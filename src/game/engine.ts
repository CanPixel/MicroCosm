import { Soundscape } from './audio';
import {
  DEFAULT_RECORDS, loadJournal, loadRecords, loadSettings, recordDiscovery, saveRecords, saveSettings, type Records,
  type Settings,
} from './persistence';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { Input } from './input';
import { Store } from './store';
import { BIOMES } from './sim/biomes';
import { OBJECTIVES, objectiveNavTarget } from './sim/director';
import { membraneImpulse } from './sim/membrane';
import { approach, clamp } from './sim/math';
import {
  ABILITY_INFO, BUILD_ORDER, buildCost, canBuild, countOrganelles, FATES, MUTATIONS, ORGANELLES, SLOTS, slotAccepts,
} from './sim/organelles';
import {
  buildOrganelle, canDivide, chooseDivision, divisionDnaCost, divisionThreshold, livingUnits, moveOrganelle,
  recycleOrganelle, rerollDivision, spendableBiomass, startDivision,
} from './sim/player';
import { createGame, stepGame } from './sim/sim';
import { SPECIES, SPECIES_LIST } from './sim/species';
import { NO_INPUT, spawnEntity, type GameState, type SimInput } from './sim/state';
import { openness, spawnGroup } from './sim/world';
import type {
  AbilityId, BiomeId, CellFate, DeathCause, LightMode, Mutation, MutationId, OrganelleType, SimEvent, SpeciesId, Stats,
  Traits, UnlockId,
} from './sim/types';

export type Screen = 'title' | 'playing' | 'paused' | 'division' | 'dead' | 'victory';

export type ToastKind = 'discover' | 'objective' | 'event' | 'warn' | 'good' | 'info' | 'unlock';
export type Toast = {
  id: number; kind: ToastKind; title: string; text: string; color: string; species?: SpeciesId; key?: string; born: number; ttl: number;
};

// A large, quiet caption for arriving somewhere (biomes, the opening shot).
export type Banner = { id: number; title: string; sub: string };

export type AbilityView = { id: AbilityId; name: string; key: string; atp: number; cooldown: number; remaining: number; affordable: boolean; description: string };

export type BuildOption = {
  type: OrganelleType; name: string; role: string; science: string; ok: boolean; reason: string; biomass: number; dna: number; owned: number; max: number;
};

export type SlotView = {
  id: number; x: number; y: number; r: number; ring: 'core' | 'inner' | 'outer'; locked: boolean;
  occupant: { id: number; type: OrganelleType; misfolded: boolean } | null;
};

export type HudSnapshot = {
  screen: Screen;
  time: number;
  atp: number;
  atpCap: number;
  glucose: number;
  glucoseCap: number;
  biomass: number;
  spendable: number;
  dna: number;
  integrity: number;
  maxIntegrity: number;
  generation: number;
  cells: number;
  division: { threshold: number; dna: number; ok: boolean; reasons: string[]; progress: number };
  abilities: AbilityView[];
  lightMode: LightMode;
  architect: boolean;
  labels: boolean;
  userZoom: number;
  biome: { id: BiomeId; name: string; tagline: string };
  light: number;
  pressure: number;
  unlocked: UnlockId[];
  banner: Banner | null;
  hint: string | null;
  // 0 → 1 over the opening shot; the HUD stays out of the way until it ends.
  intro: number;
  // Seconds since the current objective began, and the one just completed.
  objectiveAge: number;
  completed: { title: string; reward: number } | null;
  objective: { index: number; total: number; title: string; text: string; progress: string } | null;
  infection: { viralLoad: number; prophages: number; colonies: number; misfolded: number; attached: number; viroids: number; satellite: number };
  starving: boolean;
  captured: { species: SpeciesId; struggle: number } | null;
  cyst: boolean;
  dsup: boolean;
  storedVirophages: number;
  organelles: Array<{ id: number; type: OrganelleType; slot: number; misfolded: boolean }>;
  slotCount: number;
  build: BuildOption[];
  choices: { fates: CellFate[]; mutations: MutationId[] } | null;
  mutations: Mutation[];
  units: Array<{ id: number; fate: CellFate; integrity: number; maxIntegrity: number }>;
  stats: Stats;
  death: { cause: DeathCause; killer: SpeciesId | null } | null;
  discovered: SpeciesId[];
  journal: Record<string, number>;
  traits: Traits;
  rates: { atpGain: number; glucoseLight: number };
  records: Records;
  newRecords: string[];
  settings: Settings;
  webgl: boolean;
};

export const TOTAL_SPECIES = SPECIES_LIST.length;

const LIGHT_ORDER: LightMode[] = ['bright', 'dark', 'fluor'];

const EVENT_TEXT: Record<string, { title: string; text: string; color: string; kind: ToastKind }> = {
  glucoseBloom: { title: 'Glucose bloom', text: 'Photosynthesis upstream released a sugar cloud nearby.', color: '#d6ff5c', kind: 'good' },
  viralStorm: { title: 'Viral storm', text: 'Virions converging on your membrane. Dash to shake them off, then use RNAi.', color: '#ff3b5c', kind: 'warn' },
  prionFog: { title: 'Prion fog', text: 'Misfolded proteins drifting ahead. Switch to darkfield (Q) to see them.', color: '#d7c4ff', kind: 'warn' },
  phageBurst: { title: 'Phage storm', text: 'Bacteriophages are bursting a bacterial colony. Harmless to you, and full of DNA.', color: '#b9c0ff', kind: 'event' },
  virophageSwarm: { title: 'Virophage swarm', text: 'Sputnik virophages hunting giant viruses. Absorb them as allies.', color: '#7dffb0', kind: 'good' },
  currentSurge: { title: 'Current surge', text: 'A strong current sweeps the plankton. Swim hard to hold position.', color: '#7de8ff', kind: 'event' },
  neoplasm: { title: 'Neoplasm detected', text: 'A mutant cell mass is hunting. It splits when wounded. Burn it down for DNA.', color: '#ff2e4d', kind: 'warn' },
};

const UNLOCK_TEXT: Partial<Record<UnlockId, { title: string; text: string; key?: string; color: string }>> = {
  radar: { title: 'Chemotaxis', text: 'Your cell now senses chemical gradients. Green is food, blue is prey, red is danger.', color: '#7be0c0' },
  dash: { title: 'Pseudopod dash', text: 'A burst of speed that also shakes off anything clinging to you.', key: 'SPACE', color: '#7be0c0' },
  architect: { title: 'Cell Architect', text: 'Look inside your cell to grow and arrange organelles. Time slows while you build.', key: 'TAB', color: '#c4f53a' },
  microscope: { title: 'Microscope light', text: 'Switch illumination. Darkfield and fluorescence reveal what brightfield hides.', key: 'Q', color: '#9fe8ff' },
};

const DEATH_TEXT: Record<DeathCause, string> = {
  rupture: 'Membrane ruptured',
  starvation: 'Starved: catabolism consumed the cytoplasm',
  lysis: 'Lysed by viral replication',
  digested: 'Digested',
  proteostasis: 'Proteostasis collapse: misfolded proteins everywhere',
  neoplasm: 'Overrun by a neoplasm',
};
export { DEATH_TEXT };

export class GameEngine {
  readonly hud: Store<HudSnapshot>;
  readonly toasts = new Store<Toast[]>([]);
  readonly slots = new Store<SlotView[]>([]);
  readonly renderer: Renderer;
  readonly camera = new Camera();
  readonly audio = new Soundscape();
  readonly input: Input;
  state: GameState;
  screen: Screen = 'title';
  settings: Settings;
  records: Records;
  journal: Record<string, number>;

  private host: HTMLElement;
  private raf = 0;
  private last = 0;
  private clock = 0;
  private hudTimer = 0;
  private toastId = 1;
  private architect = false;
  private architectBlend = 0;
  private dark = 0;
  private fluor = 0;
  private labels = false;
  private hitstop = 0;
  private flash = 0;
  private ca = 0;
  private desat = 0;
  private combo = 0;
  private lastGlucose = 0;
  private deathTimer = 0;
  private warned = new Set<string>();
  private newRecords: string[] = [];
  private highlightSlot = -1;
  private resizeObserver: ResizeObserver | null = null;
  private lastBiome: BiomeId = 'shallows';
  debugFocus: { x: number; y: number } | null = null;
  private frameAvg = 1 / 60;
  private scaleTimer = 0;
  // Opening shot progress, 0 → 1.
  private introT = 1;
  private swum = 0;
  private banner: (Banner & { at: number }) | null = null;
  private objectiveAt = 0;
  private completed: { title: string; reward: number } | null = null;
  private bannerId = 1;

  constructor(host: HTMLElement) {
    this.host = host;
    this.settings = loadSettings();
    this.records = loadRecords();
    this.journal = loadJournal();
    this.renderer = new Renderer(host);
    this.renderer.quality = this.settings.quality;
    this.renderer.reducedMotion = this.settings.reducedMotion;
    this.renderer.particles.reduced = this.settings.reducedMotion;
    this.input = new Input(host);
    this.input.attach();
    this.audio.volumes = { master: this.settings.master, music: this.settings.music, sfx: this.settings.sfx };
    this.audio.setMuted(this.settings.muted);
    this.state = this.attractState();
    this.hud = new Store<HudSnapshot>(this.snapshot());
    this.measure();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.measure());
      this.resizeObserver.observe(host);
    }
    this.raf = requestAnimationFrame(this.frame);
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('blur', this.onBlur);
  }

  // Switching away freezes the specimen instead of letting it starve.
  private onHide = () => {
    if (document.hidden) this.pause();
  };

  private onBlur = () => this.pause();

  private attractState() {
    const s = createGame(Math.floor(Math.random() * 1e9), Object.keys(this.journal) as SpeciesId[]);
    s.player.invulnUntil = 1e9;
    // The title screen shows the ecosystem in full, not the quiet opening.
    s.objective.index = 5;
    const fauna: SpeciesId[] = ['euglena', 'paramecium', 'diatom', 'proteo', 'cyano', 'bacillus', 'spirillum', 'cocci', 'euglena', 'diatom'];
    fauna.forEach((id, i) => {
      const a = (i / fauna.length) * Math.PI * 2;
      spawnGroup(s, id, Math.cos(a) * 420, Math.sin(a) * 300, s.rng);
    });
    return s;
  }

  private measure() {
    const r = this.host.getBoundingClientRect();
    this.camera.viewW = Math.max(1, r.width);
    this.camera.viewH = Math.max(1, r.height);
    this.renderer.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, 2.5));
  }

  // --- Public actions (called from the React UI) ----------------------------

  newRun(seed?: number) {
    this.audio.unlock();
    this.audio.ui();
    const requested = Number(new URLSearchParams(window.location.search).get('seed'));
    const s = seed ?? (Number.isFinite(requested) && requested > 0 ? requested : Math.floor(Math.random() * 1e9));
    this.state = createGame(s, Object.keys(this.journal) as SpeciesId[]);
    this.screen = 'playing';
    this.architect = false;
    this.architectBlend = 0;
    this.deathTimer = 0;
    this.desat = 0;
    this.warned.clear();
    this.newRecords = [];
    this.toasts.set([]);
    this.renderer.particles.clear();
    this.renderer.floaters = [];
    this.camera.x = 0;
    this.camera.y = 0;
    this.introT = this.settings.reducedMotion ? 1 : 0;
    this.swum = 0;
    this.objectiveAt = this.clock + 3;
    this.completed = null;
    this.lastBiome = this.state.biome;
    const b = BIOMES[this.state.biome];
    this.showBanner(b.name, 'A single cell in a drop of pond water', 1.6);
    this.setLight('bright', true);
    this.audio.setPaused(false);
    this.publish();
  }

  toTitle() {
    this.state = this.attractState();
    this.screen = 'title';
    this.architect = false;
    this.desat = 0;
    this.toasts.set([]);
    this.banner = null;
    this.audio.setPaused(false);
    this.publish();
  }

  pause() {
    if (this.screen !== 'playing') return;
    this.screen = 'paused';
    this.input.clear();
    this.audio.setPaused(true);
    this.publish();
  }

  resume() {
    if (this.screen !== 'paused' && this.screen !== 'victory') return;
    this.screen = 'playing';
    this.audio.unlock();
    this.audio.setPaused(false);
    this.publish();
  }

  setLight(mode: LightMode, silent = false) {
    if (this.state.lightMode === mode && !silent) return;
    if (!silent && !this.state.unlocked.has('microscope')) return;
    this.state.lightMode = mode;
    this.audio.setLightMode(mode);
    if (!silent) {
      this.audio.modeSwitch(mode);
      if (mode === 'fluor' && !this.warned.has('fluor')) {
        this.warned.add('fluor');
        this.toast('info', 'Fluorescence', 'Tags reveal infected prey, proviruses and organelle health. Excitation light costs ATP (phototoxicity).', '#4dff6a');
      }
      if (mode === 'dark' && !this.warned.has('dark')) {
        this.warned.add('dark');
        this.toast('info', 'Darkfield', 'Scattered light outlines transparent agents: prions, viroids, satellites and trap bristles.', '#dfefff');
      }
    }
    this.publish();
  }

  cycleLight() {
    const i = LIGHT_ORDER.indexOf(this.state.lightMode);
    this.setLight(LIGHT_ORDER[(i + 1) % LIGHT_ORDER.length]);
  }

  toggleArchitect(force?: boolean) {
    if (this.screen !== 'playing') return;
    const next = force ?? !this.architect;
    if (next === this.architect) return;
    if (next && !this.state.unlocked.has('architect')) return;
    this.architect = next;
    this.audio.ui();
    this.input.clear();
    this.publish();
  }

  build(type: OrganelleType) {
    if (buildOrganelle(this.state, type)) this.publish();
  }

  moveOrganelle(id: number, slot: number) {
    if (moveOrganelle(this.state, id, slot)) {
      this.audio.ui();
      this.publish();
    }
  }

  recycle(id: number) {
    if (recycleOrganelle(this.state, id)) {
      this.audio.digest();
      this.publish();
    }
  }

  divide() {
    if (this.screen === 'playing' && startDivision(this.state)) this.publish();
  }

  chooseDivision(fate: CellFate, mutation: MutationId) {
    if (chooseDivision(this.state, fate, mutation)) {
      this.screen = 'playing';
      this.audio.setPaused(false);
      this.flash = 0.6;
      this.audio.divided();
      this.handleEvents(this.state.events.splice(0));
      this.publish();
    }
  }

  reroll() {
    if (rerollDivision(this.state)) {
      this.audio.ui();
      this.publish();
    }
  }

  ability(id: AbilityId) {
    if (id === 'dash') this.input.tap('Space');
    else this.input.tap(`Digit${ABILITY_INFO[id].key}`);
  }

  setUserZoom(z: number) {
    this.camera.setUserZoom(z);
    this.publish();
  }

  setHighlightSlot(id: number) {
    this.highlightSlot = id;
  }

  updateSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    this.audio.setVolumes({ master: this.settings.master, music: this.settings.music, sfx: this.settings.sfx });
    this.audio.setMuted(this.settings.muted);
    this.renderer.reducedMotion = this.settings.reducedMotion;
    this.renderer.particles.reduced = this.settings.reducedMotion;
    if (patch.quality) this.renderer.setQuality(this.settings.quality);
    this.publish();
  }

  unlockAudio() {
    this.audio.unlock();
  }

  dismissToast(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  // Developer aid (console only): lay out specimens in a grid beside the cell.
  debugGallery(ids?: SpeciesId[], spacing = 170, zoom = 1) {
    const s = this.state;
    for (const e of s.entities) e.dead = true;
    s.entities = [];
    s.byId.clear();
    const prime = s.player.units[0];
    const list = ids ?? SPECIES_LIST.filter((d) => d.group !== 'resource').map((d) => d.id);
    const cols = Math.ceil(Math.sqrt(list.length * 1.6));
    list.forEach((id, i) => {
      const def = SPECIES[id];
      const x = prime.x + ((i % cols) - (cols - 1) / 2) * spacing;
      const y = prime.y + 140 + Math.floor(i / cols) * spacing;
      const e = spawnEntity(s, id, x, y, { radius: def.radius[1], angle: 0 });
      e.stun = 9999;
      e.spawnT = 1;
      if (id === 'adenovirus') e.satellites = 3;
    });
    s.player.invulnUntil = s.time + 9999;
    s.director.nextEventAt = 1e9;
    this.camera.setUserZoom(zoom);
    const rows = Math.ceil(list.length / cols);
    this.debugFocus = { x: prime.x, y: prime.y + 140 + ((rows - 1) * spacing) / 2 };
  }

  // Developer aid (console only): ring of specimens around the colony.
  debugSpawn(species: SpeciesId, count = 6, distance = 160, angle = 0) {
    const prime = this.state.player.units[0];
    for (let i = 0; i < count; i++) {
      const a = angle + (i / count) * Math.PI * 2;
      spawnEntity(this.state, species, prime.x + Math.cos(a) * distance, prime.y + Math.sin(a) * distance).spawnT = 1;
    }
  }

  // Developer aid (console only): run frames synchronously, e.g. while the
  // tab is hidden and requestAnimationFrame is throttled.
  debugAdvance(seconds: number, fps = 60) {
    const start = this.last || performance.now();
    for (let i = 1; i <= seconds * fps; i++) this.tick(start + (i * 1000) / fps);
    this.last = 0;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('blur', this.onBlur);
    this.resizeObserver?.disconnect();
    this.input.detach();
    this.audio.dispose();
    this.renderer.dispose();
  }

  // --- Frame loop -------------------------------------------------------------

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    this.tick(now);
  };

  private tick(now: number) {
    const dtReal = this.last === 0 ? 1 / 60 : clamp((now - this.last) / 1000, 0, 0.1);
    this.last = now;
    this.clock += dtReal;
    if (this.screen === 'playing') this.introT = Math.min(1, this.introT + dtReal / 6.5);
    const pressed = this.input.consume();
    this.globalKeys(pressed);

    const s = this.state;
    const p = s.player;
    this.architectBlend += ((this.architect ? 1 : 0) - this.architectBlend) * approach(6, dtReal);
    let scale = 1;
    if (this.screen === 'paused' || this.screen === 'division' || this.screen === 'victory') scale = 0;
    if (this.hitstop > 0) {
      this.hitstop -= dtReal;
      scale *= 0.08;
    }
    scale *= 1 - this.architectBlend * 0.78;
    const simDt = dtReal * scale;

    if (this.screen === 'title') {
      stepGame(s, dtReal, NO_INPUT, this.camera.view());
    } else if (simDt > 0) {
      stepGame(s, simDt, this.buildInput(pressed), this.camera.view());
      this.handleEvents(s.events);
      if (p.pendingDivision && this.screen === 'playing') {
        this.screen = 'division';
        this.architect = false;
        this.audio.setPaused(true);
        this.publish();
      }
    }

    if (p.dead && this.screen === 'playing') {
      this.deathTimer += dtReal;
      this.architect = false;
      if (this.deathTimer > 2.4) {
        this.screen = 'dead';
        this.publish();
      }
    }

    // Camera.
    const units = livingUnits(p);
    let fx = 0;
    let fy = 0;
    let wsum = 0;
    for (const u of units) {
      const w = u.fate === 'prime' ? 2 : 1;
      fx += u.x * w;
      fy += u.y * w;
      wsum += w;
    }
    fx /= wsum;
    fy /= wsum;
    let colonyR = 0;
    for (const u of units) colonyR = Math.max(colonyR, Math.hypot(u.x - fx, u.y - fy) + u.radius);
    const prime = p.units[0];
    if (this.screen === 'title') {
      const t = this.clock * 0.05;
      this.camera.update(dtReal, Math.cos(t) * 320, Math.sin(t * 1.3) * 220, 0, 0, 60, 30, 0, this.settings.reducedMotion);
    } else if (this.architect || this.architectBlend > 0.02) {
      this.camera.update(dtReal, prime.x, prime.y, prime.vx, prime.vy, colonyR, prime.radius, this.architectBlend, this.settings.reducedMotion);
    } else if (this.debugFocus) {
      this.camera.update(dtReal, this.debugFocus.x, this.debugFocus.y, 0, 0, colonyR, prime.radius, 0, this.settings.reducedMotion);
    } else {
      this.camera.update(dtReal, fx, fy, prime.vx, prime.vy, colonyR, prime.radius, 0, this.settings.reducedMotion, this.introT);
    }
    if (this.screen === 'playing' && Math.hypot(prime.vx, prime.vy) > 50) this.swum += dtReal;

    // Light mode blends.
    const k = approach(7, dtReal);
    this.dark += ((s.lightMode === 'dark' ? 1 : 0) - this.dark) * k;
    this.fluor += ((s.lightMode === 'fluor' ? 1 : 0) - this.fluor) * k;
    this.flash = Math.max(0, this.flash - dtReal * 2.2);
    this.ca = Math.max(0, this.ca - dtReal * 2.5);
    if (p.dead && this.screen !== 'title') this.desat = Math.min(0.85, this.desat + dtReal * 0.5);

    const hurt = this.screen === 'title' || p.dead ? 0 : clamp(1 - prime.integrity / prime.maxIntegrity - 0.45, 0, 0.55) * 1.6 + (p.capture ? 0.35 : 0);
    const toxicyst = p.traits.abilities.includes('toxicyst');
    const pointerWorld = this.camera.screenToWorld(this.input.pointer.x, this.input.pointer.y);
    this.renderer.render(s, {
      time: this.clock,
      camera: this.camera,
      dark: this.dark,
      fluor: this.fluor,
      electron: this.architectBlend * 0.62,
      architect: this.architectBlend,
      highlightSlot: this.highlightSlot,
      fx: { ca: this.ca, flash: this.flash, hurt, desat: this.desat },
      overlay: {
        labels: this.labels,
        aim: this.input.pointer.active && !this.input.pointer.touch ? pointerWorld : null,
        aimActive: toxicyst && this.screen === 'playing',
        nav: this.screen === 'playing' && this.introT > 0.9 ? objectiveNavTarget(s) : null,
      },
      showPlayer: this.screen !== 'title',
      glowBoost: 0,
    }, dtReal);

    // Audio intensity from nearby danger.
    if (this.screen !== 'title') {
      this.audio.setBiome(s.biome);
      this.audio.setGrowth(openness(s));
      if (s.biome !== this.lastBiome && this.screen === 'playing') {
        this.lastBiome = s.biome;
        const b = BIOMES[s.biome];
        this.showBanner(b.name, b.tagline);
      }
      let danger = 0;
      for (const e of s.entities) {
        const def = SPECIES[e.species];
        if (def.threat < 2 || e.dead) continue;
        const d = Math.hypot(e.x - prime.x, e.y - prime.y);
        if (d < 520) danger += (1 - d / 520) * (def.threat === 3 ? 0.5 : 0.25);
      }
      danger += p.infection.viralLoad / 140 + (p.capture ? 0.6 : 0) + hurt * 0.4;
      this.audio.setIntensity(p.dead ? 0 : Math.min(1, danger));
    }

    this.adaptResolution(dtReal);

    this.hudTimer -= dtReal;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.publish();
      this.expireToasts();
    }
    if (this.architectBlend > 0.05) this.publishSlots();
  }

  // Keep the frame rate up on weaker GPUs by trading render resolution.
  private adaptResolution(dt: number) {
    if (document.hidden || dt <= 0 || dt >= 0.1) return;
    this.frameAvg += (dt - this.frameAvg) * 0.05;
    this.scaleTimer += dt;
    if (this.scaleTimer < 2.5) return;
    const r = this.renderer;
    if (this.frameAvg > 1 / 45 && r.dynamicScale > 0.6) {
      r.setDynamicScale(r.dynamicScale - 0.1);
      this.scaleTimer = 0;
    } else if (this.frameAvg < 1 / 58 && r.dynamicScale < 1 && this.scaleTimer > 6) {
      r.setDynamicScale(r.dynamicScale + 0.1);
      this.scaleTimer = 0;
    }
  }

  private globalKeys(pressed: Set<string>) {
    this.labels = this.input.keys.has('KeyE') && this.screen === 'playing';
    const wheel = this.input.consumeWheel();
    if (pressed.size) this.audio.unlock();
    if (this.screen === 'title') return;
    if (pressed.has('Escape') || pressed.has('KeyP')) {
      if (this.architect) this.toggleArchitect(false);
      else if (this.screen === 'playing') this.pause();
      else if (this.screen === 'paused') this.resume();
    }
    if (pressed.has('KeyM')) this.updateSettings({ muted: !this.settings.muted });
    if (this.screen !== 'playing') return;
    if (pressed.has('Tab')) this.toggleArchitect();
    if (pressed.has('KeyQ')) this.cycleLight();
    if (pressed.has('KeyR')) this.divide();
    if (wheel && !this.architect) this.camera.setUserZoom(this.camera.userZoom * Math.pow(1.12, -wheel));
    const pinch = this.input.consumePinch();
    if (pinch !== 1 && !this.architect) this.camera.setUserZoom(this.camera.userZoom * pinch);
    if (pressed.has('BracketLeft') || pressed.has('Minus')) this.camera.setUserZoom(this.camera.userZoom / 1.15);
    if (pressed.has('BracketRight') || pressed.has('Equal')) this.camera.setUserZoom(this.camera.userZoom * 1.15);
  }

  private buildInput(pressed: Set<string>): SimInput {
    const s = this.state;
    const p = s.player;
    const prime = p.units[0];
    const keys = this.input.keys;
    let mx = 0;
    let my = 0;
    if (!this.architect) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
      const ptr = this.input.pointer;
      if (mx === 0 && my === 0 && ptr.down) {
        const w = this.camera.screenToWorld(ptr.x, ptr.y);
        const dx = w.x - prime.x;
        const dy = w.y - prime.y;
        const d = Math.hypot(dx, dy);
        const k = Math.min(1, d / (prime.radius * 2.5 + 40));
        if (d > prime.radius * 0.4) {
          mx = (dx / d) * k;
          my = (dy / d) * k;
        }
      }
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    // Aim: mouse when present, otherwise the nearest threat or straight ahead.
    let aimX = prime.x + Math.cos(prime.heading) * 200;
    let aimY = prime.y + Math.sin(prime.heading) * 200;
    if (this.input.pointer.active && !this.input.pointer.touch) {
      const w = this.camera.screenToWorld(this.input.pointer.x, this.input.pointer.y);
      aimX = w.x;
      aimY = w.y;
    } else {
      const target = s.grid.nearest(prime.x, prime.y, 520, (e) => SPECIES[e.species].threat >= 1 && SPECIES[e.species].group !== 'resource');
      if (target) {
        aimX = target.x;
        aimY = target.y;
      }
    }
    const abilities: AbilityId[] = [];
    if (!this.architect) {
      for (const [id, info] of Object.entries(ABILITY_INFO) as Array<[AbilityId, (typeof ABILITY_INFO)[AbilityId]]>) {
        if (id !== 'dash' && pressed.has(`Digit${info.key}`)) abilities.push(id);
      }
      if (this.input.consumeRightClicks() > 0) {
        abilities.push(p.traits.abilities.includes('toxicyst') ? 'toxicyst' : 'lysosome');
      }
    }
    const dash = pressed.has('Space') && !this.architect && s.unlocked.has('dash');
    return { moveX: mx, moveY: my, aimX, aimY, dash, abilities, divide: false };
  }

  // --- Event feedback ------------------------------------------------------

  private pan(x: number) {
    const sx = this.camera.worldToScreen(x, 0).x;
    return clamp((sx / this.camera.viewW) * 2 - 1, -1, 1) * 0.7;
  }

  private onScreen(x: number, y: number, margin = 80) {
    const s = this.camera.worldToScreen(x, y);
    return s.x > -margin && s.y > -margin && s.x < this.camera.viewW + margin && s.y < this.camera.viewH + margin;
  }

  private nearestUnit(x: number, y: number) {
    let best = this.state.player.units[0];
    let bd = Infinity;
    for (const u of livingUnits(this.state.player)) {
      const d = (u.x - x) ** 2 + (u.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = u;
      }
    }
    return best;
  }

  private handleEvents(events: SimEvent[]) {
    const s = this.state;
    const p = s.player;
    const R = this.renderer;
    const prime = p.units[0];
    for (const ev of events) {
      switch (ev.type) {
        case 'eat': {
          const u = this.nearestUnit(ev.x, ev.y);
          membraneImpulse(u.membrane, Math.atan2(ev.y - u.y, ev.x - u.x), u.radius * 2.2, 0.4);
          if (ev.species === 'glucose') {
            this.combo = this.clock - this.lastGlucose < 0.9 ? this.combo + 1 : 0;
            this.lastGlucose = this.clock;
            this.audio.pop(this.combo, this.pan(ev.x));
            R.particles.burst(ev.x, ev.y, { count: 7, color: '#d8ff7a', speed: [40, 120], size: [1.5, 3], life: [0.3, 0.6] });
            if (this.combo >= 4 && this.combo % 4 === 0) R.addFloater(ev.x, ev.y - 10, `×${this.combo + 1} glucose`, '#d6ff5c', 12);
          } else if (ev.species === 'dna' || ev.species === 'phage') {
            this.audio.digest(this.pan(ev.x));
            R.particles.burst(ev.x, ev.y, { count: 8, color: '#b48cff', speed: [40, 140], size: [1.5, 3], life: [0.4, 0.7] });
            R.addFloater(ev.x, ev.y - 8, `+${ev.amount.toFixed(1)} DNA`, '#c9a8ff', 12);
          } else if (ev.species === 'lipid') {
            this.audio.digest(this.pan(ev.x));
            R.addFloater(ev.x, ev.y - 8, '+membrane', '#ffe27a', 12);
          } else if (ev.species === 'virophage') {
            this.audio.cure();
            R.addFloater(ev.x, ev.y - 8, '+virophage ally', '#7dffb0', 12);
          } else {
            this.audio.digest(this.pan(ev.x));
            R.particles.burst(ev.x, ev.y, { count: 4, color: '#ffb48a', speed: [30, 90], size: [1.5, 2.5], life: [0.3, 0.5] });
          }
          break;
        }
        case 'engulfStart': {
          const u = this.nearestUnit(ev.x, ev.y);
          membraneImpulse(u.membrane, Math.atan2(ev.y - u.y, ev.x - u.x), u.radius * 3, 0.6);
          this.audio.gulp(SPECIES[ev.species].radius[1], this.pan(ev.x));
          R.particles.burst(ev.x, ev.y, { count: 6, kind: 'bubble', color: 'rgba(230,255,245,0.9)', speed: [20, 60], size: [1.5, 4], life: [0.4, 0.8] });
          break;
        }
        case 'digested':
          this.audio.digest(this.pan(ev.x));
          if (ev.amount >= 1) R.addFloater(ev.x, ev.y - prime.radius, `+${Math.round(ev.amount)} biomass`, '#ffb48a', 12);
          break;
        case 'damage': {
          this.audio.hit(ev.amount / 12, this.pan(ev.x));
          this.camera.addTrauma(Math.min(0.55, 0.12 + ev.amount / 40));
          this.ca = Math.min(1, this.ca + ev.amount / 18);
          R.particles.burst(ev.x, ev.y, { count: 8, color: '#ff5c7a', speed: [60, 180], size: [1.5, 3], life: [0.3, 0.6] });
          if (ev.amount >= 3) R.addFloater(ev.x, ev.y, `-${Math.round(ev.amount)}`, '#ff6b84', 13);
          break;
        }
        case 'kill': {
          const def = SPECIES[ev.species];
          this.audio.kill(def.radius[1], this.pan(ev.x));
          const color = def.group === 'agent' ? '#c9b6ff' : '#ff9a6b';
          R.particles.burst(ev.x, ev.y, { count: def.group === 'agent' ? 6 : 14, kind: 'shard', color, speed: [60, 220], size: [1.5, 4], life: [0.4, 0.8] });
          R.particles.ring(ev.x, ev.y, def.radius[1] * 1.8, color, 0.45, 3);
          if (def.radius[1] > 30) {
            this.hitstop = 0.06;
            this.camera.addTrauma(0.3);
          }
          break;
        }
        case 'endosymbiosis': {
          this.audio.endosymbiosis();
          this.flash = 0.45;
          this.hitstop = 0.12;
          R.particles.burst(ev.x, ev.y, { count: 36, color: ev.organelle === 'mitochondrion' ? '#ffb43d' : '#7be04a', speed: [80, 260], size: [2, 4], life: [0.6, 1.2] });
          R.particles.ring(ev.x, ev.y, prime.radius * 3.2, '#fff2a8', 0.8, 4);
          const name = ORGANELLES[ev.organelle].name;
          this.toast('good', `Endosymbiosis: ${name}`, ev.organelle === 'mitochondrion'
            ? 'You engulfed a bacterium and kept it. ATP output just jumped. This is how mitochondria began, ~2 billion years ago.'
            : 'A captured cyanobacterium now photosynthesizes for you. This is how every chloroplast began.', ev.organelle === 'mitochondrion' ? '#ffb43d' : '#7be04a');
          break;
        }
        case 'attach': {
          if (ev.species === 'satellite') {
            R.particles.ring(ev.x, ev.y, 18, '#ffe98a', 0.4, 2);
            if (!this.warned.has('satellite')) {
              this.warned.add('satellite');
              this.toast('warn', 'Satellite RNA absorbed', 'Harmless alone, but the next virus that infects you will replicate faster.', '#ffe98a');
            }
            break;
          }
          this.audio.attach(this.pan(ev.x));
          R.particles.ring(ev.x, ev.y, 22, '#ff3b5c', 0.4, 2);
          if (!this.warned.has('attach')) {
            this.warned.add('attach');
            this.toast('warn', 'Virus docking', 'A virion is drilling into your membrane. DASH (SPACE) to shake it off before it injects.', '#ff3b5c');
          }
          break;
        }
        case 'shake':
          this.audio.shake();
          R.particles.burst(ev.x, ev.y, { count: 10, color: '#ffffff', speed: [100, 240], size: [1, 2], life: [0.2, 0.4] });
          R.addFloater(ev.x, ev.y - prime.radius, ev.count > 1 ? `shook off ${ev.count}` : 'shook it off', '#e8fff6', 12);
          break;
        case 'infection':
          this.audio.infection();
          this.ca = 0.8;
          if (ev.style === 'lysogenic') this.toast('warn', 'Provirus integrated', 'A retrovirus spliced itself into your genome. It sleeps until stress wakes it. RNAi (3) can excise it.', '#ff6b84');
          else this.toast('warn', 'Genome hijacked', `${SPECIES[ev.species].name} DNA is replicating inside you. Use RNA interference (3) before the cell bursts.`, '#ff3b5c');
          break;
        case 'lysisBurst':
          this.audio.burst();
          this.camera.addTrauma(0.9);
          this.ca = 1;
          this.hitstop = 0.1;
          R.particles.burst(ev.x, ev.y, { count: 30, kind: 'shard', color: '#ff3b5c', speed: [120, 320], size: [2, 5], life: [0.5, 1] });
          this.toast('warn', 'Lytic burst', 'Virions tore through your membrane. Clear the remaining load.', '#ff3b5c');
          break;
        case 'induction':
          this.audio.infection();
          this.toast('warn', 'Provirus awakened', 'Stress triggered the dormant provirus. Replication is underway.', '#ff3b5c');
          break;
        case 'misfold':
          this.audio.misfold();
          this.toast('warn', 'Prion misfolding', `Your ${ORGANELLES[ev.organelle].name.toLowerCase()} misfolded and stopped working. It will spread. Lysosome burst (1) recycles it.`, '#d7c4ff');
          break;
        case 'colonized':
          if (!this.warned.has('colonized')) {
            this.warned.add('colonized');
            this.toast('warn', 'Hitchhikers', 'That prey carried intracellular bacteria. They now steal your glucose. Lysosome bursts clear colonies.', '#9dff3a');
          }
          break;
        case 'cured':
          this.audio.cure();
          R.particles.burst(prime.x, prime.y, { count: 12, color: '#7dffb0', speed: [60, 160], size: [1.5, 3], life: [0.4, 0.7], spread: prime.radius });
          break;
        case 'captured':
          this.audio.captured();
          this.camera.addTrauma(0.5);
          this.hitstop = 0.08;
          this.toast('warn', `Caught by ${SPECIES[ev.species].name}`, 'Thrash with WASD and SPACE to break free, or encyst (4).', '#ff3b5c');
          break;
        case 'escaped':
          this.audio.escaped();
          R.particles.ring(prime.x, prime.y, prime.radius * 2.5, '#ffd23f', 0.5, 3);
          break;
        case 'ability':
          this.abilityFx(ev.ability, ev.x, ev.y);
          break;
        case 'build':
          this.audio.build();
          R.particles.burst(prime.x, prime.y, { count: 14, color: '#ffffff', speed: [40, 140], size: [1.5, 3], life: [0.4, 0.7], spread: prime.radius * 0.6 });
          membraneImpulse(prime.membrane, Math.random() * Math.PI * 2, prime.radius * 3, 1.2);
          break;
        case 'divisionReady':
          this.toast('good', 'Critical mass reached', 'Your genome can replicate. Press R to divide.', '#b48cff');
          break;
        case 'divisionStart':
          this.audio.divideStart();
          break;
        case 'divided':
          R.particles.ring(prime.x, prime.y, prime.radius * 4, '#b48cff', 0.9, 5);
          this.toast('good', `Generation ${ev.generation}`, 'Your daughter cell stays attached. The colony grows.', '#b48cff');
          break;
        case 'mutation':
          break;
        case 'cellLost':
          this.audio.kill(30, this.pan(ev.x));
          this.camera.addTrauma(0.4);
          R.particles.burst(ev.x, ev.y, { count: 20, kind: 'goo', color: '#7be0c0', speed: [60, 200], size: [2, 5], life: [0.5, 1] });
          this.toast('warn', 'Colony cell lost', 'One of your daughter cells was destroyed.', '#ff6b84');
          break;
        case 'event': {
          const info = EVENT_TEXT[ev.kind];
          this.audio.event(ev.kind);
          if (info) this.toast(info.kind, info.title, info.text, info.color);
          if (ev.kind === 'neoplasm') this.camera.addTrauma(0.25);
          break;
        }
        case 'objective': {
          const def = OBJECTIVES[ev.index];
          this.audio.objective();
          this.objectiveAt = this.clock;
          this.completed = { title: def.title, reward: def.reward };
          if (def.reward) R.addFloater(prime.x, prime.y - prime.radius * 1.6, `+${def.reward} DNA`, '#fff2a8', 14);
          break;
        }
        case 'unlock': {
          const info = UNLOCK_TEXT[ev.id];
          if (!info) break;
          this.audio.unlocked();
          R.particles.ring(prime.x, prime.y, prime.radius * 2.4, info.color, 0.7, 1.8);
          this.toast('unlock', info.title, info.text, info.color, undefined, info.key);
          break;
        }
        case 'discover': {
          const def = SPECIES[ev.species];
          const isNew = !this.journal[ev.species];
          recordDiscovery(this.journal, ev.species);
          R.particles.ring(prime.x, prime.y, prime.radius * 2, '#9fe8ff', 0.5, 1.5);
          if (isNew) {
            this.audio.discover();
            this.toast('discover', `New specimen: ${def.name}`, def.codex.fact, '#9fe8ff', ev.species);
          }
          break;
        }
        case 'npcBurst':
          if (this.onScreen(ev.x, ev.y)) {
            this.audio.kill(8, this.pan(ev.x));
            R.particles.burst(ev.x, ev.y, { count: 12, kind: 'shard', color: '#c4c9ff', speed: [60, 180], size: [1.5, 3], life: [0.4, 0.8] });
          }
          break;
        case 'stun':
          R.particles.burst(ev.x, ev.y, { count: 5, color: '#fff6a8', speed: [30, 80], size: [1.5, 2.5], life: [0.3, 0.6] });
          break;
        case 'tardigrade':
          this.audio.tardigrade();
          this.toast('good', 'Dsup borrowed', 'Brushing the tardigrade coated you in damage-suppressor protein: -45% damage for 10 s.', '#c9b6ff');
          break;
        case 'victory':
          this.audio.victory();
          this.flash = 0.8;
          this.screen = 'victory';
          this.records.victories++;
          saveRecords(this.records);
          this.publish();
          break;
        case 'death':
          this.audio.death();
          this.camera.addTrauma(0.6);
          this.finishRecords();
          break;
      }
    }
  }

  private abilityFx(id: AbilityId, x: number, y: number) {
    const R = this.renderer;
    const p = this.state.player;
    const prime = p.units[0];
    switch (id) {
      case 'dash':
        this.audio.dash();
        R.particles.burst(x, y, { count: 12, kind: 'bubble', color: 'rgba(220,255,250,0.8)', speed: [20, 80], size: [2, 5], life: [0.4, 0.8], angle: Math.atan2(-p.dashDir.y, -p.dashDir.x), cone: 0.7, spread: prime.radius * 0.6 });
        this.state.shockwaves.push({ x, y, t: 0, duration: 0.4, radius: prime.radius * 2.2, strength: 0.35, color: '#c8fff0' });
        break;
      case 'lysosome':
        this.audio.lysosome();
        this.camera.addTrauma(0.35);
        R.particles.burst(x, y, { count: 40, kind: 'bubble', color: 'rgba(200,150,255,0.9)', speed: [120, 380], size: [2, 6], life: [0.4, 0.9] });
        R.particles.burst(x, y, { count: 24, color: '#ffd23f', speed: [100, 300], size: [1.5, 3], life: [0.4, 0.8] });
        break;
      case 'toxicyst':
        this.audio.dart();
        break;
      case 'rnai':
        this.audio.rnai();
        R.particles.burst(x, y, { count: 18, color: '#7dffb0', speed: [40, 120], size: [1.5, 3], life: [0.5, 0.9], spread: prime.radius });
        break;
      case 'encyst':
        this.audio.encyst();
        R.particles.burst(x, y, { count: 16, kind: 'shard', color: '#ffcf7a', speed: [40, 120], size: [1.5, 3], life: [0.4, 0.8], spread: prime.radius });
        break;
      case 'virophage':
        this.audio.cure();
        R.particles.burst(x, y, { count: 16, color: '#7dffb0', speed: [80, 200], size: [1.5, 3], life: [0.4, 0.8] });
        break;
    }
  }

  private finishRecords() {
    const s = this.state;
    const r = this.records;
    const p = s.player;
    const newRecords: string[] = [];
    r.runs++;
    if (p.generation > r.bestGeneration) {
      r.bestGeneration = p.generation;
      newRecords.push('generation');
    }
    if (s.stats.peakCells > r.bestCells) {
      r.bestCells = s.stats.peakCells;
      newRecords.push('cells');
    }
    if (s.time > r.longestRun) {
      r.longestRun = s.time;
      newRecords.push('time');
    }
    if (s.discovered.size > r.mostSpecies) {
      r.mostSpecies = s.discovered.size;
      newRecords.push('species');
    }
    this.newRecords = newRecords;
    saveRecords(r);
  }

  private toast(kind: ToastKind, title: string, text: string, color: string, species?: SpeciesId, key?: string) {
    const ttl = kind === 'unlock' ? 8 : kind === 'discover' ? 5 : 5.5;
    const t: Toast = { id: this.toastId++, kind, title, text, color, species, key, born: this.clock, ttl };
    this.toasts.update((list) => [...list.filter((x) => x.title !== title), t].slice(-3));
  }

  private showBanner(title: string, sub: string, delay = 0) {
    this.banner = { id: this.bannerId++, title, sub, at: this.clock + delay };
  }

  private currentBanner(): Banner | null {
    const b = this.banner;
    if (!b || this.clock < b.at) return null;
    if (this.clock > b.at + 5.5) {
      this.banner = null;
      return null;
    }
    return { id: b.id, title: b.title, sub: b.sub };
  }

  private currentHint(): string | null {
    if (this.screen !== 'playing' || this.introT < 0.55) return null;
    if (this.swum < 1.5 && this.state.time < 40) {
      const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
      return touch ? 'Touch and hold to swim' : 'Swim with WASD, or hold the mouse button';
    }
    return null;
  }

  private expireToasts() {
    const list = this.toasts.get();
    if (list.some((t) => this.clock - t.born > t.ttl)) this.toasts.set(list.filter((t) => this.clock - t.born <= t.ttl));
  }

  private publishSlots() {
    const p = this.state.player;
    const prime = p.units[0];
    const c = Math.cos(prime.heading);
    const sn = Math.sin(prime.heading);
    const views: SlotView[] = SLOTS.map((slot) => {
      const wx = prime.x + (slot.x * c - slot.y * sn) * prime.radius;
      const wy = prime.y + (slot.x * sn + slot.y * c) * prime.radius;
      const sc = this.camera.worldToScreen(wx, wy);
      const o = p.organelles.find((org) => org.slot === slot.id);
      return {
        id: slot.id,
        x: sc.x,
        y: sc.y,
        r: prime.radius * this.camera.zoom * 0.15,
        ring: slot.ring,
        locked: slot.id >= p.traits.slots,
        occupant: o ? { id: o.id, type: o.type, misfolded: o.misfolded } : null,
      };
    });
    this.slots.set(views);
  }

  private publish() {
    this.hud.set(this.snapshot());
  }

  private snapshot(): HudSnapshot {
    const s = this.state;
    const p = s.player;
    const prime = p.units[0];
    const t = p.traits;
    const objective = OBJECTIVES[s.objective.index];
    const div = canDivide(s);
    const spendable = spendableBiomass(p);
    const b = BIOMES[s.biome];
    return {
      screen: this.screen,
      time: s.time,
      atp: p.atp,
      atpCap: t.atpCap,
      glucose: p.glucose,
      glucoseCap: t.glucoseCap,
      biomass: prime.biomass,
      spendable,
      dna: p.dna,
      integrity: prime.integrity,
      maxIntegrity: prime.maxIntegrity,
      generation: p.generation,
      cells: livingUnits(p).length,
      division: { threshold: divisionThreshold(p.generation), dna: divisionDnaCost(p.generation), ok: div.ok, reasons: div.reasons, progress: p.dividing },
      abilities: t.abilities.map((id) => {
        const info = ABILITY_INFO[id];
        return {
          id, name: info.name, key: info.key, atp: info.atp, description: info.description,
          cooldown: id === 'dash' ? t.dashCooldown : info.cooldown,
          remaining: Math.max(0, p.cooldowns[id] - s.time),
          affordable: p.atp >= info.atp,
        };
      }),
      lightMode: s.lightMode,
      architect: this.architect,
      labels: this.labels,
      userZoom: this.camera.userZoom,
      biome: { id: s.biome, name: b.name, tagline: b.tagline },
      light: s.light,
      pressure: s.director.pressure,
      unlocked: [...s.unlocked],
      banner: this.currentBanner(),
      hint: this.currentHint(),
      intro: this.introT,
      objectiveAge: this.clock - this.objectiveAt,
      completed: this.clock - this.objectiveAt < 2.8 ? this.completed : null,
      objective: objective ? { index: s.objective.index, total: OBJECTIVES.length, title: objective.title, text: objective.text, progress: s.objective.progressText } : null,
      infection: {
        viralLoad: p.infection.viralLoad,
        prophages: p.infection.prophages,
        colonies: p.infection.colonies,
        misfolded: p.organelles.filter((o) => o.misfolded).length,
        attached: p.units.reduce((n, u) => n + u.attached.filter((a) => a.species !== 'viroid').length, 0),
        viroids: p.units.reduce((n, u) => n + u.attached.filter((a) => a.species === 'viroid').length, 0),
        satellite: p.infection.satelliteBoost,
      },
      starving: p.starving,
      captured: p.capture ? { species: p.capture.species, struggle: p.capture.struggle } : null,
      cyst: s.time < p.cystUntil,
      dsup: s.time < s.tardigradeUntil,
      storedVirophages: p.storedVirophages,
      organelles: p.organelles.map((o) => ({ id: o.id, type: o.type, slot: o.slot, misfolded: o.misfolded })),
      slotCount: t.slots,
      build: BUILD_ORDER.map((type) => {
        const def = ORGANELLES[type];
        const check = canBuild(p, type, spendable);
        const cost = buildCost(p, type);
        return {
          type, name: def.name, role: def.role, science: def.science, ok: check.ok, reason: check.reason,
          biomass: cost.biomass, dna: cost.dna, owned: countOrganelles(p, type, true), max: def.max,
        };
      }),
      choices: s.divisionChoices ? { fates: s.divisionChoices.fates, mutations: s.divisionChoices.mutations } : null,
      mutations: p.mutations.map((m) => ({ ...m })),
      units: livingUnits(p).map((u) => ({ id: u.id, fate: u.fate, integrity: u.integrity, maxIntegrity: u.maxIntegrity })),
      stats: { ...s.stats },
      death: p.dead && p.deathCause ? { cause: p.deathCause, killer: p.killer } : null,
      discovered: [...s.discovered],
      journal: { ...this.journal },
      traits: t,
      rates: { atpGain: t.glycolysis * 2 + t.mitoRate * t.atpPerGlucoseMito, glucoseLight: t.photoRate * s.light },
      records: { ...(this.records ?? DEFAULT_RECORDS) },
      newRecords: this.newRecords,
      settings: this.settings,
      webgl: this.renderer.webgl,
    };
  }
}

export { FATES, MUTATIONS, ORGANELLES, slotAccepts };
