// Core data model for the MicroCosm simulation. Everything here is plain data
// so the sim stays renderer-agnostic and unit-testable.

export type Vec2 = { x: number; y: number };

export type BiomeId = 'shallows' | 'biofilm' | 'bloom' | 'abyss' | 'rift';
export const BIOME_IDS: BiomeId[] = ['shallows', 'biofilm', 'bloom', 'abyss', 'rift'];

export type LightMode = 'bright' | 'dark' | 'fluor';

export type SpeciesId =
  // resources
  | 'glucose' | 'debris' | 'dna' | 'lipid'
  // bacteria
  | 'cocci' | 'bacillus' | 'spirillum' | 'proteo' | 'cyano'
  // protists
  | 'diatom' | 'euglena' | 'paramecium' | 'didinium' | 'lacrymaria' | 'amoeba' | 'testate' | 'stentor'
  // animalcules
  | 'gastrotrich' | 'rotifer' | 'hydra' | 'collotheca' | 'tardigrade'
  // infectious agents along the aliveness spectrum
  | 'prion' | 'viroid' | 'satellite' | 'adenovirus' | 'retrovirus' | 'tmv' | 'phage' | 'mimivirus' | 'virophage'
  // other
  | 'neoplasm' | 'pollen';

export type SpeciesGroup = 'resource' | 'bacteria' | 'protist' | 'animal' | 'agent' | 'boss' | 'obstacle';

export type Behavior =
  | 'drift' | 'swim' | 'corkscrew' | 'hunter' | 'neck' | 'engulfer' | 'testate' | 'vortex'
  | 'tentacles' | 'trap' | 'lumber' | 'virus' | 'swarm' | 'virophage' | 'neoplasm' | 'grazer';

export type HostClass = 'bacteria' | 'eukaryote' | 'plant' | 'amoeboid' | 'giantVirus';

export type InfectionStyle = 'lytic' | 'lysogenic' | 'viroid' | 'prion';

export type OrganelleType =
  | 'nucleus' | 'mitochondrion' | 'chloroplast' | 'er' | 'golgi' | 'lysosome'
  | 'vacuole' | 'cytoskeleton' | 'flagellum' | 'cilia' | 'extrusome' | 'eyespot';

export type CellFate = 'prime' | 'photocyte' | 'ciliocyte' | 'phagocyte' | 'cnidocyte' | 'germ';

export type AbilityId = 'dash' | 'lysosome' | 'toxicyst' | 'rnai' | 'encyst' | 'virophage';

export type MutationId =
  | 'pellicle' | 'contractileVacuole' | 'cytostome' | 'cristae' | 'phototaxis' | 'interferon'
  | 'chaperonin' | 'dsup' | 'glycogen' | 'hydrolase' | 'flagellarMotor' | 'cadherin'
  | 'bioluminescence' | 'venom' | 'endosymbiontPact' | 'pseudopodSurge' | 'hgt' | 'quorum';

export type DeathCause =
  | 'rupture' | 'starvation' | 'lysis' | 'digested' | 'proteostasis' | 'neoplasm';

export type Entity = {
  id: number;
  species: SpeciesId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  radius: number;
  hp: number;
  maxHp: number;
  seed: number;
  age: number;
  // Behavior state machine.
  state: number;
  timer: number;
  targetId: number;
  // Anchor for sessile species and territorial bosses.
  homeX: number;
  homeY: number;
  // Wander heading target.
  wander: number;
  // Lacrymaria neck / hydra reach / collotheca funnel animation, 0..1.
  reach: number;
  reachAngle: number;
  // Carries intracellular bacteria (only visible under fluorescence).
  carrier: boolean;
  // Viruses: satellite RNAs hitching a ride on the capsid.
  satellites: number;
  // Host-attachment for viruses/viroids attached to another entity.
  attachedTo: number;
  attachAngle: number;
  attachTimer: number;
  stun: number;
  hitFlash: number;
  // Species-specific counters (cooldowns, payloads, split count).
  aux: number;
  aux2: number;
  // NPC infection: seconds since a virus injected this host, and by whom.
  infection: number;
  infectedBy: SpeciesId | null;
  // Fades in on spawn and out on death.
  spawnT: number;
  dead: boolean;
  // Chunk that owns the entity for streaming; empty when dynamic.
  chunk: string;
};

export type FoodVacuole = {
  id: number;
  species: SpeciesId;
  seed: number;
  radius: number;
  // Local position in the unit, normalized to the unit radius.
  lx: number;
  ly: number;
  progress: number;
  duration: number;
  biomass: number;
  glucose: number;
  dna: number;
  lipid: number;
  carrier: boolean;
  // Engulf phase: 0 = being pulled through the membrane, 1 = internalized.
  intake: number;
  startX: number;
  startY: number;
};

export type Attachment = {
  id: number;
  species: SpeciesId;
  angle: number;
  timer: number;
  injectAt: number;
  satellites: number;
  seed: number;
};

export type MembraneState = {
  r: Float32Array;
  v: Float32Array;
  target: Float32Array;
  pods: Array<{ angle: number; extent: number; age: number; life: number }>;
  podTimer: number;
};

export type CellUnit = {
  id: number;
  fate: CellFate;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  radius: number;
  biomass: number;
  integrity: number;
  maxIntegrity: number;
  membrane: MembraneState;
  vacuoles: FoodVacuole[];
  attached: Attachment[];
  hitFlash: number;
  hitAngle: number;
  // Formation slot around the prime cell (angle in the prime's local frame).
  slotAngle: number;
  slotRing: number;
  // Seconds of contact-damage immunity left for this unit.
  hitCooldown: number;
  // Throttles feedback events for continuous damage (digestion, rupture).
  dotTick: number;
  born: number;
  dead: boolean;
};

export type Organelle = {
  id: number;
  type: OrganelleType;
  slot: number;
  misfolded: boolean;
  born: number;
  // Biomass invested; part of the prime cell's total biomass.
  mass: number;
  // Smoothed render position in normalized cell coordinates.
  px: number;
  py: number;
};

export type Infection = {
  viralLoad: number;
  satelliteBoost: number;
  prophages: number;
  colonies: number;
  misfoldTimer: number;
  refoldTimer: number;
  colonyTimer: number;
  lastVirus: SpeciesId | null;
};

export type Capture = {
  byId: number;
  species: SpeciesId;
  struggle: number;
  time: number;
};

export type Traits = {
  atpCap: number;
  glucoseCap: number;
  glycolysis: number; // glucose/s through glycolysis
  mitoRate: number; // glucose/s through mitochondria
  atpPerGlucoseMito: number;
  photoRate: number; // glucose/s at full light
  speed: number;
  accel: number;
  maxIntegrity: number;
  regen: number;
  digestion: number;
  vacuoleSlots: number;
  engulfRatio: number;
  viralResistance: number;
  prionResistance: number;
  damageReduction: number;
  dashCooldown: number;
  lysoRadius: number;
  lysoDamage: number;
  dartCount: number;
  dartDamage: number;
  dartStun: number;
  senseRadius: number;
  buildDiscount: number;
  maxCells: number;
  glow: number; // bioluminescence radius
  dnaRate: number;
  slots: number;
  abilities: AbilityId[];
};

export type Mutation = { id: MutationId; stacks: number };

export type Player = {
  units: CellUnit[];
  organelles: Organelle[];
  glucose: number;
  atp: number;
  dna: number;
  storedVirophages: number;
  generation: number;
  mutations: Mutation[];
  traits: Traits;
  traitsDirty: boolean;
  cooldowns: Record<AbilityId, number>;
  dashUntil: number;
  dashDir: Vec2;
  shieldUntil: number;
  invulnUntil: number;
  cystUntil: number;
  capture: Capture | null;
  infection: Infection;
  starving: boolean;
  dividing: number; // 0 when idle, else progress 0..1
  pendingDivision: boolean;
  dead: boolean;
  dying: number;
  deathCause: DeathCause | null;
  killer: SpeciesId | null;
  lastDevoured: SpeciesId | null;
  aimX: number;
  aimY: number;
  moving: number;
  lastMoveAngle: number;
  divisionReadyNotified: boolean;
};

export type DivisionChoices = { fates: CellFate[]; mutations: MutationId[]; daughterId: number };

export type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  stun: number;
  owner: 'player' | 'enemy';
};

export type Shockwave = { x: number; y: number; t: number; duration: number; radius: number; strength: number; color: string };

// HUD elements and controls the player earns as the run unfolds.
export const UNLOCK_IDS = ['glucose', 'radar', 'biomass', 'dash', 'architect', 'dna', 'microscope', 'colony'] as const;
export type UnlockId = (typeof UNLOCK_IDS)[number];

export type SimEvent =
  | { type: 'eat'; species: SpeciesId; x: number; y: number; amount: number }
  | { type: 'engulfStart'; species: SpeciesId; x: number; y: number; unit: number }
  | { type: 'digested'; species: SpeciesId; x: number; y: number; amount: number }
  | { type: 'damage'; amount: number; x: number; y: number; unit: number; source: SpeciesId | 'burst' | 'misc' }
  | { type: 'kill'; species: SpeciesId; x: number; y: number }
  | { type: 'endosymbiosis'; organelle: OrganelleType; x: number; y: number }
  | { type: 'attach'; species: SpeciesId; x: number; y: number }
  | { type: 'shake'; count: number; x: number; y: number }
  | { type: 'infection'; style: InfectionStyle; species: SpeciesId }
  | { type: 'lysisBurst'; x: number; y: number }
  | { type: 'induction' }
  | { type: 'misfold'; organelle: OrganelleType }
  | { type: 'colonized' }
  | { type: 'cured'; what: 'virus' | 'prophage' | 'prion' | 'colony' | 'viroid' }
  | { type: 'captured'; species: SpeciesId }
  | { type: 'escaped'; species: SpeciesId }
  | { type: 'ability'; ability: AbilityId; x: number; y: number }
  | { type: 'build'; organelle: OrganelleType }
  | { type: 'divisionReady' }
  | { type: 'divisionStart' }
  | { type: 'divided'; generation: number }
  | { type: 'mutation'; id: MutationId }
  | { type: 'cellLost'; x: number; y: number }
  | { type: 'event'; kind: DirectorEventKind; x: number; y: number }
  | { type: 'objective'; index: number }
  | { type: 'unlock'; id: UnlockId }
  | { type: 'discover'; species: SpeciesId }
  | { type: 'npcBurst'; species: SpeciesId; x: number; y: number }
  | { type: 'stun'; x: number; y: number }
  | { type: 'tardigrade' }
  | { type: 'victory' }
  | { type: 'death'; cause: DeathCause };

export type DirectorEventKind = 'viralStorm' | 'prionFog' | 'phageBurst' | 'glucoseBloom' | 'neoplasm' | 'currentSurge' | 'virophageSwarm';

export type DirectorState = {
  pressure: number;
  nextEventAt: number;
  activeEvent: { kind: DirectorEventKind; until: number; x: number; y: number } | null;
  surge: number;
  bossSpawned: number;
};

export type Stats = {
  eaten: number;
  kills: number;
  glucose: number;
  maxDistance: number;
  divisions: number;
  infectionsCleared: number;
  peakCells: number;
  peakBiomass: number;
  discovered: number;
};
