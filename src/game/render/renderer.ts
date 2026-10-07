import { biomeWeights } from '../sim/biomes';
import { canUnitEat, livingUnits, playerHostClasses } from '../sim/player';
import { SPECIES } from '../sim/species';
import type { GameState } from '../sim/state';
import { BIOME_IDS, type Entity, type SpeciesId } from '../sim/types';
import type { Camera } from './camera';
import { DRAWERS, LAYER } from './draw/index';
import { drawColony } from './draw/player';
import { circle, place, type DrawCtx, type EntityLook, type Patterns, type Xf } from './draw/util';
import { PostFX } from './gl/post';
import { drawOverlay, type Floater, type OverlayInputs } from './overlay';
import { BIOME_PALETTES, hexToRgb } from './palette';
import { Particles } from './particles';
import { createPatterns } from './patterns';

export type Quality = 'high' | 'medium' | 'low';

export type FrameFx = {
  ca: number;
  flash: number;
  hurt: number;
  desat: number;
};

export type RenderInputs = {
  time: number;
  camera: Camera;
  dark: number;
  fluor: number;
  electron: number;
  architect: number;
  highlightSlot: number;
  fx: FrameFx;
  overlay: Omit<OverlayInputs, 'threats' | 'time' | 'architect'>;
  showPlayer: boolean;
  glowBoost: number;
};

const BIOME_RES = 32;
const LAYERS = 8;
const CAPTURERS = new Set<SpeciesId>(['amoeba', 'rotifer', 'stentor', 'hydra', 'collotheca']);

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly overlay: HTMLCanvasElement;
  readonly particles = new Particles();
  floaters: Floater[] = [];
  quality: Quality = 'high';
  reducedMotion = false;
  webgl = true;

  private scene: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private emit: HTMLCanvasElement;
  private ectx: CanvasRenderingContext2D;
  private octx: CanvasRenderingContext2D;
  private post: PostFX | null = null;
  private fallback: CanvasRenderingContext2D | null = null;
  private patterns: Patterns;
  private biomeData = new Uint8Array(BIOME_RES * BIOME_RES * 4);
  private biomeRect: [number, number, number, number] = [0, 0, 1, 1];
  private biomeFrame = 0;
  private palette = new Float32Array(60);
  private waves = new Float32Array(32);
  private buckets: Entity[][] = Array.from({ length: LAYERS }, () => []);
  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
  private rs = 1;
  private weights = new Float32Array(5);

  constructor(host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'mc-canvas';
    this.overlay = document.createElement('canvas');
    this.overlay.className = 'mc-overlay';
    host.appendChild(this.canvas);
    host.appendChild(this.overlay);
    this.scene = document.createElement('canvas');
    this.emit = document.createElement('canvas');
    this.sctx = this.scene.getContext('2d')!;
    this.ectx = this.emit.getContext('2d')!;
    this.octx = this.overlay.getContext('2d')!;
    try {
      this.post = new PostFX(this.canvas);
    } catch (err) {
      console.warn('MicroCosm: WebGL2 post-processing unavailable, using 2D fallback.', err);
      this.webgl = false;
      this.fallback = this.canvas.getContext('2d');
    }
    this.patterns = createPatterns(this.sctx);
    BIOME_IDS.forEach((id, b) => {
      BIOME_PALETTES[id].forEach((hex, k) => {
        const [r, g, bl] = hexToRgb(hex);
        this.palette.set([r, g, bl], (b * 4 + k) * 3);
      });
    });
  }

  // Dynamic resolution: lowered automatically when frames run long.
  dynamicScale = 1;

  private renderScale() {
    const cap = this.quality === 'high' ? 1.6 : this.quality === 'medium' ? 1.2 : 0.9;
    return Math.max(0.5, Math.min(this.dpr, cap) * this.dynamicScale);
  }

  setDynamicScale(v: number) {
    const next = Math.max(0.6, Math.min(1, v));
    if (Math.abs(next - this.dynamicScale) < 0.01) return;
    this.dynamicScale = next;
    this.resize(this.cssW, this.cssH, this.dpr);
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    this.dpr = dpr;
    this.rs = this.renderScale();
    const w = Math.round(this.cssW * this.rs);
    const h = Math.round(this.cssH * this.rs);
    if (this.scene.width !== w || this.scene.height !== h) {
      this.scene.width = w;
      this.scene.height = h;
      this.emit.width = Math.max(1, w >> 1);
      this.emit.height = Math.max(1, h >> 1);
      this.canvas.width = w;
      this.canvas.height = h;
      this.post?.resize(w, h);
    }
    const ow = Math.round(this.cssW * dpr);
    const oh = Math.round(this.cssH * dpr);
    if (this.overlay.width !== ow || this.overlay.height !== oh) {
      this.overlay.width = ow;
      this.overlay.height = oh;
    }
  }

  setQuality(q: Quality) {
    this.quality = q;
    this.resize(this.cssW, this.cssH, this.dpr);
  }

  addFloater(x: number, y: number, text: string, color: string, size = 13) {
    if (this.floaters.length > 40) this.floaters.shift();
    this.floaters.push({ x, y, text, color, life: 1.1, max: 1.1, size });
  }

  private updateBiomeMap(state: GameState, cam: Camera) {
    const span = (Math.max(cam.viewW, cam.viewH) / cam.zoom) * 1.5;
    const x0 = cam.x - span / 2;
    const y0 = cam.y - span / 2;
    this.biomeRect = [x0, y0, span, span];
    const step = span / (BIOME_RES - 1);
    for (let j = 0; j < BIOME_RES; j++) {
      for (let i = 0; i < BIOME_RES; i++) {
        biomeWeights(x0 + i * step, y0 + j * step, state.seed, this.weights);
        const o = (j * BIOME_RES + i) * 4;
        this.biomeData[o] = this.weights[0] * 255;
        this.biomeData[o + 1] = this.weights[1] * 255;
        this.biomeData[o + 2] = this.weights[2] * 255;
        this.biomeData[o + 3] = this.weights[3] * 255;
      }
    }
    this.post?.uploadBiome(this.biomeData, BIOME_RES);
  }

  render(state: GameState, inp: RenderInputs, dt: number) {
    const cam = inp.camera;
    const rs = this.rs;
    const W = this.scene.width;
    const H = this.scene.height;
    const s = cam.zoom * rs;
    const xf: Xf = { s, ox: W / 2 - cam.x * s + cam.shakeX * rs, oy: H / 2 - cam.y * s + cam.shakeY * rs };
    const exf: Xf = { s: s / 2, ox: xf.ox / 2, oy: xf.oy / 2 };
    const sctx = this.sctx;
    const ectx = this.ectx;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, W, H);
    ectx.setTransform(1, 0, 0, 1, 0, 0);
    ectx.clearRect(0, 0, this.emit.width, this.emit.height);
    ectx.globalCompositeOperation = 'lighter';

    const hiddenAlpha = Math.min(1, 0.07 + inp.dark * 0.95 + inp.fluor * 0.95 + inp.glowBoost);
    const dc: DrawCtx = {
      ctx: sctx,
      ectx,
      xf,
      exf,
      t: inp.time,
      ppu: cam.zoom,
      fluor: inp.fluor,
      dark: inp.dark,
      electron: inp.electron,
      hiddenAlpha,
      patterns: this.patterns,
    };

    // Cull and bucket entities by layer.
    for (const b of this.buckets) b.length = 0;
    const halfW = cam.viewW / 2 / cam.zoom;
    const halfH = cam.viewH / 2 / cam.zoom;
    const p = state.player;
    const units = livingUnits(p);
    const prime = units[0];
    const hosts = playerHostClasses(p);
    const threats: Array<{ x: number; y: number }> = [];
    for (const e of state.entities) {
      if (e.dead) continue;
      const reach =
        e.species === 'hydra' ? 4.6 : e.species === 'lacrymaria' ? 8 : e.species === 'collotheca' ? 2.6 : e.species === 'stentor' ? 3 : 1.6;
      const m = e.radius * reach + 20;
      const dx = Math.abs(e.x - cam.x);
      const dy = Math.abs(e.y - cam.y);
      if (dx > halfW + m || dy > halfH + m) {
        const def = SPECIES[e.species];
        if (def.threat >= 2 && !p.dead && Math.hypot(e.x - prime.x, e.y - prime.y) < 1100 && threats.length < 8) {
          if (def.group !== 'agent' || (def.infects ?? []).some((c) => hosts.includes(c))) threats.push({ x: e.x, y: e.y });
        }
        continue;
      }
      this.buckets[LAYER[e.species]].push(e);
    }

    const look: EntityLook = { alpha: 1, danger: false, edible: false, lod: 0 };
    for (const bucket of this.buckets) {
      for (const e of bucket) {
        const def = SPECIES[e.species];
        look.alpha = e.spawnT * (e.stun > 0 ? 0.75 + 0.25 * Math.sin(inp.time * 30) : 1);
        look.lod = e.radius * cam.zoom;
        let edible = false;
        if (!p.dead && def.group !== 'resource') {
          for (const u of units) {
            if (canUnitEat(p, u, e)) {
              edible = true;
              break;
            }
          }
        }
        let danger = false;
        if (!edible && !p.dead) {
          if (def.group === 'agent') danger = def.threat >= 1 && (def.infects ?? []).some((c) => hosts.includes(c));
          else if (CAPTURERS.has(e.species)) danger = prime.radius < e.radius * (e.species === 'hydra' ? 1.15 : 0.95);
          else danger = def.contactDamage > 0 || def.threat >= 2;
        }
        look.danger = danger;
        look.edible = edible && def.group !== 'agent' && (e.x - prime.x) ** 2 + (e.y - prime.y) ** 2 < 420 * 420;
        DRAWERS[e.species](dc, e, look);
      }
    }
    sctx.globalAlpha = 1;
    ectx.globalAlpha = 1;

    if (inp.showPlayer) drawColony(dc, state);

    // Projectiles.
    for (const pr of state.projectiles) {
      const a = Math.atan2(pr.vy, pr.vx);
      const player = pr.owner === 'player';
      place(sctx, xf, pr.x, pr.y, a);
      sctx.fillStyle = player ? '#ffe27a' : '#ffffff';
      sctx.beginPath();
      sctx.moveTo(7, 0);
      sctx.lineTo(-6, 1.6);
      sctx.lineTo(-6, -1.6);
      sctx.closePath();
      sctx.fill();
      place(ectx, exf, pr.x, pr.y, a);
      ectx.globalAlpha = 0.9;
      ectx.fillStyle = player ? '#ffb43d' : '#ff6b84';
      ectx.beginPath();
      circle(ectx, -2, 0, 5);
      ectx.fill();
    }
    ectx.globalAlpha = 1;

    // Shockwaves: glowing acid rings that also drive screen distortion.
    let waveCount = 0;
    for (const sw of state.shockwaves) {
      const k = sw.t / sw.duration;
      const r = sw.radius * (0.15 + 0.85 * Math.sqrt(k));
      place(ectx, exf, sw.x, sw.y, 0);
      ectx.globalAlpha = (1 - k) * 0.9;
      ectx.strokeStyle = sw.color;
      ectx.lineWidth = 10 * (1 - k) + 2;
      ectx.beginPath();
      circle(ectx, 0, 0, r);
      ectx.stroke();
      // A bold flat ring and a fading wash, readable even in brightfield.
      place(sctx, xf, sw.x, sw.y, 0);
      sctx.globalAlpha = (1 - k) * 0.14 * sw.strength;
      sctx.fillStyle = sw.color;
      sctx.beginPath();
      circle(sctx, 0, 0, r);
      sctx.fill();
      sctx.globalAlpha = (1 - k) * 0.85;
      sctx.strokeStyle = sw.color;
      sctx.lineWidth = Math.max(1.5 / cam.zoom, 5 * (1 - k) + 1);
      sctx.stroke();
      sctx.globalAlpha = 1;
      if (waveCount < 8) {
        this.waves[waveCount * 4] = (sw.x - cam.x) * s + W / 2 + cam.shakeX * rs;
        this.waves[waveCount * 4 + 1] = (sw.y - cam.y) * s + H / 2 + cam.shakeY * rs;
        this.waves[waveCount * 4 + 2] = r * s;
        this.waves[waveCount * 4 + 3] = sw.strength * (1 - k) * (this.reducedMotion ? 0.3 : 1);
        waveCount++;
      }
    }
    ectx.globalAlpha = 1;

    this.particles.update(dt);
    this.particles.draw(dc);
    sctx.globalAlpha = 1;
    ectx.globalCompositeOperation = 'source-over';

    if (this.biomeFrame-- <= 0) {
      this.biomeFrame = 5;
      this.updateBiomeMap(state, cam);
    }

    const primeVx = prime.vx;
    const primeVy = prime.vy;
    if (this.post) {
      this.post.uploadScene(this.scene);
      this.post.uploadEmit(this.emit);
      const fl = inp.fluor;
      this.post.render({
        time: inp.time,
        camX: cam.x - cam.shakeX / cam.zoom,
        camY: cam.y - cam.shakeY / cam.zoom,
        ppu: s,
        biomeRect: this.biomeRect,
        palette: this.palette,
        dark: inp.dark,
        fluor: fl,
        electron: inp.electron,
        playerPx: [(prime.x - cam.x) * s + W / 2, (prime.y - cam.y) * s + H / 2],
        playerVel: [primeVx, primeVy],
        playerR: prime.radius * s,
        light: state.light,
        surge: state.director.surge,
        waves: this.waves,
        waveCount,
        ca: inp.fx.ca,
        bloomStrength: (0.55 + inp.dark * 0.35 + fl * 0.6) * (1 - inp.architect * 0.75),
        emitGain: (0.9 + fl * 1.0 + inp.dark * 0.3) * (1 - inp.architect * 0.6),
        emitSharp: (0.18 + fl * 0.75 + inp.dark * 0.15) * (1 - inp.architect * 0.6),
        vignette: 0.42 + fl * 0.2,
        hurt: inp.fx.hurt,
        flash: inp.fx.flash,
        desat: inp.fx.desat,
        grain: 0.025 + inp.electron * 0.04,
        warp: this.reducedMotion ? 0 : 0.15 + state.director.surge * 1.2,
        threshold: 0.72 - fl * 0.2,
      });
    } else if (this.fallback) {
      const f = this.fallback;
      f.setTransform(1, 0, 0, 1, 0, 0);
      const g = f.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, inp.fluor > 0.5 || inp.dark > 0.5 ? '#05060c' : '#0f3a46');
      g.addColorStop(1, '#040814');
      f.fillStyle = g;
      f.fillRect(0, 0, W, H);
      f.drawImage(this.scene, 0, 0);
      f.globalCompositeOperation = 'lighter';
      f.drawImage(this.emit, 0, 0, W, H);
      f.globalCompositeOperation = 'source-over';
    }

    for (const fl of this.floaters) fl.life -= dt;
    this.floaters = this.floaters.filter((fl) => fl.life > 0);
    drawOverlay(this.octx, this.dpr, cam, state, this.floaters, {
      ...inp.overlay,
      threats,
      time: inp.time,
      architect: inp.architect,
    });
  }

  dispose() {
    this.post?.dispose();
    this.canvas.remove();
    this.overlay.remove();
  }
}
