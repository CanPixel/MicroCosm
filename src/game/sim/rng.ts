// Deterministic RNG and 2D noise. A given seed always produces the same world,
// so chunks can be unloaded and regenerated identically.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (rng: Rng, lo: number, hi: number) => lo + (hi - lo) * rng();
export const randInt = (rng: Rng, lo: number, hi: number) => Math.floor(rand(rng, lo, hi + 1));
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

export function weightedPick<K extends string>(rng: Rng, weights: Partial<Record<K, number>>): K | null {
  let total = 0;
  for (const key in weights) total += Math.max(0, weights[key] ?? 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const key in weights) {
    roll -= Math.max(0, weights[key] ?? 0);
    if (roll <= 0) return key;
  }
  return null;
}

// Integer lattice hash to [0, 1).
export function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function seedFor(seed: number, a: number, b: number): number {
  return (seed ^ Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0;
}

const fade = (t: number) => t * t * (3 - 2 * t);

// Smooth value noise in [0, 1] at unit frequency.
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const tx = fade(x - ix);
  const ty = fade(y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

// Fractal noise in [0, 1].
export function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(fx, fy, seed + i * 1013) * amp;
    norm += amp;
    fx = fx * 2.03 + 17.1;
    fy = fy * 2.03 - 9.7;
    amp *= 0.5;
  }
  return sum / norm;
}

// Divergence-free flow (curl of a noise potential). Returns a velocity with
// magnitude roughly in [-1, 1]; currents never pile entities into sinks.
export function curlFlow(x: number, y: number, time: number, seed: number, frequency: number, out: { x: number; y: number }) {
  const e = 0.35;
  const fx = x * frequency;
  const fy = y * frequency + time * 0.03;
  const n1 = fbm(fx, fy + e, seed, 2);
  const n2 = fbm(fx, fy - e, seed, 2);
  const n3 = fbm(fx + e, fy, seed, 2);
  const n4 = fbm(fx - e, fy, seed, 2);
  out.x = ((n1 - n2) / (2 * e)) * 2.2;
  out.y = (-(n3 - n4) / (2 * e)) * 2.2;
  return out;
}
