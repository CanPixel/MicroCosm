import { meanRadius, SPECIES } from './species';
import { emit, removeEntity, spawnEntity, type GameState } from './state';
import type { Entity, SpeciesId } from './types';

export type Yield = { biomass: number; glucose: number; dna: number; lipid: number };

export function yieldsOf(e: Entity): Yield {
  const def = SPECIES[e.species];
  // Resources can carry an explicit payload (e.g. debris from a large kill).
  if (def.group === 'resource' && e.aux > 0) {
    if (e.species === 'debris') return { biomass: e.aux, glucose: e.aux * 0.15, dna: 0, lipid: 0 };
    if (e.species === 'dna') return { biomass: 0.2, glucose: 0, dna: e.aux, lipid: 0 };
  }
  const scale = def.perRadius ? e.radius : e.radius / meanRadius(e.species);
  return {
    biomass: def.yields.biomass * scale,
    glucose: def.yields.glucose * scale,
    dna: def.yields.dna * scale,
    lipid: def.yields.lipid * scale,
  };
}

// Scatter a dead organism's contents as debris, DNA and lipid droplets.
export function dropLoot(state: GameState, e: Entity, efficiency = 0.75) {
  const y = yieldsOf(e);
  const rng = state.rng;
  const biomass = y.biomass * efficiency;
  const pieces = Math.min(12, Math.max(1, Math.ceil(biomass / 3.5)));
  for (let i = 0; i < pieces; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * e.radius * 0.7;
    const sp = 30 + rng() * 70;
    const piece = spawnEntity(state, 'debris', e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, {
      radius: 3.6 + Math.min(4, biomass / pieces) * 0.8,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
    });
    piece.aux = biomass / pieces;
  }
  let dna = y.dna * efficiency;
  while (dna > 0.15) {
    const amount = Math.min(1.5, dna);
    dna -= amount;
    const a = rng() * Math.PI * 2;
    const frag = spawnEntity(state, 'dna', e.x + Math.cos(a) * e.radius * 0.4, e.y + Math.sin(a) * e.radius * 0.4, {
      vx: Math.cos(a) * 50,
      vy: Math.sin(a) * 50,
    });
    frag.aux = amount;
  }
  if (y.lipid > 3) {
    const a = rng() * Math.PI * 2;
    spawnEntity(state, 'lipid', e.x + Math.cos(a) * e.radius * 0.3, e.y + Math.sin(a) * e.radius * 0.3, {
      vx: Math.cos(a) * 40,
      vy: Math.sin(a) * 40,
    });
  }
}

export function killEntity(state: GameState, e: Entity, byPlayer: boolean) {
  if (e.dead) return;
  const def = SPECIES[e.species];
  if (def.group !== 'resource') dropLoot(state, e, byPlayer ? 0.8 : 0.5);
  removeEntity(state, e);
  if (byPlayer) {
    state.stats.kills++;
    emit(state, { type: 'kill', species: e.species, x: e.x, y: e.y });
  }
}

// Returns true when the entity died.
export function damageEntity(state: GameState, e: Entity, amount: number, byPlayer: boolean): boolean {
  const def = SPECIES[e.species];
  if (e.dead || def.invulnerable || def.group === 'resource') return false;
  e.hp -= amount;
  e.hitFlash = 1;

  if (e.species === 'neoplasm') {
    // Wounded tumors bud off daughter masses at 70% and 35% health.
    const thresholds = [0.7, 0.35];
    while (e.aux < thresholds.length && e.hp / e.maxHp < thresholds[e.aux] && e.hp > 0) {
      e.aux++;
      const a = state.rng() * Math.PI * 2;
      const child = spawnEntity(state, 'neoplasm', e.x + Math.cos(a) * e.radius, e.y + Math.sin(a) * e.radius, {
        radius: Math.max(36, e.radius * 0.48),
        vx: Math.cos(a) * 160,
        vy: Math.sin(a) * 160,
      });
      child.aux = 2;
      child.homeX = e.homeX;
      child.homeY = e.homeY;
      child.state = 1;
    }
  }
  if (e.species === 'stentor') e.aux2 = 2.5; // contract when struck

  if (e.hp <= 0) {
    killEntity(state, e, byPlayer);
    return true;
  }
  return false;
}

// An infected NPC bursts, releasing new virions plus its contents.
export function burstHost(state: GameState, host: Entity) {
  const virus: SpeciesId = host.infectedBy ?? 'phage';
  let nearbyViruses = 0;
  state.grid.query(host.x, host.y, 500, (o) => {
    if (o.species === virus) nearbyViruses++;
  });
  const room = Math.max(0, 14 - nearbyViruses);
  const count = Math.min(room, virus === 'phage' ? 4 + Math.floor(state.rng() * 3) : 2 + Math.floor(state.rng() * 2));
  for (let i = 0; i < count; i++) {
    const a = (i / Math.max(1, count)) * Math.PI * 2 + state.rng();
    spawnEntity(state, virus, host.x + Math.cos(a) * host.radius * 0.6, host.y + Math.sin(a) * host.radius * 0.6, {
      vx: Math.cos(a) * 110,
      vy: Math.sin(a) * 110,
    });
  }
  dropLoot(state, host, 0.55);
  // Bursting cells spill nucleic acids: a DNA bonanza.
  const frag = spawnEntity(state, 'dna', host.x, host.y, { vx: 0, vy: 0 });
  frag.aux = 0.25 + host.radius * 0.015;
  removeEntity(state, host);
  emit(state, { type: 'npcBurst', species: host.species, x: host.x, y: host.y });
}
