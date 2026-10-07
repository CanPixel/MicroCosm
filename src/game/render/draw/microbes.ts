import { FLUOR, PAL } from '../palette';
import type { Entity } from '../../sim/types';
import { capsule, circle, flatShade, hash, place, type DrawCtx, type EntityLook } from './util';

// Resources and bacteria: the small, numerous things. Kept cheap.

export function rimColor(look: EntityLook, base: string, e: Entity) {
  if (e.hitFlash > 0.4) return '#ffffff';
  return look.danger ? PAL.danger : base;
}

// Fluorescence tag and infection glow shared by all living organisms.
export function fluorTags(dc: DrawCtx, e: Entity, look: EntityLook, membraneR: number, nucleusX = 0, nucleusR = 0) {
  const { ectx } = dc;
  if (e.infectedBy) {
    // Viral reporters glow under fluorescence, and faintly always.
    const k = 0.25 + dc.fluor * 0.75;
    place(ectx, dc.exf, e.x, e.y, e.angle);
    ectx.globalAlpha = look.alpha * k * (0.6 + 0.4 * Math.sin(dc.t * 6 + e.seed));
    ectx.fillStyle = FLUOR.virus;
    ectx.beginPath();
    circle(ectx, 0, 0, membraneR * 0.85);
    ectx.fill();
  }
  if (dc.fluor < 0.02) return;
  place(ectx, dc.exf, e.x, e.y, e.angle);
  ectx.globalAlpha = dc.fluor * look.alpha;
  if (nucleusR > 0) {
    ectx.fillStyle = FLUOR.nucleus;
    ectx.beginPath();
    circle(ectx, nucleusX, 0, nucleusR);
    ectx.fill();
  }
  if (e.carrier) {
    // Intracellular hitchhikers light up green.
    ectx.fillStyle = FLUOR.carrier;
    ectx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = e.seed + i * 1.9;
      circle(ectx, Math.cos(a) * membraneR * 0.45, Math.sin(a) * membraneR * 0.45, membraneR * 0.09);
    }
    ectx.fill();
  }
}

export function dangerGlow(dc: DrawCtx, e: Entity, look: EntityLook, r: number) {
  if (!look.danger) return;
  const { ectx } = dc;
  place(ectx, dc.exf, e.x, e.y, 0);
  ectx.globalAlpha = look.alpha * (0.12 + 0.08 * Math.sin(dc.t * 5 + e.seed));
  ectx.strokeStyle = PAL.dangerGlow;
  ectx.lineWidth = Math.max(1.5, r * 0.04);
  ectx.beginPath();
  circle(ectx, 0, 0, r * 1.02);
  ectx.stroke();
}

export function edibleHint(dc: DrawCtx, e: Entity, look: EntityLook, r: number) {
  if (!look.edible) return;
  const { ctx } = dc;
  place(ctx, dc.xf, e.x, e.y, dc.t * 0.6 + e.seed);
  ctx.globalAlpha = look.alpha * (0.2 + 0.12 * Math.sin(dc.t * 4 + e.seed));
  ctx.strokeStyle = PAL.edible;
  ctx.lineWidth = Math.max(0.6, 1 / dc.ppu);
  ctx.setLineDash([r * 0.35, r * 0.25]);
  ctx.beginPath();
  circle(ctx, 0, 0, r * 1.35 + 3);
  ctx.stroke();
  ctx.setLineDash([]);
}

// --- Resources -------------------------------------------------------------

export function drawGlucose(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius * (0.92 + 0.08 * Math.sin(dc.t * 3 + e.seed));
  place(ectx, dc.exf, e.x, e.y, 0);
  ectx.globalAlpha = look.alpha * (0.22 + dc.dark * 0.4) * (1 - dc.fluor * 0.7);
  ectx.fillStyle = PAL.glucose.glow;
  ectx.beginPath();
  circle(ectx, 0, 0, r * 0.9);
  ectx.fill();

  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = PAL.glucose.body;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.22;
  ctx.strokeStyle = PAL.glucose.rim;
  ctx.stroke();
  if (look.lod > 4) {
    // Ring oxygen + hydroxyl stubs, the glucose molecule glyph.
    ctx.beginPath();
    circle(ctx, 0, 0, r * 0.38);
    ctx.lineWidth = r * 0.14;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.stroke();
  }
}

export function drawDebris(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  ctx.beginPath();
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.7 + 0.35 * hash(e.seed + i));
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = PAL.debris.body;
  ctx.fill();
  ctx.lineWidth = r * 0.16;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.debris.rim;
  ctx.stroke();
  if (look.lod > 4) {
    ctx.fillStyle = PAL.debris.spot;
    ctx.beginPath();
    circle(ctx, r * 0.2, r * 0.15, r * 0.22);
    ctx.fill();
  }
}

export function drawDna(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  place(ectx, dc.exf, e.x, e.y, 0);
  ectx.globalAlpha = look.alpha * 0.22;
  ectx.fillStyle = '#b48cff';
  ectx.beginPath();
  circle(ectx, 0, 0, r * 0.9);
  ectx.fill();

  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const len = r * 2.2;
  const steps = 9;
  const phase = dc.t * 2 + e.seed;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.22;
  for (let i = 0; i < steps; i++) {
    const x = -len / 2 + (i / (steps - 1)) * len;
    const s = Math.sin(phase + i * 0.75) * r * 0.55;
    ctx.strokeStyle = PAL.dna.rungs[i % 4];
    ctx.beginPath();
    ctx.moveTo(x, s);
    ctx.lineTo(x, -s);
    ctx.stroke();
  }
  ctx.lineWidth = r * 0.26;
  for (const [sign, color] of [[1, PAL.dna.a], [-1, PAL.dna.b]] as const) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const x = -len / 2 + (i / 18) * len;
      const y = Math.sin(phase + (i / 18) * (steps - 1) * 0.75) * r * 0.55 * sign;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function drawLipid(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  place(ectx, dc.exf, e.x, e.y, 0);
  ectx.globalAlpha = look.alpha * 0.45;
  ectx.fillStyle = '#ffe27a';
  ectx.beginPath();
  circle(ectx, 0, 0, r * 1.2);
  ectx.fill();
  place(ctx, dc.xf, e.x, e.y, 0);
  ctx.globalAlpha = look.alpha;
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.fillStyle = PAL.lipid.body;
  ctx.fill();
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = PAL.lipid.rim;
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, 0, 0, r * 0.72);
  ctx.lineWidth = r * 0.06;
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, -r * 0.35, -r * 0.35, r * 0.18);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

// --- Bacteria --------------------------------------------------------------

function flagellumTail(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, t: number, w: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const s = i / 10;
    const px = x + Math.cos(angle) * len * s;
    const py = y + Math.sin(angle) * len * s;
    const off = Math.sin(t * 14 - s * 9) * len * 0.12 * s;
    const ox = -Math.sin(angle) * off;
    const oy = Math.cos(angle) * off;
    if (i === 0) ctx.moveTo(px + ox, py + oy);
    else ctx.lineTo(px + ox, py + oy);
  }
  ctx.stroke();
}

export function drawCocci(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const pair = hash(e.seed) > 0.4;
  const spheres: Array<[number, number]> = pair ? [[-r * 0.55, 0], [r * 0.55, 0]] : [[0, 0]];
  for (const [x, y] of spheres) {
    ctx.beginPath();
    circle(ctx, x, y, pair ? r * 0.72 : r);
    ctx.fillStyle = '#26d9b8';
    ctx.fill();
    if (look.lod > 5) flatShade(ctx, r * 0.72, 'rgba(0,80,90,0.3)', 'rgba(255,255,255,0.45)', e.angle);
    ctx.lineWidth = r * 0.14;
    ctx.strokeStyle = rimColor(look, '#9ffff0', e);
    ctx.stroke();
  }
  fluorTags(dc, e, look, r);
  edibleHint(dc, e, look, r);
}

function rodBody(dc: DrawCtx, e: Entity, look: EntityLook, fill: string, rim: string, inner: string, len: number) {
  const { ctx } = dc;
  const r = e.radius;
  ctx.beginPath();
  capsule(ctx, len, r * 0.62);
  ctx.fillStyle = fill;
  ctx.fill();
  if (look.lod > 5) flatShade(ctx, r * 0.9, 'rgba(0,30,60,0.28)', 'rgba(255,255,255,0.4)', e.angle);
  ctx.lineWidth = r * 0.14;
  ctx.strokeStyle = rimColor(look, rim, e);
  ctx.stroke();
  if (look.lod > 7) {
    ctx.beginPath();
    capsule(ctx, len * 0.6, r * 0.24);
    ctx.fillStyle = inner;
    ctx.fill();
  }
}

export function drawBacillus(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  if (look.lod > 4) {
    for (let i = 0; i < 3; i++) {
      flagellumTail(ctx, -r * 1.2, (i - 1) * r * 0.45, Math.PI + (i - 1) * 0.35, r * 2.4, dc.t + i * 0.3 + e.seed, r * 0.1, '#ff9a6b');
    }
  }
  rodBody(dc, e, look, '#2fc3e8', '#b5f3ff', 'rgba(10,80,140,0.5)', r * 1.35);
  fluorTags(dc, e, look, r);
  edibleHint(dc, e, look, r * 1.2);
}

export function drawProteo(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  // A promise of the mitochondrion it could become: violet glow.
  place(ectx, dc.exf, e.x, e.y, 0);
  ectx.globalAlpha = look.alpha * 0.16 * (0.6 + 0.4 * Math.sin(dc.t * 3 + e.seed));
  ectx.fillStyle = '#d58bff';
  ectx.beginPath();
  circle(ectx, 0, 0, r * 1.2);
  ectx.fill();
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  if (look.lod > 4) flagellumTail(ctx, -r * 1.1, 0, Math.PI, r * 2.6, dc.t + e.seed, r * 0.12, '#ffc2f0');
  ctx.beginPath();
  capsule(ctx, r * 1.15, r * 0.66);
  ctx.fillStyle = '#b05cff';
  ctx.fill();
  if (look.lod > 5) flatShade(ctx, r, 'rgba(60,0,100,0.32)', 'rgba(255,220,255,0.45)', e.angle);
  ctx.lineWidth = r * 0.15;
  ctx.strokeStyle = rimColor(look, '#f0c4ff', e);
  ctx.stroke();
  if (look.lod > 6) {
    // Folded inner membranes: proto-cristae.
    ctx.strokeStyle = '#ff7ac8';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = -r * 0.6 + i * r * 0.4;
      ctx.moveTo(x, -r * 0.35);
      ctx.lineTo(x + r * 0.15, r * 0.35);
    }
    ctx.stroke();
  }
  fluorTags(dc, e, look, r);
  edibleHint(dc, e, look, r * 1.1);
}

export function drawSpirillum(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  const len = r * 2.6;
  const phase = dc.t * 7 + e.seed;
  const path = () => {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const s = i / 20;
      const x = -len / 2 + s * len;
      const y = Math.sin(phase + s * Math.PI * 3) * r * 0.42;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.lineWidth = r * 0.62;
  ctx.strokeStyle = rimColor(look, '#ead4ff', e);
  ctx.stroke();
  path();
  ctx.lineWidth = r * 0.42;
  ctx.strokeStyle = '#a874ff';
  ctx.stroke();
  if (look.lod > 5) {
    flagellumTail(ctx, len / 2, 0, 0, r * 0.8, dc.t, r * 0.08, '#ffd1f5');
    flagellumTail(ctx, -len / 2, 0, Math.PI, r * 0.8, dc.t, r * 0.08, '#ffd1f5');
  }
  fluorTags(dc, e, look, r * 0.8);
  edibleHint(dc, e, look, r * 1.2);
}

export function drawCyano(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const beads = 3 + Math.floor(hash(e.seed) * 2);
  const br = r * 0.5;
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  for (let i = 0; i < beads; i++) {
    const x = (i - (beads - 1) / 2) * br * 1.7;
    const y = Math.sin(i * 1.3 + dc.t * 0.8 + e.seed) * br * 0.25;
    const big = i === beads - 1;
    const rr = big ? br * 1.2 : br;
    ctx.beginPath();
    circle(ctx, x, y, rr);
    ctx.fillStyle = big ? '#8fe05a' : '#3ec95e';
    ctx.fill();
    if (look.lod > 5) {
      ctx.strokeStyle = '#1f8f45';
      ctx.lineWidth = rr * 0.12;
      ctx.beginPath();
      ctx.arc(x, y, rr * 0.55, 0.3, 2.6);
      ctx.stroke();
    }
    ctx.beginPath();
    circle(ctx, x, y, rr);
    ctx.lineWidth = rr * 0.18;
    ctx.strokeStyle = rimColor(look, '#c8ff9e', e);
    ctx.stroke();
  }
  if (dc.fluor > 0.02) {
    // Chlorophyll autofluoresces red.
    place(ectx, dc.exf, e.x, e.y, e.angle);
    ectx.globalAlpha = dc.fluor * look.alpha;
    ectx.fillStyle = FLUOR.chloro;
    ectx.beginPath();
    for (let i = 0; i < beads; i++) circle(ectx, (i - (beads - 1) / 2) * br * 1.7, 0, br * 0.8);
    ectx.fill();
  }
  edibleHint(dc, e, look, r * 1.3);
}

export function bacteriumDot(dc: DrawCtx, e: Entity, look: EntityLook, color: string) {
  const { ctx } = dc;
  place(ctx, dc.xf, e.x, e.y, 0);
  ctx.globalAlpha = look.alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  circle(ctx, 0, 0, e.radius);
  ctx.fill();
}

