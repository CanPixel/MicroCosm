import { PAL } from '../palette';
import type { Entity } from '../../sim/types';
import { dangerGlow, edibleHint, rimColor } from './microbes';
import { circle, flatShade, hash, place, setPatternScale, smoothClosed, type DrawCtx, type EntityLook } from './util';

const XS = new Float32Array(64);
const YS = new Float32Array(64);

export function drawNeoplasm(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx, ectx } = dc;
  const r = e.radius;
  const n = 44;
  const rage = e.state === 1 ? 1 : 0;
  const pulse = 1 + Math.sin(dc.t * (2 + rage * 3) + e.seed) * 0.04;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let w = 0.86 + 0.09 * Math.sin(a * 5 + e.seed + dc.t * 0.5) + 0.06 * Math.sin(a * 11 - e.seed * 2 + dc.t);
    // Irregular spikes, the "aggressively shaped" silhouette.
    const spike = hash(Math.floor(i / 4) + e.seed);
    if (i % 4 === 0 && spike > 0.45) w += 0.18 + spike * 0.2;
    XS[i] = Math.cos(a) * r * w * pulse;
    YS[i] = Math.sin(a) * r * w * pulse;
  }
  place(ectx, dc.exf, e.x, e.y, 0);
  ectx.globalAlpha = look.alpha * (0.35 + 0.25 * Math.sin(dc.t * 3 + e.seed) + rage * 0.2);
  ectx.fillStyle = '#ff2e4d';
  ectx.beginPath();
  circle(ectx, 0, 0, r * 1.15);
  ectx.fill();

  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  ctx.beginPath();
  smoothClosed(ctx, XS, YS, n);
  ctx.fillStyle = '#d81b3c';
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (dc.patterns.tumor && look.lod > 12) {
    setPatternScale(dc.patterns.tumor, r / 110, dc.t * 4, -dc.t * 3);
    ctx.fillStyle = dc.patterns.tumor;
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
  }
  // Many nuclei: aneuploid chaos.
  ctx.fillStyle = '#4a0b3a';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = e.seed + i * 1.1;
    const d = r * (0.2 + 0.4 * hash(i + e.seed));
    circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.08 + 0.06 * hash(i * 3 + e.seed)));
  }
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  smoothClosed(ctx, XS, YS, n);
  flatShade(ctx, r, 'rgba(90,0,20,0.35)', 'rgba(255,200,200,0.25)', e.angle);
  ctx.beginPath();
  smoothClosed(ctx, XS, YS, n);
  ctx.lineWidth = Math.max(r * 0.05, 2 / dc.ppu);
  ctx.strokeStyle = rimColor(look, '#ff7a8f', e);
  ctx.stroke();
  // Health readout ring for the mini-boss.
  if (e.hp < e.maxHp) {
    place(ctx, dc.xf, e.x, e.y, -Math.PI / 2);
    ctx.globalAlpha = look.alpha * 0.85;
    ctx.lineWidth = Math.max(2 / dc.ppu, r * 0.04);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2 * Math.max(0, e.hp / e.maxHp));
    ctx.stroke();
  }
  dangerGlow(dc, e, look, r * 1.1);
  edibleHint(dc, e, look, r);
}

export function drawPollen(dc: DrawCtx, e: Entity, look: EntityLook) {
  const { ctx } = dc;
  const r = e.radius;
  const kind = hash(e.seed);
  place(ctx, dc.xf, e.x, e.y, e.angle);
  ctx.globalAlpha = look.alpha;
  if (kind < 0.4) {
    // Echinate: a sphere bristling with conical spines.
    const spikes = 26;
    ctx.fillStyle = '#e9c35a';
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const b = a + Math.PI / spikes;
      ctx.moveTo(Math.cos(a - 0.08) * r * 0.95, Math.sin(a - 0.08) * r * 0.95);
      ctx.lineTo(Math.cos(b) * r * 1.22, Math.sin(b) * r * 1.22);
      ctx.lineTo(Math.cos(a + 0.2) * r * 0.95, Math.sin(a + 0.2) * r * 0.95);
    }
    ctx.fill();
    ctx.beginPath();
    circle(ctx, 0, 0, r);
    ctx.fillStyle = '#f2cf6c';
    ctx.fill();
    flatShade(ctx, r, 'rgba(120,80,10,0.35)', 'rgba(255,250,220,0.45)', e.angle);
    if (look.lod > 10) {
      ctx.fillStyle = 'rgba(255,245,200,0.8)';
      ctx.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = hash(e.seed + i) * Math.PI * 2;
        const d = Math.sqrt(hash(e.seed * 3 + i)) * r * 0.85;
        circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * 0.035);
      }
      ctx.fill();
    }
    ctx.beginPath();
    circle(ctx, 0, 0, r);
  } else if (kind < 0.75) {
    // Reticulate: a ridged honeycomb wall.
    ctx.beginPath();
    circle(ctx, 0, 0, r);
    ctx.fillStyle = '#d9ad4e';
    ctx.fill();
    if (dc.patterns.pollen && look.lod > 8) {
      ctx.save();
      ctx.clip();
      setPatternScale(dc.patterns.pollen, r / 90, e.seed % 40, 0);
      ctx.fillStyle = dc.patterns.pollen;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
    ctx.beginPath();
    circle(ctx, 0, 0, r);
    flatShade(ctx, r, 'rgba(110,70,10,0.4)', 'rgba(255,250,220,0.35)', e.angle);
    ctx.beginPath();
    circle(ctx, 0, 0, r);
  } else {
    // Tricolpate: three lobes with germination pores.
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const w = 0.82 + 0.18 * Math.cos(a * 3);
      XS[i] = Math.cos(a) * r * w;
      YS[i] = Math.sin(a) * r * w;
    }
    ctx.beginPath();
    smoothClosed(ctx, XS, YS, n);
    ctx.fillStyle = '#e4bf6b';
    ctx.fill();
    flatShade(ctx, r, 'rgba(110,70,10,0.35)', 'rgba(255,250,225,0.4)', e.angle);
    ctx.fillStyle = '#7a4a14';
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      circle(ctx, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.09);
    }
    ctx.fill();
    ctx.beginPath();
    smoothClosed(ctx, XS, YS, n);
  }
  ctx.lineWidth = Math.max(r * 0.035, 1.4 / dc.ppu);
  ctx.strokeStyle = rimColor(look, '#fff1c4', e);
  ctx.stroke();
  void PAL;
}
