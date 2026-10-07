import { burstHost, killEntity } from './entities';
import { angleDiff, approach, turnToward } from './math';
import { canUnitEat, capturePlayer, damageUnit, isUntouchable, livingUnits, playerHostClasses } from './player';
import { curlFlow } from './rng';
import { hostClassesOf, SPECIES, type SpeciesDef } from './species';
import { removeEntity, spawnEntity, type GameState } from './state';
import type { Behavior, CellUnit, Entity, SpeciesId } from './types';

type Ctx = { state: GameState; e: Entity; def: SpeciesDef; dt: number; units: CellUnit[] };

const flow = { x: 0, y: 0 };

function steer(e: Entity, angle: number, speed: number, rate: number, dt: number) {
  const a = approach(rate, dt);
  e.vx += (Math.cos(angle) * speed - e.vx) * a;
  e.vy += (Math.sin(angle) * speed - e.vy) * a;
}

function damp(e: Entity, rate: number, dt: number) {
  const k = 1 - approach(rate, dt);
  e.vx *= k;
  e.vy *= k;
}

function wander(ctx: Ctx, jitter = 1.2): number {
  const { e, state, dt } = ctx;
  e.timer -= dt;
  if (e.timer <= 0) {
    e.timer = 0.9 + state.rng() * 2.4;
    e.wander = e.angle + (state.rng() - 0.5) * jitter * 2;
  }
  return e.wander;
}

// Nearest colony cell that could eat this organism, within its senses.
function predatorUnit(ctx: Ctx, range = ctx.def.sense): CellUnit | null {
  const { state, e, units } = ctx;
  if (state.player.dead) return null;
  let best: CellUnit | null = null;
  let bestD = range * range;
  for (const u of units) {
    const dx = u.x - e.x;
    const dy = u.y - e.y;
    const d = dx * dx + dy * dy;
    if (d < bestD && canUnitEat(state.player, u, e)) {
      best = u;
      bestD = d;
    }
  }
  return best;
}

function nearestUnit(ctx: Ctx, range: number, filter: (u: CellUnit) => boolean): CellUnit | null {
  let best: CellUnit | null = null;
  let bestD = range * range;
  for (const u of ctx.units) {
    const dx = u.x - ctx.e.x;
    const dy = u.y - ctx.e.y;
    const d = dx * dx + dy * dy;
    if (d < bestD && filter(u)) {
      best = u;
      bestD = d;
    }
  }
  return best;
}

type Target = { x: number; y: number; r: number; entity: Entity | null; unit: CellUnit | null };

function resolveTarget(ctx: Ctx, id: number): Target | null {
  if (id > 0) {
    const t = ctx.state.byId.get(id);
    return t && !t.dead ? { x: t.x, y: t.y, r: t.radius, entity: t, unit: null } : null;
  }
  if (id < 0) {
    const u = ctx.units.find((unit) => unit.id === -id);
    return u && !ctx.state.player.dead ? { x: u.x, y: u.y, r: u.radius, entity: null, unit: u } : null;
  }
  return null;
}

const PREY_GROUPS = new Set(['bacteria', 'protist']);

function smallPrey(o: Entity, maxRadius: number, self: Entity) {
  if (o === self || o.attachedTo) return false;
  const d = SPECIES[o.species];
  return PREY_GROUPS.has(d.group) && !d.invulnerable && o.radius < maxRadius && o.species !== self.species;
}

export function fireProjectile(
  state: GameState,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  life: number,
  owner: 'player' | 'enemy',
  stun = 0,
) {
  state.projectiles.push({
    id: state.nextId++,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life,
    damage,
    stun,
    owner,
  });
}

function eat(state: GameState, predator: Entity, prey: Entity, grow = 0.05) {
  removeEntity(state, prey);
  const max = SPECIES[predator.species].radius[1] * 1.25;
  predator.radius = Math.min(max, predator.radius + prey.radius * grow);
  predator.aux2 = Math.max(predator.aux2, 0.6);
}

const behaviors: Record<Behavior, (ctx: Ctx) => void> = {
  drift(ctx) {
    const { e, def, dt } = ctx;
    damp(e, 1.1, dt);
    if (def.speed > 0) steer(e, wander(ctx, 1.6), def.speed, 0.8, dt);
    e.angle += e.spin * dt;
  },

  swim(ctx) {
    const { e, def, dt, state } = ctx;
    e.aux = Math.max(0, e.aux - dt);
    const threat = predatorUnit(ctx);
    let angle: number;
    let speed: number;
    if (threat) {
      angle = Math.atan2(e.y - threat.y, e.x - threat.x);
      speed = def.speed * 1.3;
      if (e.species === 'paramecium' && e.aux <= 0) {
        const d = Math.hypot(threat.x - e.x, threat.y - e.y);
        if (d < threat.radius + 160) {
          // Trichocysts: a defensive spray of protein harpoons.
          const toward = Math.atan2(threat.y - e.y, threat.x - e.x);
          for (let i = -1; i <= 1; i++) fireProjectile(state, e.x, e.y, toward + i * 0.18, 380, 4, 0.55, 'enemy');
          e.aux = 2.4;
        }
      }
    } else {
      angle = wander(ctx);
      speed = def.speed * 0.55;
    }
    e.angle = turnToward(e.angle, angle, def.turn * dt);
    steer(e, e.angle, speed, 2.4, dt);
  },

  corkscrew(ctx) {
    const { e, def, dt } = ctx;
    const threat = predatorUnit(ctx);
    const angle = threat ? Math.atan2(e.y - threat.y, e.x - threat.x) : wander(ctx, 1.6);
    e.angle = turnToward(e.angle, angle, def.turn * dt);
    const wobble = Math.sin(e.age * 9 + e.seed) * 0.35;
    steer(e, e.angle + wobble, def.speed * (threat ? 1.25 : 0.7), 3, dt);
  },

  grazer(ctx) {
    const { e, def, dt, state } = ctx;
    const threat = predatorUnit(ctx, 260);
    if (threat) {
      e.angle = turnToward(e.angle, Math.atan2(e.y - threat.y, e.x - threat.x), def.turn * 1.4 * dt);
      steer(e, e.angle, def.speed * 1.35, 2, dt);
      return;
    }
    e.aux -= dt;
    if (e.aux <= 0) {
      e.aux = 0.6;
      const g = state.grid.nearest(e.x, e.y, def.sense, (o) => o.species === 'glucose');
      e.targetId = g ? g.id : 0;
    }
    const target = e.targetId ? state.byId.get(e.targetId) : undefined;
    if (target && !target.dead) {
      e.angle = turnToward(e.angle, Math.atan2(target.y - e.y, target.x - e.x), def.turn * dt);
      steer(e, e.angle, def.speed, 2, dt);
      if (Math.hypot(target.x - e.x, target.y - e.y) < e.radius * 0.7 + target.radius) removeEntity(state, target);
    } else {
      e.angle = turnToward(e.angle, wander(ctx), def.turn * dt);
      steer(e, e.angle, def.speed * 0.5, 2, dt);
    }
  },

  hunter(ctx) {
    const { e, def, dt, state } = ctx;
    const scared = predatorUnit(ctx, 240);
    if (scared && e.state !== 2) {
      e.state = 0;
      e.angle = turnToward(e.angle, Math.atan2(e.y - scared.y, e.x - scared.x), def.turn * dt);
      steer(e, e.angle, def.speed * 0.8, 2, dt);
      return;
    }
    e.timer -= dt;
    if (e.state === 0) {
      e.angle = turnToward(e.angle, wander(ctx), def.turn * 0.5 * dt);
      steer(e, e.angle, def.speed * 0.32, 2, dt);
      e.aux -= dt;
      if (e.aux <= 0) {
        e.aux = 0.4;
        const unit = isUntouchable(state) ? null : nearestUnit(ctx, def.sense, (u) => u.radius < e.radius * 1.9);
        if (unit) {
          e.targetId = -unit.id;
        } else {
          const prey = state.grid.nearest(
            e.x,
            e.y,
            def.sense * 0.7,
            (o) => o.species === 'paramecium' || (smallPrey(o, e.radius * 1.6, e) && SPECIES[o.species].group === 'protist'),
          );
          e.targetId = prey ? prey.id : 0;
        }
        if (e.targetId) {
          e.state = 1;
          e.timer = 0.45;
        }
      }
    } else if (e.state === 1) {
      const t = resolveTarget(ctx, e.targetId);
      if (!t) {
        e.state = 0;
        return;
      }
      const toward = Math.atan2(t.y - e.y, t.x - e.x);
      e.angle = turnToward(e.angle, toward, 9 * dt);
      damp(e, 6, dt);
      if (e.timer <= 0) {
        e.state = 2;
        e.timer = 0.6;
        e.reachAngle = toward;
      }
    } else if (e.state === 2) {
      steer(e, e.reachAngle, def.speed * 2.4, 10, dt);
      const t = resolveTarget(ctx, e.targetId);
      if (t?.entity && Math.hypot(t.x - e.x, t.y - e.y) < e.radius + t.r * 0.7) {
        eat(state, e, t.entity, 0.02);
        e.state = 3;
        e.timer = 2.4;
      } else if (e.timer <= 0) {
        e.state = 3;
        e.timer = 1.1;
      }
    } else {
      damp(e, 2.5, dt);
      if (e.timer <= 0) e.state = 0;
    }
  },

  neck(ctx) {
    const { e, def, dt, state } = ctx;
    const neckLen = e.radius * 6.5;
    e.timer -= dt;
    e.aux = Math.max(0, e.aux - dt);
    if (e.state === 0) {
      const threat = predatorUnit(ctx, 300);
      const angle = threat ? Math.atan2(e.y - threat.y, e.x - threat.x) : wander(ctx);
      e.angle = turnToward(e.angle, angle, def.turn * dt);
      steer(e, e.angle, def.speed * (threat ? 1.2 : 0.45), 2, dt);
      e.reach += (0.1 - e.reach) * approach(3, dt);
      e.reachAngle = turnToward(e.reachAngle, e.angle + Math.sin(e.age * 1.3 + e.seed) * 0.7, 2 * dt);
      if (!threat && e.aux <= 0) {
        e.aux = 0.3;
        const unit = isUntouchable(state) ? null : nearestUnit(ctx, e.radius + neckLen * 0.95, () => true);
        if (unit) e.targetId = -unit.id;
        else {
          const prey = state.grid.nearest(e.x, e.y, neckLen * 0.9, (o) => smallPrey(o, e.radius * 0.9, e));
          e.targetId = prey ? prey.id : 0;
        }
        if (e.targetId) {
          e.state = 1;
          e.timer = 0.75;
        }
      }
    } else if (e.state === 1) {
      const t = resolveTarget(ctx, e.targetId);
      if (!t) {
        e.state = 3;
        e.timer = 0.4;
        return;
      }
      const toward = Math.atan2(t.y - e.y, t.x - e.x);
      e.reachAngle = turnToward(e.reachAngle, toward, 5 * dt);
      e.angle = turnToward(e.angle, toward, def.turn * dt);
      e.reach += (0 - e.reach) * approach(8, dt);
      damp(e, 4, dt);
      if (e.timer <= 0) {
        e.state = 2;
        e.timer = 0.35;
      }
    } else if (e.state === 2) {
      e.reach = Math.min(1, e.reach + dt / 0.14);
      const tipX = e.x + Math.cos(e.reachAngle) * (e.radius * 0.8 + e.reach * neckLen);
      const tipY = e.y + Math.sin(e.reachAngle) * (e.radius * 0.8 + e.reach * neckLen);
      let hit = false;
      for (const u of ctx.units) {
        if (Math.hypot(u.x - tipX, u.y - tipY) < u.radius * 0.95 + 5) {
          damageUnit(state, u, 14, tipX, tipY, e.species);
          hit = true;
          break;
        }
      }
      if (!hit) {
        state.grid.query(tipX, tipY, 30, (o) => {
          if (smallPrey(o, e.radius * 0.9, e) && Math.hypot(o.x - tipX, o.y - tipY) < o.radius + 8) {
            eat(state, e, o, 0.02);
            hit = true;
            return true;
          }
        });
      }
      if (hit || e.reach >= 1) {
        e.state = 3;
        e.timer = 0.75;
      }
    } else {
      e.reach += (0 - e.reach) * approach(4, dt);
      if (e.timer <= 0) {
        e.state = 0;
        e.aux = 1.4;
      }
    }
  },

  engulfer(ctx) {
    const { e, def, dt, state } = ctx;
    e.aux -= dt;
    e.aux2 = Math.max(0, e.aux2 - dt);
    const threat = predatorUnit(ctx, 360);
    const crawl = def.speed * (0.6 + 0.4 * Math.sin(e.age * 1.6 + e.seed));
    if (threat) {
      e.angle = turnToward(e.angle, Math.atan2(e.y - threat.y, e.x - threat.x), def.turn * dt);
      steer(e, e.angle, crawl * 1.3, 1.5, dt);
      e.reachAngle = e.angle;
      return;
    }
    if (e.aux <= 0) {
      e.aux = 0.5;
      const unit = isUntouchable(state) ? null : nearestUnit(ctx, def.sense, (u) => u.radius < e.radius * 0.78);
      if (unit) e.targetId = -unit.id;
      else {
        const prey = state.grid.nearest(e.x, e.y, def.sense * 0.6, (o) => smallPrey(o, e.radius * 0.45, e));
        e.targetId = prey ? prey.id : 0;
      }
    }
    const t = resolveTarget(ctx, e.targetId);
    if (t) {
      // Amoeboid crawling has no fixed front: a pseudopod simply extends
      // toward the prey, so steer straight at it.
      const toward = Math.atan2(t.y - e.y, t.x - e.x);
      e.angle = turnToward(e.angle, toward, 3 * dt);
      steer(e, toward, crawl * 1.15, 1.4, dt);
      const d = Math.hypot(t.x - e.x, t.y - e.y);
      if (t.unit && d < e.radius * 0.8 + t.r * 0.5) {
        if (t.unit.fate === 'prime') capturePlayer(state, e);
        else damageUnit(state, t.unit, 14, e.x, e.y, e.species);
      } else if (t.entity && d < e.radius * 0.8) {
        eat(state, e, t.entity, 0.06);
      }
    } else {
      e.angle = turnToward(e.angle, wander(ctx, 0.8), def.turn * dt);
      steer(e, e.angle, crawl * 0.6, 1.2, dt);
    }
    e.reachAngle = e.angle;
  },

  testate(ctx) {
    const { e, def, dt, state } = ctx;
    e.aux = Math.max(0, e.aux - dt);
    e.reach += (0 - e.reach) * approach(3.5, dt);
    const prime = ctx.units[0];
    const near = prime && !state.player.dead && Math.hypot(prime.x - e.x, prime.y - e.y) < 340;
    if (near) {
      const toward = Math.atan2(prime.y - e.y, prime.x - e.x);
      e.angle = turnToward(e.angle, toward, def.turn * dt);
      steer(e, e.angle, def.speed * 0.6, 1.5, dt);
    } else {
      e.angle = turnToward(e.angle, wander(ctx, 0.9), def.turn * dt);
      steer(e, e.angle, def.speed * 0.5, 1.5, dt);
    }
    if (e.aux <= 0 && !isUntouchable(state)) {
      for (const u of ctx.units) {
        const dx = u.x - e.x;
        const dy = u.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < e.radius * 1.7 + u.radius && Math.abs(angleDiff(e.angle, Math.atan2(dy, dx))) < 0.9) {
          damageUnit(state, u, 10, e.x + Math.cos(e.angle) * e.radius, e.y + Math.sin(e.angle) * e.radius, e.species);
          e.aux = 1.7;
          e.reach = 1;
          e.reachAngle = Math.atan2(dy, dx);
          break;
        }
      }
    }
  },

  vortex(ctx) {
    const { e, def, dt, state } = ctx;
    e.aux2 = Math.max(0, e.aux2 - dt);
    const sessile = e.species === 'stentor';
    const threat = predatorUnit(ctx, 280);
    let feeding = true;
    if (sessile) {
      e.x += (e.homeX - e.x) * approach(2, dt);
      e.y += (e.homeY - e.y) * approach(2, dt);
      damp(e, 4, dt);
      e.angle = e.wander + Math.sin(e.age * 0.45 + e.seed) * 0.28;
      if (threat) e.aux2 = Math.max(e.aux2, 0.5);
    } else {
      e.timer -= dt;
      if (threat) {
        e.angle = turnToward(e.angle, Math.atan2(e.y - threat.y, e.x - threat.x), def.turn * dt);
        steer(e, e.angle, def.speed * 1.4, 2, dt);
        feeding = false;
      } else if (e.state === 0) {
        e.angle = turnToward(e.angle, e.wander, def.turn * dt);
        steer(e, e.angle, def.speed, 1.5, dt);
        feeding = false;
        if (e.timer <= 0) {
          e.state = 1;
          e.timer = 6 + state.rng() * 4;
        }
      } else {
        damp(e, 3, dt);
        if (e.timer <= 0) {
          e.state = 0;
          e.timer = 3 + state.rng() * 3;
          e.wander = e.angle + (state.rng() - 0.5) * 2;
        }
      }
    }
    if (e.aux2 > 0) feeding = false;
    e.reach += ((feeding ? 1 : 0) - e.reach) * approach(3, dt);
    if (!feeding) return;

    const mx = e.x + Math.cos(e.angle) * e.radius * 0.85;
    const my = e.y + Math.sin(e.angle) * e.radius * 0.85;
    const R = e.radius * 4.2;
    const fx = Math.cos(e.angle);
    const fy = Math.sin(e.angle);
    state.grid.query(mx, my, R, (o) => {
      if (o === e || o.attachedTo) return;
      const od = SPECIES[o.species];
      if (od.invulnerable || od.solid || o.radius > e.radius * 0.45) return;
      const dx = mx - o.x;
      const dy = my - o.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > R) return;
      if ((o.x - e.x) * fx + (o.y - e.y) * fy < -e.radius * 0.2) return;
      const pull = 150 * Math.pow(1 - d / R, 1.6);
      o.x += (dx / d) * pull * dt;
      o.y += (dy / d) * pull * dt;
      if (d < e.radius * 0.32 + o.radius) eat(state, e, o, 0.01);
    });
    if (state.player.dead || state.time < state.player.cystUntil) return;
    for (const u of ctx.units) {
      if (u.radius > e.radius * 0.62) continue;
      const dx = mx - u.x;
      const dy = my - u.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > R || (u.x - e.x) * fx + (u.y - e.y) * fy < -e.radius * 0.2) continue;
      const pull = 120 * Math.pow(1 - d / R, 1.5) * (state.player.capture ? 0 : 1);
      u.x += (dx / d) * pull * dt;
      u.y += (dy / d) * pull * dt;
      if (d < e.radius * 0.4 + u.radius * 0.45) {
        if (u.fate === 'prime') capturePlayer(state, e);
        else damageUnit(state, u, 10, mx, my, e.species);
      }
    }
  },

  tentacles(ctx) {
    const { e, def, dt, state } = ctx;
    e.x += (e.homeX - e.x) * approach(3, dt);
    e.y += (e.homeY - e.y) * approach(3, dt);
    damp(e, 5, dt);
    e.angle = e.wander + Math.sin(e.age * 0.35 + e.seed) * 0.15;
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03 * dt);
    e.timer -= dt;
    const reachMax = e.radius * 3.4;
    const mx = e.x + Math.cos(e.angle) * e.radius * 0.75;
    const my = e.y + Math.sin(e.angle) * e.radius * 0.75;
    const capturedByMe = state.player.capture?.byId === e.id;
    if (capturedByMe) {
      e.reach = 0.5;
      const prime = ctx.units[0];
      e.reachAngle = Math.atan2(prime.y - my, prime.x - mx);
      return;
    }
    if (e.state === 0) {
      e.reach += (0.28 - e.reach) * approach(2, dt);
      e.reachAngle = e.angle + Math.sin(e.age * 0.8) * 0.9;
      e.aux -= dt;
      if (e.aux <= 0) {
        e.aux = 0.4;
        let found = 0;
        if (!isUntouchable(state)) {
          for (const u of ctx.units) {
            if (u.radius < e.radius * 1.15 && Math.hypot(u.x - mx, u.y - my) < reachMax + u.radius) {
              found = -u.id;
              break;
            }
          }
        }
        if (!found) {
          const prey = state.grid.nearest(mx, my, reachMax, (o) => smallPrey(o, e.radius * 0.5, e));
          found = prey ? prey.id : 0;
        }
        if (found) {
          e.targetId = found;
          e.state = 1;
          e.timer = 2.4;
        }
      }
    } else if (e.state === 1) {
      const t = resolveTarget(ctx, e.targetId);
      const d = t ? Math.hypot(t.x - mx, t.y - my) : Infinity;
      if (!t || d > reachMax * 1.15 || e.timer <= 0) {
        e.state = 2;
        e.timer = 1;
        return;
      }
      e.reachAngle = turnToward(e.reachAngle, Math.atan2(t.y - my, t.x - mx), 4 * dt);
      e.reach += (Math.min(1, d / reachMax + 0.08) - e.reach) * approach(4, dt);
      const tipX = mx + Math.cos(e.reachAngle) * e.reach * reachMax;
      const tipY = my + Math.sin(e.reachAngle) * e.reach * reachMax;
      if (Math.hypot(t.x - tipX, t.y - tipY) < t.r + 10) {
        if (t.unit) {
          if (t.unit.fate === 'prime') capturePlayer(state, e);
          else damageUnit(state, t.unit, 16, tipX, tipY, e.species);
        } else if (t.entity) {
          eat(state, e, t.entity, 0);
        }
        e.state = 2;
        e.timer = 1.2;
      }
    } else {
      e.reach += (0.2 - e.reach) * approach(2.5, dt);
      if (e.timer <= 0) e.state = 0;
    }
    void def;
  },

  trap(ctx) {
    const { e, dt, state } = ctx;
    e.x += (e.homeX - e.x) * approach(3, dt);
    e.y += (e.homeY - e.y) * approach(3, dt);
    damp(e, 5, dt);
    e.angle = e.wander + Math.sin(e.age * 0.3 + e.seed) * 0.08;
    e.timer -= dt;
    const fcx = e.x + Math.cos(e.angle) * e.radius * 0.55;
    const fcy = e.y + Math.sin(e.angle) * e.radius * 0.55;
    const fr = e.radius * 0.85;
    if (state.player.capture?.byId === e.id) {
      e.reach = 1;
      return;
    }
    if (e.state === 0) {
      e.reach += (0 - e.reach) * approach(4, dt);
      let found = 0;
      if (!isUntouchable(state)) {
        for (const u of ctx.units) {
          if (u.radius < e.radius * 1.05 && Math.hypot(u.x - fcx, u.y - fcy) < fr) {
            found = -u.id;
            break;
          }
        }
      }
      if (!found) {
        const prey = state.grid.nearest(fcx, fcy, fr, (o) => smallPrey(o, e.radius * 0.5, e));
        found = prey ? prey.id : 0;
      }
      if (found) {
        e.targetId = found;
        e.state = 1;
        e.timer = 0.24;
      }
    } else if (e.state === 1) {
      e.reach += (1 - e.reach) * approach(16, dt);
      if (e.timer <= 0) {
        const t = resolveTarget(ctx, e.targetId);
        if (t && Math.hypot(t.x - fcx, t.y - fcy) < fr * 1.35) {
          if (t.unit) {
            if (t.unit.fate === 'prime') capturePlayer(state, e);
            else damageUnit(state, t.unit, 14, fcx, fcy, e.species);
          } else if (t.entity) eat(state, e, t.entity, 0);
        }
        e.state = 2;
        e.timer = 3.2;
      }
    } else if (e.state === 2) {
      e.reach = 1;
      if (e.timer <= 0) {
        e.state = 3;
        e.timer = 1.2;
      }
    } else {
      e.reach += (0 - e.reach) * approach(2.5, dt);
      if (e.timer <= 0) e.state = 0;
    }
  },

  lumber(ctx) {
    const { e, def, dt } = ctx;
    e.angle = turnToward(e.angle, wander(ctx, 0.7), def.turn * dt);
    steer(e, e.angle, def.speed * (0.7 + 0.3 * Math.sin(e.age * 2.2)), 1.2, dt);
  },

  virus(ctx) {
    const { e, def, dt, state } = ctx;
    e.angle += e.spin * dt * 2;
    e.aux -= dt;
    if (e.aux <= 0) {
      e.aux = 0.6;
      e.targetId = 0;
      const infects = def.infects ?? [];
      const hostsPlayer = !isUntouchable(state) && playerHostClasses(state.player).some((c) => infects.includes(c));
      let bestD = def.sense * def.sense;
      if (hostsPlayer) {
        for (const u of ctx.units) {
          const d = (u.x - e.x) ** 2 + (u.y - e.y) ** 2;
          if (d < bestD) {
            bestD = d;
            e.targetId = -u.id;
          }
        }
      }
      if (!e.targetId) {
        const host = state.grid.nearest(
          e.x,
          e.y,
          def.sense,
          (o) => !o.infectedBy && !o.attachedTo && o.id !== e.id && hostClassesOf(o.species).some((c) => infects.includes(c)),
        );
        if (host) e.targetId = host.id;
      }
    }
    const t = resolveTarget(ctx, e.targetId);
    if (t) {
      steer(e, Math.atan2(t.y - e.y, t.x - e.x), def.speed, 1.6, dt);
      if (t.entity && Math.hypot(t.x - e.x, t.y - e.y) < t.r + e.radius * 0.4) {
        e.attachedTo = t.entity.id;
        e.attachAngle = Math.atan2(e.y - t.y, e.x - t.x) - t.entity.angle;
        e.attachTimer = 0;
      }
    } else {
      damp(e, 0.8, dt);
    }
  },

  swarm(ctx) {
    const { e, def, dt, state } = ctx;
    let cx = 0;
    let cy = 0;
    let ax = 0;
    let ay = 0;
    let sx = 0;
    let sy = 0;
    let n = 0;
    state.grid.query(e.x, e.y, 70, (o) => {
      if (o === e || o.species !== e.species) return;
      const dx = o.x - e.x;
      const dy = o.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 70) return;
      cx += dx;
      cy += dy;
      ax += o.vx;
      ay += o.vy;
      if (d < 14) {
        sx -= dx / d;
        sy -= dy / d;
      }
      n++;
    });
    let dx = Math.cos(e.angle) * 0.6;
    let dy = Math.sin(e.angle) * 0.6;
    if (n) {
      dx += (cx / n) * 0.012 + (ax / n) * 0.006 + sx * 1.4;
      dy += (cy / n) * 0.012 + (ay / n) * 0.006 + sy * 1.4;
    }
    const hostsPlayer = !isUntouchable(state) && playerHostClasses(state.player).includes('plant');
    if (hostsPlayer) {
      const u = nearestUnit(ctx, def.sense, () => true);
      if (u) {
        const d = Math.hypot(u.x - e.x, u.y - e.y) || 1;
        dx += ((u.x - e.x) / d) * 2.2;
        dy += ((u.y - e.y) / d) * 2.2;
      }
    }
    e.angle = turnToward(e.angle, Math.atan2(dy, dx), def.turn * dt);
    steer(e, e.angle, def.speed * (hostsPlayer ? 1 : 0.5), 3, dt);
  },

  virophage(ctx) {
    const { e, def, dt, state } = ctx;
    e.aux -= dt;
    if (e.aux <= 0) {
      e.aux = 0.5;
      const prey = state.grid.nearest(e.x, e.y, def.sense, (o) => o.species === 'mimivirus');
      e.targetId = prey ? prey.id : 0;
    }
    const t = resolveTarget(ctx, e.targetId);
    if (t?.entity) {
      steer(e, Math.atan2(t.y - e.y, t.x - e.x), def.speed, 3, dt);
      if (Math.hypot(t.x - e.x, t.y - e.y) < t.r + e.radius) {
        killEntity(state, t.entity, false);
        removeEntity(state, e);
        for (let i = 0; i < 2; i++) {
          const a = state.rng() * Math.PI * 2;
          spawnEntity(state, 'virophage', t.x + Math.cos(a) * 10, t.y + Math.sin(a) * 10, { vx: Math.cos(a) * 80, vy: Math.sin(a) * 80 });
        }
      }
    } else {
      steer(e, wander(ctx, 2), def.speed * 0.3, 1, dt);
    }
  },

  neoplasm(ctx) {
    const { e, def, dt, state } = ctx;
    e.aux2 -= dt;
    // Tumors hoard glucose and swell (Warburg effect).
    state.grid.query(e.x, e.y, e.radius * 1.3, (o) => {
      if (o.species === 'glucose' && Math.hypot(o.x - e.x, o.y - e.y) < e.radius + o.radius) {
        removeEntity(state, o);
        e.radius = Math.min(150, e.radius + 0.4);
        e.maxHp += 3;
        e.hp += 3;
      }
    });
    const prime = ctx.units[0];
    const canBeEaten = prime && canUnitEat(state.player, prime, e);
    const dPrime = prime && !state.player.dead ? Math.hypot(prime.x - e.x, prime.y - e.y) : Infinity;
    const dHome = Math.hypot(e.homeX - e.x, e.homeY - e.y);
    if (!canBeEaten && dPrime < def.sense && dHome < 1500) {
      e.state = 1;
      const pulse = 0.72 + 0.38 * Math.sin(e.age * 2.3);
      e.angle = turnToward(e.angle, Math.atan2(prime.y - e.y, prime.x - e.x), def.turn * dt);
      steer(e, e.angle, def.speed * pulse, 1.8, dt);
      if (e.aux2 <= 0 && dPrime < 600) {
        const spikes = 10;
        for (let i = 0; i < spikes; i++) {
          fireProjectile(state, e.x, e.y, (i / spikes) * Math.PI * 2 + e.age, 290, 9, 1.5, 'enemy');
        }
        e.aux2 = e.hp / e.maxHp < 0.4 ? 2.6 : 3.8;
      }
    } else if (dHome > 500) {
      e.state = 2;
      e.angle = turnToward(e.angle, Math.atan2(e.homeY - e.y, e.homeX - e.x), def.turn * dt);
      steer(e, e.angle, def.speed * 0.6, 1.5, dt);
    } else {
      e.state = 0;
      e.angle = turnToward(e.angle, wander(ctx), def.turn * 0.5 * dt);
      steer(e, e.angle, def.speed * 0.25, 1, dt);
    }
  },
};

function currentFactor(def: SpeciesDef): number {
  if (def.behavior === 'tentacles' || def.behavior === 'trap' || def.id === 'stentor') return 0;
  switch (def.group) {
    case 'resource':
    case 'agent':
    case 'obstacle':
      return 1;
    case 'bacteria':
      return 0.85;
    case 'protist':
      return 0.45;
    case 'animal':
      return 0.2;
    default:
      return 0.1;
  }
}

function updateAttached(state: GameState, e: Entity, dt: number) {
  const host = state.byId.get(e.attachedTo);
  if (!host || host.dead) {
    e.attachedTo = 0;
    return;
  }
  const a = host.angle + e.attachAngle;
  e.x = host.x + Math.cos(a) * (host.radius + e.radius * 0.25);
  e.y = host.y + Math.sin(a) * (host.radius + e.radius * 0.25);
  e.angle = a + Math.PI;
  e.attachTimer += dt;
  if (e.attachTimer >= 2.4) {
    if (!host.infectedBy) {
      host.infectedBy = e.species;
      host.infection = 0.001;
    }
    removeEntity(state, e);
  }
}

export function updateEntities(state: GameState, dt: number) {
  const units = livingUnits(state.player);
  const view = state.view;
  const active = Math.max(view.halfW, view.halfH) * 1.5 + 400;
  const surge = 1 + state.director.surge * 2.2;
  for (let i = 0; i < state.entities.length; i++) {
    const e = state.entities[i];
    if (e.dead) continue;
    e.age += dt;
    e.spawnT = Math.min(1, e.spawnT + dt * 2.2);
    e.hitFlash = Math.max(0, e.hitFlash - dt * 3);
    if (e.attachedTo) {
      updateAttached(state, e, dt);
      continue;
    }
    const def = SPECIES[e.species];
    if (e.infectedBy) {
      e.infection += dt;
      if (e.infection > 6 + e.radius * 0.08) {
        burstHost(state, e);
        continue;
      }
    }
    const far = Math.abs(e.x - view.x) > active || Math.abs(e.y - view.y) > active;
    if (e.stun > 0) {
      e.stun -= dt;
      damp(e, 4, dt);
    } else if (!far) {
      behaviors[def.behavior]({ state, e, def, dt, units });
      if (e.dead) continue;
    } else {
      damp(e, 1, dt);
    }
    const cf = currentFactor(def);
    if (cf > 0 && !far) {
      curlFlow(e.x, e.y, state.time, state.seed, 1 / 1400, flow);
      const drift = cf * state.current * surge * 26;
      e.x += flow.x * drift * dt;
      e.y += flow.y * drift * dt;
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
}

export const speciesBehavior = (id: SpeciesId) => SPECIES[id].behavior;
