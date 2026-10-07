import { SPECIES } from '../sim/species';
import type { GameState } from '../sim/state';
import type { SpeciesId } from '../sim/types';
import type { Camera } from './camera';

export type Floater = { x: number; y: number; text: string; color: string; life: number; max: number; size: number };

export type OverlayInputs = {
  labels: boolean;
  aim: { x: number; y: number } | null;
  aimActive: boolean;
  nav: { x: number; y: number; species: SpeciesId } | null;
  threats: Array<{ x: number; y: number }>;
  time: number;
  architect: number;
};

const FONT = '"Sora", "Nunito Sans", system-ui, sans-serif';

export function drawOverlay(ctx: CanvasRenderingContext2D, dpr: number, cam: Camera, state: GameState, floaters: Floater[], o: OverlayInputs) {
  const W = cam.viewW;
  const H = cam.viewH;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const p = state.player;
  const prime = p.units[0];
  const ps = cam.worldToScreen(prime.x, prime.y);

  // Species labels (hold E): a field-guide look.
  if (o.labels && o.architect < 0.5) {
    ctx.font = `600 11px ${FONT}`;
    for (const e of state.entities) {
      if (e.dead) continue;
      const def = SPECIES[e.species];
      if (def.group === 'resource' && e.species !== 'dna' && e.species !== 'lipid') continue;
      if (def.hidden && state.lightMode === 'bright') continue;
      const s = cam.worldToScreen(e.x, e.y);
      if (s.x < -40 || s.y < -40 || s.x > W + 40 || s.y > H + 40) continue;
      const y = s.y + e.radius * cam.zoom + 14;
      const label = def.name;
      const w = ctx.measureText(label).width + 14;
      ctx.fillStyle = 'rgba(10,14,40,0.78)';
      roundRect(ctx, s.x - w / 2, y - 9, w, 18, 9);
      ctx.fill();
      ctx.fillStyle = def.threat >= 2 ? '#ff8aa0' : def.group === 'agent' ? '#d7c4ff' : '#e8fff6';
      ctx.fillText(label, s.x, y + 0.5);
    }
  }

  // Floating feedback text.
  for (const f of floaters) {
    const s = cam.worldToScreen(f.x, f.y);
    const k = f.life / f.max;
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.font = `800 ${f.size}px ${FONT}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8,10,30,0.7)';
    const y = s.y - (1 - k) * 34;
    ctx.strokeText(f.text, s.x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, s.x, y);
  }
  ctx.globalAlpha = 1;

  if (o.architect > 0.5 || p.dead) return;

  // Objective navigator.
  if (o.nav) {
    const s = cam.worldToScreen(o.nav.x, o.nav.y);
    const margin = 48;
    const onScreen = s.x > margin && s.y > margin && s.x < W - margin && s.y < H - margin;
    const bob = Math.sin(o.time * 4) * 4;
    ctx.fillStyle = '#fff2a8';
    ctx.strokeStyle = 'rgba(10,12,40,0.8)';
    if (onScreen) {
      const r = (SPECIES[o.nav.species].radius[1] + 10) * cam.zoom;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -o.time * 20;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(16, r), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,242,168,0.85)';
      ctx.stroke();
      ctx.setLineDash([]);
      chevron(ctx, s.x, s.y - Math.max(16, r) - 12 + bob, Math.PI / 2, 9);
    } else {
      const a = Math.atan2(s.y - ps.y, s.x - ps.x);
      const t = edgePoint(ps.x, ps.y, a, W, H, margin);
      chevron(ctx, t.x + Math.cos(a) * bob, t.y + Math.sin(a) * bob, a, 11);
      const d = Math.hypot(o.nav.x - prime.x, o.nav.y - prime.y);
      ctx.font = `700 10px ${FONT}`;
      ctx.fillStyle = '#fff2a8';
      ctx.fillText(`${Math.round(d / 2)} μm`, t.x - Math.cos(a) * 22, t.y - Math.sin(a) * 22);
    }
  }

  // Off-screen threats approaching.
  ctx.fillStyle = '#ff3b5c';
  for (const th of o.threats) {
    const s = cam.worldToScreen(th.x, th.y);
    if (s.x > 0 && s.y > 0 && s.x < W && s.y < H) continue;
    const a = Math.atan2(s.y - ps.y, s.x - ps.x);
    const t = edgePoint(ps.x, ps.y, a, W, H, 20);
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(o.time * 8);
    triangle(ctx, t.x, t.y, a, 8);
  }
  ctx.globalAlpha = 1;

  // Toxicyst reticle.
  if (o.aim && o.aimActive) {
    const s = cam.worldToScreen(o.aim.x, o.aim.y);
    ctx.strokeStyle = 'rgba(255,214,90,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.moveTo(s.x + Math.cos(a) * 12, s.y + Math.sin(a) * 12);
      ctx.lineTo(s.x + Math.cos(a) * 17, s.y + Math.sin(a) * 17);
    }
    ctx.stroke();
  }

  // Captured: a struggle meter around the cell.
  const pr = prime.radius * cam.zoom;
  if (p.capture) {
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(10,12,40,0.6)';
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, pr + 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, pr + 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.capture.struggle));
    ctx.stroke();
    ctx.font = `800 14px ${FONT}`;
    const shake = Math.sin(o.time * 40) * 2;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(10,12,40,0.85)';
    ctx.strokeText('STRUGGLE!  WASD / SPACE', ps.x + shake, ps.y - pr - 34);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('STRUGGLE!  WASD / SPACE', ps.x + shake, ps.y - pr - 34);
  }
  // Division progress.
  if (p.dividing > 0) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#b48cff';
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, pr + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.dividing);
    ctx.stroke();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function chevron(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s * 0.7, s * 0.8);
  ctx.lineTo(-s * 0.25, 0);
  ctx.lineTo(-s * 0.7, -s * 0.8);
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(10,12,40,0.8)';
  ctx.stroke();
  ctx.fillStyle = '#fff2a8';
  ctx.fill();
  ctx.restore();
}

function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s * 0.6, s * 0.75);
  ctx.lineTo(-s * 0.6, -s * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function edgePoint(cx: number, cy: number, a: number, W: number, H: number, m: number) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const tx = dx > 0 ? (W - m - cx) / dx : dx < 0 ? (m - cx) / dx : Infinity;
  const ty = dy > 0 ? (H - m - cy) / dy : dy < 0 ? (m - cy) / dy : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}
