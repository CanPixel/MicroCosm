import { updateEntities } from './ai';
import { updateInteractions, updateProjectiles, castAbility } from './combat';
import { checkDivisionReady, updateDirector, updateDiscovery, updateEnvironment, updateObjectives, updateUnlocks } from './director';
import { updateInfection } from './infection';
import {
  refreshTraits,
  startDivision,
  updateDigestion,
  updateDivision,
  updateMetabolism,
  updatePlayerMovement,
  updateUnitBodies,
} from './player';
import { mulberry32, rand } from './rng';
import { createState, spawnEntity, type GameState, type SimInput, type ViewRect } from './state';
import { ambientUpkeep, streamChunks } from './world';
import type { SpeciesId } from './types';

export function createGame(seed: number, knownSpecies: Iterable<SpeciesId> = []): GameState {
  const state = createState(seed, knownSpecies);
  const rng = mulberry32(seed ^ 0x2c1b3c6d);
  // A quiet opening field: a few meandering trails of single glucose crystals
  // to learn swimming, and almost nothing else. The endosymbiotic ancestors
  // drift in later, when their objective begins.
  const trails = 3;
  for (let t = 0; t < trails; t++) {
    let a = (t / trails) * Math.PI * 2 + rng() * 1.2;
    let d = rand(rng, 90, 150);
    let heading = a;
    for (let i = 0; i < 5; i++) {
      spawnEntity(state, 'glucose', Math.cos(a) * d, Math.sin(a) * d, { rng });
      heading += (rng() - 0.5) * 1.1;
      const x = Math.cos(a) * d + Math.cos(heading) * rand(rng, 80, 130);
      const y = Math.sin(a) * d + Math.sin(heading) * rand(rng, 80, 130);
      a = Math.atan2(y, x);
      d = Math.hypot(x, y);
    }
  }
  for (let i = 0; i < 2; i++) {
    const a = rng() * Math.PI * 2;
    const d = rand(rng, 320, 520);
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
  updateUnlocks(state);
  updateDiscovery(state, dt);
  checkDivisionReady(state);

  if (state.entities.some((e) => e.dead)) state.entities = state.entities.filter((e) => !e.dead);
  const units = state.player.units;
  if (units.some((u, i) => i > 0 && u.dead)) state.player.units = units.filter((u, i) => i === 0 || !u.dead);
}

export type { GameState, SimInput, ViewRect };
