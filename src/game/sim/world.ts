import { biomeProperty, biomeWeights } from './biomes';
import { mulberry32, rand, randInt, seedFor, weightedPick, type Rng } from './rng';
import { SPECIES, SPECIES_LIST, type SpeciesDef } from './species';
import { removeEntity, spawnEntity, type GameState, type ViewRect } from './state';
import { BIOME_IDS, type SpeciesId } from './types';

export const CHUNK = 900;
// The opening "nursery" around the spawn point stays sparse and harmless.
const NURSERY = 1400;

// How far the run has unfolded, 0 (quiet opening) to 1 (full ecosystem).
export function openness(state: GameState) {
  return Math.min(1, Math.max(state.time / 480, state.objective.index / 5));
}

const isSymbiont = (id: SpeciesId) => id === 'proteo' || id === 'cyano';
export const chunkKey = (cx: number, cy: number) => `${cx},${cy}`;

// Dangerous species phase in as ecosystem pressure rises.
export function pressureWeight(def: SpeciesDef, pressure: number): number {
  if (def.threat === 0) return 1;
  if (pressure < def.minPressure) return 0;
  return Math.min(1.7, 0.3 + (pressure - def.minPressure) * 1.1);
}

const weights = new Float32Array(5);
const SPAWNABLE = SPECIES_LIST.filter((d) => d.id !== 'glucose' && d.id !== 'debris');

export function speciesWeightsAt(x: number, y: number, seed: number, pressure: number, filter?: (d: SpeciesDef) => boolean) {
  biomeWeights(x, y, seed, weights);
  const out: Partial<Record<SpeciesId, number>> = {};
  for (const def of SPAWNABLE) {
    if (filter && !filter(def)) continue;
    let w = 0;
    for (let b = 0; b < BIOME_IDS.length; b++) w += weights[b] * (def.biomes[BIOME_IDS[b]] ?? 0);
    w *= pressureWeight(def, pressure);
    if (w > 0.001) out[def.id] = w;
  }
  return out;
}

export function spawnGroup(state: GameState, species: SpeciesId, x: number, y: number, rng: Rng, chunk = '') {
  const def = SPECIES[species];
  const n = randInt(rng, def.group_size[0], def.group_size[1]);
  const spread = def.group === 'agent' ? 50 : def.group === 'bacteria' ? 34 + n * 6 : 90;
  const heading = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = i === 0 ? 0 : rand(rng, 0.3, 1) * spread;
    const e = spawnEntity(state, species, x + Math.cos(a) * d, y + Math.sin(a) * d, { rng, chunk });
    if (def.behavior === 'swarm' || def.group === 'bacteria') e.angle = heading + (rng() - 0.5) * 0.6;
    if (species === 'adenovirus' || species === 'retrovirus' || species === 'mimivirus') {
      if (rng() < 0.3) e.satellites = randInt(rng, 2, 4);
    }
  }
}

export function spawnGlucoseCluster(state: GameState, x: number, y: number, rng: Rng, count: number, chunk = '', spread = 70) {
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * spread;
    spawnEntity(state, 'glucose', x + Math.cos(a) * d, y + Math.sin(a) * d, { rng, chunk });
  }
}

export function generateChunk(state: GameState, cx: number, cy: number) {
  const rng = mulberry32(seedFor(state.seed, cx, cy));
  const key = chunkKey(cx, cy);
  const x0 = cx * CHUNK;
  const y0 = cy * CHUNK;
  const pressure = state.director.pressure;
  const far = Math.min(1, Math.max(0, (Math.hypot(x0 + CHUNK / 2, y0 + CHUNK / 2) - 900) / 2200));
  const fill = 0.3 + 0.7 * Math.max(far, openness(state));

  const groups = Math.round((4 + Math.floor(rng() * 4)) * fill);
  for (let i = 0; i < groups; i++) {
    const x = x0 + rng() * CHUNK;
    const y = y0 + rng() * CHUNK;
    const table = speciesWeightsAt(x, y, state.seed, pressure);
    const species = weightedPick(rng, table);
    if (!species) continue;
    const def = SPECIES[species];
    const fromOrigin = Math.hypot(x, y);
    // Keep the opening microscope field gentle and uncluttered. The
    // endosymbionts are introduced by their objective instead.
    if (fromOrigin < NURSERY && (def.threat >= 1 || isSymbiont(species))) continue;
    if (fromOrigin < 320 && def.group !== 'resource') continue;
    spawnGroup(state, species, x, y, rng, key);
  }

  const glucose = biomeProperty(x0 + CHUNK / 2, y0 + CHUNK / 2, state.seed, 'glucose');
  const clusters = Math.round(glucose * (1.4 + rng() * 2) * fill);
  for (let i = 0; i < clusters; i++) {
    spawnGlucoseCluster(state, x0 + rng() * CHUNK, y0 + rng() * CHUNK, rng, randInt(rng, 3, 3 + Math.round(6 * fill)), key);
  }
}

// Load chunks that intersect the (padded) view and forget chunks well out of
// range. Forgotten chunks regenerate deterministically on return.
export function streamChunks(state: GameState, view: ViewRect) {
  const pad = CHUNK * 0.6;
  const cx0 = Math.floor((view.x - view.halfW - pad) / CHUNK);
  const cx1 = Math.floor((view.x + view.halfW + pad) / CHUNK);
  const cy0 = Math.floor((view.y - view.halfH - pad) / CHUNK);
  const cy1 = Math.floor((view.y + view.halfH + pad) / CHUNK);

  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const key = chunkKey(cx, cy);
      if (state.loadedChunks.has(key)) continue;
      state.loadedChunks.add(key);
      generateChunk(state, cx, cy);
    }
  }

  let unloaded = false;
  const forgotten = new Set<string>();
  for (const key of state.loadedChunks) {
    const [cx, cy] = key.split(',').map(Number);
    if (cx < cx0 - 2 || cx > cx1 + 2 || cy < cy0 - 2 || cy > cy1 + 2) {
      forgotten.add(key);
      unloaded = true;
    }
  }
  if (!unloaded) return;
  for (const key of forgotten) state.loadedChunks.delete(key);
  const keepX = view.halfW + CHUNK;
  const keepY = view.halfH + CHUNK;
  for (const e of state.entities) {
    if (!e.chunk || !forgotten.has(e.chunk)) continue;
    if (Math.abs(e.x - view.x) > keepX || Math.abs(e.y - view.y) > keepY) removeEntity(state, e);
    else e.chunk = '';
  }
}

// Remove far-away dynamic entities and keep the neighborhood stocked with
// glucose and small prey so explored ground never goes barren.
export function ambientUpkeep(state: GameState, view: ViewRect, dt: number) {
  const keep = Math.max(view.halfW, view.halfH) * 1.6 + 1500;
  for (const e of state.entities) {
    if (e.chunk || e.dead || e.attachedTo) continue;
    if (Math.abs(e.x - view.x) > keep || Math.abs(e.y - view.y) > keep) removeEntity(state, e);
  }

  state.ambientTimer -= dt;
  if (state.ambientTimer > 0) return;
  state.ambientTimer = 1.1;

  const active = Math.max(view.halfW, view.halfH) + 500;
  let glucose = 0;
  let prey = 0;
  for (const e of state.entities) {
    if (e.dead) continue;
    if (Math.abs(e.x - view.x) > active || Math.abs(e.y - view.y) > active) continue;
    if (e.species === 'glucose') glucose++;
    else if (SPECIES[e.species].group === 'bacteria' || e.species === 'euglena' || e.species === 'diatom') prey++;
  }

  const richness = biomeProperty(view.x, view.y, state.seed, 'glucose');
  const open = openness(state);
  const rng = state.rng;
  const p = state.player.units[0];
  const heading = Math.atan2(p.vy, p.vx);
  const offscreen = () => {
    const ahead = Math.hypot(p.vx, p.vy) > 40 && rng() < 0.7;
    const a = ahead ? heading + (rng() - 0.5) * 2.2 : rng() * Math.PI * 2;
    const d = Math.max(view.halfW, view.halfH) * 1.08 + 80 + rng() * 260;
    return { x: view.x + Math.cos(a) * d, y: view.y + Math.sin(a) * d };
  };

  if (glucose < (9 + 17 * open) * richness) {
    const at = offscreen();
    spawnGlucoseCluster(state, at.x, at.y, rng, randInt(rng, 3, 4 + Math.round(5 * open)));
  }
  if (prey < 3 + 9 * open) {
    const at = offscreen();
    const symbionts = state.objective.index >= 1;
    const table = speciesWeightsAt(at.x, at.y, state.seed, state.director.pressure, (d) =>
      (d.group === 'bacteria' && (symbionts || !isSymbiont(d.id))) || d.id === 'euglena' || d.id === 'diatom'
      || (d.id === 'paramecium' && open > 0.4),
    );
    const species = weightedPick(rng, table);
    if (species) spawnGroup(state, species, at.x, at.y, rng);
  }
}
