import { createMembrane } from './membrane';
import { baseTraits, computeTraits } from './organelles';
import { mulberry32, rand, type Rng } from './rng';
import { SpatialHash } from './spatial';
import { SPECIES } from './species';
import type {
  AbilityId, BiomeId, CellFate, CellUnit, DirectorState, DivisionChoices, Entity, LightMode, Player, Projectile,
  Shockwave, SimEvent, SpeciesId, Stats, UnlockId,
} from './types';

export const START_BIOMASS = 40;
// The cell's own body: never spendable on organelles or daughters.
export const BODY_BIOMASS = 34;
export const MIN_CYTOPLASM = 12;

// Radius grows with the square root of biomass, like area.
export const radiusForBiomass = (biomass: number) => 8 + 3.1 * Math.sqrt(Math.max(0, biomass));

export type ViewRect = { x: number; y: number; halfW: number; halfH: number };

export type SimInput = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  dash: boolean;
  abilities: AbilityId[];
  divide: boolean;
};

export const NO_INPUT: SimInput = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, dash: false, abilities: [], divide: false };

// startEaten: prey engulfed before the current objective began.
export type ObjectiveState = { index: number; progressText: string; startEaten: number };

export type GameState = {
  seed: number;
  rng: Rng;
  time: number;
  entities: Entity[];
  byId: Map<number, Entity>;
  nextId: number;
  grid: SpatialHash;
  player: Player;
  projectiles: Projectile[];
  shockwaves: Shockwave[];
  events: SimEvent[];
  loadedChunks: Set<string>;
  director: DirectorState;
  objective: ObjectiveState;
  unlocked: Set<UnlockId>;
  // Time the current objective's subject was last introduced into view.
  introducedAt: number;
  lightMode: LightMode;
  stats: Stats;
  discovered: Set<SpeciesId>;
  biome: BiomeId;
  light: number;
  current: number;
  tardigradeUntil: number;
  hitstop: number;
  victory: boolean;
  view: ViewRect;
  ambientTimer: number;
  discoverTimer: number;
  // Persisted Field Journal entries from previous runs (for "new species" toasts).
  knownSpecies: Set<SpeciesId>;
  divisionChoices: DivisionChoices | null;
  nextOrganelleId: number;
  nextVacuoleId: number;
};

let unitIds = 1;

export function createUnit(fate: CellFate, x: number, y: number, biomass: number, time: number): CellUnit {
  const radius = radiusForBiomass(biomass);
  return {
    id: unitIds++,
    fate,
    x,
    y,
    vx: 0,
    vy: 0,
    heading: -Math.PI / 2,
    radius,
    biomass,
    integrity: 100,
    maxIntegrity: 100,
    membrane: createMembrane(radius),
    vacuoles: [],
    attached: [],
    hitFlash: 0,
    hitAngle: 0,
    slotAngle: Math.PI,
    slotRing: 0,
    hitCooldown: 0,
    dotTick: 0,
    born: time,
    dead: false,
  };
}

function createPlayer(): Player {
  const cooldowns = { dash: 0, lysosome: 0, toxicyst: 0, rnai: 0, encyst: 0, virophage: 0 } as Record<AbilityId, number>;
  const player: Player = {
    units: [createUnit('prime', 0, 0, START_BIOMASS, 0)],
    organelles: [{ id: 1, type: 'nucleus', slot: 0, misfolded: false, born: 0, mass: 0, px: 0, py: 0 }],
    glucose: 30,
    atp: 80,
    dna: 0,
    storedVirophages: 0,
    generation: 1,
    mutations: [],
    traits: baseTraits(),
    traitsDirty: true,
    cooldowns,
    dashUntil: 0,
    dashDir: { x: 0, y: -1 },
    shieldUntil: 0,
    invulnUntil: 0,
    cystUntil: 0,
    capture: null,
    infection: { viralLoad: 0, satelliteBoost: 0, prophages: 0, colonies: 0, misfoldTimer: 0, refoldTimer: 0, colonyTimer: 0, lastVirus: null },
    starving: false,
    dividing: 0,
    pendingDivision: false,
    dead: false,
    dying: 0,
    deathCause: null,
    killer: null,
    lastDevoured: null,
    aimX: 0,
    aimY: -100,
    moving: 0,
    lastMoveAngle: 0,
    divisionReadyNotified: false,
  };
  player.traits = computeTraits(player);
  return player;
}

export function createState(seed: number, knownSpecies: Iterable<SpeciesId> = []): GameState {
  return {
    seed,
    rng: mulberry32(seed ^ 0x5f356495),
    time: 0,
    entities: [],
    byId: new Map(),
    nextId: 1,
    grid: new SpatialHash(160),
    player: createPlayer(),
    projectiles: [],
    shockwaves: [],
    events: [],
    loadedChunks: new Set(),
    director: { pressure: 0.1, nextEventAt: 150, activeEvent: null, surge: 0, bossSpawned: -999 },
    objective: { index: 0, progressText: '', startEaten: 0 },
    unlocked: new Set(),
    introducedAt: -999,
    lightMode: 'bright',
    stats: { eaten: 0, kills: 0, glucose: 0, maxDistance: 0, divisions: 0, infectionsCleared: 0, peakCells: 1, peakBiomass: START_BIOMASS, discovered: 0 },
    discovered: new Set(),
    biome: 'shallows',
    light: 1,
    current: 0.5,
    tardigradeUntil: 0,
    hitstop: 0,
    victory: false,
    view: { x: 0, y: 0, halfW: 600, halfH: 400 },
    ambientTimer: 0,
    discoverTimer: 0,
    knownSpecies: new Set(knownSpecies),
    divisionChoices: null,
    nextOrganelleId: 2,
    nextVacuoleId: 1,
  };
}

export type SpawnOpts = {
  radius?: number;
  angle?: number;
  chunk?: string;
  vx?: number;
  vy?: number;
  carrier?: boolean;
  satellites?: number;
  rng?: Rng;
  spawnT?: number;
};

export function spawnEntity(state: GameState, species: SpeciesId, x: number, y: number, opts: SpawnOpts = {}): Entity {
  const def = SPECIES[species];
  const rng = opts.rng ?? state.rng;
  const radius = opts.radius ?? rand(rng, def.radius[0], def.radius[1]);
  const hp = Math.max(1, def.hpPerRadius * radius);
  const e: Entity = {
    id: state.nextId++,
    species,
    x,
    y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    angle: opts.angle ?? rng() * Math.PI * 2,
    spin: (rng() - 0.5) * 0.6,
    radius,
    hp,
    maxHp: hp,
    seed: Math.floor(rng() * 1e9),
    age: 0,
    state: 0,
    timer: rng() * 2,
    targetId: 0,
    homeX: x,
    homeY: y,
    wander: 0,
    reach: 0,
    reachAngle: 0,
    carrier: opts.carrier ?? (def.carrierChance ? rng() < def.carrierChance : false),
    satellites: opts.satellites ?? 0,
    attachedTo: 0,
    attachAngle: 0,
    attachTimer: 0,
    stun: 0,
    hitFlash: 0,
    aux: 0,
    aux2: 0,
    infection: 0,
    infectedBy: null,
    spawnT: opts.spawnT ?? 0,
    dead: false,
    chunk: opts.chunk ?? '',
  };
  e.wander = e.angle;
  state.entities.push(e);
  state.byId.set(e.id, e);
  return e;
}

export function removeEntity(state: GameState, e: Entity) {
  if (e.dead) return;
  e.dead = true;
  state.byId.delete(e.id);
}

export function emit(state: GameState, event: SimEvent) {
  state.events.push(event);
}

export function alive(units: CellUnit[]): CellUnit[] {
  return units.filter((u) => !u.dead);
}
