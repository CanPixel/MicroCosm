// Deterministic RNG + 2D value noise used for world generation, so a given
// seed always produces the same world layout.

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

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Hash a lattice point to [0, 1).
function latticeHash(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth 2D value noise in [0, 1]. `frequency` is in cycles per world unit.
export function valueNoise2D(x: number, y: number, frequency: number, seed: number): number {
  const fx = x * frequency;
  const fy = y * frequency;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = smoothstep(fx - ix);
  const ty = smoothstep(fy - iy);

  const v00 = latticeHash(ix, iy, seed);
  const v10 = latticeHash(ix + 1, iy, seed);
  const v01 = latticeHash(ix, iy + 1, seed);
  const v11 = latticeHash(ix + 1, iy + 1, seed);

  return lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
}

// Two octaves of value noise, still in [0, 1].
export function fractalNoise2D(x: number, y: number, frequency: number, seed: number): number {
  const n1 = valueNoise2D(x, y, frequency, seed);
  const n2 = valueNoise2D(x, y, frequency * 2.7, seed ^ 0x9e3779b9);
  return (n1 * 2 + n2) / 3;
}
