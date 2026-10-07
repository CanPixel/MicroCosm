import { yieldsOf } from './entities';
import { approach, clamp, TAU, turnToward } from './math';
import { membraneImpulse, stepMembrane, type MembraneBody } from './membrane';
import {
  canBuild, computeTraits, countOrganelles, FATES, firstFreeSlot, MUTATION_POOL, MUTATIONS, mutationStacks, ORGANELLES,
  SLOTS, slotAccepts,
} from './organelles';
import { curlFlow } from './rng';
import { SPECIES } from './species';
import { BODY_BIOMASS, createUnit, emit, MIN_CYTOPLASM, radiusForBiomass, type GameState, type SimInput } from './state';
import type {
  CellFate, CellUnit, DeathCause, Entity, HostClass, MutationId, OrganelleType, Player, SpeciesId,
} from './types';

// Dividing costs spare biomass (it becomes the daughter) and nucleotides for
// genome replication, so every division competes with building organelles.
export const divisionThreshold = (generation: number) => 80 + 50 * (generation - 1);
export const divisionDnaCost = (generation: number) => 3 + generation * 3;

export const organelleMass = (player: Player) => player.organelles.reduce((sum, o) => sum + o.mass, 0);
export const spendableBiomass = (player: Player) => player.units[0].biomass - organelleMass(player) - BODY_BIOMASS;
export const livingUnits = (player: Player) => player.units.filter((u) => !u.dead);

export function playerHostClasses(player: Player): HostClass[] {
  const classes: HostClass[] = ['eukaryote', 'amoeboid'];
  if (countOrganelles(player, 'chloroplast', true) > 0) classes.push('plant');
  return classes;
}

export const unitEngulfRatio = (player: Player, unit: CellUnit) =>
  player.traits.engulfRatio + (unit.fate === 'phagocyte' ? 0.12 : 0);

export function canUnitEat(player: Player, unit: CellUnit, e: Entity): boolean {
  const def = SPECIES[e.species];
  if (!def.edible || def.invulnerable) return false;
  if (def.group === 'resource') return true;
  return e.radius < unit.radius * unitEngulfRatio(player, unit);
}

export const vacuoleSlotsFor = (player: Player, unit: CellUnit) =>
  unit.fate === 'prime' ? player.traits.vacuoleSlots : unit.fate === 'phagocyte' ? 3 : 1;

export function isUntouchable(state: GameState) {
  const p = state.player;
  return p.dead || state.time < p.cystUntil || state.time < p.invulnUntil;
}

export function killPlayer(state: GameState, cause: DeathCause, killer: SpeciesId | null = null) {
  const p = state.player;
  if (p.dead) return;
  p.dead = true;
  p.dying = 0;
  p.deathCause = cause;
  p.killer = killer;
  p.capture = null;
  emit(state, { type: 'death', cause });
}

function loseUnit(state: GameState, unit: CellUnit) {
  unit.dead = true;
  state.player.traitsDirty = true;
  emit(state, { type: 'cellLost', x: unit.x, y: unit.y });
}

export type DamageOpts = { cause?: DeathCause; bypassCooldown?: boolean };

// Applies damage to a cell of the colony. Returns damage dealt.
export function damageUnit(
  state: GameState, unit: CellUnit, amount: number, fromX: number, fromY: number,
  source: SpeciesId | 'burst' | 'misc', opts: DamageOpts = {},
): number {
  const p = state.player;
  if (p.dead || unit.dead || amount <= 0) return 0;
  if (state.time < p.cystUntil) return 0;
  if (!opts.bypassCooldown && (state.time < p.invulnUntil || unit.hitCooldown > 0)) return 0;
  let dmg = amount * (1 - p.traits.damageReduction);
  if (unit.fate !== 'prime' && mutationStacks(p, 'cadherin') > 0) dmg *= 0.75;
  if (state.time < state.tardigradeUntil) dmg *= 0.55;
  unit.integrity -= dmg;
  const angle = Math.atan2(fromY - unit.y, fromX - unit.x);
  // Continuous damage only produces feedback a few times per second.
  const feedback = !opts.bypassCooldown || unit.dotTick <= 0;
  if (!opts.bypassCooldown) unit.hitCooldown = 0.45;
  if (feedback) {
    if (opts.bypassCooldown) unit.dotTick = 0.4;
    unit.hitFlash = 1;
    unit.hitAngle = angle;
    membraneImpulse(unit.membrane, angle, -unit.radius * Math.min(7, 2 + dmg * 0.35), 0.55);
    emit(state, { type: 'damage', amount: dmg, x: unit.x + Math.cos(angle) * unit.radius, y: unit.y + Math.sin(angle) * unit.radius, unit: unit.id, source });
  }
  if (unit.integrity <= 0) {
    unit.integrity = 0;
    if (unit.fate === 'prime') {
      const species = typeof source === 'string' && source in SPECIES ? (source as SpeciesId) : null;
      const cause: DeathCause = opts.cause ?? (source === 'burst' ? 'lysis' : species === 'neoplasm' ? 'neoplasm' : 'rupture');
      killPlayer(state, cause, species);
    } else {
      loseUnit(state, unit);
    }
  }
  return dmg;
}

export function capturePlayer(state: GameState, captor: Entity) {
  const p = state.player;
  if (p.capture || isUntouchable(state)) return false;
  p.capture = { byId: captor.id, species: captor.species, struggle: 0, time: 0 };
  p.dashUntil = 0;
  emit(state, { type: 'captured', species: captor.species });
  return true;
}

export function releaseCapture(state: GameState, escaped: boolean) {
  const p = state.player;
  if (!p.capture) return;
  const captor = state.byId.get(p.capture.byId);
  const prime = p.units[0];
  if (captor) {
    captor.stun = 1.6;
    captor.state = 0;
    captor.reach = 0;
    captor.timer = 2.5;
    const a = Math.atan2(prime.y - captor.y, prime.x - captor.x);
    prime.vx += Math.cos(a) * 420;
    prime.vy += Math.sin(a) * 420;
  }
  if (escaped) emit(state, { type: 'escaped', species: p.capture.species });
  p.capture = null;
  p.invulnUntil = state.time + 1.1;
}

// Where a captor's mouth is, for pulling the captured cell in.
export function captorMouth(e: Entity): { x: number; y: number } {
  switch (e.species) {
    case 'rotifer':
    case 'stentor':
      return { x: e.x + Math.cos(e.angle) * e.radius * 0.75, y: e.y + Math.sin(e.angle) * e.radius * 0.75 };
    case 'hydra':
      return { x: e.x + Math.cos(e.angle) * e.radius * 0.7, y: e.y + Math.sin(e.angle) * e.radius * 0.7 };
    case 'collotheca':
      return { x: e.x + Math.cos(e.angle) * e.radius * 0.55, y: e.y + Math.sin(e.angle) * e.radius * 0.55 };
    default:
      return { x: e.x, y: e.y };
  }
}

function layoutColony(player: Player) {
  // Daughters settle into a hexagonal rosette, filling behind the prime first.
  const order = [Math.PI, Math.PI - 1.05, Math.PI + 1.05, -1.25, 1.25, 0];
  let k = 0;
  for (const unit of player.units.slice(1)) {
    if (unit.dead) continue;
    const ring = Math.floor(k / order.length);
    unit.slotAngle = order[k % order.length] + ring * 0.52;
    unit.slotRing = ring;
    k++;
  }
}

export function updatePlayerMovement(state: GameState, input: SimInput, dt: number) {
  const p = state.player;
  const t = p.traits;
  const prime = p.units[0];
  const now = state.time;

  if (p.dead) {
    p.dying += dt;
    for (const u of p.units) {
      u.vx *= 1 - approach(2, dt);
      u.vy *= 1 - approach(2, dt);
      u.x += u.vx * dt;
      u.y += u.vy * dt;
    }
    return;
  }

  const inputLen = Math.min(1, Math.hypot(input.moveX, input.moveY));
  const inputAngle = Math.atan2(input.moveY, input.moveX);
  p.moving = inputLen;
  p.aimX = input.aimX;
  p.aimY = input.aimY;

  const cyst = now < p.cystUntil;
  if (p.capture) {
    updateCapture(state, input, dt, inputLen, inputAngle);
  } else if (cyst) {
    prime.vx *= 1 - approach(5, dt);
    prime.vy *= 1 - approach(5, dt);
  } else {
    const sizeFactor = Math.pow(28 / prime.radius, 0.28);
    const colonyFactor = Math.pow(0.97, livingUnits(p).length - 1);
    const dashing = now < p.dashUntil;
    let maxSpeed = t.speed * sizeFactor * colonyFactor;
    if (p.starving) maxSpeed *= 0.55;
    if (p.dividing > 0) maxSpeed *= 0.5;
    const a = approach(dashing ? 14 : t.accel, dt);
    let dx = inputLen > 0.05 ? Math.cos(inputAngle) * inputLen : 0;
    let dy = inputLen > 0.05 ? Math.sin(inputAngle) * inputLen : 0;
    if (dashing) {
      dx = p.dashDir.x;
      dy = p.dashDir.y;
      maxSpeed *= 3;
    }
    prime.vx += (dx * maxSpeed - prime.vx) * a;
    prime.vy += (dy * maxSpeed - prime.vy) * a;
    if (inputLen > 0.05) p.lastMoveAngle = inputAngle;
  }

  // Ambient currents nudge the cell (planktonic drift), less when swimming hard.
  const flow = curlFlow(prime.x, prime.y, now, state.seed, 1 / 1400, { x: 0, y: 0 });
  const drift = state.current * (1 + state.director.surge * 2.2) * 16 * (1 - inputLen * 0.6);
  prime.x += (prime.vx + flow.x * drift) * dt;
  prime.y += (prime.vy + flow.y * drift) * dt;

  const speed = Math.hypot(prime.vx, prime.vy);
  if (speed > 25 && !cyst) prime.heading = turnToward(prime.heading, Math.atan2(prime.vy, prime.vx), 3.4 * dt);

  layoutColony(p);
  for (const u of p.units) {
    if (u.dead || u === prime) continue;
    const d = (prime.radius + u.radius) * 0.84 + u.slotRing * u.radius * 1.6;
    const a = prime.heading + u.slotAngle;
    const tx = prime.x + Math.cos(a) * d;
    const ty = prime.y + Math.sin(a) * d;
    u.vx += ((tx - u.x) * 16 - (u.vx - prime.vx) * 5.5) * dt;
    u.vy += ((ty - u.y) * 16 - (u.vy - prime.vy) * 5.5) * dt;
    u.x += u.vx * dt;
    u.y += u.vy * dt;
    u.heading = turnToward(u.heading, prime.heading, 4 * dt);
  }
  // Daughters must not overlap each other more than an adhesion junction.
  const units = livingUnits(p);
  for (let i = 1; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const a = units[i];
      const b = units[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dd = Math.hypot(dx, dy) || 1;
      const min = (a.radius + b.radius) * 0.82;
      if (dd < min) {
        const push = (min - dd) * 0.5;
        a.x -= (dx / dd) * push;
        a.y -= (dy / dd) * push;
        b.x += (dx / dd) * push;
        b.y += (dy / dd) * push;
      }
    }
  }
}

function updateCapture(state: GameState, input: SimInput, dt: number, inputLen: number, inputAngle: number) {
  const p = state.player;
  const cap = p.capture!;
  const captor = state.byId.get(cap.byId);
  const prime = p.units[0];
  if (!captor || captor.dead) {
    releaseCapture(state, false);
    return;
  }
  cap.time += dt;
  const mouth = captorMouth(captor);
  prime.x += (mouth.x - prime.x) * approach(2.6, dt);
  prime.y += (mouth.y - prime.y) * approach(2.6, dt);
  prime.vx *= 1 - approach(8, dt);
  prime.vy *= 1 - approach(8, dt);

  // Struggling: pushing away from the captor and thrashing direction both help.
  const strength = clamp((prime.radius / captor.radius) * 1.7, 0.45, 1.6);
  if (inputLen > 0.3) {
    const away = Math.atan2(prime.y - captor.y, prime.x - captor.x);
    const alignment = Math.cos(inputAngle - away);
    let delta = Math.abs(inputAngle - p.lastMoveAngle) % TAU;
    if (delta > Math.PI) delta = TAU - delta;
    cap.struggle += dt * strength * (0.16 + Math.max(0, alignment) * 0.22) + Math.min(0.12, delta * 0.05) * strength;
    p.lastMoveAngle = inputAngle;
  }
  if (input.dash) cap.struggle += 0.3 * strength;

  const digest = (6 + captor.radius * 0.06) * dt;
  damageUnit(state, prime, digest, captor.x, captor.y, captor.species, { bypassCooldown: true, cause: 'digested' });
  if (cap.struggle >= 1 && !p.dead) releaseCapture(state, true);
}

export function updateUnitBodies(state: GameState, dt: number) {
  const p = state.player;
  const prime = p.units[0];
  const units = livingUnits(p);
  const cyst = state.time < p.cystUntil;
  const dividingPinch = p.dividing > 0 ? Math.sin(Math.min(1, p.dividing) * Math.PI * 0.5) : 0;

  // Organelles ease toward their slots (in normalized prime-local space).
  for (const o of p.organelles) {
    const slot = SLOTS[o.slot] ?? SLOTS[0];
    o.px += (slot.x - o.px) * approach(5, dt);
    o.py += (slot.y - o.py) * approach(5, dt);
  }

  for (const u of units) {
    u.radius += (radiusForBiomass(u.biomass) - u.radius) * approach(3, dt);
    u.hitFlash = Math.max(0, u.hitFlash - dt * 2.5);
    u.hitCooldown = Math.max(0, u.hitCooldown - dt);
    u.dotTick = Math.max(0, u.dotTick - dt);

    const bodies: MembraneBody[] = [];
    const cos = Math.cos(u.heading);
    const sin = Math.sin(u.heading);
    if (u === prime) {
      for (const o of p.organelles) {
        const lx = o.px * u.radius;
        const ly = o.py * u.radius;
        bodies.push({ x: lx * cos - ly * sin, y: lx * sin + ly * cos, r: ORGANELLES[o.type].size * u.radius * 0.95 });
      }
    } else {
      bodies.push({ x: 0, y: 0, r: u.radius * 0.3 });
    }
    const engulfing: MembraneBody[] = [];
    for (const v of u.vacuoles) {
      if (v.intake >= 1) {
        const lx = v.lx * u.radius;
        const ly = v.ly * u.radius;
        bodies.push({ x: lx * cos - ly * sin, y: lx * sin + ly * cos, r: v.radius * (1 - v.progress * 0.7) });
        continue;
      }
      const k = v.intake * v.intake;
      const lx = v.lx * u.radius;
      const ly = v.ly * u.radius;
      const ix = lx * cos - ly * sin;
      const iy = lx * sin + ly * cos;
      engulfing.push({ x: v.startX + (ix - v.startX) * k, y: v.startY + (iy - v.startY) * k, r: v.radius });
    }
    const neighbors: MembraneBody[] = [];
    for (const o of units) {
      if (o === u) continue;
      const dx = o.x - u.x;
      const dy = o.y - u.y;
      if (dx * dx + dy * dy < (u.radius + o.radius) * (u.radius + o.radius) * 1.3) neighbors.push({ x: dx, y: dy, r: o.radius });
    }
    const speed = Math.hypot(u.vx, u.vy) / Math.max(1, p.traits.speed);
    stepMembrane(u.membrane, {
      radius: u.radius,
      heading: u.heading,
      speed: Math.min(1.3, speed),
      time: state.time,
      dt,
      seed: u.id * 1.7,
      liveliness: u === prime ? 1 : 0.65,
      bodies,
      engulfing,
      neighbors,
      rigid: cyst,
      pinch: u === prime ? dividingPinch : 0,
      rand: state.rng,
    });
  }
}

export function updateMetabolism(state: GameState, dt: number) {
  const p = state.player;
  if (p.dead) return;
  const t = p.traits;
  const prime = p.units[0];
  const cyst = state.time < p.cystUntil;

  // Photosynthesis: light depends on the biome.
  p.glucose = Math.min(t.glucoseCap, p.glucose + t.photoRate * state.light * dt);

  // Glycolysis (2 ATP/glucose) and oxidative phosphorylation (~12+).
  if (p.atp < t.atpCap) {
    const g1 = Math.min(p.glucose, t.glycolysis * dt, (t.atpCap - p.atp) / 2);
    p.glucose -= g1;
    p.atp += g1 * 2;
    const g2 = Math.min(p.glucose, t.mitoRate * dt, Math.max(0, t.atpCap - p.atp) / t.atpPerGlucoseMito);
    p.glucose -= g2;
    p.atp += g2 * t.atpPerGlucoseMito;
  }

  const units = livingUnits(p);
  if (!cyst) {
    const speedFrac = Math.min(1.5, Math.hypot(prime.vx, prime.vy) / Math.max(1, t.speed));
    let drain = 0.45 + prime.radius * 0.011 + (units.length - 1) * 0.32 + speedFrac * 2.1;
    if (p.dividing > 0) drain += 1.2;
    if (state.lightMode === 'fluor') drain += 0.9; // phototoxicity under excitation light
    const inf = p.infection;
    if (inf.viralLoad > 0) drain += 0.6 + inf.viralLoad * 0.012;
    if (inf.colonies > 0 && mutationStacks(p, 'endosymbiontPact') > 0) drain -= inf.colonies * 0.3;
    p.atp -= drain * dt;
  }

  // Integrity repair spends ATP.
  if (p.atp > 8) {
    for (const u of units) {
      if (u.integrity >= u.maxIntegrity) continue;
      const heal = Math.min(u.maxIntegrity - u.integrity, t.regen * dt * (u.fate === 'prime' ? 1 : 0.7));
      u.integrity += heal;
      p.atp -= heal * 0.35;
    }
  }

  p.dna += t.dnaRate * dt;

  if (p.atp <= 0) {
    p.atp = 0;
    if (!p.starving) p.starving = true;
    // Catabolism: the cell digests its own cytoplasm to survive; once only the
    // body remains, the membrane itself starts to fail.
    if (prime.biomass > organelleMass(p) + BODY_BIOMASS * 0.8) {
      const burn = 1.3 * dt;
      prime.biomass -= burn;
      p.glucose += burn * 0.5;
    } else {
      damageUnit(state, prime, 3 * dt, prime.x, prime.y, 'misc', { bypassCooldown: true, cause: 'starvation' });
    }
  } else if (p.starving && p.atp > 6) {
    p.starving = false;
  }
  p.atp = Math.min(p.atp, t.atpCap);
  p.glucose = clamp(p.glucose, 0, t.glucoseCap);

  // Daughters share the colony's biomass budget: they slowly grow toward a
  // fraction of the prime's size.
  for (const u of units) {
    if (u === prime) continue;
    const target = Math.max(18, prime.biomass * 0.42);
    if (u.biomass < target && spendableBiomass(p) > 30) {
      const share = Math.min(0.9 * dt, target - u.biomass);
      u.biomass += share;
      prime.biomass -= share;
    }
  }
  for (const u of units) {
    u.maxIntegrity = (u.fate === 'prime' ? t.maxIntegrity : t.maxIntegrity * 0.7);
    u.integrity = Math.min(u.integrity, u.maxIntegrity);
  }
  state.stats.peakBiomass = Math.max(state.stats.peakBiomass, units.reduce((s, u) => s + u.biomass, 0));
}

// Digestion inside food vacuoles, plus endosymbiotic capture.
export function updateDigestion(state: GameState, dt: number) {
  const p = state.player;
  const prime = p.units[0];
  for (const u of p.units) {
    if (u.dead) continue;
    for (let i = u.vacuoles.length - 1; i >= 0; i--) {
      const v = u.vacuoles[i];
      if (v.intake < 1) {
        v.intake = Math.min(1, v.intake + dt / 0.42);
        if (v.intake >= 1) {
          const def = SPECIES[v.species];
          if (def.endosymbiont && u === prime && countOrganelles(p, def.endosymbiont, true) === 0) {
            const slot = firstFreeSlot(p, def.endosymbiont);
            if (slot !== null) {
              p.organelles.push({
                id: state.nextOrganelleId++, type: def.endosymbiont, slot, misfolded: false, born: state.time, mass: 4,
                px: v.lx, py: v.ly,
              });
              prime.biomass += 4;
              p.traitsDirty = true;
              u.vacuoles.splice(i, 1);
              emit(state, { type: 'endosymbiosis', organelle: def.endosymbiont, x: u.x, y: u.y });
              continue;
            }
          }
        }
        continue;
      }
      const before = v.progress;
      v.progress = Math.min(1, v.progress + (dt * p.traits.digestion) / v.duration);
      const dp = v.progress - before;
      p.glucose = Math.min(p.traits.glucoseCap, p.glucose + v.glucose * dp);
      p.dna += v.dna * dp;
      const target = u.fate !== 'prime' && u.biomass > prime.biomass * 0.7 ? prime : u;
      target.biomass += v.biomass * dp;
      u.integrity = Math.min(u.maxIntegrity, u.integrity + v.lipid * dp);
      if (v.progress >= 1) {
        u.vacuoles.splice(i, 1);
        emit(state, { type: 'digested', species: v.species, x: u.x, y: u.y, amount: v.biomass });
        if (v.carrier) {
          // Lysosome-rich cells sometimes kill the hitchhiker first.
          const lyso = countOrganelles(p, 'lysosome');
          if (state.rng() > lyso * 0.22) {
            p.infection.colonies = Math.min(8, p.infection.colonies + 1);
            emit(state, { type: 'colonized' });
          }
        }
      }
    }
  }
}

export function engulf(state: GameState, unit: CellUnit, e: Entity) {
  const p = state.player;
  const y = yieldsOf(e);
  const def = SPECIES[e.species];
  const a = state.rng() * TAU;
  const rr = 0.18 + state.rng() * 0.32;
  unit.vacuoles.push({
    id: state.nextVacuoleId++,
    species: e.species,
    seed: e.seed,
    radius: e.radius,
    lx: Math.cos(a) * rr,
    ly: Math.sin(a) * rr,
    progress: 0,
    duration: (1.1 + e.radius * 0.075) * (e.species === 'diatom' ? 2 : 1),
    biomass: y.biomass,
    glucose: y.glucose,
    dna: y.dna,
    lipid: y.lipid,
    carrier: e.carrier,
    intake: 0,
    startX: e.x - unit.x,
    startY: e.y - unit.y,
  });
  p.lastDevoured = e.species;
  state.stats.eaten++;
  emit(state, { type: 'engulfStart', species: e.species, x: e.x, y: e.y, unit: unit.id });
  if (def.group === 'boss') state.stats.kills++;
}

// --- Division -------------------------------------------------------------

export function canDivide(state: GameState) {
  const p = state.player;
  const units = livingUnits(p);
  const reasons: string[] = [];
  const spare = spendableBiomass(p);
  if (spare < divisionThreshold(p.generation)) reasons.push(`Spare biomass ${Math.floor(Math.max(0, spare))}/${divisionThreshold(p.generation)}`);
  if (p.dna < divisionDnaCost(p.generation)) reasons.push(`DNA ${Math.floor(p.dna)}/${divisionDnaCost(p.generation)}`);
  if (p.infection.viralLoad > 40) reasons.push('Genome infected');
  if (units.length >= 12) reasons.push('Colony at maximum size');
  if (p.dividing > 0 || p.pendingDivision) reasons.push('Already dividing');
  if (p.capture) reasons.push('Captured');
  return { ok: reasons.length === 0 && !p.dead, reasons };
}

export function startDivision(state: GameState): boolean {
  const p = state.player;
  if (!canDivide(state).ok) return false;
  p.dna -= divisionDnaCost(p.generation);
  p.dividing = 0.0001;
  emit(state, { type: 'divisionStart' });
  return true;
}

function rollChoices(state: GameState): { fates: CellFate[]; mutations: MutationId[] } {
  const rng = state.rng;
  const p = state.player;
  const fates = (Object.keys(FATES) as CellFate[]).sort(() => rng() - 0.5).slice(0, 3);
  const pool = MUTATION_POOL.filter((id) => mutationStacks(p, id) < MUTATIONS[id].maxStacks);
  const mutations: MutationId[] = [];
  while (mutations.length < 3 && pool.length) {
    const i = Math.floor(rng() * pool.length);
    mutations.push(pool.splice(i, 1)[0]);
  }
  return { fates, mutations };
}

export function updateDivision(state: GameState, dt: number) {
  const p = state.player;
  if (p.dividing <= 0 || p.dead) return;
  p.dividing += dt / 3.2;
  if (p.dividing < 1) return;
  p.dividing = 0;
  const prime = p.units[0];
  const share = Math.max(14, Math.min(spendableBiomass(p), divisionThreshold(p.generation)));
  prime.biomass -= share;
  const back = prime.heading + Math.PI;
  const daughter = createUnit('phagocyte', prime.x + Math.cos(back) * prime.radius, prime.y + Math.sin(back) * prime.radius, share, state.time);
  daughter.heading = prime.heading;
  daughter.integrity = 100;
  p.units.push(daughter);
  p.pendingDivision = true;
  const choices = rollChoices(state);
  state.divisionChoices = { ...choices, daughterId: daughter.id };
  p.traitsDirty = true;
}

export function rerollDivision(state: GameState): boolean {
  const p = state.player;
  if (!state.divisionChoices || p.dna < 2) return false;
  p.dna -= 2;
  const choices = rollChoices(state);
  state.divisionChoices = { ...choices, daughterId: state.divisionChoices.daughterId };
  return true;
}

export function applyMutation(state: GameState, id: MutationId) {
  const p = state.player;
  const existing = p.mutations.find((m) => m.id === id);
  if (existing) existing.stacks++;
  else p.mutations.push({ id, stacks: 1 });
  if (id === 'hgt') {
    p.dna += 3;
    const pool = MUTATION_POOL.filter((m) => m !== 'hgt' && mutationStacks(p, m) < MUTATIONS[m].maxStacks);
    if (pool.length) applyMutation(state, pool[Math.floor(state.rng() * pool.length)]);
  }
  emit(state, { type: 'mutation', id });
  p.traitsDirty = true;
}

export function chooseDivision(state: GameState, fate: CellFate, mutation: MutationId): boolean {
  const p = state.player;
  const choices = state.divisionChoices;
  if (!choices || !choices.fates.includes(fate) || !choices.mutations.includes(mutation)) return false;
  const daughter = p.units.find((u) => u.id === choices.daughterId);
  if (daughter) daughter.fate = fate;
  applyMutation(state, mutation);
  p.generation++;
  p.pendingDivision = false;
  p.divisionReadyNotified = false;
  state.divisionChoices = null;
  state.stats.divisions++;
  state.stats.peakCells = Math.max(state.stats.peakCells, livingUnits(p).length);
  p.invulnUntil = state.time + 2;
  emit(state, { type: 'divided', generation: p.generation });
  return true;
}

// --- Cell architecture ----------------------------------------------------

export function buildOrganelle(state: GameState, type: OrganelleType): boolean {
  const p = state.player;
  if (p.dead) return false;
  const check = canBuild(p, type, spendableBiomass(p));
  if (!check.ok) return false;
  const slot = firstFreeSlot(p, type);
  if (slot === null) return false;
  const origin = SLOTS[slot];
  p.organelles.push({
    id: state.nextOrganelleId++, type, slot, misfolded: false, born: state.time, mass: check.cost.biomass,
    px: origin.x * 0.2, py: origin.y * 0.2,
  });
  p.dna -= check.cost.dna;
  p.traitsDirty = true;
  emit(state, { type: 'build', organelle: type });
  return true;
}

export function moveOrganelle(state: GameState, organelleId: number, slot: number): boolean {
  const p = state.player;
  const moving = p.organelles.find((o) => o.id === organelleId);
  if (!moving || moving.type === 'nucleus') return false;
  if (slot >= p.traits.slots || !slotAccepts(slot, moving.type)) return false;
  if (moving.slot === slot) return true;
  const occupant = p.organelles.find((o) => o.slot === slot);
  if (occupant) {
    if (occupant.type === 'nucleus' || !slotAccepts(moving.slot, occupant.type)) return false;
    occupant.slot = moving.slot;
  }
  moving.slot = slot;
  p.traitsDirty = true;
  return true;
}

export function recycleOrganelle(state: GameState, organelleId: number): boolean {
  const p = state.player;
  const index = p.organelles.findIndex((o) => o.id === organelleId);
  if (index < 0 || p.organelles[index].type === 'nucleus') return false;
  const [removed] = p.organelles.splice(index, 1);
  // Autophagy recovers most, not all, of the invested material.
  p.units[0].biomass -= removed.mass * 0.4;
  p.traitsDirty = true;
  return true;
}

export function refreshTraits(state: GameState) {
  const p = state.player;
  if (!p.traitsDirty) return;
  p.traitsDirty = false;
  p.traits = computeTraits(p);
  // Keep the prime's cytoplasm viable if traits changed slot limits.
  const prime = p.units[0];
  if (prime.biomass < organelleMass(p) + MIN_CYTOPLASM * 0.5) prime.biomass = organelleMass(p) + MIN_CYTOPLASM * 0.5;
}
