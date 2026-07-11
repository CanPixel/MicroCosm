import { AMBIENT_ACTIVE_CHANCE } from './constants';
import { fractalNoise2D, mulberry32, Rng } from './rng';
import { EntitySize, Organism, OrganelleType, OrganismKind, SpeciesId } from './types';

export const WORLD_CHUNK_SIZE = 1200;

type SpeciesDef = {
  kind: OrganismKind;
  organelleType?: OrganelleType;
  autonomous: boolean;
  permanentlyHostile: boolean;
  size: (rng: Rng) => EntitySize;
  collisionScale?: number;
};

const defaultSize = (rng: Rng) => rng() * 80 + 20;

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  mitochondrion: { kind: 'organelle', organelleType: 'mitochondrion', autonomous: false, permanentlyHostile: false, size: defaultSize },
  golgi: { kind: 'organelle', organelleType: 'golgi', autonomous: false, permanentlyHostile: false, size: defaultSize },
  nucleus: { kind: 'organelle', organelleType: 'nucleus', autonomous: false, permanentlyHostile: false, size: defaultSize },
  fungiWall: {
    kind: 'wall', autonomous: false, permanentlyHostile: true,
    size: (rng) => {
      const length = rng() * 170 + 210;
      const thickness = rng() * 12 + 34;
      return rng() > 0.5 ? { width: length, height: thickness } : { width: thickness, height: length };
    },
  },
  bacteriophage: { kind: 'infectious', autonomous: true, permanentlyHostile: false, size: defaultSize, collisionScale: 0.38 },
  amoeba: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: (rng) => rng() * 150 + 250, collisionScale: 0.34 },
  tardigrade: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: defaultSize, collisionScale: 0.39 },
  spikyVirus: { kind: 'ambient', autonomous: true, permanentlyHostile: true, size: defaultSize, collisionScale: 0.46 },
  rodBacteria: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: defaultSize, collisionScale: 0.43 },
  flagellateProtist: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: defaultSize, collisionScale: 0.36 },
  ciliate: { kind: 'ambient', autonomous: true, permanentlyHostile: false, size: defaultSize, collisionScale: 0.4 },
};

const SPAWN_TABLE: Array<[number, SpeciesId]> = [
  [0.08, 'mitochondrion'], [0.16, 'golgi'], [0.24, 'nucleus'], [0.29, 'fungiWall'],
  [0.35, 'bacteriophage'], [0.45, 'amoeba'], [0.55, 'tardigrade'], [0.65, 'spikyVirus'],
  [0.75, 'rodBacteria'], [0.85, 'flagellateProtist'], [1.01, 'ciliate'],
];

function pickSpecies(rng: Rng): SpeciesId {
  const roll = rng();
  return SPAWN_TABLE.find(([threshold]) => roll < threshold)?.[1] ?? 'ciliate';
}

export function maxDimension(size: EntitySize): number {
  return typeof size === 'number' ? size : Math.max(size.width, size.height);
}

export function renderDimensions(organism: Pick<Organism, 'species' | 'size'>) {
  if (typeof organism.size !== 'number') return organism.size;
  return organism.species === 'rodBacteria'
    ? { width: organism.size, height: organism.size * 0.5 }
    : { width: organism.size, height: organism.size };
}

function seedForChunk(seed: number, chunkX: number, chunkY: number) {
  return (seed ^ Math.imul(chunkX, 73856093) ^ Math.imul(chunkY, 19349663)) >>> 0;
}

export function chunkKey(chunkX: number, chunkY: number) {
  return `${chunkX}:${chunkY}`;
}

export function generateChunk(seed: number, chunkX: number, chunkY: number): Organism[] {
  const rng = mulberry32(seedForChunk(seed, chunkX, chunkY));
  const noiseSeed = seed ^ 0x7f4a7c15;
  const count = 5 + Math.floor(rng() * 4);
  const organisms: Organism[] = [];

  for (let i = 0; i < count; i++) {
    const species = pickSpecies(rng);
    const def = SPECIES[species];
    const size = def.size(rng);
    const dimension = maxDimension(size);
    let pos = {
      x: chunkX * WORLD_CHUNK_SIZE + rng() * WORLD_CHUNK_SIZE,
      y: chunkY * WORLD_CHUNK_SIZE + rng() * WORLD_CHUNK_SIZE,
    };

    // Bias ambient organisms toward stable, repeatable ecological patches.
    if (def.kind === 'ambient') {
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = {
          x: chunkX * WORLD_CHUNK_SIZE + rng() * WORLD_CHUNK_SIZE,
          y: chunkY * WORLD_CHUNK_SIZE + rng() * WORLD_CHUNK_SIZE,
        };
        const density = fractalNoise2D(candidate.x, candidate.y, 1 / 900, noiseSeed);
        pos = candidate;
        if (rng() < 0.18 + density * density * 0.82) break;
      }
    }

    // Keep the starting microscope field navigable.
    if ((species === 'amoeba' || species === 'fungiWall') && Math.hypot(pos.x, pos.y) < 520 + dimension) {
      pos = {
        x: chunkX * WORLD_CHUNK_SIZE + WORLD_CHUNK_SIZE * (0.72 + rng() * 0.22),
        y: chunkY * WORLD_CHUNK_SIZE + WORLD_CHUNK_SIZE * (0.72 + rng() * 0.22),
      };
    }

    const ambientActive = def.kind === 'ambient' && rng() < AMBIENT_ACTIVE_CHANCE;
    const harmful = def.permanentlyHostile || def.kind === 'wall' || ambientActive;
    const opacity = def.kind === 'ambient' && !def.permanentlyHostile
      ? ambientActive ? rng() * 0.2 + 0.8 : rng() * 0.2 + 0.12
      : 1;

    organisms.push({
      id: `chunk-${chunkX}-${chunkY}-${i}`,
      chunk: { x: chunkX, y: chunkY },
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
      collisionRadius: dimension * (def.collisionScale ?? 0.5),
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
