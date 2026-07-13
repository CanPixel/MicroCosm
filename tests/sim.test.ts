import { describe, expect, test } from 'bun:test';
import {
  DIVISION_ATP_COST,
  DIVISION_BIOMASS_COST,
  DIVISION_GLUCOSE_COST,
  DIVISION_MIN_ARCHITECTURE_SCORE,
  DIVISION_MIN_SIZE,
  MAX_ORGANELLE_LEVEL,
  USER_ZOOM_MAX,
  USER_ZOOM_MIN,
} from '../src/lib/game/constants';
import { createSimulation, type Simulation, type ViewInfo } from '../src/lib/game/sim';

const idleInput = { moveX: 0, moveY: 0 };

function advance(simulation: Simulation, seconds: number, view: ViewInfo) {
  const frames = Math.ceil(seconds * 60);
  for (let frame = 0; frame < frames; frame++) {
    simulation.step(1 / 60, idleInput, view);
  }
}

describe('microscope camera', () => {
  test('clamps user magnification and preserves smooth automatic framing', () => {
    const simulation = createSimulation(17);
    const view = { width: 1440, height: 900 };

    simulation.setZoomMultiplier(100);
    expect(simulation.state.camera.zoomMultiplier).toBe(USER_ZOOM_MAX);
    advance(simulation, 2, view);
    const closeZoom = simulation.state.camera.zoom;

    simulation.setZoomMultiplier(-100);
    expect(simulation.state.camera.zoomMultiplier).toBe(USER_ZOOM_MIN);
    advance(simulation, 2.5, view);
    const ecosystemZoom = simulation.state.camera.zoom;

    expect(closeZoom).toBeGreaterThan(4.7);
    expect(ecosystemZoom).toBeLessThan(1.55);
    expect(closeZoom).toBeGreaterThan(ecosystemZoom);
  });
});

describe('infinite deterministic world streaming', () => {
  test('loads enough chunks for a large viewport and replaces them after distant travel', () => {
    const simulation = createSimulation(31);
    const view = { width: 3840, height: 2160 };
    simulation.initialSpawns(view);

    const originChunkKeys = new Set(simulation.state.organisms.map(({ chunk }) => `${chunk.x}:${chunk.y}`));
    const originIds = new Set(simulation.state.organisms.map(({ id }) => id));
    expect(originChunkKeys.size).toBeGreaterThanOrEqual(35);

    simulation.state.player.pos.x = 120_000;
    simulation.state.player.pos.y = -84_000;
    simulation.state.camera.pos.x = simulation.state.player.pos.x;
    simulation.state.camera.pos.y = simulation.state.player.pos.y;
    simulation.step(1 / 60, idleInput, view);

    const farChunkKeys = new Set(simulation.state.organisms.map(({ chunk }) => `${chunk.x}:${chunk.y}`));
    const overlappingIds = simulation.state.organisms.filter(({ id }) => originIds.has(id));
    expect(farChunkKeys.size).toBeGreaterThanOrEqual(35);
    expect(overlappingIds).toHaveLength(0);
  });
});

describe('ecosystem pressure', () => {
  test('a threat interval launches a visible giant-virus wave', () => {
    const simulation = createSimulation(57);
    const view = { width: 1280, height: 720 };
    simulation.initialSpawns(view);

    advance(simulation, 45.2, view);

    const waveViruses = simulation.state.organisms.filter(({ id }) => id.startsWith('wave-'));
    expect(simulation.state.threatLevel).toBe(2);
    expect(waveViruses.length).toBeGreaterThanOrEqual(2);
    expect(waveViruses.every(({ species, kind }) => species === 'giantVirus' && kind === 'infectious')).toBe(true);
  });

  test('collision damage never increases the size of a critically starved cell', () => {
    const simulation = createSimulation(61);
    const player = simulation.state.player;
    player.size = 5.5;
    player.score = 5.5;
    simulation.state.time = 6;
    simulation.state.organisms.push({
      id: 'collision-target',
      chunk: { x: 0, y: 0 },
      species: 'spikyVirus',
      kind: 'ambient',
      harmful: true,
      devourable: false,
      autonomous: false,
      pos: { x: 0, y: 0 },
      heading: 0,
      displayRotation: 0,
      speed: 0,
      size: 20,
      collisionRadius: 10,
      render: {
        duration: 20,
        delay: 0,
        opacity: 1,
        initialRotation: 0,
        animationDirection: 'normal',
      },
    });

    simulation.step(1 / 60, idleInput, { width: 1, height: 1 });

    expect(player.size).toBeLessThanOrEqual(5.5);
    expect(player.integrity).toBeLessThan(player.maxIntegrity);
  });
});

describe('genome hijack counterplay', () => {
  test('an upgraded nucleus can clear an established viral load with RNA interference', () => {
    const simulation = createSimulation(9);
    const player = simulation.state.player;
    simulation.state.collectedOrganelles.add('nucleus');
    player.organelleLevels.nucleus = 1;
    player.infected = true;
    player.infectionStart = 0;
    player.infectionProgress = 40;
    simulation.state.time = 12;

    expect(simulation.activate('nucleus')).toBe(true);
    expect(player.infected).toBe(false);
    expect(player.infectionProgress).toBe(0);
    expect(player.energy).toBe(72);
  });

  test('an unupgraded nucleus shields the membrane but cannot clear infection', () => {
    const simulation = createSimulation(9);
    const player = simulation.state.player;
    simulation.state.collectedOrganelles.add('nucleus');
    player.infected = true;
    player.infectionStart = 0;
    player.infectionProgress = 40;
    simulation.state.time = 12;

    expect(simulation.activate('nucleus')).toBe(true);
    expect(player.infected).toBe(true);
    expect(player.shieldUntil).toBeGreaterThan(simulation.state.time);
  });

  test('a folded RNAi program automatically clears a dangerous viral load', () => {
    const simulation = createSimulation(19);
    const player = simulation.state.player;
    simulation.state.collectedOrganelles.add('nucleus');
    player.organelleLevels.nucleus = 1;
    player.automation.rnai = true;
    player.infected = true;
    player.infectionStart = 0;
    simulation.state.time = 8;

    simulation.step(1 / 60, idleInput, { width: 1, height: 1 });

    expect(player.infected).toBe(false);
    expect(player.energy).toBeLessThan(100);
  });

  test('a folded autophagy program spends ATP to digest an approaching virus', () => {
    const simulation = createSimulation(23);
    const player = simulation.state.player;
    simulation.state.collectedOrganelles.add('golgi');
    player.organelleLevels.golgi = 1;
    player.automation.autophagy = true;
    simulation.state.organisms.push({
      id: 'autophagy-target',
      chunk: { x: 0, y: 0 },
      species: 'giantVirus',
      kind: 'infectious',
      harmful: true,
      devourable: false,
      autonomous: false,
      pos: { x: 100, y: 0 },
      heading: 0,
      displayRotation: 0,
      speed: 0,
      size: 44,
      collisionRadius: 18,
      render: {
        duration: 24,
        delay: 0,
        opacity: 1,
        initialRotation: 0,
        animationDirection: 'normal',
      },
    });

    simulation.step(1 / 60, idleInput, { width: 1, height: 1 });

    expect(simulation.state.organisms.some(({ id }) => id === 'autophagy-target')).toBe(false);
    expect(player.energy).toBeLessThan(67);
    expect(player.kills).toBeGreaterThanOrEqual(1);
  });
});

describe('internal cell architecture', () => {
  test('engulfed systems arrive disordered and require deliberate intracellular transport', () => {
    const simulation = createSimulation(41);
    const view = { width: 1280, height: 720 };
    simulation.initialSpawns(view);
    for (const type of ['mitochondrion', 'golgi', 'nucleus'] as const) {
      const starter = simulation.state.organisms.find(({ id }) => id === `starter-${type}`);
      expect(starter).toBeDefined();
      simulation.state.player.pos = { ...starter!.pos };
      simulation.state.camera.pos = { ...starter!.pos };
      simulation.step(1 / 60, idleInput, view);
    }

    expect(simulation.state.player.architecture.find(({ type }) => type === 'nucleus')?.slot).toBe(8);
    expect(simulation.getArchitectureBonuses().score).toBeLessThan(DIVISION_MIN_ARCHITECTURE_SCORE);

    const nucleus = simulation.state.player.architecture.find(({ type }) => type === 'nucleus')!;
    const mitochondrion = simulation.state.player.architecture.find(({ type }) => type === 'mitochondrion')!;
    const golgi = simulation.state.player.architecture.find(({ type }) => type === 'golgi')!;
    simulation.moveOrganelle(nucleus.id, 0);
    simulation.moveOrganelle(mitochondrion.id, 1);
    simulation.moveOrganelle(golgi.id, 2);

    expect(simulation.getArchitectureBonuses().score).toBeGreaterThanOrEqual(DIVISION_MIN_ARCHITECTURE_SCORE);
  });

  test('moving the nucleus into the genome core improves coherence and viral resistance', () => {
    const simulation = createSimulation(44);
    simulation.state.player.architecture = [
      { id: 'nucleus-0', type: 'nucleus', slot: 8 },
      { id: 'mitochondrion-0', type: 'mitochondrion', slot: 0 },
      { id: 'golgi-0', type: 'golgi', slot: 6 },
    ];
    const disordered = simulation.getArchitectureBonuses();

    expect(simulation.moveOrganelle('nucleus-0', 0)).toBe(true);
    const coherent = simulation.getArchitectureBonuses();

    expect(coherent.score).toBeGreaterThan(disordered.score);
    expect(coherent.viralResistance).toBeGreaterThan(disordered.viralResistance);
    expect(simulation.state.player.architecture.find(({ id }) => id === 'mitochondrion-0')?.slot).toBe(8);
  });

  test('upgrades grow additional placeable organelles and stop at the specialization cap', () => {
    const simulation = createSimulation(45);
    const player = simulation.state.player;
    simulation.state.collectedOrganelles.add('mitochondrion');
    player.architecture.push({ id: 'mitochondrion-0', type: 'mitochondrion', slot: 1 });
    player.glucose = 500;
    player.biomass = 500;

    expect(simulation.upgrade('mitochondrion')).toBe(true);
    expect(simulation.upgrade('mitochondrion')).toBe(true);
    expect(player.organelleLevels.mitochondrion).toBe(MAX_ORGANELLE_LEVEL);
    expect(player.architecture.filter(({ type }) => type === 'mitochondrion')).toHaveLength(3);
    expect(simulation.upgrade('mitochondrion')).toBe(false);
  });
});

describe('controlled cytokinesis victory loop', () => {
  test('requires a stable architecture and completes a viable daughter cell', () => {
    const simulation = createSimulation(91);
    const player = simulation.state.player;
    const systems = ['mitochondrion', 'golgi', 'nucleus'] as const;
    systems.forEach((type) => simulation.state.collectedOrganelles.add(type));
    player.organelleLevels = { mitochondrion: 1, golgi: 1, nucleus: 1 };
    player.architecture = [
      { id: 'nucleus-0', type: 'nucleus', slot: 0 },
      { id: 'mitochondrion-0', type: 'mitochondrion', slot: 1 },
      { id: 'golgi-0', type: 'golgi', slot: 2 },
    ];
    player.size = DIVISION_MIN_SIZE;
    player.score = DIVISION_MIN_SIZE;
    player.energy = 100;
    player.glucose = 80;
    player.biomass = 40;
    player.integrity = player.maxIntegrity;

    expect(simulation.divisionReadiness().ready).toBe(true);
    expect(simulation.beginDivision()).toBe(true);
    expect(player.energy).toBe(100 - DIVISION_ATP_COST);
    expect(player.glucose).toBe(80 - DIVISION_GLUCOSE_COST);
    expect(player.biomass).toBe(40 - DIVISION_BIOMASS_COST);

    advance(simulation, 13, { width: 1, height: 1 });

    expect(player.won).toBe(true);
    expect(player.stage).toBe('complete');
    expect(player.divisionProgress).toBe(100);
  });

  test('viral hijack aborts division before the genome is copied', () => {
    const simulation = createSimulation(92);
    const player = simulation.state.player;
    player.divisionActive = true;
    player.divisionProgress = 52;
    player.infected = true;
    player.infectionStart = 0;
    simulation.state.time = 2;

    simulation.step(1 / 60, idleInput, { width: 1, height: 1 });

    expect(player.divisionActive).toBe(false);
    expect(player.divisionProgress).toBe(0);
    expect(player.won).toBe(false);
  });
});
