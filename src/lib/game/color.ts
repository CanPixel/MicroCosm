export type RGB = [number, number, number];

// Parse a CSS HSL triple like "224 71% 8%" into linear-ish [0..1] RGB.
export function parseHslVar(value: string): RGB {
  const parts = value.trim().split(/\s+/);
  const h = parseFloat(parts[0]) || 0;
  const s = (parseFloat(parts[1]) || 0) / 100;
  const l = (parseFloat(parts[2]) || 0) / 100;
  return hslToRgb(h, s, l);
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r + m, g + m, b + m];
}

// Read a CSS custom property holding an HSL triple off :root.
export function readThemeColor(name: string): RGB {
  if (typeof window === 'undefined') return [0, 0, 0];
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return parseHslVar(raw || '0 0% 0%');
}
