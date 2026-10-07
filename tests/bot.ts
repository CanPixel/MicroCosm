// A scripted "naturalist" that plays the simulation headlessly. Used by the
// integration tests and for balance tuning. It is not clever; it is a rough
// stand-in for an attentive first-time player.
import { ABILITY_INFO } from '../src/game/sim/organelles';
import { canDivide, canUnitEat, chooseDivision, buildOrganelle, startDivision } from '../src/game/sim/player';
import { createGame, stepGame } from '../src/game/sim/sim';
import { SPECIES } from '../src/game/sim/species';
import { objectiveNavTarget, OBJECTIVES } from '../src/game/sim/director';
import { mulberry32 } from '../src/game/sim/rng';
import type { GameState, SimInput } from '../src/game/sim/state';
import type { AbilityId, OrganelleType } from '../src/game/sim/types';

const BUILD_PRIORITY: OrganelleType[] = [
  'er',
  'golgi',
  'lysosome',
  'cytoskeleton',
  'mitochondrion',
  'vacuole',
  'extrusome',
  'flagellum',
  'mitochondrion',
  'cilia',
  'lysosome',
  'chloroplast',
];

export type BotReport = {
  seed: number;
  time: number;
  dead: boolean;
  cause: string | null;
  killer: string | null;
  generation: number;
  cells: number;
  objective: number;
  objectiveTimes: Record<string, number>;
  victory: boolean;
  organelles: string[];
  eaten: number;
  species: number;
  dna: number;
  minAtp: number;
  starvingTime: number;
  damage: number;
  infections: number;
  captures: number;
};

export function runBot(seed: number, seconds: number, dt = 1 / 30): BotReport & { state: GameState } {
  const state = createGame(seed);
  const view = { x: 0, y: 0, halfW: 720, halfH: 450 };
  const objectiveTimes: Record<string, number> = {};
  const random = mulberry32(seed * 7919 + 1);
  let buildTimer = 0;
  let wanderAngle = random() * Math.PI * 2;
  let flip = 1;
  let lastObjective = 0;
  let minAtp = Infinity;
  let starvingTime = 0;
  let damage = 0;
  let infections = 0;
  let captures = 0;

  for (let frame = 0; frame < seconds / dt; frame++) {
    const p = state.player;
    if (p.dead || state.victory) break;
    const prime = p.units[0];

    if (p.pendingDivision && state.divisionChoices) {
      chooseDivision(state, state.divisionChoices.fates[0], state.divisionChoices.mutations[0]);
    }

    const abilities: AbilityId[] = [];
    let dash = false;
    const has = (id: AbilityId) => p.traits.abilities.includes(id) && state.time >= p.cooldowns[id] && p.atp >= ABILITY_INFO[id].atp;

    // Threat assessment.
    let fx = 0;
    let fy = 0;
    let nearestHostile = Infinity;
    for (const e of state.entities) {
      const def = SPECIES[e.species];
      if (e.dead || def.threat < 2 || def.group === 'agent') continue;
      if (canUnitEat(p, prime, e)) continue;
      const dx = prime.x - e.x;
      const dy = prime.y - e.y;
      const d = Math.hypot(dx, dy) - e.radius;
      const reach = e.species === 'hydra' ? e.radius * 3.6 : e.species === 'lacrymaria' ? e.radius * 7 : e.radius * 1.5 + 120;
      if (d < reach) {
        fx += (dx / (d + 1)) * 300;
        fy += (dy / (d + 1)) * 300;
      }
      nearestHostile = Math.min(nearestHostile, d);
    }

    if (p.capture) {
      flip = -flip;
      dash = true;
    }
    if (prime.attached.some((a) => a.species !== 'viroid') && has('dash')) dash = true;
    if ((p.infection.viralLoad > 30 || p.infection.prophages > 0) && has('rnai')) abilities.push('rnai');
    if ((nearestHostile < 140 || p.organelles.some((o) => o.misfolded) || p.infection.colonies > 2) && has('lysosome'))
      abilities.push('lysosome');
    if (nearestHostile < 260 && has('toxicyst')) abilities.push('toxicyst');
    if (p.capture && has('encyst')) abilities.push('encyst');

    buildTimer -= dt;
    if (buildTimer <= 0) {
      buildTimer = 1.5;
      for (const type of BUILD_PRIORITY) if (buildOrganelle(state, type)) break;
      if (canDivide(state).ok) startDivision(state);
    }

    // Movement: objective target, else nearest edible, else wander.
    let tx: number;
    let ty: number;
    const nav = objectiveNavTarget(state);
    let best = nav ? { x: nav.x, y: nav.y, d: Math.hypot(nav.x - prime.x, nav.y - prime.y) * 0.6 } : null;
    for (const e of state.entities) {
      if (e.dead || e.attachedTo) continue;
      const def = SPECIES[e.species];
      if (def.group === 'agent' && e.species !== 'virophage' && e.species !== 'phage') continue;
      if (!canUnitEat(p, prime, e) && e.species !== 'virophage') continue;
      const d = Math.hypot(e.x - prime.x, e.y - prime.y) / (def.group === 'resource' ? 1 : 0.8);
      if (d < 700 && (!best || d < best.d)) best = { x: e.x, y: e.y, d };
    }
    if (best) {
      tx = best.x - prime.x;
      ty = best.y - prime.y;
    } else {
      if (random() < 0.01) wanderAngle += (random() - 0.5) * 2;
      tx = Math.cos(wanderAngle);
      ty = Math.sin(wanderAngle);
    }
    const tl = Math.hypot(tx, ty) || 1;
    let mx = tx / tl + fx * 0.01;
    let my = ty / tl + fy * 0.01;
    if (p.capture) {
      mx = Math.cos(state.time * 20) * flip;
      my = Math.sin(state.time * 20) * flip;
    }
    const ml = Math.hypot(mx, my) || 1;
    const input: SimInput = {
      moveX: mx / ml,
      moveY: my / ml,
      aimX: prime.x + mx * 200,
      aimY: prime.y + my * 200,
      dash,
      abilities,
      divide: false,
    };
    view.x = prime.x;
    view.y = prime.y;
    stepGame(state, dt, input, view);
    minAtp = Math.min(minAtp, state.player.atp);
    if (state.player.starving) starvingTime += dt;
    for (const ev of state.events) {
      if (ev.type === 'damage') damage += ev.amount;
      if (ev.type === 'infection') infections++;
      if (ev.type === 'captured') captures++;
    }

    if (state.objective.index !== lastObjective) {
      for (let i = lastObjective; i < state.objective.index; i++) objectiveTimes[OBJECTIVES[i].id] = Math.round(state.time);
      lastObjective = state.objective.index;
    }
  }

  const p = state.player;
  return {
    state,
    seed,
    time: Math.round(state.time),
    dead: p.dead,
    cause: p.deathCause,
    killer: p.killer,
    generation: p.generation,
    cells: p.units.filter((u) => !u.dead).length,
    objective: state.objective.index,
    objectiveTimes,
    victory: state.victory,
    organelles: p.organelles.map((o) => o.type),
    eaten: state.stats.eaten,
    species: state.discovered.size,
    dna: Math.round(p.dna * 10) / 10,
    minAtp: Math.round(minAtp),
    starvingTime: Math.round(starvingTime),
    damage: Math.round(damage),
    infections,
    captures,
  };
}
