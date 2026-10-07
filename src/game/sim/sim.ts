import { updateEntities } from './ai';
import { updateInteractions, updateProjectiles, castAbility } from './combat';
import { checkDivisionReady, updateDirector, updateDiscovery, updateEnvironment, updateObjectives } from './director';
import { updateInfection } from './infection';
import {
  refreshTraits, startDivision, updateDigestion, updateDivision, updateMetabolism, updatePlayerMovement, updateUnitBodies,
} from './player';
import { mulberry32, rand } from './rng';
import { createState, spawnEntity, type GameState, type SimInput, type ViewRect } from './state';
import { ambientUpkeep, spawnGlucoseCluster, streamChunks } from './world';
import type { SpeciesId } from './types';

export function createGame(seed: number, knownSpecies: Iterable<SpeciesId> = []): GameState {
  const state = createState(seed, knownSpecies);
  const rng = mulberry32(seed ^ 0x2c1b3c6d);
  // A gentle, legible opening field: glucose to learn movement, and the two
  // endosymbiotic ancestors close enough to find.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng();
    spawnGlucoseCluster(state, Math.cos(a) * rand(rng, 140, 260), Math.sin(a) * rand(rng, 140, 260), rng, 5, '', 55);
  }
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2;
    const d = rand(rng, 330, 560);
    spawnEntity(state, 'proteo', Math.cos(a) * d, Math.sin(a) * d, { rng });
  }
  for (let i = 0; i < 2; i++) {
    const a = rng() * Math.PI * 2;
    const d = rand(rng, 380, 620);
    spawnEntity(state, 'cyano', Math.cos(a) * d, Math.sin(a) * d, { rng });
  }
  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI * 2;
    const d = rand(rng, 260, 520);
    spawnEntity(state, 'cocci', Math.cos(a) * d, Math.sin(a) * d, { rng });
  }
  return state;
}

export function stepGame(state: GameState, dt: number, input: SimInput, view: ViewRect) {
  state.events.length = 0;
  if (state.player.pendingDivision) return;
  dt = Math.min(dt, 1 / 20);
  state.time += dt;
  state.view = view;

  refreshTraits(state);
  updateEnvironment(state);
  updateDirector(state, dt);
  streamChunks(state, view);
  ambientUpkeep(state, view, dt);

  state.grid.clear();
  for (const e of state.entities) if (!e.dead) state.grid.insert(e);

  if (input.dash) castAbility(state, 'dash', input);
  for (const ability of input.abilities) castAbility(state, ability, input);
  if (input.divide) startDivision(state);

  updatePlayerMovement(state, input, dt);
  updateEntities(state, dt);
  updateInteractions(state, dt);
  updateProjectiles(state, dt);
  updateInfection(state, dt);
  updateDigestion(state, dt);
  updateMetabolism(state, dt);
  updateDivision(state, dt);
  refreshTraits(state);
  updateUnitBodies(state, dt);
  updateObjectives(state);
  updateDiscovery(state, dt);
  checkDivisionReady(state);

  if (state.entities.some((e) => e.dead)) state.entities = state.entities.filter((e) => !e.dead);
  const units = state.player.units;
  if (units.some((u, i) => i > 0 && u.dead)) state.player.units = units.filter((u, i) => i === 0 || !u.dead);
}

export type { GameState, SimInput, ViewRect };
