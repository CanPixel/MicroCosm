import { FLUOR, PAL } from '../palette';
import type { OrganelleType } from '../../sim/types';
import { capsule, circle, ellipse, flatShade, rgba } from './util';

// Organelle artwork in a local frame (origin at the organelle center, units in
// world space). `face` is the direction toward the cell center so stacked
// membranes (ER, Golgi) curve around the nucleus like real endomembranes.

export function drawOrganelle(ctx: CanvasRenderingContext2D, type: OrganelleType, r: number, t: number, seed: number, face = 0, extra = 0) {
  switch (type) {
    case 'nucleus':
      return nucleus(ctx, r, t, seed, extra);
    case 'mitochondrion':
      return mitochondrion(ctx, r, t, seed);
    case 'chloroplast':
      return chloroplast(ctx, r, t, seed);
    case 'er':
      return er(ctx, r, t, face);
    case 'golgi':
      return golgi(ctx, r, t, face);
    case 'lysosome':
      return lysosome(ctx, r, t, seed);
    case 'vacuole':
      return vacuole(ctx, r, t);
    case 'cytoskeleton':
      return centrosome(ctx, r, t);
    case 'flagellum':
      return basalBody(ctx, r, PAL.flagellum);
    case 'cilia':
      return basalBody(ctx, r, PAL.cilia, 5);
    case 'extrusome':
      return extrusomes(ctx, r, face);
    case 'eyespot':
      return eyespot(ctx, r);
  }
}

function nucleus(ctx: CanvasRenderingContext2D, r: number, t: number, seed: number, dividing: number) {
  const N = PAL.nucleus;
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.fillStyle = N.body;
  ctx.fill();
  flatShade(ctx, r, 'rgba(40,10,110,0.35)', 'rgba(255,255,255,0.22)', 0);
  // Chromatin threads, or condensed chromosomes during division.
  ctx.lineCap = 'round';
  if (dividing > 0) {
    const sep = Math.min(1, dividing * 1.6) * r * 0.45;
    ctx.lineWidth = r * 0.13;
    for (let i = 0; i < 4; i++) {
      const y = (i - 1.5) * r * 0.24;
      for (const side of [-1, 1]) {
        ctx.strokeStyle = i % 2 ? '#ffd23f' : '#ff7ad9';
        ctx.beginPath();
        const x = side * sep;
        ctx.moveTo(x - r * 0.12, y - r * 0.08);
        ctx.lineTo(x + r * 0.12, y + r * 0.08);
        ctx.moveTo(x - r * 0.12, y + r * 0.08);
        ctx.lineTo(x + r * 0.12, y - r * 0.08);
        ctx.stroke();
      }
    }
  } else {
    ctx.strokeStyle = N.chromatin;
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = seed + i * 1.7;
      const rr = r * (0.3 + 0.12 * i);
      ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.quadraticCurveTo(
        Math.cos(a + 1.2 + Math.sin(t * 0.6 + i) * 0.2) * r * 0.75,
        Math.sin(a + 1.2) * r * 0.75,
        Math.cos(a + 2.2) * rr,
        Math.sin(a + 2.2) * rr,
      );
    }
    ctx.stroke();
    // Nucleolus.
    ctx.beginPath();
    circle(ctx, r * 0.22, -r * 0.12, r * 0.34);
    ctx.fillStyle = N.nucleolus;
    ctx.fill();
    ctx.beginPath();
    circle(ctx, r * 0.13, -r * 0.22, r * 0.11);
    ctx.fillStyle = 'rgba(255,230,245,0.85)';
    ctx.fill();
  }
  // Double envelope with pores.
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = N.envelope;
  ctx.stroke();
  ctx.fillStyle = N.pore;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + seed;
    circle(ctx, Math.cos(a) * r, Math.sin(a) * r, r * 0.06);
  }
  ctx.fill();
}

function mitochondrion(ctx: CanvasRenderingContext2D, r: number, t: number, seed: number) {
  const M = PAL.mito;
  const half = r * 1.15;
  const w = r * 0.62;
  ctx.beginPath();
  capsule(ctx, half, w);
  ctx.fillStyle = M.body;
  ctx.fill();
  flatShade(ctx, w * 1.4, 'rgba(170,50,10,0.32)', 'rgba(255,255,220,0.35)', 0);
  // Inner membrane folded into cristae.
  ctx.beginPath();
  capsule(ctx, half * 0.82, w * 0.66);
  ctx.fillStyle = M.matrix;
  ctx.fill();
  ctx.strokeStyle = M.cristae;
  ctx.lineWidth = r * 0.14;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const folds = 5;
  for (let i = 0; i <= folds; i++) {
    const x = -half * 0.7 + (i / folds) * half * 1.4;
    const up = i % 2 === 0;
    ctx.lineTo(x, (up ? -1 : 1) * w * 0.5);
    ctx.lineTo(x + (half * 1.4) / folds / 2, (up ? 1 : -1) * w * 0.15);
  }
  ctx.stroke();
  // ATP synthase turbines flicker along the inner membrane.
  ctx.fillStyle = '#fff3a0';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const phase = (t * 1.6 + i * 0.25 + seed) % 1;
    circle(ctx, -half * 0.6 + phase * half * 1.2, (i % 2 ? 1 : -1) * w * 0.66, r * 0.07);
  }
  ctx.fill();
  ctx.beginPath();
  capsule(ctx, half, w);
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = M.rim;
  ctx.stroke();
}

function chloroplast(ctx: CanvasRenderingContext2D, r: number, t: number, seed: number) {
  const C = PAL.chloro;
  ctx.beginPath();
  ellipse(ctx, 0, 0, r * 1.15, r * 0.74);
  ctx.fillStyle = C.body;
  ctx.fill();
  flatShade(ctx, r, 'rgba(10,80,30,0.35)', 'rgba(230,255,200,0.3)', 0);
  // Lamellae connecting grana stacks.
  ctx.strokeStyle = C.thylakoid;
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, 0);
  ctx.lineTo(r * 0.85, 0);
  ctx.moveTo(-r * 0.6, -r * 0.3);
  ctx.lineTo(r * 0.6, r * 0.3);
  ctx.stroke();
  ctx.fillStyle = C.grana;
  for (let g = 0; g < 4; g++) {
    const gx = -r * 0.6 + g * r * 0.4;
    const gy = (g % 2 ? 1 : -1) * r * 0.18;
    for (let k = 0; k < 4; k++) {
      ctx.fillRect(gx - r * 0.13, gy - r * 0.2 + k * r * 0.1, r * 0.26, r * 0.07);
    }
  }
  // Starch grain.
  ctx.beginPath();
  ellipse(ctx, r * 0.45, -r * 0.32, r * 0.16, r * 0.1, 0.4);
  ctx.fillStyle = 'rgba(255,255,240,0.8)';
  ctx.fill();
  ctx.beginPath();
  ellipse(ctx, 0, 0, r * 1.15, r * 0.74);
  ctx.lineWidth = r * 0.09;
  ctx.strokeStyle = C.rim;
  ctx.stroke();
  void t;
  void seed;
}

function er(ctx: CanvasRenderingContext2D, r: number, t: number, face: number) {
  const E = PAL.er;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const rr = r * (0.55 + i * 0.32);
    const span = 1.1 - i * 0.12;
    const cx = Math.cos(face) * r * 1.3;
    const cy = Math.sin(face) * r * 1.3;
    ctx.beginPath();
    const steps = 12;
    for (let k = 0; k <= steps; k++) {
      const a = face + Math.PI + (k / steps - 0.5) * span * 2;
      const wob = 1 + 0.06 * Math.sin(k * 2.3 + t * 1.5 + i);
      const x = cx + Math.cos(a) * rr * wob;
      const y = cy + Math.sin(a) * rr * wob;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = r * 0.2;
    ctx.strokeStyle = E.body;
    ctx.stroke();
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = E.rim;
    ctx.stroke();
    // Ribosomes stud the rough ER.
    ctx.fillStyle = E.ribosome;
    ctx.beginPath();
    for (let k = 1; k < steps; k += 2) {
      const a = face + Math.PI + (k / steps - 0.5) * span * 2;
      circle(ctx, cx + Math.cos(a) * (rr + r * 0.14), cy + Math.sin(a) * (rr + r * 0.14), r * 0.05);
    }
    ctx.fill();
  }
}

function golgi(ctx: CanvasRenderingContext2D, r: number, t: number, face: number) {
  const G = PAL.golgi;
  ctx.lineCap = 'round';
  const cx = Math.cos(face) * r * 1.4;
  const cy = Math.sin(face) * r * 1.4;
  for (let i = 0; i < 4; i++) {
    const rr = r * (0.9 + i * 0.22);
    const span = 0.75 - i * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, face + Math.PI - span, face + Math.PI + span);
    ctx.lineWidth = r * 0.2;
    ctx.strokeStyle = i % 2 ? '#ff6b84' : G.body;
    ctx.stroke();
  }
  // Budding vesicles drift off the trans face.
  ctx.fillStyle = G.vesicle;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.4 + i / 3) % 1;
    const a = face + Math.PI + (i - 1) * 0.5;
    const d = r * (1.65 + phase * 0.5);
    circle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.12 * (1 - phase * 0.4));
  }
  ctx.fill();
}

function lysosome(ctx: CanvasRenderingContext2D, r: number, t: number, seed: number) {
  const L = PAL.lyso;
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.fillStyle = L.body;
  ctx.fill();
  flatShade(ctx, r, 'rgba(60,10,120,0.3)', 'rgba(255,240,255,0.35)', 0);
  ctx.fillStyle = L.acid;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = seed + i * 1.3 + t * 0.7;
    circle(ctx, Math.cos(a) * r * 0.45, Math.sin(a * 1.3) * r * 0.45, r * 0.13);
  }
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.lineWidth = r * 0.14;
  ctx.strokeStyle = L.rim;
  ctx.stroke();
}

function vacuole(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.beginPath();
  circle(ctx, 0, 0, r * (1 + Math.sin(t * 0.9) * 0.03));
  ctx.fillStyle = PAL.vacuole.body;
  ctx.fill();
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = PAL.vacuole.rim;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, Math.PI * 1.1, Math.PI * 1.55);
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.stroke();
}

function centrosome(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.strokeStyle = 'rgba(160,230,255,0.55)';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.sin(t * 0.5) * 0.05;
    const L = r * (1.6 + (i % 3) * 0.35);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
  }
  ctx.stroke();
  ctx.fillStyle = PAL.cyto.body;
  ctx.strokeStyle = PAL.cyto.rim;
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.rect(-r * 0.45, -r * 0.2, r * 0.9, r * 0.4);
  ctx.rect(-r * 0.2, -r * 0.45, r * 0.4, r * 0.9);
  ctx.fill();
  ctx.stroke();
}

function basalBody(ctx: CanvasRenderingContext2D, r: number, color: string, count = 2) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < count; i++) circle(ctx, (i - (count - 1) / 2) * r * 0.45, 0, r * 0.2);
  ctx.fill();
}

function extrusomes(ctx: CanvasRenderingContext2D, r: number, face: number) {
  const out = face + Math.PI;
  for (let i = -1; i <= 1; i++) {
    const a = out + i * 0.35;
    const bx = Math.cos(a + Math.PI / 2) * i * r * 0.4;
    const by = Math.sin(a + Math.PI / 2) * i * r * 0.4;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(a);
    ctx.beginPath();
    ellipse(ctx, 0, 0, r * 0.75, r * 0.2);
    ctx.fillStyle = PAL.extrusome.body;
    ctx.fill();
    ctx.beginPath();
    circle(ctx, r * 0.7, 0, r * 0.12);
    ctx.fillStyle = PAL.extrusome.tip;
    ctx.fill();
    ctx.restore();
  }
}

function eyespot(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = PAL.eyespot.body;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    circle(ctx, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.32);
  }
  ctx.fill();
  ctx.beginPath();
  circle(ctx, -r * 0.15, -r * 0.15, r * 0.18);
  ctx.fillStyle = 'rgba(255,230,220,0.8)';
  ctx.fill();
}

// Misfolded organelles: desaturated with a tangled prion scribble.
export function drawMisfoldOverlay(ctx: CanvasRenderingContext2D, r: number, t: number, seed: number) {
  ctx.beginPath();
  circle(ctx, 0, 0, r * 1.25);
  ctx.fillStyle = 'rgba(70,60,90,0.55)';
  ctx.fill();
  ctx.strokeStyle = rgba(FLUOR.prion, 0.85);
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = seed + i * 2.4 + Math.sin(t + i) * 0.2;
    const rr = r * (0.3 + (i % 3) * 0.3);
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.stroke();
}

export const FLUOR_TAG: Partial<Record<OrganelleType, string>> = {
  nucleus: FLUOR.nucleus,
  mitochondrion: FLUOR.mito,
  chloroplast: FLUOR.chloro,
  lysosome: FLUOR.lyso,
  er: FLUOR.er,
  golgi: '#ffd23f',
};
