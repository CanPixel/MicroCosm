import { smoothstep } from './math';
import { fbm } from './rng';
import { BIOME_IDS, type BiomeId } from './types';

export type BiomeDef = {
  id: BiomeId;
  name: string;
  tagline: string;
  // Fraction of full sunlight; drives chloroplast photosynthesis.
  light: number;
  glucose: number;
  current: number;
  danger: number;
};

export const BIOMES: Record<BiomeId, BiomeDef> = {
  shallows: {
    id: 'shallows',
    name: 'Sunlit Shallows',
    tagline: 'Caustic light, algae and easy glucose.',
    light: 1,
    glucose: 1,
    current: 0.55,
    danger: 0.6,
  },
  biofilm: {
    id: 'biofilm',
    name: 'Biofilm Reef',
    tagline: 'Bacterial mats, grazers and anchored hunters.',
    light: 0.5,
    glucose: 1.3,
    current: 0.3,
    danger: 1,
  },
  bloom: {
    id: 'bloom',
    name: 'Lysis Bloom',
    tagline: 'Viral clouds over the ruins of burst cells. Rich in DNA.',
    light: 0.38,
    glucose: 0.8,
    current: 0.85,
    danger: 1.4,
  },
  abyss: {
    id: 'abyss',
    name: 'Abyssal Sediment',
    tagline: 'Dark, sparse, patrolled by giants.',
    light: 0.06,
    glucose: 0.45,
    current: 0.35,
    danger: 1.3,
  },
  rift: {
    id: 'rift',
    name: 'Neoplastic Rift',
    tagline: 'Mutant tissue hoarding glucose. The Warburg effect, weaponized.',
    light: 0.28,
    glucose: 1.9,
    current: 1,
    danger: 2,
  },
};

const SCALE = 1 / 5200;

// Soft per-biome membership weights at a world position. Weights sum to 1 and
// blend smoothly, so both spawning and the background shader agree on borders.
export function biomeWeights(x: number, y: number, seed: number, out: Float32Array): Float32Array {
  const n1 = fbm(x * SCALE, y * SCALE, seed + 11, 3);
  const n2 = fbm(x * SCALE * 1.31 + 40.2, y * SCALE * 1.31 - 12.7, seed + 23, 3);
  const n3 = fbm(x * SCALE * 0.83 - 70.4, y * SCALE * 0.83 + 33.1, seed + 37, 3);
  const d = Math.hypot(x, y);
  const near = 1 - smoothstep(1300, 3800, d);
  const far = smoothstep(4000, 14000, d);

  const scores = [
    (n1 - 0.42) * 7 + near * 5, // shallows
    (n2 - 0.5) * 8 - near * 2.5, // biofilm
    (n3 - 0.52) * 8 - near * 4 + far * 0.8, // bloom
    (0.46 - n1) * 8 - near * 4 + far * 0.6, // abyss
    (n2 + n3 - 1.18) * 10 - 3.4 + far * 3.2 - near * 6, // rift
  ];
  let max = -Infinity;
  for (const s of scores) max = Math.max(max, s);
  let total = 0;
  for (let i = 0; i < scores.length; i++) {
    const w = Math.exp(scores[i] - max);
    out[i] = w;
    total += w;
  }
  for (let i = 0; i < scores.length; i++) out[i] /= total;
  return out;
}

const scratch = new Float32Array(5);

export function dominantBiome(x: number, y: number, seed: number): BiomeId {
  biomeWeights(x, y, seed, scratch);
  let best = 0;
  for (let i = 1; i < scratch.length; i++) if (scratch[i] > scratch[best]) best = i;
  return BIOME_IDS[best];
}

export function biomeProperty(x: number, y: number, seed: number, key: 'light' | 'glucose' | 'current' | 'danger'): number {
  biomeWeights(x, y, seed, scratch);
  let value = 0;
  for (let i = 0; i < BIOME_IDS.length; i++) value += scratch[i] * BIOMES[BIOME_IDS[i]][key];
  return value;
}
