import { FLUOR } from '../palette';
import type { Entity, SpeciesId } from '../../sim/types';
import { dangerGlow, rimColor } from './microbes';
import { circle, place, type DrawCtx, type EntityLook } from './util';

// Viruses and sub-viral agents. Each draws in a local frame; `drawAgentShape`
// is reused for agents attached to the player's membrane.

function hexagon(ctx: CanvasRenderingContext2D, r: number, rot = 0) {
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

function adenovirus(ctx: CanvasRenderingContext2D, r: number, t: number, detail: boolean) {
  // Fibers with knobs from the vertices.
  ctx.strokeStyle = '#ffe58a';
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const L = i % 2 ? r * 1.35 : r * 1.6;
    ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
    ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
  }
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const L = i % 2 ? r * 1.35 : r * 1.6;
    circle(ctx, Math.cos(a) * L, Math.sin(a) * L, r * 0.18);
  }
  ctx.fill();
  ctx.beginPath();
  hexagon(ctx, r);
  ctx.fillStyle = '#2f6bff';
  ctx.fill();
  if (detail) {
    // Icosahedral facets.
    ctx.fillStyle = '#4f86ff';
    ctx.beginPath();
    for (let i = 0; i < 6; i += 2) {
      const a0 = (i / 6) * Math.PI * 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.beginPath();
  hexagon(ctx, r);
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = '#9fc0ff';
  ctx.stroke();
  void t;
}

function retrovirus(ctx: CanvasRenderingContext2D, r: number, t: number, detail: boolean) {
  ctx.strokeStyle = '#ff9ac0';
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.2;
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a) * r * 1.38, Math.sin(a) * r * 1.38);
  }
  ctx.stroke();
  ctx.fillStyle = '#ff4f8b';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.2;
    circle(ctx, Math.cos(a) * r * 1.42, Math.sin(a) * r * 1.42, r * 0.16);
  }
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.fillStyle = '#3346c9';
  ctx.fill();
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = '#8fa2ff';
  ctx.stroke();
  if (detail) {
    // The conical capsid holding two RNA copies and reverse transcriptase.
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.18);
    ctx.lineTo(r * 0.45, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.62, 0, r * 0.45, r * 0.42);
    ctx.lineTo(-r * 0.5, r * 0.18);
    ctx.quadraticCurveTo(-r * 0.6, 0, -r * 0.5, -r * 0.18);
    ctx.fillStyle = '#ffb43d';
    ctx.fill();
  }
}

function tmv(ctx: CanvasRenderingContext2D, r: number, detail: boolean) {
  const L = r * 1.9;
  const W = r * 0.42;
  ctx.beginPath();
  ctx.rect(-L, -W, L * 2, W * 2);
  ctx.fillStyle = '#93cf62';
  ctx.fill();
  if (detail) {
    ctx.strokeStyle = '#5d9a3a';
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    for (let x = -L + r * 0.2; x < L; x += r * 0.28) {
      ctx.moveTo(x, -W);
      ctx.lineTo(x + r * 0.18, W);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(-L, -W, L * 2, W * 2);
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = '#dfffb8';
  ctx.stroke();
}

function phage(ctx: CanvasRenderingContext2D, r: number, t: number, detail: boolean) {
  // Head at -x, contractile tail toward +x, fibers splayed at the baseplate.
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#c8cdff';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const k = Math.floor(i / 2);
    const bend = Math.sin(t * 3 + i) * r * 0.1;
    ctx.moveTo(r * 1.15, 0);
    ctx.lineTo(r * 1.4 + k * r * 0.15, side * (r * 0.5 + k * r * 0.2) + bend);
    ctx.lineTo(r * 1.9 + k * r * 0.1, side * (r * 0.75 + k * r * 0.25));
  }
  ctx.stroke();
  ctx.fillStyle = '#8f98e8';
  ctx.fillRect(-r * 0.1, -r * 0.16, r * 1.25, r * 0.32);
  if (detail) {
    ctx.strokeStyle = '#6c74c8';
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    for (let x = 0; x < r * 1.1; x += r * 0.16) {
      ctx.moveTo(x, -r * 0.16);
      ctx.lineTo(x, r * 0.16);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = -r * 0.62 + Math.cos(a) * r * 0.62 * 1.25;
    const y = Math.sin(a) * r * 0.62;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#c4c9ff';
  ctx.fill();
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = '#eef0ff';
  ctx.stroke();
  if (detail) {
    ctx.strokeStyle = '#7b5cff';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, 0);
    ctx.bezierCurveTo(-r * 0.8, -r * 0.4, -r * 0.5, r * 0.4, -r * 0.2, 0);
    ctx.stroke();
  }
}

function mimivirus(ctx: CanvasRenderingContext2D, r: number, t: number, detail: boolean) {
  ctx.strokeStyle = '#c3b0ff';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  const n = detail ? 64 : 24;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const L = r * (1.22 + 0.06 * Math.sin(i * 3.1 + t * 2));
    ctx.moveTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
  }
  ctx.stroke();
  ctx.beginPath();
  hexagon(ctx, r, Math.PI / 6);
  ctx.fillStyle = '#4b2fc9';
  ctx.fill();
  ctx.beginPath();
  hexagon(ctx, r * 0.66, Math.PI / 6);
  ctx.fillStyle = '#6a4ff0';
  ctx.fill();
  if (detail) {
    // The "stargate" vertex through which the genome exits.
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.moveTo(r * 0.55, -r * 0.55);
      ctx.lineTo(r * 0.55 + Math.cos(a) * r * 0.25, -r * 0.55 + Math.sin(a) * r * 0.25);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  hexagon(ctx, r, Math.PI / 6);
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = '#a996ff';
  ctx.stroke();
}

function virophage(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  hexagon(ctx, r);
  ctx.fillStyle = '#5ff0a0';
  ctx.fill();
  ctx.lineWidth = r * 0.2;
  ctx.strokeStyle = '#eafff3';
  ctx.stroke();
}

function prion(ctx: CanvasRenderingContext2D, r: number, t: number, seed: number) {
  // Stacked beta strands: the misfolded amyloid signature.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#d7c4ff';
  ctx.lineWidth = r * 0.32;
  for (let k = 0; k < 3; k++) {
    const y = (k - 1) * r * 0.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, y);
    for (let i = 1; i <= 4; i++) ctx.lineTo(-r * 0.9 + i * r * 0.42, y + (i % 2 ? -1 : 1) * r * 0.22 * Math.sin(t * 2 + seed + k));
    ctx.stroke();
  }
}

function viroid(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.strokeStyle = '#ff7ad9';
  ctx.lineWidth = r * 0.35;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const w = 1 + 0.18 * Math.sin(a * 4 + t * 3);
    const x = Math.cos(a) * r * 1.1 * w;
    const y = Math.sin(a) * r * 0.6 * w;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function satellite(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.fillStyle = '#ffe98a';
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.fill();
  ctx.strokeStyle = '#fff6c8';
  ctx.lineWidth = r * 0.4;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(-r * 2, Math.sin(t * 6) * r, -r * 3, 0);
  ctx.stroke();
}

export function drawAgentShape(ctx: CanvasRenderingContext2D, species: SpeciesId, r: number, t: number, seed: number, detail = true) {
  switch (species) {
    case 'adenovirus': return adenovirus(ctx, r, t, detail);
    case 'retrovirus': return retrovirus(ctx, r, t, detail);
    case 'tmv': return tmv(ctx, r, detail);
    case 'phage': return phage(ctx, r, t, detail);
    case 'mimivirus': return mimivirus(ctx, r, t, detail);
    case 'virophage': return virophage(ctx, r);
    case 'prion': return prion(ctx, r, t, seed);
    case 'viroid': return viroid(ctx, r, t);
    case 'satellite': return satellite(ctx, r, t);
    default: break;
  }
}

const HIDDEN = new Set<SpeciesId>(['prion', 'viroid', 'satellite']);

export function drawAgent(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const hidden = HIDDEN.has(e.species);
  const alpha = look.alpha * (hidden ? dc.hiddenAlpha : 1);
  if (alpha < 0.01) return;
  const detail = look.lod > 7;

  // Glow: hidden agents scatter light in darkfield; viruses are tagged in fluorescence.
  const glow = hidden ? Math.max(dc.dark, dc.fluor) * 0.9 + (dc.hiddenAlpha - 0.08) * 0.4 : dc.fluor * 0.9 + (e.species === 'virophage' ? 0.5 : 0.08);
  if (glow > 0.02) {
    place(ectx, dc.exf, e.x, e.y, 0);
    ectx.globalAlpha = Math.min(1, glow) * look.alpha;
    ectx.fillStyle = e.species === 'virophage' ? '#7dffb0' : hidden ? FLUOR.prion : FLUOR.virus;
    ectx.beginPath();
    circle(ectx, 0, 0, r * (hidden ? 1.6 : 1.3));
    ectx.fill();
  }

  if (look.lod < 2.2) {
    place(ctx, dc.xf, e.x, e.y, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = e.species === 'virophage' ? '#5ff0a0' : hidden ? '#d7c4ff' : '#4f7dff';
    ctx.beginPath();
    circle(ctx, 0, 0, Math.max(r, 1.6 / dc.ppu));
    ctx.fill();
    return;
  }

  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = alpha;
  drawAgentShape(ctx, e.species, r, dc.t, e.seed, detail);

  // Satellite RNAs orbiting a helper virus.
  if (e.satellites > 0) {
    place(ctx, dc.xf, e.x, e.y, 0);
    ctx.globalAlpha = look.alpha * Math.max(0.35, dc.hiddenAlpha);
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    for (let i = 0; i < e.satellites; i++) {
      const a = dc.t * 2.2 + (i / e.satellites) * Math.PI * 2;
      circle(ctx, Math.cos(a) * r * 2, Math.sin(a) * r * 2, r * 0.22);
    }
    ctx.fill();
  }
  if (look.danger && !hidden) {
    place(ctx, dc.xf, e.x, e.y, 0);
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = rimColor(look, '#ffffff', e);
    ctx.lineWidth = Math.max(0.6, 1.2 / dc.ppu);
    ctx.beginPath();
    circle(ctx, 0, 0, r * 1.9);
    ctx.stroke();
    dangerGlow(dc, e, look, r * 1.4);
  }
}
