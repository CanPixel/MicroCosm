import { DRAWERS } from '@/game/render/draw/index';
import { drawOrganelle } from '@/game/render/draw/organelles';
import type { DrawCtx, Patterns } from '@/game/render/draw/util';
import { createPatterns } from '@/game/render/patterns';
import { SPECIES } from '@/game/sim/species';
import type { Entity, OrganelleType, SpeciesId } from '@/game/sim/types';

// Thumbnails rendered with the exact in-game drawing code, cached as data URLs,
// so the journal and build menu always match the world.

const cache = new Map<string, string>();
let patterns: Patterns | null = null;

function surface(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

export function organelleIcon(type: OrganelleType, size = 96): string {
  const key = `o:${type}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = surface(size);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const r = size * (type === 'er' || type === 'golgi' ? 0.2 : type === 'mitochondrion' ? 0.3 : 0.32);
  ctx.setTransform(1, 0, 0, 1, size / 2 + (type === 'er' || type === 'golgi' ? -size * 0.12 : 0), size / 2);
  drawOrganelle(ctx, type, r, 1.2, 3, 0);
  if (type === 'flagellum' || type === 'cilia') {
    ctx.strokeStyle = '#e8fff5';
    ctx.lineWidth = size * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const s = i / 12;
      const x = -size * 0.35 + s * size * 0.7;
      const y = Math.sin(s * 9) * size * (type === 'cilia' ? 0.05 : 0.12);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

export function speciesIcon(id: SpeciesId, size = 128, silhouette = false): string {
  const key = `s:${id}:${size}:${silhouette}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = surface(size);
  const glow = surface(size);
  const ctx = canvas.getContext('2d');
  const ectx = glow.getContext('2d');
  if (!ctx || !ectx) return '';
  patterns ??= createPatterns(ctx);
  const def = SPECIES[id];
  const r = (def.radius[0] + def.radius[1]) / 2;
  // Fit each organism's typical footprint into the tile.
  const extent: Partial<Record<SpeciesId, number>> = {
    stentor: 1.9, hydra: 2.1, lacrymaria: 2.4, gastrotrich: 1.6, collotheca: 1.5, rotifer: 1.7, euglena: 2.6,
    bacillus: 2.4, proteo: 2.6, spirillum: 1.6, cyano: 1.8, paramecium: 1.7, phage: 2.2, diatom: 1.7, tmv: 2,
    satellite: 5, prion: 2.6, viroid: 2.6, tardigrade: 1.4, amoeba: 1.2, neoplasm: 1.3, mimivirus: 1.3, adenovirus: 1.7,
    retrovirus: 1.5, virophage: 2.2,
  };
  const scale = (size * 0.42) / (r * (extent[id] ?? 1.15));
  const e: Entity = {
    id: 1, species: id, x: 0, y: 0, vx: 0, vy: 0, angle: id === 'stentor' || id === 'hydra' ? 0.2 : -0.35, spin: 0,
    radius: r, hp: 1, maxHp: 1, seed: 7, age: 2, state: 0, timer: 0, targetId: 0, homeX: 0, homeY: 0, wander: 0,
    reach: id === 'lacrymaria' ? 0.25 : id === 'hydra' ? 0.3 : 0, reachAngle: -0.35, carrier: false, satellites: id === 'adenovirus' ? 2 : 0,
    attachedTo: 0, attachAngle: 0, attachTimer: 0, stun: 0, hitFlash: 0, aux: 0, aux2: 0, infection: 0, infectedBy: null,
    spawnT: 1, dead: false, chunk: '',
  };
  const offX = id === 'stentor' ? size * 0.16 : id === 'hydra' ? size * 0.02 : id === 'collotheca' ? size * 0.06 : id === 'lacrymaria' ? -size * 0.12 : 0;
  const dc: DrawCtx = {
    ctx, ectx,
    xf: { s: scale, ox: size / 2 + offX, oy: size / 2 },
    exf: { s: scale, ox: size / 2 + offX, oy: size / 2 },
    t: 1.3, ppu: scale, fluor: 0, dark: 0, electron: 0, hiddenAlpha: 1, patterns,
  };
  DRAWERS[id](dc, e, { alpha: 1, danger: false, edible: false, lod: r * scale });
  if (silhouette) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'rgba(120,140,190,0.35)';
    ctx.fillRect(0, 0, size, size);
  }
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}
