// 2D convex-hull utilities for the player's deformable membrane.
//
// The membrane is generated as the convex hull of a point cloud made of the
// cell's structural cytoskeleton nodes plus its internal organelles. The hull
// gives two properties the naive radial blob lacked:
//   1. Organelles drifting near the wall push the boundary outward (bulges).
//   2. The boundary can never collapse inward or self-intersect on a sharp
//      turn — an inward-pushed node simply drops off the hull.
// (The blueprint suggested Jarvis March; Monotone Chain is the same result in
// O(n log n) and is simpler to keep numerically robust.)

export type Pt = { x: number; y: number };

const cross = (o: Pt, a: Pt, b: Pt) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

// Andrew's monotone chain. Returns hull vertices counter-clockwise.
export function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);

  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Distance from the origin (assumed inside `hull`) to the hull boundary along
// direction `angle`. Used to resample the hull into a fixed set of evenly
// spaced membrane radii, which the spline then smooths. Returns 0 if no edge
// is hit (degenerate hull) so callers can fall back to a base radius.
export function hullRadiusAtAngle(hull: Pt[], angle: number): number {
  if (hull.length < 2) return 0;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = 0;

  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    // Solve origin + t*d = a + s*e for the forward ray (t > 0), s in [0,1].
    const det = ex * dy - ey * dx;
    if (Math.abs(det) < 1e-9) continue;
    const t = (ex * a.y - ey * a.x) / det;
    const s = (dx * a.y - dy * a.x) / det;
    if (t > 0 && s >= -0.001 && s <= 1.001) {
      // Origin is inside a convex polygon, so the forward ray exits through
      // exactly one edge — the first positive hit.
      if (best === 0 || t < best) best = t;
    }
  }
  return best;
}
