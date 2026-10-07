import { FLUOR, PAL } from '../palette';
import type { Entity } from '../../sim/types';
import { dangerGlow, edibleHint, fluorTags, rimColor } from './microbes';
import { circle, ellipse, flatShade, hash, place, setPatternScale, smoothClosed, type DrawCtx, type EntityLook } from './util';

const XS = new Float32Array(64);
const YS = new Float32Array(64);

function cilia(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  n: number,
  len: number,
  t: number,
  color: string,
  width: number,
  step = 1,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < n; i += step) {
    const i0 = (i - 1 + n) % n;
    const i1 = (i + 1) % n;
    let nx = ys[i1] - ys[i0];
    let ny = -(xs[i1] - xs[i0]);
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    const beat = Math.sin(t * 10 - i * 0.7) * 0.6;
    ctx.moveTo(xs[i], ys[i]);
    ctx.lineTo(xs[i] + (nx + ny * beat * 0.5) * len, ys[i] + (ny - nx * beat * 0.5) * len);
  }
  ctx.stroke();
}

export function drawDiatom(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const centric = hash(e.seed) > 0.62;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const shell = () => {
    ctx.beginPath();
    if (centric) circle(ctx, 0, 0, r);
    else {
      const L = r * 1.55;
      const W = r * 0.58;
      ctx.moveTo(-L, 0);
      ctx.bezierCurveTo(-L * 0.5, -W * 1.35, L * 0.5, -W * 1.35, L, 0);
      ctx.bezierCurveTo(L * 0.5, W * 1.35, -L * 0.5, W * 1.35, -L, 0);
      ctx.closePath();
    }
  };
  shell();
  ctx.fillStyle = 'rgba(205,255,248,0.32)';
  ctx.fill();
  // Golden-brown chloroplasts (fucoxanthin) behind the glass.
  ctx.fillStyle = '#d29a35';
  ctx.beginPath();
  if (centric) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + e.seed;
      ellipse(ctx, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.22, r * 0.13, a);
    }
  } else {
    ellipse(ctx, 0, -r * 0.24, r * 1.0, r * 0.16);
    ellipse(ctx, 0, r * 0.24, r * 1.0, r * 0.16);
  }
  ctx.fill();
  if (look.lod > 9) {
    ctx.strokeStyle = 'rgba(230,255,252,0.55)';
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    if (centric) {
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
        ctx.lineTo(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93);
      }
    } else {
      for (let i = -9; i <= 9; i++) {
        const x = i * r * 0.15;
        const h = r * 0.55 * Math.sqrt(Math.max(0, 1 - (x / (r * 1.55)) ** 2));
        ctx.moveTo(x, -h);
        ctx.lineTo(x, h);
      }
      ctx.moveTo(-r * 1.3, 0);
      ctx.lineTo(r * 1.3, 0);
    }
    ctx.stroke();
  }
  shell();
  ctx.lineWidth = r * 0.09;
  ctx.strokeStyle = rimColor(look, '#e6fffb', e);
  ctx.stroke();
  // Glass glint.
  place(ectx, dc.exf, e.x, e.y, e.angle);
  ectx.globalAlpha = look.alpha * (0.25 + dc.dark * 0.5);
  ectx.strokeStyle = '#d8fff8';
  ectx.lineWidth = r * 0.1;
  ectx.beginPath();
  if (centric) ectx.arc(0, 0, r, 3.6, 4.6);
  else ectx.arc(0, r * 0.6, r * 1.2, 3.7, 5.2);
  ectx.stroke();
  if (dc.fluor > 0.02) {
    ectx.globalAlpha = dc.fluor * look.alpha;
    ectx.fillStyle = FLUOR.chloro;
    ectx.beginPath();
    ellipse(ectx, 0, 0, r * (centric ? 0.7 : 1.1), r * (centric ? 0.7 : 0.35));
    ectx.fill();
  }
  edibleHint(dc, e, look, r * 1.3);
}

export function drawEuglena(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const squish = 1 + Math.sin(dc.t * 2.2 + e.seed) * 0.08; // euglenoid "metaboly"
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  // Flagellum beating from the front reservoir.
  ctx.strokeStyle = '#e9ffe6';
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const s = i / 14;
    const x = r * 1.25 + s * r * 2.4;
    const y = Math.sin(dc.t * 11 - s * 7 + e.seed) * r * 0.35 * s;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const body = () => {
    ctx.beginPath();
    const L = r * 1.6;
    const W = (r * 0.52) / squish;
    ctx.moveTo(L * 0.85, 0);
    ctx.bezierCurveTo(L * 0.85, -W * 1.2, -L * 0.2, -W * 1.25, -L, 0);
    ctx.bezierCurveTo(-L * 0.2, W * 1.25, L * 0.85, W * 1.2, L * 0.85, 0);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = '#54d65e';
  ctx.fill();
  if (look.lod > 6) {
    flatShade(ctx, r, 'rgba(10,80,30,0.3)', 'rgba(230,255,200,0.4)', e.angle);
    ctx.fillStyle = '#2f9e44';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) ellipse(ctx, -r * 0.8 + i * r * 0.28, (i % 2 ? 1 : -1) * r * 0.16, r * 0.15, r * 0.09, 0.5);
    ctx.fill();
    // Pellicle strips spiral down the body.
    ctx.strokeStyle = 'rgba(20,90,40,0.45)';
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = -r * 1.1 + i * r * 0.4;
      ctx.moveTo(x, -r * 0.5);
      ctx.quadraticCurveTo(x + r * 0.2, 0, x + r * 0.05, r * 0.5);
    }
    ctx.stroke();
  }
  // Red eyespot (stigma) shading the photoreceptor.
  ctx.beginPath();
  circle(ctx, r * 0.95, -r * 0.14, r * 0.13);
  ctx.fillStyle = '#ff3b3b';
  ctx.fill();
  body();
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = rimColor(look, '#c8ffb8', e);
  ctx.stroke();
  place(ectx, dc.exf, e.x, e.y, e.angle);
  ectx.globalAlpha = look.alpha * 0.8;
  ectx.fillStyle = '#ff5050';
  ectx.beginPath();
  circle(ectx, r * 0.95, -r * 0.14, r * 0.2);
  ectx.fill();
  if (dc.fluor > 0.02) {
    ectx.globalAlpha = dc.fluor * look.alpha;
    ectx.fillStyle = FLUOR.chloro;
    ectx.beginPath();
    ellipse(ectx, -r * 0.1, 0, r * 1.1, r * 0.35);
    ectx.fill();
  }
  fluorTags(dc, e, look, r * 1.2, -r * 0.2, r * 0.25);
  edibleHint(dc, e, look, r * 1.4);
}

export function drawParamecium(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  const n = 30;
  const L = r * 1.55;
  const W = r * 0.62;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // Slipper: blunt front, wider rear, oral groove dent on one side.
    const groove = a > 0.6 && a < 1.6 ? 0.18 * Math.sin(((a - 0.6) / 1.0) * Math.PI) : 0;
    const taper = 1 - 0.18 * Math.cos(a);
    XS[i] = Math.cos(a) * L;
    YS[i] = Math.sin(a) * W * taper * (1 - groove);
  }
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  if (look.lod > 5) cilia(ctx, XS, YS, n, r * 0.22, dc.t + e.seed, 'rgba(225,245,255,0.8)', r * 0.04);
  ctx.beginPath();
  smoothClosed(ctx, XS, YS, n);
  ctx.fillStyle = 'rgba(150,205,255,0.82)';
  ctx.fill();
  if (look.lod > 6) {
    flatShade(ctx, r * 1.2, 'rgba(30,70,140,0.25)', 'rgba(255,255,255,0.35)', e.angle);
    // Macronucleus.
    ctx.beginPath();
    ellipse(ctx, -r * 0.1, r * 0.05, r * 0.42, r * 0.22, 0.2);
    ctx.fillStyle = '#b8a6ff';
    ctx.fill();
    // Food vacuoles.
    ctx.beginPath();
    for (let i = 0; i < 4; i++) circle(ctx, -r * 0.7 + i * r * 0.35, (i % 2 ? -1 : 1) * r * 0.22, r * 0.09);
    ctx.fillStyle = '#ffb36b';
    ctx.fill();
    // Contractile vacuoles with radial canals, pulsing.
    for (const cx of [-r * 0.85, r * 0.8]) {
      const pulse = 0.6 + 0.4 * Math.sin(dc.t * 3 + cx + e.seed);
      ctx.strokeStyle = 'rgba(235,250,255,0.85)';
      ctx.lineWidth = r * 0.035;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx + Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
      }
      ctx.stroke();
      ctx.beginPath();
      circle(ctx, cx, 0, r * 0.09 * pulse);
      ctx.fillStyle = 'rgba(245,252,255,0.95)';
      ctx.fill();
    }
    // Oral groove.
    ctx.strokeStyle = 'rgba(60,110,190,0.6)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(r * 1.1, r * 0.3);
    ctx.quadraticCurveTo(r * 0.4, r * 0.5, r * 0.05, r * 0.15);
    ctx.stroke();
  }
  ctx.beginPath();
  smoothClosed(ctx, XS, YS, n);
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = rimColor(look, '#eaf7ff', e);
  ctx.stroke();
  fluorTags(dc, e, look, r * 1.3, -r * 0.1, r * 0.3);
  edibleHint(dc, e, look, r * 1.5);
}

export function drawDidinium(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const charging = e.state === 2 ? 1 : e.state === 1 ? 0.5 : 0;
  // Proboscis snout, extended while lunging.
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -r * 0.22);
  ctx.lineTo(r * (1.25 + charging * 0.45), 0);
  ctx.lineTo(r * 0.8, r * 0.22);
  ctx.closePath();
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.beginPath();
  ellipse(ctx, 0, 0, r * 0.95, r * 0.82);
  ctx.fillStyle = '#ff8f3d';
  ctx.fill();
  if (look.lod > 5) flatShade(ctx, r, 'rgba(140,40,0,0.3)', 'rgba(255,240,200,0.4)', e.angle);
  // Two girdles of cilia.
  if (look.lod > 5) {
    ctx.strokeStyle = 'rgba(255,240,215,0.9)';
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    for (const gx of [r * 0.35, -r * 0.35]) {
      for (let i = 0; i < 9; i++) {
        const y = -r * 0.8 + (i / 8) * r * 1.6;
        const h = Math.sqrt(Math.max(0, 1 - (y / (r * 0.82)) ** 2)) * r * 0.08;
        const beat = Math.sin(dc.t * 14 + i) * r * 0.12;
        ctx.moveTo(gx, y);
        ctx.lineTo(gx - r * 0.25 - h + beat, y);
      }
    }
    ctx.stroke();
  }
  ctx.beginPath();
  ellipse(ctx, 0, 0, r * 0.95, r * 0.82);
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = rimColor(look, '#ffe1c0', e);
  ctx.stroke();
  dangerGlow(dc, e, look, r);
  fluorTags(dc, e, look, r, 0, r * 0.3);
  edibleHint(dc, e, look, r * 1.2);
}

export function drawLacrymaria(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const neckLen = r * 6.5;
  const rel = e.reachAngle - e.angle;
  const ext = r * 0.8 + e.reach * neckLen;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  // The neck: a tapered, slightly sinuous tube; it coils while aiming.
  const coil = e.state === 1 ? 1 : 0;
  const tipX = Math.cos(rel) * ext;
  const tipY = Math.sin(rel) * ext;
  const midX = Math.cos(rel) * ext * 0.5 + Math.sin(dc.t * 3 + e.seed) * r * (0.6 + coil * 1.2);
  const midY = Math.sin(rel) * ext * 0.5 + Math.cos(dc.t * 2.4 + e.seed) * r * (0.6 + coil * 1.2);
  ctx.lineCap = 'round';
  ctx.strokeStyle = rimColor(look, '#ffd6ec', e);
  ctx.lineWidth = r * 0.34;
  ctx.beginPath();
  ctx.moveTo(r * 0.6, 0);
  ctx.quadraticCurveTo(midX, midY, tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = '#ff9ccf';
  ctx.lineWidth = r * 0.2;
  ctx.stroke();
  // Head with its oral cilia crown.
  ctx.beginPath();
  circle(ctx, tipX, tipY, r * 0.24);
  ctx.fillStyle = '#ffe3f1';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,250,0.9)';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + dc.t * 4;
    ctx.moveTo(tipX + Math.cos(a) * r * 0.22, tipY + Math.sin(a) * r * 0.22);
    ctx.lineTo(tipX + Math.cos(a) * r * 0.42, tipY + Math.sin(a) * r * 0.42);
  }
  ctx.stroke();
  // Teardrop body.
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);
    ctx.bezierCurveTo(r * 0.4, -r * 0.9, -r * 1.1, -r * 0.85, -r * 1.05, 0);
    ctx.bezierCurveTo(-r * 1.1, r * 0.85, r * 0.4, r * 0.9, r * 0.7, 0);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = '#ff8fc6';
  ctx.fill();
  if (look.lod > 5) {
    flatShade(ctx, r, 'rgba(130,20,70,0.3)', 'rgba(255,240,250,0.4)', e.angle);
    ctx.strokeStyle = 'rgba(255,220,240,0.6)';
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(r * 0.6, i * r * 0.12);
      ctx.quadraticCurveTo(-r * 0.3, i * r * 0.32, -r * 1, i * r * 0.1);
    }
    ctx.stroke();
  }
  body();
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = rimColor(look, '#ffe0f0', e);
  ctx.stroke();
  // Telegraph: the coiled neck flushes red right before the strike.
  if (e.state === 1 || e.state === 2) {
    place(ectx, dc.exf, e.x, e.y, e.angle);
    ectx.globalAlpha = look.alpha * (e.state === 1 ? 0.5 + 0.5 * Math.sin(dc.t * 30) : 0.9);
    ectx.strokeStyle = PAL.danger;
    ectx.lineWidth = r * 0.4;
    ectx.lineCap = 'round';
    ectx.beginPath();
    ectx.moveTo(r * 0.6, 0);
    ectx.quadraticCurveTo(midX, midY, tipX, tipY);
    ectx.stroke();
  }
  dangerGlow(dc, e, look, r);
  fluorTags(dc, e, look, r, -r * 0.2, r * 0.3);
  edibleHint(dc, e, look, r * 1.3);
}

export function drawAmoeba(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  const n = 34;
  const lead = e.reachAngle - e.angle;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let w = 0.82;
    // Several lobose pseudopods; the leading one points along the crawl.
    for (let k = 0; k < 4; k++) {
      const pa = k === 0 ? lead : e.seed * (k + 1) + Math.sin(dc.t * 0.3 + k) * 0.8;
      const d = Math.atan2(Math.sin(a - pa), Math.cos(a - pa));
      const ext = (k === 0 ? 0.32 : 0.16) * (0.75 + 0.25 * Math.sin(dc.t * (0.7 + k * 0.2) + k + e.seed));
      w += ext * Math.exp(-(d * d) / 0.12);
    }
    w += 0.04 * Math.sin(a * 7 + dc.t * 1.4 + e.seed);
    XS[i] = Math.cos(a) * r * w;
    YS[i] = Math.sin(a) * r * w;
  }
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  ctx.beginPath();
  smoothClosed(ctx, XS, YS, n);
  ctx.fillStyle = 'rgba(150,185,220,0.86)';
  ctx.fill();
  if (look.lod > 10) {
    ctx.save();
    ctx.clip();
    setPatternScale(dc.patterns.cyto, r / 90, dc.t * 3, dc.t * 2);
    if (dc.patterns.cyto) {
      ctx.fillStyle = dc.patterns.cyto;
      ctx.globalAlpha = look.alpha * 0.45;
      ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
      ctx.globalAlpha = look.alpha;
    }
    // Endoplasm granules streaming toward the leading pseudopod.
    ctx.fillStyle = 'rgba(70,95,140,0.35)';
    ctx.beginPath();
    ellipse(ctx, 0, 0, r * 0.6, r * 0.45);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const phase = (dc.t * 0.12 + hash(e.seed + i)) % 1;
      const a = lead + (hash(i * 7 + e.seed) - 0.5) * 2.4;
      const d = r * (phase * 0.9 - 0.2);
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * 0.025);
    }
    ctx.fill();
    // Food vacuoles: green algae and red-brown morsels, like the classic plate.
    const colors = ['#45c45a', '#c7552b', '#a8471f', '#ffd0d0', '#e0743a'];
    for (let i = 0; i < 5; i++) {
      const a = e.seed * 3 + i * 1.3 + dc.t * 0.05;
      const d = r * (0.25 + 0.25 * hash(e.seed + i * 3));
      ctx.beginPath();
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.06 + 0.05 * hash(i + e.seed)));
      ctx.fillStyle = colors[i];
      ctx.fill();
    }
    // Nucleus and pulsing contractile vacuole.
    ctx.beginPath();
    ellipse(ctx, -r * 0.18, r * 0.1, r * 0.17, r * 0.13, 0.5);
    ctx.fillStyle = '#d7e3ff';
    ctx.fill();
    ctx.beginPath();
    circle(ctx, -r * 0.42, -r * 0.2, r * 0.11 * (0.5 + 0.5 * Math.abs(Math.sin(dc.t * 0.9 + e.seed))));
    ctx.fillStyle = 'rgba(240,250,255,0.8)';
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  smoothClosed(ctx, XS, YS, n);
  ctx.lineWidth = Math.max(r * 0.035, 1.6 / dc.ppu);
  ctx.strokeStyle = rimColor(look, '#eef7ff', e);
  ctx.stroke();
  dangerGlow(dc, e, look, r);
  fluorTags(dc, e, look, r * 0.95, -r * 0.18, r * 0.17);
  edibleHint(dc, e, look, r * 1.05);
}

export function drawTestate(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  // Pseudopods reach out of the aperture; lunge on a lash.
  ctx.fillStyle = 'rgba(200,225,255,0.85)';
  ctx.strokeStyle = rimColor(look, '#f2f8ff', e);
  ctx.lineWidth = r * 0.05;
  for (let i = -1; i <= 1; i++) {
    const lash = e.reach * (i === 0 ? 1 : 0.6);
    const a = i * 0.45 + Math.sin(dc.t * 1.3 + i + e.seed) * 0.15;
    const len = r * (0.45 + 0.25 * Math.sin(dc.t * 1.1 + i * 2) + lash * 0.9);
    const bx = r * 0.78;
    ctx.beginPath();
    ctx.moveTo(bx, Math.sin(a) * r * 0.2 - r * 0.12);
    ctx.quadraticCurveTo(bx + Math.cos(a) * len, Math.sin(a) * len - r * 0.15, bx + Math.cos(a) * len, Math.sin(a) * len);
    ctx.quadraticCurveTo(bx + Math.cos(a) * len, Math.sin(a) * len + r * 0.15, bx, Math.sin(a) * r * 0.2 + r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Domed shell (test) with its textured, armored surface.
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.fillStyle = '#b8742c';
  ctx.fill();
  if (look.lod > 8 && dc.patterns.shell) {
    ctx.save();
    ctx.clip();
    setPatternScale(dc.patterns.shell, r / 70, e.seed % 50, 0);
    ctx.fillStyle = dc.patterns.shell;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  flatShade(ctx, r, 'rgba(70,30,0,0.35)', 'rgba(255,230,180,0.35)', e.angle);
  // Aperture: the only vulnerable opening.
  ctx.beginPath();
  ellipse(ctx, r * 0.72, 0, r * 0.2, r * 0.32);
  ctx.fillStyle = '#3a1d0c';
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.lineWidth = r * 0.09;
  ctx.strokeStyle = rimColor(look, '#ffd59a', e);
  ctx.stroke();
  dangerGlow(dc, e, look, r * 1.1);
  edibleHint(dc, e, look, r * 1.2);
}

export function drawStentor(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const contract = e.aux2 > 0 ? 0.6 : 1;
  const L = r * 2.3 * contract;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  // Feeding vortex in front of the oral disc.
  if (e.reach > 0.05 && look.lod > 6) {
    ctx.strokeStyle = `rgba(210,240,255,${0.25 * e.reach})`;
    ctx.lineWidth = r * 0.04;
    for (let i = 0; i < 5; i++) {
      const phase = (dc.t * 0.6 + i / 5) % 1;
      const rad = r * (2.8 - phase * 2.2);
      ctx.beginPath();
      ctx.arc(r * 0.85, 0, rad, -0.9 + phase * 2, 0.4 + phase * 2);
      ctx.stroke();
    }
  }
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 0.95);
    ctx.bezierCurveTo(r * 0.2, -r * 0.7, -L * 0.45, -r * 0.3, -L, -r * 0.12);
    ctx.quadraticCurveTo(-L - r * 0.15, 0, -L, r * 0.12);
    ctx.bezierCurveTo(-L * 0.45, r * 0.3, r * 0.2, r * 0.7, r * 0.85, r * 0.95);
    ctx.quadraticCurveTo(r * 1.05, 0, r * 0.85, -r * 0.95);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = '#3f7bff';
  ctx.fill();
  if (look.lod > 6) {
    flatShade(ctx, r * 1.3, 'rgba(10,30,120,0.3)', 'rgba(220,235,255,0.3)', e.angle);
    // Pigment stripes (stentorin) run down the trumpet.
    ctx.save();
    body();
    ctx.clip();
    ctx.strokeStyle = 'rgba(140,190,255,0.5)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) {
      ctx.moveTo(r * 0.9, i * r * 0.22);
      ctx.quadraticCurveTo(-L * 0.3, i * r * 0.1, -L, i * r * 0.02);
    }
    ctx.stroke();
    ctx.restore();
    // Moniliform nucleus: a string of beads.
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const s = i / 6;
      circle(ctx, r * 0.3 - s * L * 0.75, Math.sin(s * 5 + e.seed) * r * 0.18, r * 0.1);
    }
    ctx.fill();
  }
  // Oral membranelles ring the disc.
  ctx.strokeStyle = 'rgba(230,245,255,0.9)';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const s = i / 15;
    const y = -r * 0.95 + s * r * 1.9;
    const x = r * (0.85 + 0.2 * Math.sin(s * Math.PI));
    const beat = Math.sin(dc.t * 12 - i * 0.8) * r * 0.12;
    ctx.moveTo(x, y);
    ctx.lineTo(x + r * 0.22, y + beat);
  }
  ctx.stroke();
  body();
  ctx.lineWidth = r * 0.06;
  ctx.strokeStyle = rimColor(look, '#cfe0ff', e);
  ctx.stroke();
  if (dc.fluor > 0.02) {
    place(ectx, dc.exf, e.x, e.y, e.angle);
    ectx.globalAlpha = dc.fluor * look.alpha;
    ectx.fillStyle = FLUOR.nucleus;
    ectx.beginPath();
    for (let i = 0; i < 7; i++) {
      const s = i / 6;
      circle(ectx, r * 0.3 - s * L * 0.75, Math.sin(s * 5 + e.seed) * r * 0.18, r * 0.14);
    }
    ectx.fill();
  }
  dangerGlow(dc, e, look, r * 1.4);
  edibleHint(dc, e, look, r * 1.4);
}
