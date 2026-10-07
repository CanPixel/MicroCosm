import { describe, expect, test } from 'bun:test';
import { biomeWeights, dominantBiome } from '../src/game/sim/biomes';
import { castAbility } from '../src/game/sim/combat';
import { attachAgent } from '../src/game/sim/infection';
import { angleDiff } from '../src/game/sim/math';
import { createMembrane, stepMembrane, type MembraneInput } from '../src/game/sim/membrane';
import { buildCost, canBuild, computeTraits, SLOT_NEIGHBORS } from '../src/game/sim/organelles';
import {
  buildOrganelle, canDivide, canUnitEat, chooseDivision, divisionDnaCost, divisionThreshold, spendableBiomass, startDivision,
} from '../src/game/sim/player';
import { mulberry32 } from '../src/game/sim/rng';
import { createGame, stepGame } from '../src/game/sim/sim';
import { BODY_BIOMASS, NO_INPUT, spawnEntity, type GameState, type SimInput } from '../src/game/sim/state';
import { chunkKey, generateChunk } from '../src/game/sim/world';
import { createState } from '../src/game/sim/state';
import { SPECIES } from '../src/game/sim/species';
import type { OrganelleType } from '../src/game/sim/types';

const view = (s: GameState) => ({ x: s.player.units[0].x, y: s.player.units[0].y, halfW: 720, halfH: 450 });

function run(s: GameState, seconds: number, input: SimInput = NO_INPUT) {
  for (let i = 0; i < seconds * 30; i++) stepGame(s, 1 / 30, input, view(s));
}

// A clean world with only what the test spawns.
function emptyWorld(seed = 1) {
  const s = createGame(seed);
  s.entities = [];
  s.byId.clear();
  s.director.nextEventAt = 1e9;
  // Mark the neighborhood as loaded so streaming does not repopulate it.
  for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) s.loadedChunks.add(chunkKey(x, y));
  s.ambientTimer = 1e9;
  return s;
}

function grant(s: GameState, biomass: number, dna = 0) {
  s.player.units[0].biomass += biomass;
  s.player.dna += dna;
}

function addOrganelle(s: GameState, type: OrganelleType, slot: number) {
  s.player.organelles.push({ id: s.nextOrganelleId++, type, slot, misfolded: false, born: 0, mass: 0, px: 0, py: 0 });
  s.player.traitsDirty = true;
}

describe('membrane', () => {
  const base = (rand: () => number): MembraneInput => ({
    radius: 30, heading: 0, speed: 1, time: 0, dt: 1 / 60, seed: 1, liveliness: 1,
    bodies: [], engulfing: [], neighbors: [], rigid: false, pinch: 0, rand,
  });

  test('stays a positive, star-shaped loop through violent turns and engulfing', () => {
    const rand = mulberry32(4);
    const m = createMembrane(30);
    for (let f = 0; f < 1200; f++) {
      const heading = f % 40 < 20 ? 0 : Math.PI; // repeated 180 degree reversals
      stepMembrane(m, {
        ...base(rand), heading, time: f / 60,
        bodies: [{ x: Math.cos(f * 0.1) * 20, y: Math.sin(f * 0.1) * 20, r: 8 }],
        engulfing: f % 200 < 50 ? [{ x: 40, y: 0, r: 12 }] : [],
        pinch: f > 900 ? 0.8 : 0,
      });
      for (let i = 0; i < m.r.length; i++) {
        expect(Number.isFinite(m.r[i])).toBe(true);
        expect(m.r[i]).toBeGreaterThan(30 * 0.4);
      }
    }
  });

  test('organelles push the wall outward past their own edge', () => {
    const rand = mulberry32(2);
    const m = createMembrane(30);
    for (let f = 0; f < 240; f++) stepMembrane(m, { ...base(rand), speed: 0, liveliness: 0, bodies: [{ x: 28, y: 0, r: 10 }] });
    expect(m.r[0]).toBeGreaterThan(38);
  });

  test('colony neighbours produce a flat shared wall at the bisector', () => {
    const rand = mulberry32(3);
    const m = createMembrane(30);
    for (let f = 0; f < 120; f++) stepMembrane(m, { ...base(rand), speed: 0, neighbors: [{ x: 45, y: 0, r: 30 }] });
    // Along +x the wall must not cross the midpoint between the two cells.
    expect(m.r[0]).toBeLessThanOrEqual(22.5);
  });
});

describe('world', () => {
  test('biome weights are a partition of unity and the origin is sunlit', () => {
    const w = new Float32Array(5);
    for (const [x, y] of [[0, 0], [9000, -4000], [-20000, 15000]]) {
      biomeWeights(x, y, 99, w);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4);
    }
    expect(dominantBiome(0, 0, 99)).toBe('shallows');
  });

  test('chunks regenerate identically from the seed', () => {
    const a = createState(1234);
    const b = createState(1234);
    generateChunk(a, 3, -2);
    generateChunk(b, 3, -2);
    expect(a.entities.map((e) => `${e.species}:${e.x.toFixed(2)}:${e.y.toFixed(2)}`))
      .toEqual(b.entities.map((e) => `${e.species}:${e.x.toFixed(2)}:${e.y.toFixed(2)}`));
  });

  test('streams new ground and forgets the old after long travel', () => {
    const s = createGame(31);
    run(s, 0.2);
    const originIds = new Set(s.entities.map((e) => e.id));
    expect(s.loadedChunks.size).toBeGreaterThan(8);
    s.player.units[0].x = 60_000;
    s.player.units[0].y = -40_000;
    run(s, 0.2);
    expect(s.entities.filter((e) => originIds.has(e.id))).toHaveLength(0);
    expect(s.entities.length).toBeGreaterThan(20);
  });
});

describe('predation by size', () => {
  test('engulfs smaller prey into a food vacuole and digests it into biomass', () => {
    const s = emptyWorld();
    const prime = s.player.units[0];
    const prey = spawnEntity(s, 'bacillus', prime.x + 10, prime.y, { radius: 7 });
    const before = prime.biomass;
    expect(canUnitEat(s.player, prime, prey)).toBe(true);
    run(s, 0.1);
    expect(prime.vacuoles.length).toBe(1);
    run(s, 5);
    expect(prime.vacuoles.length).toBe(0);
    expect(prime.biomass).toBeGreaterThan(before + 1);
    expect(s.stats.eaten).toBe(1);
  });

  test('cannot engulf something larger than itself', () => {
    const s = emptyWorld();
    const prime = s.player.units[0];
    const big = spawnEntity(s, 'paramecium', prime.x + 200, prime.y, { radius: 28 });
    expect(canUnitEat(s.player, prime, big)).toBe(false);
  });

  test('engulfing an α-proteobacterium installs a mitochondrion (endosymbiosis)', () => {
    const s = emptyWorld();
    const prime = s.player.units[0];
    spawnEntity(s, 'proteo', prime.x + 8, prime.y, { radius: 7 });
    run(s, 1);
    expect(s.player.organelles.some((o) => o.type === 'mitochondrion')).toBe(true);
    expect(s.events.length >= 0).toBe(true);
    expect(s.player.traits.mitoRate).toBeGreaterThan(0);
  });
});

describe('cell architecture', () => {
  test('building requires prerequisites and spare biomass beyond the body', () => {
    const s = emptyWorld();
    expect(spendableBiomass(s.player)).toBeLessThan(18);
    expect(canBuild(s.player, 'er', spendableBiomass(s.player)).ok).toBe(false);
    expect(canBuild(s.player, 'golgi', 100).reason).toContain('Endoplasmic');
    expect(canBuild(s.player, 'mitochondrion', 100).reason).toContain('proteobacterium');
    grant(s, 40, 2);
    expect(buildOrganelle(s, 'er')).toBe(true);
    expect(buildOrganelle(s, 'golgi')).toBe(true);
    s.player.traits = computeTraits(s.player);
    expect(s.player.traits.abilities).toContain('rnai');
  });

  test('an ER beside the nucleus makes construction cheaper', () => {
    const s = emptyWorld();
    const plain = buildCost(s.player, 'vacuole').biomass;
    addOrganelle(s, 'er', 1);
    expect(SLOT_NEIGHBORS[1]).toContain(0);
    s.player.traits = computeTraits(s.player);
    expect(buildCost(s.player, 'vacuole').biomass).toBeLessThan(plain);
  });

  test('chloroplasts photosynthesize more in the cortex than deep inside', () => {
    const s = emptyWorld();
    addOrganelle(s, 'chloroplast', 1);
    const inner = computeTraits(s.player).photoRate;
    s.player.organelles[1].slot = 7;
    expect(computeTraits(s.player).photoRate).toBeGreaterThan(inner);
  });
});

describe('infection', () => {
  test('a docked virus injects, replicates, and RNA interference cuts the load', () => {
    const s = emptyWorld();
    addOrganelle(s, 'er', 1);
    const prime = s.player.units[0];
    attachAgent(s, prime, 'adenovirus', 0, 0, 1);
    run(s, 3);
    expect(prime.attached).toHaveLength(0);
    expect(s.player.infection.viralLoad).toBeGreaterThan(15);
    const load = s.player.infection.viralLoad;
    s.player.atp = 100;
    expect(castAbility(s, 'rnai', NO_INPUT)).toBe(true);
    expect(s.player.infection.viralLoad).toBeLessThan(load);
  });

  test('a dash can shake a virion off before it injects', () => {
    const s = emptyWorld(7);
    const prime = s.player.units[0];
    for (let i = 0; i < 6; i++) attachAgent(s, prime, 'adenovirus', i, 0, i);
    s.player.atp = 100;
    expect(castAbility(s, 'dash', { ...NO_INPUT, moveX: 1 })).toBe(true);
    expect(prime.attached.length).toBeLessThan(6);
  });

  test('an unchecked lytic infection bursts the membrane and releases virions', () => {
    const s = emptyWorld();
    s.player.infection.viralLoad = 99;
    s.player.infection.lastVirus = 'adenovirus';
    const integrity = s.player.units[0].integrity;
    run(s, 1);
    expect(s.player.units[0].integrity).toBeLessThan(integrity);
    expect(s.entities.filter((e) => e.species === 'adenovirus').length).toBeGreaterThan(0);
    expect(s.player.infection.viralLoad).toBeLessThan(40);
  });

  test('prions misfold organelles and a lysosome burst recycles them', () => {
    const s = emptyWorld();
    for (const [t, slot] of [['er', 1], ['golgi', 2], ['lysosome', 3]] as Array<[OrganelleType, number]>) addOrganelle(s, t, slot);
    const prime = s.player.units[0];
    spawnEntity(s, 'prion', prime.x + 5, prime.y);
    run(s, 0.2);
    expect(s.player.organelles.some((o) => o.misfolded)).toBe(true);
    const misfolded = s.player.organelles.filter((o) => o.misfolded).length;
    s.player.atp = 100;
    s.player.traits = computeTraits(s.player);
    if (!s.player.traits.abilities.includes('lysosome')) {
      // The misfold may have hit the lysosome itself; add a healthy one.
      addOrganelle(s, 'lysosome', 4);
      s.player.traits = computeTraits(s.player);
    }
    expect(castAbility(s, 'lysosome', NO_INPUT)).toBe(true);
    expect(s.player.organelles.filter((o) => o.misfolded).length).toBeLessThan(misfolded);
  });
});

describe('predators', () => {
  test('a giant amoeba engulfs a small cell, and struggling breaks free', () => {
    const s = emptyWorld(5);
    const prime = s.player.units[0];
    spawnEntity(s, 'amoeba', prime.x + 90, prime.y, { radius: 94 });
    run(s, 4);
    expect(s.player.capture?.species).toBe('amoeba');
    let flip = 1;
    for (let i = 0; i < 30 * 6 && s.player.capture; i++) {
      flip = -flip;
      s.player.atp = 100;
      stepGame(s, 1 / 30, { ...NO_INPUT, moveX: flip, moveY: 0, dash: i % 14 === 0 }, view(s));
    }
    expect(s.player.capture).toBeNull();
    expect(s.player.dead).toBe(false);
  });

  test('an uncontested capture ends in digestion', () => {
    const s = emptyWorld(5);
    const prime = s.player.units[0];
    spawnEntity(s, 'amoeba', prime.x + 90, prime.y, { radius: 94 });
    run(s, 20);
    expect(s.player.dead).toBe(true);
    expect(s.player.deathCause).toBe('digested');
  });
});

describe('division and colony', () => {
  test('division is gated on spare biomass and DNA, then offers fates and mutations', () => {
    const s = emptyWorld();
    expect(canDivide(s).ok).toBe(false);
    grant(s, divisionThreshold(1) + 5, divisionDnaCost(1));
    expect(canDivide(s).ok).toBe(true);
    expect(startDivision(s)).toBe(true);
    run(s, 3.5);
    expect(s.player.pendingDivision).toBe(true);
    const choices = s.divisionChoices!;
    expect(choices.fates).toHaveLength(3);
    expect(choices.mutations).toHaveLength(3);
    expect(chooseDivision(s, choices.fates[0], choices.mutations[0])).toBe(true);
    expect(s.player.generation).toBe(2);
    expect(s.player.units).toHaveLength(2);
    expect(s.player.units[1].fate).toBe(choices.fates[0]);
    // The daughter is built from spare biomass, never from the prime's body.
    expect(s.player.units[0].biomass).toBeGreaterThanOrEqual(BODY_BIOMASS);
  });

  test('daughters stay adhered to the prime cell while it swims', () => {
    const s = emptyWorld();
    grant(s, divisionThreshold(1) + 5, divisionDnaCost(1));
    startDivision(s);
    run(s, 3.5);
    chooseDivision(s, s.divisionChoices!.fates[0], s.divisionChoices!.mutations[0]);
    run(s, 4, { ...NO_INPUT, moveX: 1 });
    const [a, b] = s.player.units;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan((a.radius + b.radius) * 1.3);
    expect(a.x).toBeGreaterThan(200);
  });
});

describe('angle helpers', () => {
  test('shortest signed difference wraps around', () => {
    expect(angleDiff(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2, 6);
    expect(angleDiff(-3, 3)).toBeCloseTo(6 - Math.PI * 2, 6);
  });
});

describe('opening pacing', () => {
  test('the opening field is quiet: no threats or endosymbionts near the spawn', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = createGame(seed);
      run(s, 8);
      const near = s.entities.filter((e) => Math.hypot(e.x, e.y) < 1300);
      expect(near.some((e) => SPECIES[e.species].threat >= 1)).toBe(false);
      expect(near.some((e) => e.species === 'proteo' || e.species === 'cyano')).toBe(false);
      expect(s.director.pressure).toBeLessThan(0.3);
    }
  });

  test('the HUD and controls unlock with progress, and objectives introduce their subject', () => {
    const s = createGame(7);
    run(s, 2);
    expect(s.unlocked.has('radar')).toBe(false);
    expect(s.unlocked.has('architect')).toBe(false);
    s.stats.glucose = 10;
    run(s, 0.5);
    expect(s.objective.index).toBe(1);
    expect([...s.unlocked]).toEqual(expect.arrayContaining(['glucose', 'radar']));
    const prime = s.player.units[0];
    expect(s.entities.some((e) => e.species === 'proteo' && Math.hypot(e.x - prime.x, e.y - prime.y) < 1200)).toBe(true);
    expect(s.unlocked.has('microscope')).toBe(false);
  });
});
