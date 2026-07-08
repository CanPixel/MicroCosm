import {
  AMBIENT_ACTIVE_CHANCE,
  NO_SPAWN_RADIUS,
  ORGANISM_COUNT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import { fractalNoise2D, mulberry32, Rng } from './rng';
import { EntitySize, Organism, OrganelleType, OrganismKind, SpeciesId } from './types';

// Data-driven species behavior. This replaces the old pattern of mutating
// static flags on the shared React components, which leaked one instance's
// "harmful" roll onto every other instance of the species.
type SpeciesDef = {
  kind: OrganismKind;
  organelleType?: OrganelleType;
  autonomous: boolean;
  // Always hostile and never devourable (contact is punished regardless of size).
  permanentlyHostile: boolean;
  size: (rng: Rng) => EntitySize;
};

const defaultSize = (rng: Rng) => rng() * 80 + 20;

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  mitochondrion: { kind: 'organelle', organelleType: 'mitochondrion', autonomous: false, permanentlyHostile: false, size: defaultSize },
  golgi: { kind: 'organelle', organelleType: 'golgi', autonomous: false, permanentlyHostile: false, size: defaultSize },
  nucleus: { kind: 'organelle', organelleType: 'nucleus', autonomous: false, permanentlyHostile: false, size: defaultSize },
  fungiWall: {
    kind: 'wall',
    autonomous: false,
    permanentlyHostile: true,
    size: (rng) => {
      const isHorizontal = rng() > 0.5;
      const length = rng() * 200 + 300;
      const thickness = 50;
      return isHorizontal ? { width: length, height: thickness } : { width: thickness, height: length };
    },
  },
  bacteriophage: { kind: 'infectious', autonomous: true, permanentlyHostile: false, size: defaultSize },
  amoeba: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: (rng) => rng() * 150 + 250 },
  tardigrade: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: defaultSize },
  spikyVirus: { kind: 'ambient', autonomous: true, permanentlyHostile: true, size: defaultSize },
  rodBacteria: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: defaultSize },
  flagellateProtist: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: defaultSize },
  ciliate: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: defaultSize },
};

// Cumulative spawn distribution (matches the original draft's ratios).
const SPAWN_TABLE: Array<[number, SpeciesId]> = [
  [0.08, 'mitochondrion'],
  [0.16, 'golgi'],
  [0.24, 'nucleus'],
  [0.3, 'fungiWall'],
  [0.35, 'bacteriophage'],
  [0.45, 'amoeba'],
  [0.55, 'tardigrade'],
  [0.65, 'spikyVirus'],
  [0.75, 'rodBacteria'],
  [0.85, 'flagellateProtist'],
  [1.01, 'ciliate'],
];

function pickSpecies(rng: Rng): SpeciesId {
  const roll = rng();
  for (const [threshold, id] of SPAWN_TABLE) {
    if (roll < threshold) return id;
  }
  return 'ciliate';
}

export function maxDimension(size: EntitySize): number {
  return typeof size === 'number' ? size : Math.max(size.width, size.height);
}

// Sample a position clustered by the world's noise field: denser regions of
// the field are more likely to host life, which produces organic-looking
// colonies instead of a uniform scatter.
function samplePosition(rng: Rng, noiseSeed: number, clustered: boolean): { x: number; y: number } {
  for (let attempt = 0; attempt < 8; attempt++) {
    const x = rng() * WORLD_WIDTH;
    const y = rng() * WORLD_HEIGHT;
    if (!clustered) return { x, y };
    const density = fractalNoise2D(x, y, 1 / 900, noiseSeed);
    if (rng() < 0.15 + 0.85 * density * density) return { x, y };
  }
  return { x: rng() * WORLD_WIDTH, y: rng() * WORLD_HEIGHT };
}

export function generateWorld(seed: number): Organism[] {
  const rng = mulberry32(seed);
  const noiseSeed = Math.floor(rng() * 0xffffffff);
  const playerSpawn = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
  const organisms: Organism[] = [];

  for (let i = 0; i < ORGANISM_COUNT; i++) {
    const species = pickSpecies(rng);
    const def = SPECIES[species];
    const size = def.size(rng);
    const dimension = maxDimension(size);

    // Ambient organisms roll per-instance whether they are "active" (hostile,
    // vivid) or harmless low-opacity background life.
    const ambientActive = def.kind === 'ambient' && rng() < AMBIENT_ACTIVE_CHANCE;
    const harmful = def.permanentlyHostile || def.kind === 'wall' || ambientActive;

    let opacity = 1;
    if (def.kind === 'ambient' && !def.permanentlyHostile) {
      opacity = ambientActive ? rng() * 0.2 + 0.8 : rng() * 0.2 + 0.1;
    }

    // Keep big/hostile obstacles away from the player spawn.
    const keepClear = species === 'amoeba' || species === 'fungiWall';
    let pos = samplePosition(rng, noiseSeed, def.kind === 'ambient');
    if (keepClear) {
      let guard = 0;
      while (Math.hypot(pos.x - playerSpawn.x, pos.y - playerSpawn.y) < NO_SPAWN_RADIUS + dimension && guard++ < 100) {
        pos = samplePosition(rng, noiseSeed, false);
      }
    }

    const collisionRadius =
      species === 'amoeba' ? (dimension * 0.7) / 2 : dimension / 2;

    organisms.push({
      id: `organism-${i}`,
      species,
      kind: def.kind,
      organelleType: def.organelleType,
      harmful,
      devourable: harmful && !def.permanentlyHostile && def.kind === 'ambient',
      autonomous: def.autonomous,
      pos,
      heading: rng() * Math.PI * 2,
      displayRotation: rng() * 360,
      speed: def.autonomous ? rng() * 30 + 15 : 0,
      size,
      collisionRadius,
      render: {
        duration: rng() * 40 + 20,
        delay: rng() * -60,
        opacity,
        initialRotation: species === 'fungiWall' ? 0 : rng() * 360,
        animationDirection: rng() < 0.5 ? 'normal' : 'reverse',
      },
    });
  }

  return organisms;
}
