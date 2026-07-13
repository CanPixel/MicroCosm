import { describe, expect, test } from 'bun:test';
import { DIVISION_MIN_ARCHITECTURE_SCORE } from '../src/lib/game/constants';
import { createSimulation } from '../src/lib/game/sim';
import type { OrganelleType } from '../src/lib/game/types';

const view = { width: 1280, height: 720 };
const systems: OrganelleType[] = ['mitochondrion', 'golgi', 'nucleus'];

describe('complete dual-loop run', () => {
  test('a deterministic explorer can forage, assemble, specialize, and divide', () => {
    const simulation = createSimulation(303);
    simulation.initialSpawns(view);
    const player = simulation.state.player;
    const dt = 1 / 30;

    for (let frame = 0; frame < 30 * 420 && !player.dead && !player.won; frame++) {
      if (player.infected && simulation.state.collectedOrganelles.has('nucleus') && player.energy >= 28) {
        simulation.activate('nucleus');
      }

      if (player.integrity < player.maxIntegrity * 0.86 && simulation.state.collectedOrganelles.has('nucleus')) {
        simulation.setMetabolicStance('homeostasis');
        if (player.energy >= 28) simulation.activate('nucleus');
      }

      const hostileInRange = simulation.state.organisms.some((organism) => {
        const hostile = organism.kind === 'infectious' || (organism.harmful && organism.kind === 'ambient');
        return hostile && Math.hypot(organism.pos.x - player.pos.x, organism.pos.y - player.pos.y) < 250;
      });
      if (hostileInRange && simulation.state.collectedOrganelles.has('golgi') && player.energy >= 34) {
        simulation.activate('golgi');
      }

      if (systems.every((type) => simulation.state.collectedOrganelles.has(type))) {
        const nucleus = player.architecture.find(({ type }) => type === 'nucleus');
        const mitochondrion = player.architecture.find(({ type }) => type === 'mitochondrion');
        const golgi = player.architecture.find(({ type }) => type === 'golgi');
        if (nucleus && nucleus.slot !== 0) simulation.moveOrganelle(nucleus.id, 0);
        if (mitochondrion && mitochondrion.slot !== 1) simulation.moveOrganelle(mitochondrion.id, 1);
        if (golgi && golgi.slot !== 2) simulation.moveOrganelle(golgi.id, 2);
        if (player.integrity >= player.maxIntegrity * 0.96) simulation.setMetabolicStance('replicate');
        for (const type of systems) {
          if (player.organelleLevels[type] > 0) continue;
          const cost = simulation.upgradeCosts(type);
          if (player.glucose >= cost.glucose && player.biomass >= cost.biomass) simulation.upgrade(type);
        }
      }

      if (simulation.divisionReadiness().ready) simulation.beginDivision();

      const missingSystem = simulation.state.organisms.find(
        (organism) => organism.id.startsWith('starter-') && organism.organelleType && !simulation.state.collectedOrganelles.has(organism.organelleType),
      ) ?? simulation.state.organisms.find(
        (organism) => organism.organelleType && !simulation.state.collectedOrganelles.has(organism.organelleType),
      );
      const candidates = missingSystem ? [missingSystem.pos] : simulation.state.sugars;
      let target: { x: number; y: number } | undefined;
      let nearest = Number.POSITIVE_INFINITY;
      for (const candidate of candidates) {
        const distance = Math.hypot(candidate.x - player.pos.x, candidate.y - player.pos.y);
        if (distance < nearest) {
          nearest = distance;
          target = candidate;
        }
      }
      const dx = (target?.x ?? player.pos.x) - player.pos.x;
      const dy = (target?.y ?? player.pos.y) - player.pos.y;
      const length = Math.hypot(dx, dy) || 1;
      simulation.step(dt, { moveX: dx / length, moveY: dy / length }, view);
    }

    expect(player.dead).toBe(false);
    expect(player.won).toBe(true);
    expect(player.stage).toBe('complete');
    expect(player.sugarsEaten).toBeGreaterThanOrEqual(8);
    expect(systems.every((type) => player.organelleLevels[type] >= 1)).toBe(true);
    expect(simulation.getArchitectureBonuses().score).toBeGreaterThanOrEqual(DIVISION_MIN_ARCHITECTURE_SCORE);
  });
});
