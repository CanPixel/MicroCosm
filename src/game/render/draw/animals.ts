import { FLUOR } from '../palette';
import type { Entity } from '../../sim/types';
import { dangerGlow, edibleHint, fluorTags, rimColor } from './microbes';
import { circle, ellipse, flatShade, place, type DrawCtx, type EntityLook } from './util';

const LX = new Float32Array(32);
const LY = new Float32Array(32);
const RX = new Float32Array(32);
const RY = new Float32Array(32);

export function drawGastrotrich(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  const n = 14;
  const len = r * 2.5;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const swim = Math.hypot(e.vx, e.vy) > 10 ? 1 : 0.4;
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1); // 0 = head, 1 = tail
    const x = len / 2 - s * len;
    const y = Math.sin(dc.t * 4 * swim - s * 4 + e.seed) * r * 0.12 * s;
    const w = r * (s < 0.15 ? 0.36 + s * 1.2 : 0.52 - (s - 0.15) * 0.45);
    LX[i] = x;
    LY[i] = y - w;
    RX[i] = x;
    RY[i] = y + w;
  }
  // Cat-whisker bristles.
  if (look.lod > 6) {
    ctx.strokeStyle = 'rgba(240,250,220,0.75)';
    ctx.lineWidth = r * 0.025;
    ctx.beginPath();
    for (let i = 1; i < n - 2; i++) {
      for (const [xs, ys, sign] of [
        [LX, LY, -1],
        [RX, RY, 1],
      ] as const) {
        ctx.moveTo(xs[i], ys[i]);
        ctx.lineTo(xs[i] - r * 0.3, ys[i] + sign * r * 0.22);
      }
    }
    // Sensory whiskers on the head.
    for (const sign of [-1, 1]) {
      ctx.moveTo(LX[0] - r * 0.05, sign * r * 0.25);
      ctx.lineTo(LX[0] + r * 0.45, sign * r * 0.55);
    }
    ctx.stroke();
  }
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(LX[0], LY[0]);
    for (let i = 1; i < n; i++) ctx.lineTo(LX[i], LY[i]);
    // Forked tail (furca).
    const tx = LX[n - 1];
    const ty = (LY[n - 1] + RY[n - 1]) / 2;
    ctx.lineTo(tx - r * 0.35, ty - r * 0.32);
    ctx.lineTo(tx - r * 0.05, ty);
    ctx.lineTo(tx - r * 0.35, ty + r * 0.32);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(RX[i], RY[i]);
    // Three-lobed head.
    ctx.quadraticCurveTo(LX[0] + r * 0.35, r * 0.3, LX[0] + r * 0.3, 0);
    ctx.quadraticCurveTo(LX[0] + r * 0.35, -r * 0.3, LX[0], LY[0]);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = 'rgba(222,240,178,0.88)';
  ctx.fill();
  if (look.lod > 6) {
    flatShade(ctx, r * 1.3, 'rgba(80,110,30,0.25)', 'rgba(255,255,240,0.4)', e.angle);
    // Gut.
    ctx.strokeStyle = 'rgba(170,190,80,0.8)';
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 2; i < n - 2; i++) {
      const y = (LY[i] + RY[i]) / 2;
      if (i === 2) ctx.moveTo(LX[i], y);
      else ctx.lineTo(LX[i], y);
    }
    ctx.stroke();
  }
  body();
  ctx.lineWidth = r * 0.06;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rimColor(look, '#f5ffe0', e);
  ctx.stroke();
  fluorTags(dc, e, look, r * 1.1, r * 0.6, r * 0.2);
  edibleHint(dc, e, look, r * 1.3);
}

export function drawRotifer(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  // Foot and toes at the rear.
  ctx.strokeStyle = 'rgba(235,228,205,0.85)';
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const sway = Math.sin(dc.t * 1.5 + e.seed) * r * 0.15;
  ctx.moveTo(-r * 0.85, 0);
  ctx.quadraticCurveTo(-r * 1.3, sway, -r * 1.6, sway * 1.5);
  ctx.stroke();
  // Corona: two ciliated wheels, spinning when feeding.
  const spin = dc.t * (4 + e.reach * 8);
  for (const cy of [-r * 0.42, r * 0.42]) {
    ctx.beginPath();
    circle(ctx, r * 0.95, cy, r * 0.3);
    ctx.fillStyle = 'rgba(245,240,225,0.55)';
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,245,${0.5 + e.reach * 0.4})`;
    ctx.lineWidth = r * 0.035;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + spin * (cy > 0 ? 1 : -1);
      ctx.moveTo(r * 0.95 + Math.cos(a) * r * 0.28, cy + Math.sin(a) * r * 0.28);
      ctx.lineTo(r * 0.95 + Math.cos(a + 0.3) * r * 0.48, cy + Math.sin(a + 0.3) * r * 0.48);
    }
    ctx.stroke();
  }
  // Lorica: the vase-shaped armor with anterior and posterior spines.
  const lorica = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 0.62);
    ctx.lineTo(r * 1.25, -r * 0.82);
    ctx.lineTo(r * 0.92, -r * 0.42);
    ctx.lineTo(r * 1.12, -r * 0.18);
    ctx.lineTo(r * 0.9, 0);
    ctx.lineTo(r * 1.12, r * 0.18);
    ctx.lineTo(r * 0.92, r * 0.42);
    ctx.lineTo(r * 1.25, r * 0.82);
    ctx.lineTo(r * 0.85, r * 0.62);
    ctx.bezierCurveTo(r * 0.2, r * 1.05, -r * 0.7, r * 0.75, -r * 0.95, r * 0.42);
    ctx.lineTo(-r * 1.45, r * 0.62);
    ctx.lineTo(-r * 0.92, r * 0.12);
    ctx.lineTo(-r * 0.92, -r * 0.12);
    ctx.lineTo(-r * 1.45, -r * 0.62);
    ctx.lineTo(-r * 0.95, -r * 0.42);
    ctx.bezierCurveTo(-r * 0.7, -r * 0.75, r * 0.2, -r * 1.05, r * 0.85, -r * 0.62);
    ctx.closePath();
  };
  lorica();
  ctx.fillStyle = 'rgba(238,232,212,0.62)';
  ctx.fill();
  if (look.lod > 6) {
    flatShade(ctx, r * 1.2, 'rgba(110,90,50,0.22)', 'rgba(255,255,250,0.35)', e.angle);
    // Gut glowing with ingested algae, as seen under darkfield.
    ctx.beginPath();
    ellipse(ctx, -r * 0.2, 0, r * 0.45, r * 0.35);
    ctx.fillStyle = 'rgba(214,190,60,0.85)';
    ctx.fill();
    // Mastax: a grinding jaw.
    const grind = Math.sin(dc.t * 9) * r * 0.06;
    ctx.fillStyle = '#c9a4ff';
    ctx.beginPath();
    ellipse(ctx, r * 0.35, -r * 0.1 - grind, r * 0.16, r * 0.1, 0.4);
    ellipse(ctx, r * 0.35, r * 0.1 + grind, r * 0.16, r * 0.1, -0.4);
    ctx.fill();
    ctx.beginPath();
    circle(ctx, r * 0.68, -r * 0.05, r * 0.07);
    ctx.fillStyle = '#ff3030';
    ctx.fill();
  }
  lorica();
  ctx.lineWidth = r * 0.05;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rimColor(look, '#fffaf0', e);
  ctx.stroke();
  dangerGlow(dc, e, look, r * 1.2);
  fluorTags(dc, e, look, r * 1.05, -r * 0.2, r * 0.22);
  edibleHint(dc, e, look, r * 1.4);
}

export function drawHydra(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const reachMax = r * 3.4;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const mx = r * 0.75;
  const tentacle = (a: number, len: number, wiggle: number, width: number) => {
    const tx = mx + Math.cos(a) * len;
    const ty = Math.sin(a) * len;
    const cx = mx + Math.cos(a) * len * 0.5 - Math.sin(a) * wiggle;
    const cy = Math.sin(a) * len * 0.5 + Math.cos(a) * wiggle;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rimColor(look, '#b7f5a8', e);
    ctx.lineWidth = width * 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, 0);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();
    ctx.strokeStyle = '#5bc46b';
    ctx.lineWidth = width;
    ctx.stroke();
    // Nematocyst batteries.
    if (look.lod > 10) {
      ctx.fillStyle = 'rgba(245,255,235,0.9)';
      ctx.beginPath();
      for (let k = 1; k <= 5; k++) {
        const s = k / 6;
        const bx = (1 - s) * (1 - s) * mx + 2 * (1 - s) * s * cx + s * s * tx;
        const by = 2 * (1 - s) * s * cy + s * s * ty;
        circle(ctx, bx, by, width * 0.45);
      }
      ctx.fill();
    }
  };
  const rel = e.reachAngle - e.angle;
  for (let i = 0; i < 6; i++) {
    const base = (i - 2.5) * 0.42;
    const sway = Math.sin(dc.t * 0.9 + i * 1.3 + e.seed) * 0.25;
    const active = i === 2 && e.state === 1;
    const capturing = i === 2 && e.reach > 0.45 && e.state !== 1;
    const a = active || capturing ? rel : base + sway;
    const len = active || capturing ? Math.max(r * 0.6, e.reach * reachMax) : r * (1.3 + 0.35 * Math.sin(dc.t * 0.7 + i));
    tentacle(a, len, Math.sin(dc.t * 1.7 + i) * r * 0.35, r * 0.11);
  }
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(mx, -r * 0.32);
    ctx.bezierCurveTo(0, -r * 0.42, -r * 0.9, -r * 0.28, -r * 1.25, -r * 0.2);
    ctx.lineTo(-r * 1.4, -r * 0.34);
    ctx.lineTo(-r * 1.5, 0);
    ctx.lineTo(-r * 1.4, r * 0.34);
    ctx.lineTo(-r * 1.25, r * 0.2);
    ctx.bezierCurveTo(-r * 0.9, r * 0.28, 0, r * 0.42, mx, r * 0.32);
    ctx.quadraticCurveTo(mx + r * 0.25, 0, mx, -r * 0.32);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = '#48b85a';
  ctx.fill();
  if (look.lod > 6) {
    flatShade(ctx, r, 'rgba(10,70,20,0.3)', 'rgba(220,255,210,0.35)', e.angle);
    // Symbiotic Chlorella speckle the gastrodermis.
    ctx.fillStyle = '#2b8f3c';
    ctx.beginPath();
    for (let i = 0; i < 14; i++) circle(ctx, -r * 1.1 + i * r * 0.14, Math.sin(i * 2.1) * r * 0.16, r * 0.05);
    ctx.fill();
  }
  body();
  ctx.lineWidth = r * 0.05;
  ctx.strokeStyle = rimColor(look, '#c9ffbf', e);
  ctx.stroke();
  if (dc.fluor > 0.02) {
    place(ectx, dc.exf, e.x, e.y, e.angle);
    ectx.globalAlpha = dc.fluor * look.alpha * 0.8;
    ectx.fillStyle = FLUOR.chloro;
    ectx.beginPath();
    ellipse(ectx, -r * 0.3, 0, r * 0.9, r * 0.25);
    ectx.fill();
  }
  dangerGlow(dc, e, look, r * 1.6);
}

export function drawCollotheca(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const close = e.reach;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const rimW = r * (0.9 - close * 0.65);
  // Long setae fan out from the funnel rim. Faint in brightfield, vivid in darkfield.
  const setaeAlpha = 0.18 + dc.dark * 0.6;
  ctx.strokeStyle = `rgba(235,245,255,${setaeAlpha})`;
  ctx.lineWidth = r * 0.018;
  ctx.beginPath();
  for (let i = 0; i < 18; i++) {
    const s = i / 17 - 0.5;
    const y0 = s * rimW * 2;
    const a = s * (2.2 - close * 2) + Math.sin(dc.t * 0.8 + i) * 0.05;
    const L = r * (1.3 + 0.2 * Math.sin(i * 1.7));
    ctx.moveTo(r * 0.9, y0);
    ctx.lineTo(r * 0.9 + Math.cos(a) * L, y0 + Math.sin(a) * L);
  }
  ctx.stroke();
  // Stalk.
  ctx.strokeStyle = 'rgba(220,230,240,0.7)';
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, 0);
  ctx.lineTo(-r * 1.4, Math.sin(dc.t * 0.4) * r * 0.1);
  ctx.stroke();
  const cup = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.18);
    ctx.bezierCurveTo(0, -r * 0.3, r * 0.5, -rimW * 0.8, r * 0.9, -rimW);
    ctx.lineTo(r * 0.9, rimW);
    ctx.bezierCurveTo(r * 0.5, rimW * 0.8, 0, r * 0.3, -r * 0.45, r * 0.18);
    ctx.closePath();
  };
  cup();
  ctx.fillStyle = 'rgba(215,232,250,0.35)';
  ctx.fill();
  ctx.beginPath();
  ellipse(ctx, -r * 0.15, 0, r * 0.25, r * 0.17);
  ctx.fillStyle = '#e98a4a';
  ctx.fill();
  cup();
  ctx.lineWidth = r * 0.04;
  ctx.strokeStyle = rimColor(look, 'rgba(240,248,255,0.8)', e);
  ctx.stroke();
  // In darkfield the whole funnel glows; the trap becomes obvious.
  place(ectx, dc.exf, e.x, e.y, e.angle);
  ectx.globalAlpha = look.alpha * (0.12 + dc.dark * 0.5);
  ectx.strokeStyle = '#dfefff';
  ectx.lineWidth = r * 0.06;
  ectx.beginPath();
  ectx.moveTo(r * 0.9, -rimW);
  ectx.lineTo(r * 0.9, rimW);
  ectx.stroke();
  dangerGlow(dc, e, look, r * 1.2);
  edibleHint(dc, e, look, r * 1.2);
}

export function drawTardigrade(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const walk = dc.t * 5 + e.seed;
  // Four pairs of stubby legs, tipped with claws, stepping in a wave.
  for (let i = 0; i < 4; i++) {
    const x = r * 0.62 - i * r * 0.46;
    for (const side of [-1, 1]) {
      const swing = Math.sin(walk + i * 1.6 + (side > 0 ? Math.PI : 0)) * r * 0.1;
      const lx = x + swing;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#d9875e';
      ctx.lineWidth = r * 0.26;
      ctx.beginPath();
      ctx.moveTo(x, side * r * 0.35);
      ctx.lineTo(lx, side * r * 0.66);
      ctx.stroke();
      ctx.strokeStyle = '#fff3e6';
      ctx.lineWidth = r * 0.035;
      ctx.beginPath();
      for (let c = -1; c <= 1; c++) {
        ctx.moveTo(lx + c * r * 0.05, side * r * 0.76);
        ctx.quadraticCurveTo(lx + c * r * 0.07, side * r * 0.86, lx + c * r * 0.07 - r * 0.06, side * r * 0.9);
      }
      ctx.stroke();
    }
  }
  // One plump body with gentle segment bulges and a rounded head.
  const n = 28;
  const body = () => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a);
      const seg = 1 + 0.07 * Math.cos(x * Math.PI * 3.5);
      const head = x > 0.55 ? 1 - (x - 0.55) * 0.35 : 1;
      const px = Math.cos(a) * r * 1.25;
      const py = Math.sin(a) * r * 0.6 * seg * head;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  body();
  ctx.fillStyle = '#f4b183';
  ctx.fill();
  flatShade(ctx, r * 1.15, 'rgba(160,70,30,0.25)', 'rgba(255,248,236,0.45)', e.angle);
  // Segment creases.
  ctx.strokeStyle = 'rgba(176,90,52,0.45)';
  ctx.lineWidth = r * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = r * 0.45 - i * r * 0.46;
    ctx.moveTo(x, -r * 0.5);
    ctx.quadraticCurveTo(x - r * 0.12, 0, x, r * 0.5);
  }
  ctx.stroke();
  // Face: eyespots and the stylet mouth.
  ctx.fillStyle = '#4a2235';
  ctx.beginPath();
  circle(ctx, r * 0.95, -r * 0.18, r * 0.05);
  circle(ctx, r * 0.95, r * 0.18, r * 0.05);
  ctx.fill();
  ctx.beginPath();
  ellipse(ctx, r * 1.2, 0, r * 0.08, r * 0.1);
  ctx.fillStyle = '#c4664f';
  ctx.fill();
  body();
  ctx.lineWidth = r * 0.05;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rimColor(look, '#fff0e2', e);
  ctx.stroke();
}
