import { BIOMES, biomeWeights } from './biomes';
import { countOrganelles } from './organelles';
import { canDivide, divisionDnaCost, divisionThreshold, livingUnits, spendableBiomass } from './player';
import { pick, rand, randInt, weightedPick } from './rng';
import { SPECIES } from './species';
import { emit, spawnEntity, type GameState } from './state';
import { spawnGlucoseCluster, spawnGroup } from './world';
import { BIOME_IDS, type DirectorEventKind, type SpeciesId, type UnlockId } from './types';

export type ObjectiveDef = {
  id: string;
  title: string;
  text: string;
  reward: number;
  check: (s: GameState) => boolean;
  progress?: (s: GameState) => string;
  nav?: SpeciesId[] | ((s: GameState) => SpeciesId[] | null);
  // Organisms that drift into view when the objective begins, so the opening
  // field can stay sparse without leaving the player searching.
  intro?: SpeciesId[];
};

const has = (s: GameState, type: Parameters<typeof countOrganelles>[1]) => countOrganelles(s.player, type, true) > 0;

export const OBJECTIVES: ObjectiveDef[] = [
  {
    id: 'feed', title: 'Ignite metabolism', reward: 0,
    text: 'Swim into glucose crystals. Glycolysis turns each one into ATP.',
    check: (s) => s.stats.glucose >= 10,
    progress: (s) => `${Math.min(10, s.stats.glucose)}/10 glucose`,
    nav: ['glucose'],
  },
  {
    id: 'mito', title: 'Endosymbiosis', reward: 1,
    text: 'Engulf a purple α-proteobacterium. Instead of digesting it, you keep it as your first mitochondrion.',
    check: (s) => has(s, 'mitochondrion'),
    nav: ['proteo'],
    intro: ['proteo', 'proteo', 'cyano'],
  },
  {
    id: 'hunt', title: 'Gather biomass', reward: 1,
    text: 'Engulf microbes smaller than you (dashed green ring). Digested prey becomes spare biomass for building.',
    check: (s) => s.stats.eaten - s.objective.startEaten >= 6 || has(s, 'er'),
    progress: (s) => `${Math.min(6, s.stats.eaten - s.objective.startEaten)}/6 engulfed · ${Math.floor(Math.max(0, spendableBiomass(s.player)))} spare`,
    nav: ['bacillus', 'cocci', 'spirillum', 'euglena', 'diatom'],
    intro: ['cocci', 'bacillus'],
  },
  {
    id: 'er', title: 'Endomembrane system', reward: 2,
    text: 'Press TAB to zoom into your ultrastructure and grow an endoplasmic reticulum.',
    check: (s) => has(s, 'er'),
  },
  {
    id: 'arm', title: 'Arm the cell', reward: 1,
    text: 'Grow a Golgi apparatus, then a lysosome. Lysosome burst is on key 1.',
    check: (s) => has(s, 'lysosome'),
    progress: (s) => `${(has(s, 'golgi') ? 1 : 0) + (has(s, 'lysosome') ? 1 : 0)}/2 built`,
  },
  {
    id: 'divide', title: 'Cytokinesis', reward: 2,
    text: 'Reach critical mass and gather DNA for genome replication, then divide with R.',
    check: (s) => s.player.generation >= 2,
    progress: (s) => {
      const p = s.player;
      return `${Math.floor(Math.max(0, spendableBiomass(p)))}/${divisionThreshold(p.generation)} spare · ${Math.floor(p.dna)}/${divisionDnaCost(p.generation)} DNA`;
    },
    nav: (s) => (s.player.dna < divisionDnaCost(s.player.generation) ? ['dna', 'phage'] : null),
  },
  {
    id: 'colony', title: 'A colony forms', reward: 2,
    text: 'Divide again. Your daughters stay attached and specialize.',
    check: (s) => livingUnits(s.player).length >= 3,
    progress: (s) => `${livingUnits(s.player).length}/3 cells`,
  },
  {
    id: 'journal', title: 'Field journal', reward: 3,
    text: 'Catalogue 16 species. Switch microscope light (Q) to reveal hidden agents.',
    check: (s) => s.discovered.size >= 16,
    progress: (s) => `${s.discovered.size}/16 species`,
  },
  {
    id: 'multicellular', title: 'Multicellularity', reward: 5,
    text: 'Grow a colony of 6 specialized cells and cross the threshold to complex life.',
    check: (s) => livingUnits(s.player).length >= 6,
    progress: (s) => `${livingUnits(s.player).length}/6 cells`,
  },
];

export function objectiveNavTarget(state: GameState): { x: number; y: number; species: SpeciesId } | null {
  const def = OBJECTIVES[state.objective.index];
  if (!def?.nav) return null;
  const list = typeof def.nav === 'function' ? def.nav(state) : def.nav;
  if (!list) return null;
  const prime = state.player.units[0];
  let best: { x: number; y: number; species: SpeciesId } | null = null;
  let bestD = Infinity;
  for (const e of state.entities) {
    if (e.dead || e.attachedTo || !list.includes(e.species)) continue;
    const d = (e.x - prime.x) ** 2 + (e.y - prime.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { x: e.x, y: e.y, species: e.species };
    }
  }
  return best;
}

const weights = new Float32Array(5);

export function updateEnvironment(state: GameState) {
  const prime = state.player.units[0];
  biomeWeights(prime.x, prime.y, state.seed, weights);
  let best = 0;
  let light = 0;
  let current = 0;
  let danger = 0;
  for (let i = 0; i < BIOME_IDS.length; i++) {
    if (weights[i] > weights[best]) best = i;
    const b = BIOMES[BIOME_IDS[i]];
    light += weights[i] * b.light;
    current += weights[i] * b.current;
    danger += weights[i] * b.danger;
  }
  state.biome = BIOME_IDS[best];
  state.light = light;
  state.current = current;
  const dist = Math.hypot(prime.x, prime.y);
  state.stats.maxDistance = Math.max(state.stats.maxDistance, dist);
  const p = state.player;
  // A slow dawn: the first three minutes stay quiet, then the world wakes up.
  const t = state.time;
  const timeTerm = t < 180 ? t / 720 : 0.25 + (t - 180) / 240;
  state.director.pressure = Math.min(4, 0.1 + timeTerm + dist / 7000 + (p.generation - 1) * 0.15 + (danger - 1) * 0.2);
}

function ahead(state: GameState, distance: number, jitter = 0.8) {
  const prime = state.player.units[0];
  const speed = Math.hypot(prime.vx, prime.vy);
  const base = speed > 30 ? Math.atan2(prime.vy, prime.vx) : state.rng() * Math.PI * 2;
  const a = base + (state.rng() - 0.5) * jitter * 2;
  return { x: prime.x + Math.cos(a) * distance, y: prime.y + Math.sin(a) * distance };
}

function runEvent(state: GameState, kind: DirectorEventKind) {
  const rng = state.rng;
  const p = state.player;
  const prime = p.units[0];
  const pressure = state.director.pressure;
  const view = state.view;
  let at = { x: prime.x, y: prime.y };
  switch (kind) {
    case 'glucoseBloom': {
      at = ahead(state, 520);
      for (let i = 0; i < 3; i++) spawnGlucoseCluster(state, at.x + rand(rng, -140, 140), at.y + rand(rng, -140, 140), rng, 9, '', 90);
      break;
    }
    case 'viralStorm': {
      const n = Math.min(12, 4 + Math.floor(pressure * 2.5));
      const ring = Math.max(view.halfW, view.halfH) + 140;
      const plant = countOrganelles(p, 'chloroplast', true) > 0;
      for (let i = 0; i < n; i++) {
        const species = weightedPick<SpeciesId>(rng, {
          adenovirus: 3,
          retrovirus: pressure > 1 ? 1.2 : 0,
          mimivirus: pressure > 1.3 ? 0.5 : 0,
          tmv: plant ? 1 : 0,
        }) ?? 'adenovirus';
        const a = (i / n) * Math.PI * 2 + rng() * 0.3;
        const e = spawnEntity(state, species, prime.x + Math.cos(a) * ring, prime.y + Math.sin(a) * ring, {
          vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60,
        });
        if (rng() < 0.3) e.satellites = randInt(rng, 2, 3);
      }
      break;
    }
    case 'prionFog': {
      at = ahead(state, 560, 0.4);
      for (let i = 0; i < 20; i++) {
        const a = rng() * Math.PI * 2;
        const d = Math.sqrt(rng()) * 220;
        spawnEntity(state, 'prion', at.x + Math.cos(a) * d, at.y + Math.sin(a) * d);
      }
      break;
    }
    case 'phageBurst': {
      let infected = 0;
      state.grid.query(prime.x, prime.y, 900, (e) => {
        if (infected >= 5 || SPECIES[e.species].group !== 'bacteria' || e.infectedBy) return;
        e.infectedBy = 'phage';
        e.infection = 3 + rng() * 3;
        infected++;
      });
      if (infected < 3) {
        at = ahead(state, 480);
        for (let i = 0; i < 8; i++) {
          const b = spawnEntity(state, pick(rng, ['cocci', 'bacillus', 'cocci'] as const), at.x + rand(rng, -90, 90), at.y + rand(rng, -90, 90));
          b.infectedBy = 'phage';
          b.infection = rng() * 4;
        }
      }
      break;
    }
    case 'virophageSwarm': {
      at = ahead(state, 620);
      for (let i = 0; i < 6; i++) spawnEntity(state, 'virophage', at.x + rand(rng, -60, 60), at.y + rand(rng, -60, 60));
      for (let i = 0; i < 2; i++) spawnEntity(state, 'mimivirus', at.x + rand(rng, -200, 200), at.y + rand(rng, -200, 200));
      break;
    }
    case 'currentSurge': {
      state.director.surge = 1;
      break;
    }
    case 'neoplasm': {
      at = ahead(state, Math.max(view.halfW, view.halfH) + 260, 1.4);
      const boss = spawnEntity(state, 'neoplasm', at.x, at.y, { radius: 80 + Math.min(40, pressure * 12) });
      boss.homeX = at.x;
      boss.homeY = at.y;
      state.director.bossSpawned = state.time;
      break;
    }
  }
  state.director.activeEvent = { kind, until: state.time + 10, x: at.x, y: at.y };
  emit(state, { type: 'event', kind, x: at.x, y: at.y });
}

export function updateDirector(state: GameState, dt: number) {
  const d = state.director;
  d.surge = Math.max(0, d.surge - dt / 14);
  if (d.activeEvent && state.time > d.activeEvent.until) d.activeEvent = null;
  if (state.time < d.nextEventAt || state.player.dead) return;
  const p = state.player;
  const pressure = d.pressure;
  const kind = weightedPick<DirectorEventKind>(state.rng, {
    glucoseBloom: 1,
    viralStorm: pressure >= 0.55 ? 1.3 : 0,
    prionFog: pressure >= 0.8 ? 0.6 : 0,
    phageBurst: 0.7,
    virophageSwarm: pressure >= 0.9 ? 0.5 : 0,
    currentSurge: 0.5,
    neoplasm: p.generation >= 2 && state.time - d.bossSpawned > 150 ? 0.8 : 0,
  });
  d.nextEventAt = state.time + Math.max(32, 62 - pressure * 8) + state.rng() * 26;
  if (kind) runEvent(state, kind);
}

function introduce(state: GameState, species: SpeciesId[]) {
  const rng = state.rng;
  const prime = state.player.units[0];
  const edge = Math.max(state.view.halfW, state.view.halfH) + 90;
  for (const id of species) {
    const at = ahead(state, edge + rng() * 160, 1.1);
    if (id !== 'proteo' && id !== 'cyano') {
      spawnGroup(state, id, at.x, at.y, rng);
    } else {
      const a = Math.atan2(prime.y - at.y, prime.x - at.x) + (rng() - 0.5) * 0.8;
      spawnEntity(state, id, at.x, at.y, { vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 });
    }
  }
  state.introducedAt = state.time;
}

export function updateObjectives(state: GameState) {
  const o = state.objective;
  const def = OBJECTIVES[o.index];
  if (!def) return;
  o.progressText = def.progress ? def.progress(state) : '';
  // If the subject has drifted away or been eaten, send another one in.
  if (def.intro && state.time - state.introducedAt > 25 && !objectiveNavTarget(state)) introduce(state, def.intro.slice(0, 1));
  if (!def.check(state)) return;
  state.player.dna += def.reward;
  o.index++;
  o.startEaten = state.stats.eaten;
  emit(state, { type: 'objective', index: o.index - 1 });
  const next = OBJECTIVES[o.index];
  if (next?.intro) introduce(state, next.intro);
  if (def.id === 'multicellular' && !state.victory) {
    state.victory = true;
    emit(state, { type: 'victory' });
  }
}

const UNLOCK_CHECKS: Record<UnlockId, (s: GameState) => boolean> = {
  glucose: (s) => s.stats.glucose >= 1,
  radar: (s) => s.objective.index >= 1,
  biomass: (s) => s.stats.eaten >= 1 || s.objective.index >= 2,
  // Dash arrives early, or immediately if something grabs you first.
  dash: (s) => s.stats.eaten >= 2 || s.objective.index >= 2 || !!s.player.capture
    || s.player.units.some((u) => u.attached.length > 0),
  architect: (s) => s.objective.index >= 2,
  dna: (s) => s.player.dna >= 0.5 || s.objective.index >= 4,
  microscope: (s) => s.objective.index >= 3 || s.time > 540,
  colony: (s) => s.player.generation >= 2,
};

export function updateUnlocks(state: GameState) {
  for (const id of Object.keys(UNLOCK_CHECKS) as UnlockId[]) {
    if (state.unlocked.has(id) || !UNLOCK_CHECKS[id](state)) continue;
    state.unlocked.add(id);
    emit(state, { type: 'unlock', id });
  }
}

export function updateDiscovery(state: GameState, dt: number) {
  state.discoverTimer -= dt;
  if (state.discoverTimer > 0) return;
  state.discoverTimer = 0.3;
  const v = state.view;
  const prime = state.player.units[0];
  const glow = state.player.traits.glow;
  for (const e of state.entities) {
    if (e.dead || state.discovered.has(e.species) || e.spawnT < 0.6) continue;
    if (Math.abs(e.x - v.x) > v.halfW * 0.92 || Math.abs(e.y - v.y) > v.halfH * 0.92) continue;
    const def = SPECIES[e.species];
    if (def.hidden && state.lightMode === 'bright') {
      if (!(glow > 0 && Math.hypot(e.x - prime.x, e.y - prime.y) < glow)) continue;
    }
    state.discovered.add(e.species);
    state.stats.discovered = state.discovered.size;
    emit(state, { type: 'discover', species: e.species });
  }
}

export function checkDivisionReady(state: GameState) {
  const p = state.player;
  if (p.divisionReadyNotified || p.dividing > 0 || p.pendingDivision) return;
  if (canDivide(state).ok) {
    p.divisionReadyNotified = true;
    emit(state, { type: 'divisionReady' });
  }
}
