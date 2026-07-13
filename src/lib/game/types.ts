export type Vec2 = { x: number; y: number };

export type SpeciesId =
  | 'amoeba'
  | 'tardigrade'
  | 'spikyVirus'
  | 'rodBacteria'
  | 'flagellateProtist'
  | 'ciliate'
  | 'giantVirus'
  | 'fungiWall'
  | 'mitochondrion'
  | 'golgi'
  | 'nucleus';

export type OrganismKind = 'ambient' | 'wall' | 'infectious' | 'organelle';

export type OrganelleType = 'mitochondrion' | 'golgi' | 'nucleus';
export type OrganelleLevels = Record<OrganelleType, number>;

export type MetabolicStance = 'forage' | 'homeostasis' | 'replicate';
export type AutomationRule = 'rnai' | 'autophagy';
export type CellAutomation = Record<AutomationRule, boolean>;

export type CellStage = 'forage' | 'assemble' | 'stabilize' | 'replicate' | 'division' | 'complete';
export type DeathCause = 'starvation' | 'membrane-rupture' | 'genome-hijack';

export type OrganellePlacement = {
  id: string;
  type: OrganelleType;
  slot: number;
};

export type ArchitectureBonuses = {
  score: number;
  atpConversion: number;
  glucoseUptake: number;
  movementSpeed: number;
  damageReduction: number;
  viralResistance: number;
  biomassSynthesis: number;
  lysosomeRadius: number;
};

export type EntitySize = number | { width: number; height: number };

// Visual parameters generated once at world-gen time and never mutated.
export type OrganismRenderProps = {
  duration: number;
  delay: number;
  opacity: number;
  initialRotation: number;
  animationDirection: 'normal' | 'reverse';
};

export type Organism = {
  id: string;
  chunk: { x: number; y: number };
  species: SpeciesId;
  kind: OrganismKind;
  organelleType?: OrganelleType;
  // Per-instance behavior, never stored on the shared component.
  harmful: boolean;
  // Harmful ambients can be devoured when smaller than the player; walls cannot.
  devourable: boolean;
  autonomous: boolean;
  pos: Vec2;
  heading: number; // radians, current facing for autonomous movement
  displayRotation: number; // degrees, smoothed toward heading
  speed: number; // px/second
  size: EntitySize;
  // Circle collision radius; walls use their rect (size) instead.
  collisionRadius: number;
  render: OrganismRenderProps;
};

export type SugarParticle = {
  id: string;
  x: number;
  y: number;
  size: number;
  createdAt: number; // sim-time seconds
};

export type AntiviralParticle = {
  id: string;
  x: number;
  y: number;
};

export type PlayerState = {
  pos: Vec2;
  vel: Vec2;
  size: number;
  score: number;
  energy: number;
  glucose: number;
  biomass: number;
  integrity: number;
  maxIntegrity: number;
  organelleLevels: OrganelleLevels;
  shieldUntil: number;
  boostUntil: number;
  lysosomeCooldownUntil: number;
  kills: number;
  starving: boolean;
  invulnerableUntil: number; // sim-time seconds
  flickering: boolean;
  infected: boolean;
  infectionStart: number;
  infectionProgress: number; // 0..100
  metabolicStance: MetabolicStance;
  automation: CellAutomation;
  architecture: OrganellePlacement[];
  sugarsEaten: number;
  stage: CellStage;
  divisionActive: boolean;
  divisionProgress: number;
  won: boolean;
  deathCause: DeathCause | null;
  dying: boolean;
  dyingSince: number;
  dead: boolean;
};

export type SimInput = {
  // Desired movement direction, each component in [-1, 1].
  moveX: number;
  moveY: number;
};

export type SimEvent =
  | { type: 'damaged' }
  | { type: 'infected' }
  | { type: 'cured' }
  | { type: 'organelleCollected'; organelle: OrganelleType }
  | { type: 'sugarEaten'; size: number }
  | { type: 'devoured' }
  | { type: 'ability'; organelle: OrganelleType }
  | { type: 'upgrade'; organelle: OrganelleType }
  | { type: 'architectureChanged' }
  | { type: 'stanceChanged'; stance: MetabolicStance }
  | { type: 'automationChanged'; rule: AutomationRule; enabled: boolean }
  | { type: 'stageChanged'; stage: CellStage }
  | { type: 'divisionStarted' }
  | { type: 'divisionCancelled' }
  | { type: 'won' }
  | { type: 'wave'; level: number }
  | { type: 'died' };
