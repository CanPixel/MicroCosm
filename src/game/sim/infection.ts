import { mutationStacks, SLOT_NEIGHBORS } from './organelles';
import { damageUnit, livingUnits } from './player';
import { SPECIES } from './species';
import { emit, spawnEntity, type GameState } from './state';
import type { Attachment, CellUnit, SpeciesId } from './types';

// The infection model follows the design bible's aliveness spectrum:
// prions misfold organelles, viroids siphon ATP, satellites amplify viruses,
// lytic viruses replicate to a burst, retroviruses integrate and wait, and
// intracellular bacteria colonize the cytoplasm.

export function attachAgent(state: GameState, unit: CellUnit, species: SpeciesId, angleWorld: number, satellites: number, seed: number) {
  const inject = species === 'viroid' ? 9999 : species === 'mimivirus' ? 3.2 : species === 'retrovirus' ? 2.4 : 1.9;
  const a: Attachment = {
    id: state.nextId++,
    species,
    angle: angleWorld - unit.heading,
    timer: 0,
    injectAt: inject * (0.85 + state.rng() * 0.3),
    satellites,
    seed,
  };
  unit.attached.push(a);
  emit(state, { type: 'attach', species, x: unit.x + Math.cos(angleWorld) * unit.radius, y: unit.y + Math.sin(angleWorld) * unit.radius });
}

// Dash/encyst shake: each attachment may be flung off.
export function shakeAttachments(state: GameState, chance: number) {
  let shaken = 0;
  for (const u of livingUnits(state.player)) {
    for (let i = u.attached.length - 1; i >= 0; i--) {
      if (state.rng() > chance) continue;
      const a = u.attached[i];
      u.attached.splice(i, 1);
      const wa = a.angle + u.heading;
      const x = u.x + Math.cos(wa) * (u.radius + 8);
      const y = u.y + Math.sin(wa) * (u.radius + 8);
      const e = spawnEntity(state, a.species, x, y, { vx: Math.cos(wa) * 260, vy: Math.sin(wa) * 260, satellites: a.satellites });
      e.stun = 1.4;
      shaken++;
    }
  }
  if (shaken) {
    const prime = state.player.units[0];
    emit(state, { type: 'shake', count: shaken, x: prime.x, y: prime.y });
  }
  return shaken;
}

export function clearAttachments(state: GameState, filter: (a: Attachment) => boolean) {
  let cleared = 0;
  for (const u of state.player.units) {
    const before = u.attached.length;
    u.attached = u.attached.filter((a) => !filter(a));
    cleared += before - u.attached.length;
  }
  return cleared;
}

export function misfoldRandom(state: GameState): boolean {
  const p = state.player;
  const healthy = p.organelles.filter((o) => !o.misfolded);
  if (!healthy.length) return false;
  const target = healthy[Math.floor(state.rng() * healthy.length)];
  target.misfolded = true;
  p.traitsDirty = true;
  emit(state, { type: 'misfold', organelle: target.type });
  return true;
}

export function updateInfection(state: GameState, dt: number) {
  const p = state.player;
  if (p.dead) return;
  const inf = p.infection;
  const prime = p.units[0];
  const units = livingUnits(p);

  // Attached agents tick toward injection; viroids drain while attached.
  let viroids = 0;
  for (const u of units) {
    for (let i = u.attached.length - 1; i >= 0; i--) {
      const a = u.attached[i];
      a.timer += dt;
      if (a.species === 'viroid') {
        viroids++;
        continue;
      }
      if (a.timer < a.injectAt) continue;
      u.attached.splice(i, 1);
      const style = SPECIES[a.species].infection;
      if (style === 'lysogenic') {
        inf.prophages = Math.min(6, inf.prophages + 1);
        emit(state, { type: 'infection', style, species: a.species });
      } else {
        const dose = a.species === 'mimivirus' ? 38 : 22;
        inf.viralLoad = Math.min(100, inf.viralLoad + dose * (1 + a.satellites * 0.25));
        inf.satelliteBoost += a.satellites * 0.2;
        inf.lastVirus = a.species;
        emit(state, { type: 'infection', style: 'lytic', species: a.species });
      }
    }
  }
  if (viroids > 0) {
    // Viroids hijack the photosynthetic machinery and bleed ATP.
    p.atp = Math.max(0, p.atp - viroids * 0.9 * dt);
    p.glucose = Math.max(0, p.glucose - viroids * 0.25 * dt);
  }

  // Lytic replication toward a burst.
  if (inf.viralLoad > 0) {
    const resist = 1 - p.traits.viralResistance;
    if (inf.viralLoad < 14 && inf.satelliteBoost <= 0) {
      inf.viralLoad = Math.max(0, inf.viralLoad - 0.8 * dt); // innate clearance of a light dose
    } else {
      inf.viralLoad += (3.2 + inf.viralLoad * 0.025) * (1 + inf.satelliteBoost) * resist * dt;
    }
    if (inf.viralLoad >= 100) {
      const virus = inf.lastVirus ?? 'adenovirus';
      const n = virus === 'mimivirus' ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + state.rng();
        spawnEntity(state, virus, prime.x + Math.cos(a) * prime.radius, prime.y + Math.sin(a) * prime.radius, {
          vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
        }).stun = 2;
      }
      damageUnit(state, prime, prime.maxIntegrity * 0.34, prime.x, prime.y, 'burst', { bypassCooldown: true, cause: 'lysis' });
      // The burst vents most virions out of the cell with them.
      inf.viralLoad = 6;
      inf.satelliteBoost *= 0.5;
      emit(state, { type: 'lysisBurst', x: prime.x, y: prime.y });
    }
  }
  inf.satelliteBoost = Math.max(0, inf.satelliteBoost - dt * 0.01);

  // Proviruses wait for stress, then reactivate.
  if (inf.prophages > 0) {
    let stress = 1;
    if (prime.integrity < prime.maxIntegrity * 0.4) stress += 4;
    if (p.starving) stress += 4;
    if (inf.viralLoad > 0) stress += 2;
    if (p.dividing > 0) stress += 3;
    if (state.rng() < 0.0035 * stress * inf.prophages * dt) {
      inf.prophages--;
      inf.viralLoad = Math.min(100, inf.viralLoad + 55);
      inf.lastVirus = 'retrovirus';
      emit(state, { type: 'induction' });
    }
  }

  // Prion misfolding spreads through adjacent organelles.
  const misfolded = p.organelles.filter((o) => o.misfolded);
  if (misfolded.length > 0) {
    inf.misfoldTimer += dt * (1 - p.traits.prionResistance * 0.6);
    if (inf.misfoldTimer > 20) {
      inf.misfoldTimer = 0;
      const source = misfolded[Math.floor(state.rng() * misfolded.length)];
      const neighbors = p.organelles.filter((o) => !o.misfolded && SLOT_NEIGHBORS[source.slot]?.includes(o.slot));
      if (neighbors.length && state.rng() < 0.7) {
        const victim = neighbors[Math.floor(state.rng() * neighbors.length)];
        victim.misfolded = true;
        p.traitsDirty = true;
        emit(state, { type: 'misfold', organelle: victim.type });
      }
    }
    if (mutationStacks(p, 'chaperonin') > 0) {
      inf.refoldTimer += dt;
      if (inf.refoldTimer > 26) {
        inf.refoldTimer = 0;
        misfolded[0].misfolded = false;
        p.traitsDirty = true;
        emit(state, { type: 'cured', what: 'prion' });
      }
    }
    // A cell whose proteome has largely collapsed starts to fall apart.
    if (misfolded.length >= 4 && misfolded.length >= p.organelles.length * 0.6) {
      damageUnit(state, prime, 2.2 * dt, prime.x, prime.y, 'misc', { bypassCooldown: true, cause: 'proteostasis' });
    }
  } else {
    inf.misfoldTimer = 0;
  }

  // Intracellular bacteria.
  if (inf.colonies > 0) {
    const pact = mutationStacks(p, 'endosymbiontPact') > 0;
    if (pact) {
      inf.colonies = Math.min(inf.colonies, 4);
    } else {
      p.glucose = Math.max(0, p.glucose - inf.colonies * 0.32 * dt);
      inf.colonyTimer += dt;
      if (inf.colonyTimer > 18 && p.glucose > 8) {
        inf.colonyTimer = 0;
        inf.colonies = Math.min(8, inf.colonies + 1);
      }
      if (inf.colonies > 4) damageUnit(state, prime, (inf.colonies - 4) * 1.1 * dt, prime.x, prime.y, 'misc', { bypassCooldown: true, cause: 'rupture' });
    }
  }

  // Free virophages near the colony intercept attached giant viruses.
  if (units.some((u) => u.attached.some((a) => a.species === 'mimivirus'))) {
    state.grid.query(prime.x, prime.y, 220, (o) => {
      if (o.species !== 'virophage') return;
      for (const u of units) {
        const i = u.attached.findIndex((a) => a.species === 'mimivirus');
        if (i >= 0) {
          u.attached.splice(i, 1);
          o.dead = true;
          state.byId.delete(o.id);
          emit(state, { type: 'cured', what: 'virus' });
          return true;
        }
      }
    });
  }
}
