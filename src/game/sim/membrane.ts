import { angleDiff, TAU } from './math';
import type { MembraneState } from './types';

// The membrane is a ring of springy radii sampled at fixed world angles.
// Because every sample is a radius from the cell center, the outline is
// always a star-shaped simple loop: it cannot self-intersect or invert on a
// sharp turn (the old "180 degree cell wall" bug), yet it can still form
// non-convex pseudopods, organelle bulges, phagocytic cups and flat shared
// walls against colony neighbors.

export const MEMBRANE_SAMPLES = 56;

export function createMembrane(radius: number, samples = MEMBRANE_SAMPLES): MembraneState {
  const r = new Float32Array(samples).fill(radius);
  return { r, v: new Float32Array(samples), target: new Float32Array(samples).fill(radius), pods: [], podTimer: 0 };
}

export type MembraneBody = { x: number; y: number; r: number };

export type MembraneInput = {
  radius: number;
  heading: number;
  speed: number; // 0..1 of max speed
  time: number;
  dt: number;
  seed: number;
  liveliness: number;
  // Positions relative to the cell center, in world units.
  bodies: MembraneBody[];
  engulfing: MembraneBody[];
  neighbors: MembraneBody[];
  rigid: boolean;
  pinch: number; // 0..1 cleavage-furrow constriction during division
  rand: () => number;
};

export function stepMembrane(m: MembraneState, input: MembraneInput) {
  const n = m.r.length;
  const { radius: R, heading, speed, time, dt, seed, rigid } = input;

  // Pseudopod lifecycle: motion grows lobes toward the heading; idle cells
  // probe the surroundings with small exploratory pods.
  m.podTimer -= dt;
  if (!rigid && m.podTimer <= 0) {
    const moving = speed > 0.15;
    m.podTimer = moving ? 0.22 + input.rand() * 0.25 : 0.6 + input.rand() * 0.9;
    if (m.pods.length < 5) {
      const spread = moving ? 0.9 : Math.PI;
      m.pods.push({
        angle: heading + (input.rand() * 2 - 1) * spread,
        extent: (moving ? 0.16 + input.rand() * 0.2 : 0.1 + input.rand() * 0.14) * input.liveliness,
        age: 0,
        life: moving ? 0.7 + input.rand() * 0.8 : 1.4 + input.rand() * 1.2,
      });
    }
  }
  for (const pod of m.pods) pod.age += dt;
  m.pods = m.pods.filter((pod) => pod.age < pod.life);

  const t = m.target;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let target: number;
    if (rigid) {
      target = R * 0.94;
    } else {
      const wobble =
        0.075 * Math.sin(3 * a + time * 0.55 + seed) +
        0.045 * Math.sin(5 * a - time * 0.8 + seed * 2.1) +
        0.02 * Math.sin(7 * a + time * 1.3 + seed * 0.7);
      target = R * (1 + wobble * input.liveliness);
      const c = Math.cos(a - heading);
      // Elongate along the swim axis and slim the flanks.
      target *= 1 + speed * (0.13 * (2 * c * c - 1) + 0.05 * c);
      for (const pod of m.pods) {
        const d = angleDiff(a, pod.angle);
        const life = Math.sin((pod.age / pod.life) * Math.PI);
        target += R * pod.extent * life * Math.exp(-(d * d) / 0.09);
      }
      // Cleavage furrow: pinch perpendicular to the heading during division.
      if (input.pinch > 0) {
        const side = Math.abs(Math.sin(a - heading));
        target *= 1 - input.pinch * 0.42 * Math.pow(side, 6);
        target *= 1 + input.pinch * 0.18 * Math.abs(c);
      }
    }

    // Internal bodies push the wall out: the ray at angle `a` must exit
    // beyond each organelle's circle.
    for (const b of input.bodies) {
      const rho = Math.hypot(b.x, b.y);
      const phi = Math.atan2(b.y, b.x);
      const d = angleDiff(a, phi);
      if (Math.abs(d) >= Math.PI / 2) continue;
      const perp = rho * Math.sin(Math.abs(d));
      const rr = b.r * 1.18 + 2;
      if (perp >= rr) continue;
      const need = rho * Math.cos(d) + Math.sqrt(rr * rr - perp * perp);
      if (need > target) target = need;
    }

    // Phagocytic cup: the membrane flows around prey being engulfed.
    for (const b of input.engulfing) {
      const rho = Math.hypot(b.x, b.y);
      const phi = Math.atan2(b.y, b.x);
      const d = angleDiff(a, phi);
      const width = Math.atan2(b.r, Math.max(rho, 1)) + 0.28;
      const w = Math.exp(-(d * d) / (width * width));
      const cup = rho + b.r * 1.15;
      if (cup > target) target = target + (cup - target) * w;
    }
    t[i] = target;
  }

  // One smoothing pass keeps the target free of single-sample spikes.
  let prev = t[n - 1];
  const first = t[0];
  for (let i = 0; i < n; i++) {
    const next = i === n - 1 ? first : t[i + 1];
    const cur = t[i];
    t[i] = cur * 0.5 + (prev + next) * 0.25;
    prev = cur;
  }

  const k = rigid ? 180 : 95;
  const c = rigid ? 18 : 9.5;
  const minR = R * 0.42;
  for (let i = 0; i < n; i++) {
    m.v[i] += ((t[i] - m.r[i]) * k - m.v[i] * c) * dt;
    m.r[i] += m.v[i] * dt;
    if (m.r[i] < minR) {
      m.r[i] = minR;
      if (m.v[i] < 0) m.v[i] = 0;
    }
  }

  // Shared walls with adhered colony neighbors: clip each ray at the power
  // bisector between the two cells, producing flat tissue-like junctions.
  for (const nb of input.neighbors) {
    const D = Math.hypot(nb.x, nb.y);
    if (D < 1) continue;
    const phi = Math.atan2(nb.y, nb.x);
    const d0 = (D * D + R * R - nb.r * nb.r) / (2 * D) - 1.2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const cosA = Math.cos(a - phi);
      if (cosA <= 0.05) continue;
      const limit = d0 / cosA;
      if (m.r[i] > limit) {
        m.r[i] = Math.max(minR, limit);
        if (m.v[i] > 0) m.v[i] = 0;
      }
    }
  }
}

// Radial dent + jiggle where the membrane was struck (negative = inward).
export function membraneImpulse(m: MembraneState, angle: number, strength: number, width = 0.5) {
  const n = m.r.length;
  for (let i = 0; i < n; i++) {
    const d = angleDiff((i / n) * TAU, angle);
    m.v[i] += strength * Math.exp(-(d * d) / (width * width));
  }
}

// Interpolated membrane radius at an arbitrary angle.
export function membraneRadiusAt(m: MembraneState, angle: number): number {
  const n = m.r.length;
  let f = ((((angle % TAU) + TAU) % TAU) / TAU) * n;
  const i0 = Math.floor(f) % n;
  const i1 = (i0 + 1) % n;
  f -= Math.floor(f);
  return m.r[i0] * (1 - f) + m.r[i1] * f;
}
