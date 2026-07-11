import { describe, expect, test } from 'bun:test';
import { USER_ZOOM_MAX, USER_ZOOM_MIN } from '../src/lib/game/constants';
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
});
