import type { Entity } from './types';

// Uniform grid rebuilt each frame. Buckets are reused to avoid GC churn.
export class SpatialHash {
  private buckets = new Map<number, Entity[]>();
  private active: Entity[][] = [];

  constructor(readonly cell: number) {}

  private key(ix: number, iy: number) {
    return (ix + 32768) * 65536 + (iy + 32768);
  }

  clear() {
    for (const bucket of this.active) bucket.length = 0;
    this.active.length = 0;
    // Occasionally drop empty buckets so far-away cells don't accumulate.
    if (this.buckets.size > 4096) this.buckets.clear();
  }

  insert(e: Entity) {
    const ix = Math.floor(e.x / this.cell);
    const iy = Math.floor(e.y / this.cell);
    const k = this.key(ix, iy);
    let bucket = this.buckets.get(k);
    if (!bucket) {
      bucket = [];
      this.buckets.set(k, bucket);
    }
    if (bucket.length === 0) this.active.push(bucket);
    bucket.push(e);
  }

  // Calls fn for every entity whose bucket overlaps the query circle. Callers
  // still do exact distance checks. Return true from fn to stop early.
  query(x: number, y: number, r: number, fn: (e: Entity) => boolean | void) {
    const x0 = Math.floor((x - r) / this.cell);
    const x1 = Math.floor((x + r) / this.cell);
    const y0 = Math.floor((y - r) / this.cell);
    const y1 = Math.floor((y + r) / this.cell);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        const bucket = this.buckets.get(this.key(ix, iy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const e = bucket[i];
          if (e.dead) continue;
          if (fn(e) === true) return;
        }
      }
    }
  }

  nearest(x: number, y: number, r: number, filter: (e: Entity) => boolean): Entity | null {
    let best: Entity | null = null;
    let bestD = r * r;
    this.query(x, y, r, (e) => {
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD && filter(e)) {
        bestD = d;
        best = e;
      }
    });
    return best;
  }
}
