import { membraneRadiusAt } from '../../sim/membrane';
import { ORGANELLES } from '../../sim/organelles';
import { SPECIES } from '../../sim/species';
import type { GameState } from '../../sim/state';
import type { CellUnit, FoodVacuole, OrganelleType, SpeciesId } from '../../sim/types';
import { FLUOR, PAL } from '../palette';
import { drawAgentShape } from './agents';
import { drawMisfoldOverlay, drawOrganelle, FLUOR_TAG } from './organelles';
import { circle, ellipse, hash, place, rgba, setPatternScale, smoothClosed, type DrawCtx } from './util';

const XS = new Float32Array(96);
const YS = new Float32Array(96);

const PREY_COLOR: Partial<Record<SpeciesId, string>> = {
  cocci: '#26d9b8', bacillus: '#2fc3e8', spirillum: '#a874ff', proteo: '#b05cff', cyano: '#3ec95e', diatom: '#d29a35',
  euglena: '#54d65e', paramecium: '#96c8ff', didinium: '#ff8f3d', lacrymaria: '#ff8fc6', amoeba: '#9ab8dc',
  testate: '#b8742c', stentor: '#3f7bff', gastrotrich: '#dff0b2', rotifer: '#e8dfc4', collotheca: '#d7e8fa',
  neoplasm: '#d81b3c', phage: '#c4c9ff',
};

const FATE_TINT: Record<string, [string, string, string]> = {
  prime: [PAL.player.cytoA, PAL.player.cytoB, PAL.player.cytoC],
  photocyte: ['rgba(190,255,140,0.92)', 'rgba(80,200,90,0.88)', 'rgba(30,120,70,0.9)'],
  ciliocyte: ['rgba(170,240,255,0.92)', 'rgba(60,180,220,0.88)', 'rgba(20,100,150,0.9)'],
  phagocyte: ['rgba(255,225,160,0.92)', 'rgba(230,160,70,0.88)', 'rgba(150,90,40,0.9)'],
  cnidocyte: ['rgba(255,190,215,0.92)', 'rgba(230,90,150,0.88)', 'rgba(140,40,90,0.9)'],
  germ: ['rgba(220,200,255,0.92)', 'rgba(150,110,240,0.88)', 'rgba(80,50,160,0.9)'],
};

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function membranePoints(u: CellUnit, scale = 1) {
  const m = u.membrane;
  const n = m.r.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    XS[i] = Math.cos(a) * m.r[i] * scale;
    YS[i] = Math.sin(a) * m.r[i] * scale;
  }
  return n;
}

function membranePath(ctx: CanvasRenderingContext2D, n: number) {
  ctx.beginPath();
  smoothClosed(ctx, XS, YS, n);
}

type Appendage = { type: OrganelleType; angle: number };

function appendagesOf(state: GameState, u: CellUnit): Appendage[] {
  const list: Appendage[] = [];
  if (u.fate === 'prime') {
    for (const o of state.player.organelles) {
      if (o.misfolded) continue;
      if (o.type === 'flagellum' || o.type === 'cilia' || o.type === 'extrusome' || o.type === 'eyespot') {
        list.push({ type: o.type, angle: Math.atan2(o.py, o.px) + u.heading });
      }
    }
  } else if (u.fate === 'ciliocyte') {
    for (let i = 0; i < 4; i++) list.push({ type: 'cilia', angle: u.heading + (i / 4) * Math.PI * 2 });
  }
  return list;
}

function drawAppendages(dc: DrawCtx, u: CellUnit, list: Appendage[], t: number) {
  const { ctx } = dc;
  const R = u.radius;
  const moving = Math.min(1, Math.hypot(u.vx, u.vy) / 120);
  for (const ap of list) {
    const rr = membraneRadiusAt(u.membrane, ap.angle);
    const bx = Math.cos(ap.angle) * rr;
    const by = Math.sin(ap.angle) * rr;
    if (ap.type === 'flagellum') {
      // Tapered whip, beating harder while swimming.
      const L = R * 2.3;
      const freq = 9 + moving * 9;
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass === 0 ? 'rgba(20,60,70,0.35)' : PAL.flagellum;
        ctx.lineCap = 'round';
        let px = bx;
        let py = by;
        for (let i = 1; i <= 16; i++) {
          const s = i / 16;
          const off = Math.sin(t * freq - s * 8) * R * 0.32 * s;
          const x = bx + Math.cos(ap.angle) * L * s - Math.sin(ap.angle) * off;
          const y = by + Math.sin(ap.angle) * L * s + Math.cos(ap.angle) * off;
          ctx.lineWidth = R * (0.11 - s * 0.08) * (pass === 0 ? 1.6 : 1);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
          px = x;
          py = y;
        }
      }
    } else if (ap.type === 'cilia') {
      ctx.strokeStyle = PAL.cilia;
      ctx.lineWidth = Math.max(R * 0.025, 0.6 / dc.ppu);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const count = 22;
      for (let i = 0; i < count; i++) {
        const a = ap.angle + (i / (count - 1) - 0.5) * 2.1;
        const r = membraneRadiusAt(u.membrane, a);
        const beat = Math.sin(t * 12 - i * 0.6) * 0.5;
        const len = R * 0.22;
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + beat * 0.25) * (r + len), Math.sin(a + beat * 0.25) * (r + len));
      }
      ctx.stroke();
    } else if (ap.type === 'extrusome') {
      ctx.fillStyle = PAL.extrusome.body;
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        const a = ap.angle + i * 0.18;
        const r = membraneRadiusAt(u.membrane, a);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        ctx.moveTo(x - Math.sin(a) * R * 0.05, y + Math.cos(a) * R * 0.05);
        ctx.lineTo(x + Math.cos(a) * R * 0.2, y + Math.sin(a) * R * 0.2);
        ctx.lineTo(x + Math.sin(a) * R * 0.05, y - Math.cos(a) * R * 0.05);
      }
      ctx.fill();
    }
  }
  if (u.fate === 'cnidocyte') {
    ctx.fillStyle = '#ff9ec4';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + u.heading;
      const r = membraneRadiusAt(u.membrane, a);
      ctx.moveTo(Math.cos(a - 0.08) * r, Math.sin(a - 0.08) * r);
      ctx.lineTo(Math.cos(a) * (r + R * 0.22), Math.sin(a) * (r + R * 0.22));
      ctx.lineTo(Math.cos(a + 0.08) * r, Math.sin(a + 0.08) * r);
    }
    ctx.fill();
  }
}

function drawPrey(ctx: CanvasRenderingContext2D, species: SpeciesId, r: number, digest: number, seed: number) {
  const base = PREY_COLOR[species] ?? '#e0e0e0';
  const k = 1 - digest * 0.75;
  ctx.globalAlpha *= 1 - digest * 0.4;
  ctx.fillStyle = base;
  ctx.beginPath();
  const def = SPECIES[species];
  if (def.group === 'bacteria' || species === 'euglena' || species === 'paramecium') {
    ellipse(ctx, 0, 0, r * 1.2 * k, r * 0.6 * k, seed);
  } else {
    circle(ctx, 0, 0, r * k);
  }
  ctx.fill();
  if (digest > 0.15) {
    ctx.fillStyle = `rgba(110,60,30,${Math.min(0.7, digest)})`;
    ctx.fill();
  }
}

function vacuolePos(u: CellUnit, v: FoodVacuole) {
  const c = Math.cos(u.heading);
  const s = Math.sin(u.heading);
  const lx = v.lx * u.radius;
  const ly = v.ly * u.radius;
  const ix = lx * c - ly * s;
  const iy = lx * s + ly * c;
  if (v.intake >= 1) return { x: ix, y: iy };
  const k = v.intake * v.intake;
  return { x: v.startX + (ix - v.startX) * k, y: v.startY + (iy - v.startY) * k };
}

function drawVacuole(dc: DrawCtx, u: CellUnit, v: FoodVacuole, t: number, lysosomes: number) {
  const { ctx } = dc;
  const p = vacuolePos(u, v);
  const rr = Math.min(v.radius, u.radius * 0.42);
  place(ctx, dc.xf, u.x + p.x, u.y + p.y, 0);
  const alpha = ctx.globalAlpha;
  if (v.intake >= 1) {
    ctx.beginPath();
    circle(ctx, 0, 0, rr * (1.15 - v.progress * 0.5));
    ctx.fillStyle = 'rgba(240,255,250,0.18)';
    ctx.fill();
    ctx.lineWidth = Math.max(0.6 / dc.ppu, rr * 0.08);
    ctx.strokeStyle = 'rgba(240,255,250,0.55)';
    ctx.stroke();
  }
  place(ctx, dc.xf, u.x + p.x, u.y + p.y, t * 0.4 + v.seed);
  drawPrey(ctx, v.species, rr * 0.85, v.progress, v.seed);
  ctx.globalAlpha = alpha;
  if (v.progress > 0.08 && lysosomes > 0) {
    // Lysosomes fuse with the food vacuole and pour in their acid.
    ctx.fillStyle = PAL.lyso.acid;
    ctx.beginPath();
    for (let i = 0; i < Math.min(5, 2 + lysosomes); i++) {
      const a = t * 1.5 + i * 2.1 + v.seed;
      circle(ctx, Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.9, rr * 0.12);
    }
    ctx.fill();
  }
}

function drawFateInternals(dc: DrawCtx, u: CellUnit, t: number) {
  const { ctx } = dc;
  const R = u.radius;
  const items: Array<[OrganelleType, number, number, number]> = [];
  switch (u.fate) {
    case 'photocyte':
      items.push(['nucleus', 0, 0, 0.26], ['chloroplast', 0.45, 0.2, 0.16], ['chloroplast', -0.4, 0.3, 0.16], ['chloroplast', 0.05, -0.5, 0.16], ['chloroplast', -0.35, -0.3, 0.14]);
      break;
    case 'ciliocyte':
      items.push(['nucleus', 0, 0, 0.27], ['mitochondrion', 0.42, -0.25, 0.13], ['mitochondrion', -0.42, 0.25, 0.13]);
      break;
    case 'phagocyte':
      items.push(['nucleus', -0.2, 0, 0.26], ['lysosome', 0.3, 0.35, 0.09], ['lysosome', 0.4, -0.3, 0.09], ['golgi', -0.1, 0.45, 0.12]);
      break;
    case 'cnidocyte':
      items.push(['nucleus', -0.25, 0, 0.24]);
      break;
    case 'germ':
      items.push(['nucleus', 0, 0, 0.42], ['mitochondrion', 0.5, 0.3, 0.12]);
      break;
    default:
      items.push(['nucleus', 0, 0, 0.26]);
  }
  const c = Math.cos(u.heading);
  const s = Math.sin(u.heading);
  for (const [type, lx, ly, size] of items) {
    const x = (lx * c - ly * s) * R;
    const y = (lx * s + ly * c) * R;
    place(ctx, dc.xf, u.x + x, u.y + y, u.heading + lx * 3);
    drawOrganelle(ctx, type, size * R, t, u.id + lx * 10, Math.atan2(-y, -x) - u.heading - lx * 3);
  }
  if (u.fate === 'cnidocyte') {
    // Nematocyst capsules with coiled threads.
    for (let i = 0; i < 3; i++) {
      const a = u.heading + 0.8 + i * 0.7;
      const x = Math.cos(a) * R * 0.45;
      const y = Math.sin(a) * R * 0.45;
      place(ctx, dc.xf, u.x + x, u.y + y, a);
      ctx.beginPath();
      ellipse(ctx, 0, 0, R * 0.16, R * 0.09);
      ctx.fillStyle = '#ffd3e6';
      ctx.fill();
      ctx.strokeStyle = '#d6337a';
      ctx.lineWidth = R * 0.02;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const s2 = k / 12;
        const px = -R * 0.12 + s2 * R * 0.24;
        const py = Math.sin(s2 * 14) * R * 0.04;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
}

export function drawCell(dc: DrawCtx, state: GameState, u: CellUnit, alpha: number) {
  const { ctx, ectx } = dc;
  const p = state.player;
  const t = dc.t;
  const R = u.radius;
  const prime = u.fate === 'prime';
  const n = membranePoints(u);
  const cyst = state.time < p.cystUntil;

  // --- Emissive halo (bloom) and fluorescence tags.
  place(ectx, dc.exf, u.x, u.y, 0);
  ectx.globalAlpha = alpha * (0.22 + (prime ? 0.08 : 0)) * (1 - dc.fluor * 0.85);
  ectx.strokeStyle = cyst ? '#ffcf7a' : '#c8fff0';
  ectx.lineWidth = R * 0.07;
  membranePath(ectx, n);
  ectx.stroke();
  if (p.traits.glow > 0 && prime) {
    ectx.globalAlpha = alpha * 0.22;
    ectx.fillStyle = '#7de8ff';
    ectx.beginPath();
    circle(ectx, 0, 0, Math.min(p.traits.glow, R * 4) * (0.9 + 0.1 * Math.sin(t * 2)));
    ectx.fill();
  }
  if (dc.fluor > 0.02) {
    ectx.globalAlpha = alpha * dc.fluor * 0.8;
    ectx.strokeStyle = FLUOR.membrane;
    ectx.lineWidth = R * 0.06;
    membranePath(ectx, n);
    ectx.stroke();
    if (prime) {
      ectx.globalAlpha = alpha * dc.fluor * 0.5;
      for (const o of p.organelles) {
        const color = o.misfolded ? FLUOR.prion : FLUOR_TAG[o.type];
        if (!color) continue;
        const c = Math.cos(u.heading);
        const s = Math.sin(u.heading);
        const x = (o.px * c - o.py * s) * R;
        const y = (o.px * s + o.py * c) * R;
        ectx.fillStyle = color;
        ectx.beginPath();
        circle(ectx, x, y, ORGANELLES[o.type].size * R * (o.type === 'nucleus' ? 0.85 : 0.9));
        ectx.fill();
      }
      // Integrated proviruses light up inside the nucleus.
      ectx.fillStyle = FLUOR.provirus;
      ectx.beginPath();
      for (let i = 0; i < p.infection.prophages; i++) {
        const a = i * 2.3 + t * 0.3;
        circle(ectx, Math.cos(a) * R * 0.14, Math.sin(a) * R * 0.14, R * 0.06);
      }
      ectx.fill();
      if (p.infection.viralLoad > 0) {
        ectx.globalAlpha = alpha * dc.fluor * Math.min(1, p.infection.viralLoad / 70);
        ectx.fillStyle = FLUOR.virus;
        membranePath(ectx, n);
        ectx.fill();
      }
      if (p.infection.colonies > 0) {
        ectx.globalAlpha = alpha * dc.fluor;
        ectx.fillStyle = FLUOR.carrier;
        ectx.beginPath();
        for (let i = 0; i < p.infection.colonies; i++) circle(ectx, Math.cos(i * 2.4) * R * 0.5, Math.sin(i * 2.4) * R * 0.5, R * 0.1);
        ectx.fill();
      }
    } else {
      ectx.fillStyle = FLUOR.nucleus;
      ectx.beginPath();
      circle(ectx, 0, 0, R * 0.26);
      ectx.fill();
    }
  }

  // --- Appendages behind the body.
  place(ctx, dc.xf, u.x, u.y, 0);
  ctx.globalAlpha = alpha;
  const apps = appendagesOf(state, u);
  if (apps.length || u.fate === 'cnidocyte') drawAppendages(dc, u, apps, t);

  // --- Cytoplasm.
  const tint = FATE_TINT[u.fate] ?? FATE_TINT.prime;
  const grad = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.15);
  grad.addColorStop(0, tint[0]);
  grad.addColorStop(0.55, tint[1]);
  grad.addColorStop(1, tint[2]);
  membranePath(ctx, n);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.clip();
  if (dc.patterns.cyto && R * dc.ppu > 14) {
    // Bubbling Voronoi texture, drifting with cytoplasmic flow.
    setPatternScale(dc.patterns.cyto, R / 62, Math.sin(t * 0.21 + u.id) * 30, t * 6);
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = dc.patterns.cyto;
    ctx.fillRect(-R * 1.6, -R * 1.6, R * 3.2, R * 3.2);
    ctx.globalAlpha = alpha;
  }
  // Depth: a darker inner band along the cortex.
  membranePath(ctx, n);
  ctx.lineWidth = R * 0.36;
  ctx.strokeStyle = 'rgba(8,52,70,0.26)';
  ctx.stroke();
  // Cyclosis: granules streaming in a loop around the cell.
  if (R * dc.ppu > 12) {
    ctx.fillStyle = PAL.player.granule;
    ctx.beginPath();
    const count = prime ? 34 : 16;
    for (let i = 0; i < count; i++) {
      const h = hash(i * 13.1 + u.id);
      const rho = R * (0.25 + h * 0.6);
      const w = (0.35 + hash(i * 3.3) * 0.3) * (i % 2 ? 1 : -1) * (prime ? 1 : 0.7);
      const a = h * 6.28 + t * w;
      circle(ctx, Math.cos(a) * rho, Math.sin(a) * rho * 0.85, R * (0.012 + hash(i) * 0.016));
    }
    ctx.fill();
  }
  // Viral replication becomes visible: virions multiply inside the cell.
  if (prime && p.infection.viralLoad > 0) {
    ctx.fillStyle = rgba('#ff3b5c', Math.min(0.32, p.infection.viralLoad / 260));
    ctx.fillRect(-R * 1.6, -R * 1.6, R * 3.2, R * 3.2);
    ctx.fillStyle = '#ff6b84';
    ctx.beginPath();
    const virions = Math.floor(p.infection.viralLoad / 7);
    for (let i = 0; i < virions; i++) {
      const a = hash(i + 7) * 6.28 + t * 0.3;
      const d = R * (0.2 + hash(i * 5) * 0.6);
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d, R * 0.03);
    }
    ctx.fill();
  }
  // Intracellular bacteria colonies.
  if (prime && p.infection.colonies > 0) {
    ctx.fillStyle = '#7fd23c';
    ctx.beginPath();
    for (let c = 0; c < p.infection.colonies; c++) {
      const a = c * 2.4 + 0.5;
      const cx = Math.cos(a) * R * 0.5;
      const cy = Math.sin(a) * R * 0.5;
      for (let k = 0; k < 4; k++) ellipse(ctx, cx + Math.cos(k * 1.6) * R * 0.05, cy + Math.sin(k * 1.6) * R * 0.05, R * 0.04, R * 0.02, k);
    }
    ctx.fill();
  }
  ctx.restore();

  // --- Organelles.
  if (prime) {
    const order: OrganelleType[] = ['nucleus', 'er', 'golgi'];
    const sorted = [...p.organelles].sort((a, b) => {
      const ia = order.indexOf(a.type);
      const ib = order.indexOf(b.type);
      return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib);
    });
    const c = Math.cos(u.heading);
    const s = Math.sin(u.heading);
    for (const o of sorted) {
      const def = ORGANELLES[o.type];
      if (def.ring === 'membrane' && o.type !== 'extrusome' && o.type !== 'eyespot') continue;
      const x = (o.px * c - o.py * s) * R;
      const y = (o.px * s + o.py * c) * R;
      const pop = easeOutBack(Math.min(1, (state.time - o.born) / 0.55));
      const spin = o.type === 'nucleus' ? 0 : (o.id * 1.37) % 6.28 + Math.sin(t * 0.4 + o.id) * 0.15;
      place(ctx, dc.xf, u.x + x, u.y + y, u.heading + spin, Math.max(0.01, pop));
      ctx.globalAlpha = alpha * (o.misfolded ? 0.6 : 1);
      const face = Math.atan2(-y, -x) - u.heading - spin;
      drawOrganelle(ctx, o.type, def.size * R, t, o.id, face, o.type === 'nucleus' ? p.dividing : 0);
      if (o.misfolded) drawMisfoldOverlay(ctx, def.size * R, t, o.id);
      ctx.globalAlpha = alpha;
    }
  } else {
    drawFateInternals(dc, u, t);
  }

  // --- Food vacuoles and prey mid-engulfment.
  const lysos = prime ? p.organelles.filter((o) => o.type === 'lysosome' && !o.misfolded).length : u.fate === 'phagocyte' ? 2 : 0;
  for (const v of u.vacuoles) {
    ctx.globalAlpha = alpha;
    drawVacuole(dc, u, v, t, lysos);
  }

  // --- Membrane: bold white rim (the player's flat outline) and bilayer.
  place(ctx, dc.xf, u.x, u.y, 0);
  ctx.globalAlpha = alpha;
  membranePath(ctx, n);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(R * (prime ? 0.085 : 0.07), 2.2 / dc.ppu);
  ctx.strokeStyle = cyst ? '#ffdca0' : PAL.player.rim;
  ctx.stroke();
  if (u.hitFlash > 0) {
    ctx.globalAlpha = alpha * u.hitFlash;
    ctx.strokeStyle = PAL.danger;
    ctx.lineWidth = R * 0.12;
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }
  membranePoints(u, 0.9);
  membranePath(ctx, n);
  ctx.lineWidth = Math.max(R * 0.018, 0.6 / dc.ppu);
  ctx.strokeStyle = PAL.player.bilayer;
  ctx.stroke();

  // --- Encystment wall.
  if (cyst) {
    membranePoints(u, 1.04);
    membranePath(ctx, n);
    ctx.fillStyle = 'rgba(255,214,150,0.28)';
    ctx.fill();
    ctx.lineWidth = R * 0.14;
    ctx.strokeStyle = 'rgba(214,150,60,0.9)';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,0.8)';
    ctx.lineWidth = R * 0.03;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = membraneRadiusAt(u.membrane, a);
      ctx.moveTo(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97);
      ctx.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1);
    }
    ctx.stroke();
  }
  // --- Dsup protection borrowed from a tardigrade.
  if (state.time < state.tardigradeUntil) {
    ctx.globalAlpha = alpha * (0.4 + 0.2 * Math.sin(t * 4));
    ctx.strokeStyle = '#c9b6ff';
    ctx.lineWidth = R * 0.04;
    ctx.setLineDash([R * 0.18, R * 0.1]);
    ctx.beginPath();
    circle(ctx, 0, 0, R * 1.22);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = alpha;
  }

  // --- Attached agents docking on the membrane.
  for (const a of u.attached) {
    const wa = a.angle + u.heading;
    const rr = membraneRadiusAt(u.membrane, wa);
    const size = SPECIES[a.species].radius[0] * 1.15;
    const x = Math.cos(wa) * (rr + size * 0.6);
    const y = Math.sin(wa) * (rr + size * 0.6);
    const prog = a.species === 'viroid' ? 0 : Math.min(1, a.timer / a.injectAt);
    place(ctx, dc.xf, u.x, u.y, 0);
    if (prog > 0) {
      // Injection needle pushing genome through the membrane.
      ctx.strokeStyle = rgba('#ff3b5c', 0.5 + 0.5 * Math.sin(t * 20));
      ctx.lineWidth = Math.max(0.7 / dc.ppu, size * 0.18);
      ctx.beginPath();
      ctx.moveTo(Math.cos(wa) * rr, Math.sin(wa) * rr);
      ctx.lineTo(Math.cos(wa) * (rr - R * 0.35 * prog), Math.sin(wa) * (rr - R * 0.35 * prog));
      ctx.stroke();
    }
    place(ctx, dc.xf, u.x + x, u.y + y, wa + Math.PI + Math.sin(t * 8 + a.seed) * 0.1);
    drawAgentShape(ctx, a.species, size, t, a.seed, R * dc.ppu > 30);
    place(ectx, dc.exf, u.x + x, u.y + y, 0);
    ectx.globalAlpha = alpha * (0.4 + dc.fluor * 0.6);
    ectx.fillStyle = FLUOR.virus;
    ectx.beginPath();
    circle(ectx, 0, 0, size * 1.4);
    ectx.fill();
  }
  ctx.globalAlpha = 1;
  ectx.globalAlpha = 1;
}

export function drawColony(dc: DrawCtx, state: GameState) {
  const p = state.player;
  const alpha = p.dead ? Math.max(0, 1 - p.dying / 2.2) : 1;
  if (alpha <= 0) return;
  for (let i = p.units.length - 1; i >= 0; i--) {
    const u = p.units[i];
    if (u.dead) continue;
    drawCell(dc, state, u, alpha);
  }
}
