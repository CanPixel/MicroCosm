// Canvas helpers shared by every organism drawer. All drawing happens in a
// local frame placed with setTransform (no save/restore churn), where +x is
// the organism's facing direction and units are world units.

export type Xf = { s: number; ox: number; oy: number };

export type DrawCtx = {
  ctx: CanvasRenderingContext2D;
  ectx: CanvasRenderingContext2D;
  xf: Xf;
  exf: Xf;
  t: number;
  ppu: number; // screen pixels per world unit
  fluor: number;
  dark: number;
  electron: number;
  // Opacity for hidden agents (prions, viroids...) under the current light.
  hiddenAlpha: number;
  patterns: Patterns;
};

export type Patterns = {
  cyto: CanvasPattern | null;
  shell: CanvasPattern | null;
  tumor: CanvasPattern | null;
  pollen: CanvasPattern | null;
};

export type EntityLook = {
  alpha: number;
  danger: boolean;
  edible: boolean;
  lod: number; // radius in screen pixels
};

export function place(ctx: CanvasRenderingContext2D, xf: Xf, x: number, y: number, angle = 0, k = 1) {
  const s = xf.s * k;
  const c = Math.cos(angle) * s;
  const si = Math.sin(angle) * s;
  ctx.setTransform(c, si, -si, c, xf.s * x + xf.ox, xf.s * y + xf.oy);
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}

// Closed Catmull-Rom spline through points given as parallel arrays.
export function smoothClosed(ctx: CanvasRenderingContext2D, xs: ArrayLike<number>, ys: ArrayLike<number>, n: number) {
  if (n < 3) return;
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 0; i < n; i++) {
    const i0 = (i - 1 + n) % n;
    const i2 = (i + 1) % n;
    const i3 = (i + 2) % n;
    const c1x = xs[i] + (xs[i2] - xs[i0]) / 6;
    const c1y = ys[i] + (ys[i2] - ys[i0]) / 6;
    const c2x = xs[i2] - (xs[i3] - xs[i]) / 6;
    const c2y = ys[i2] - (ys[i3] - ys[i]) / 6;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, xs[i2], ys[i2]);
  }
  ctx.closePath();
}

const BX = new Float32Array(64);
const BY = new Float32Array(64);

// Organic blob: a smooth closed outline with seeded lobes and slow breathing.
export function blob(
  ctx: CanvasRenderingContext2D, r: number, seed: number, t: number, wobble = 0.12, lobes = 5, n = 22, sx = 1, sy = 1,
) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 1
      + wobble * Math.sin(a * lobes + seed + t * 0.9)
      + wobble * 0.5 * Math.sin(a * (lobes + 2) - seed * 1.7 - t * 1.3);
    BX[i] = Math.cos(a) * r * w * sx;
    BY[i] = Math.sin(a) * r * w * sy;
  }
  smoothClosed(ctx, BX, BY, n);
}

export function capsule(ctx: CanvasRenderingContext2D, halfLen: number, r: number) {
  const L = Math.max(0, halfLen - r);
  ctx.moveTo(-L, -r);
  ctx.lineTo(L, -r);
  ctx.arc(L, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-L, r);
  ctx.arc(-L, 0, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
}

// Flat Kurzgesagt shading inside the current path: a darker crescent on the
// lower-right and a soft highlight on the upper-left. Expects the body path to
// be the current path; leaves it intact for stroking.
export function flatShade(ctx: CanvasRenderingContext2D, r: number, shadow: string, highlight: string, angle: number) {
  ctx.save();
  ctx.clip();
  // Light comes from the screen's upper-left regardless of facing.
  const la = -angle - Math.PI * 0.75;
  ctx.fillStyle = shadow;
  ctx.beginPath();
  circle(ctx, -Math.cos(la) * r * 0.55, -Math.sin(la) * r * 0.55, r * 1.25);
  ctx.rect(-r * 4, -r * 4, r * 8, r * 8);
  ctx.fill('evenodd');
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ellipse(ctx, Math.cos(la) * r * 0.42, Math.sin(la) * r * 0.42, r * 0.32, r * 0.2, la + Math.PI / 2);
  ctx.fill();
  ctx.restore();
}

export function rgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function setPatternScale(p: CanvasPattern | null, scale: number, ox = 0, oy = 0) {
  if (!p || typeof DOMMatrix === 'undefined') return;
  p.setTransform(new DOMMatrix([scale, 0, 0, scale, ox, oy]));
}
