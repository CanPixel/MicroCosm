// Kurzgesagt-inspired flat palette: vivid, high-contrast fills on a deep
// navy/purple void. Danger reads red/pink, food reads lime/yellow, the player
// is outlined in white (per the art bible's flat-outline language).

export const PAL = {
  white: '#ffffff',
  ink: '#0b1030',
  player: {
    rim: '#ffffff',
    rimGlow: 'rgba(190,255,240,0.9)',
    cytoA: 'rgba(150,240,170,0.92)',
    cytoB: 'rgba(40,190,170,0.88)',
    cytoC: 'rgba(22,118,140,0.9)',
    bilayer: 'rgba(220,255,240,0.55)',
    granule: 'rgba(235,255,220,0.75)',
  },
  nucleus: { body: '#7a3cff', envelope: '#b48cff', nucleolus: '#ff4fa0', chromatin: '#5a24d0', pore: '#e7d9ff' },
  mito: { body: '#ff9a1f', rim: '#ffd27a', cristae: '#ff5f6d', matrix: '#ff7a2f' },
  chloro: { body: '#3fcf5a', rim: '#a8ff8a', thylakoid: '#1f8f45', grana: '#2bb35a' },
  er: { body: '#2ad4c4', rim: '#9ffff2', ribosome: '#e9fffb' },
  golgi: { body: '#ff4d6d', rim: '#ffb0c0', vesicle: '#ffd0da' },
  lyso: { body: '#b06cff', rim: '#e3c7ff', acid: '#ffd23f' },
  vacuole: { body: 'rgba(150,225,255,0.38)', rim: '#cff4ff' },
  cyto: { body: '#5fd0ff', rim: '#d2f4ff' },
  flagellum: '#e8fff5',
  cilia: 'rgba(225,255,245,0.85)',
  extrusome: { body: '#ffd23f', tip: '#ff6b3d' },
  eyespot: { body: '#ff3b3b', rim: '#ffb3a8' },
  glucose: { body: '#c4f53a', rim: '#6fbf2a', glow: '#b9ff4a' },
  debris: { body: '#ff9a6b', rim: '#ffd1b8', spot: '#d9624a' },
  dna: { a: '#5ab0ff', b: '#ff5f9e', rungs: ['#ffd23f', '#2ad4c4', '#ff8a3d', '#a96bff'] },
  lipid: { body: 'rgba(255,214,90,0.75)', rim: '#fff0a8' },
  danger: '#ff3b5c',
  dangerGlow: 'rgba(255,59,92,0.85)',
  edible: 'rgba(200,255,120,0.75)',
  fates: {
    prime: '#7be0c0',
    photocyte: '#7be04a',
    ciliocyte: '#4fd8ff',
    phagocyte: '#ffb43d',
    cnidocyte: '#ff4f8b',
    germ: '#b07bff',
  },
};

// Fluorescence tags, matching real probes: DAPI (blue nucleus), MitoTracker
// (green mitochondria), chlorophyll autofluorescence (red), LysoTracker
// (magenta), membrane dye (orange), and red/orange for viral reporters.
export const FLUOR = {
  nucleus: '#4f7dff',
  mito: '#4dff6a',
  chloro: '#ff3030',
  lyso: '#ff3df2',
  er: '#30fff0',
  membrane: '#ff9a3d',
  virus: '#ff3b3b',
  provirus: '#ff2a2a',
  prion: '#d8b8ff',
  carrier: '#9dff3a',
  generic: '#5ad8ff',
};

// Background palettes per biome: [deep, mid, edge/membrane, accent].
export const BIOME_PALETTES: Record<string, [string, string, string, string]> = {
  shallows: ['#030f22', '#0b3346', '#4fdcc4', '#b8f06a'],
  biofilm: ['#0e0a14', '#33200f', '#ffad52', '#ffd27a'],
  bloom: ['#0e0418', '#35103f', '#ff5fd0', '#9d6bff'],
  abyss: ['#01030b', '#081232', '#3c6bff', '#6fb8ff'],
  rift: ['#110308', '#3a0814', '#ff3b5c', '#ff9a3d'],
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
