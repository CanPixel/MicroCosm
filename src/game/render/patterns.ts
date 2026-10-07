import type { Patterns } from './draw/util';

// Seamless Voronoi tiles, generated once at startup. Cell borders come from
// the F2 - F1 Worley distance, computed against the 3x3 periodic copies of the
// seed points so the texture wraps without seams.

type TileStyle = {
  size: number;
  cells: number;
  edge: [number, number, number];
  edgeAlpha: number;
  edgeWidth: number;
  fill: [number, number, number];
  fillAlpha: number;
  shade: number; // per-cell brightness variation
  rim: number; // bright inner rim width (0 = none)
  seed: number;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTile(style: TileStyle): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const { size, cells } = style;
  const r = rng(style.seed);
  const px: number[] = [];
  const py: number[] = [];
  const shade: number[] = [];
  for (let i = 0; i < cells; i++) {
    px.push(r() * size);
    py.push(r() * size);
    shade.push(r());
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let f1 = 1e9;
      let f2 = 1e9;
      let id = 0;
      for (let i = 0; i < cells; i++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const dx = x - (px[i] + ox * size);
            const dy = y - (py[i] + oy * size);
            const dd = dx * dx + dy * dy;
            if (dd < f1) {
              f2 = f1;
              f1 = dd;
              id = i;
            } else if (dd < f2) {
              f2 = dd;
            }
          }
        }
      }
      const border = Math.sqrt(f2) - Math.sqrt(f1);
      const edge = Math.max(0, 1 - border / style.edgeWidth);
      const rim = style.rim > 0 ? Math.max(0, 1 - Math.abs(border - style.edgeWidth * 1.6) / style.rim) * 0.5 : 0;
      const centre = Math.sqrt(f1) / (size / Math.sqrt(cells));
      const s = 1 + (shade[id] - 0.5) * style.shade - centre * style.shade * 0.4;
      const o = (y * size + x) * 4;
      const ea = edge * style.edgeAlpha + rim * style.edgeAlpha;
      const fa = style.fillAlpha * (1 - edge);
      const a = Math.min(1, ea + fa);
      const mix = a > 0 ? ea / a : 0;
      d[o] = Math.min(255, (style.edge[0] * mix + style.fill[0] * s * (1 - mix)) * 255);
      d[o + 1] = Math.min(255, (style.edge[1] * mix + style.fill[1] * s * (1 - mix)) * 255);
      d[o + 2] = Math.min(255, (style.edge[2] * mix + style.fill[2] * s * (1 - mix)) * 255);
      d[o + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function createPatterns(ctx: CanvasRenderingContext2D): Patterns {
  const make = (style: TileStyle) => {
    const tile = makeTile(style);
    return tile ? ctx.createPattern(tile, 'repeat') : null;
  };
  return {
    cyto: make({ size: 128, cells: 16, edge: [0.86, 1, 0.95], edgeAlpha: 0.5, edgeWidth: 2.4, fill: [0.7, 1, 0.9], fillAlpha: 0.08, shade: 0.7, rim: 2, seed: 7 }),
    shell: make({ size: 96, cells: 14, edge: [0.32, 0.18, 0.08], edgeAlpha: 0.85, edgeWidth: 3.2, fill: [0.95, 0.66, 0.32], fillAlpha: 0.32, shade: 0.5, rim: 2.5, seed: 21 }),
    tumor: make({ size: 128, cells: 18, edge: [0.35, 0.02, 0.1], edgeAlpha: 0.75, edgeWidth: 3, fill: [1, 0.35, 0.42], fillAlpha: 0.35, shade: 0.9, rim: 3, seed: 33 }),
    pollen: make({ size: 112, cells: 20, edge: [1, 0.93, 0.62], edgeAlpha: 0.9, edgeWidth: 3.6, fill: [0.55, 0.38, 0.1], fillAlpha: 0.5, shade: 0.6, rim: 0, seed: 44 }),
  };
}
