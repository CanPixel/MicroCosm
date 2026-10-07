import { fireProjectile } from './ai';
import { damageEntity, killEntity, yieldsOf } from './entities';
import { attachAgent, clearAttachments, shakeAttachments } from './infection';
import { angleDiff } from './math';
import { ABILITY_INFO, countOrganelles } from './organelles';
import { canUnitEat, damageUnit, engulf, isUntouchable, livingUnits, playerHostClasses, releaseCapture, vacuoleSlotsFor } from './player';
import { SPECIES } from './species';
import { emit, removeEntity, spawnEntity, type GameState, type SimInput } from './state';
import type { AbilityId, CellUnit, Entity } from './types';

function absorbResource(state: GameState, unit: CellUnit, e: Entity) {
  const p = state.player;
  const y = yieldsOf(e);
  p.glucose = Math.min(p.traits.glucoseCap, p.glucose + y.glucose);
  const prime = p.units[0];
  const target = unit.fate !== 'prime' && unit.biomass > prime.biomass * 0.7 ? prime : unit;
  target.biomass += y.biomass;
  p.dna += y.dna;
  if (y.lipid > 0) unit.integrity = Math.min(unit.maxIntegrity, unit.integrity + y.lipid);
  if (e.species === 'glucose') state.stats.glucose++;
  emit(state, { type: 'eat', species: e.species, x: e.x, y: e.y, amount: y.glucose || y.biomass || y.dna });
  removeEntity(state, e);
}

function separate(unit: CellUnit, e: Entity, minDist: number, unitShare: number) {
  const dx = e.x - unit.x;
  const dy = e.y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d >= minDist) return;
  const overlap = minDist - d;
  const nx = dx / d;
  const ny = dy / d;
  unit.x -= nx * overlap * unitShare;
  unit.y -= ny * overlap * unitShare;
  e.x += nx * overlap * (1 - unitShare);
  e.y += ny * overlap * (1 - unitShare);
  // Kill inward velocity so bodies slide rather than stick.
  const vn = unit.vx * nx + unit.vy * ny;
  if (vn > 0) {
    unit.vx -= vn * nx;
    unit.vy -= vn * ny;
  }
}

export function updateInteractions(state: GameState, dt: number) {
  const p = state.player;
  if (p.dead) return;
  const units = livingUnits(p);
  const untouchable = isUntouchable(state);
  const hostClasses = playerHostClasses(p);
  const ciliated = countOrganelles(p, 'cilia') > 0;
  const shielded = state.time < p.shieldUntil;

  for (const u of units) {
    const sweep = ciliated || u.fate === 'ciliocyte' ? u.radius * 2.8 : u.radius * 1.5;
    state.grid.query(u.x, u.y, Math.max(sweep, u.radius + 180), (e) => {
      if (e.dead || e.attachedTo) return;
      const def = SPECIES[e.species];
      const dx = e.x - u.x;
      const dy = e.y - u.y;
      const d = Math.hypot(dx, dy) || 1;

      if (def.group === 'resource') {
        // Feeding currents and endocytosis draw nearby molecules in.
        if (d < sweep) {
          const pull = (ciliated ? 150 : 70) * (1 - d / sweep);
          e.x -= (dx / d) * pull * dt;
          e.y -= (dy / d) * pull * dt;
        }
        if (d < u.radius + e.radius * 0.3) absorbResource(state, u, e);
        return;
      }

      if (def.group === 'agent') {
        if (d > u.radius + e.radius * 0.5) return;
        switch (e.species) {
          case 'virophage':
            p.storedVirophages = Math.min(12, p.storedVirophages + 1);
            p.traitsDirty = true;
            emit(state, { type: 'eat', species: e.species, x: e.x, y: e.y, amount: 1 });
            removeEntity(state, e);
            return;
          case 'phage':
            absorbResource(state, u, e);
            return;
          case 'satellite':
            if (untouchable) return;
            p.infection.satelliteBoost += 0.35;
            emit(state, { type: 'attach', species: e.species, x: e.x, y: e.y });
            removeEntity(state, e);
            return;
          case 'prion':
            if (untouchable || shielded) return;
            removeEntity(state, e);
            if (state.rng() > p.traits.prionResistance * 0.5) {
              const healthy = p.organelles.filter((o) => !o.misfolded);
              if (healthy.length) {
                const victim = healthy[Math.floor(state.rng() * healthy.length)];
                victim.misfolded = true;
                p.traitsDirty = true;
                emit(state, { type: 'misfold', organelle: victim.type });
              }
            }
            return;
          default: {
            const compatible = (def.infects ?? []).some((c) => hostClasses.includes(c));
            if (!compatible || untouchable || shielded || u.attached.length >= 8) {
              e.vx += (dx / d) * 120;
              e.vy += (dy / d) * 120;
              return;
            }
            attachAgent(state, u, e.species, Math.atan2(dy, dx), e.satellites, e.seed);
            removeEntity(state, e);
            return;
          }
        }
      }

      if (def.solid) {
        const min = u.radius * 0.9 + e.radius * (e.species === 'pollen' ? 0.88 : 0.75);
        separate(u, e, min, def.invulnerable ? 1 : 0.6);
        if (e.species === 'tardigrade' && d < min + 4 && e.aux <= state.time) {
          e.aux = state.time + 25;
          state.tardigradeUntil = state.time + 10;
          emit(state, { type: 'tardigrade' });
        }
        return;
      }

      if (canUnitEat(p, u, e)) {
        if (d < u.radius + e.radius * 0.35) {
          if (u.vacuoles.length < vacuoleSlotsFor(p, u)) {
            removeEntity(state, e);
            engulf(state, u, e);
          } else {
            e.vx += (dx / d) * 90;
            e.vy += (dy / d) * 90;
          }
        }
        return;
      }

      // Predators that swallow prey whole are not solid to cells they can
      // capture: their AI pulls the cell in instead of bumping it away.
      const capturer = def.behavior === 'engulfer' || def.behavior === 'vortex' || def.behavior === 'trap' || def.behavior === 'tentacles';
      if (capturer && u.radius < e.radius * 0.8) return;
      const contact = u.radius * 0.92 + e.radius * 0.78;
      if (d > contact) return;
      if (def.contactDamage > 0 && !untouchable) {
        let dmg = def.contactDamage;
        if (def.behavior === 'hunter') dmg *= e.state === 2 ? 1.6 : 0.35;
        const dealt = damageUnit(state, u, dmg, e.x, e.y, e.species);
        if (dealt > 0) {
          if (u.fate === 'cnidocyte') damageEntity(state, e, 10, true);
          if (def.behavior === 'hunter' && e.state === 2) {
            e.state = 3;
            e.timer = 1;
          }
        }
      }
      separate(u, e, contact, e.radius > u.radius * 1.4 ? 0.85 : 0.5);
    });
  }
}

export function castAbility(state: GameState, id: AbilityId, input: SimInput): boolean {
  const p = state.player;
  if (p.dead || p.pendingDivision) return false;
  if (!p.traits.abilities.includes(id)) return false;
  const info = ABILITY_INFO[id];
  if (state.time < p.cooldowns[id] || p.atp < info.atp) return false;
  const prime = p.units[0];
  if (state.time < p.cystUntil && id !== 'rnai') return false;

  switch (id) {
    case 'dash': {
      if (p.capture) {
        p.capture.struggle += 0.3;
        p.cooldowns.dash = state.time + 0.45;
        p.atp -= info.atp * 0.5;
        return true;
      }
      const len = Math.hypot(input.moveX, input.moveY);
      let ax = len > 0.1 ? input.moveX / len : input.aimX - prime.x;
      let ay = len > 0.1 ? input.moveY / len : input.aimY - prime.y;
      const al = Math.hypot(ax, ay) || 1;
      ax /= al;
      ay /= al;
      p.dashDir = { x: ax, y: ay };
      p.dashUntil = state.time + 0.32;
      shakeAttachments(state, 0.65);
      break;
    }
    case 'lysosome': {
      const R = Math.max(150, p.traits.lysoRadius);
      const dmg = p.traits.lysoDamage;
      for (const e of state.entities) {
        if (e.dead) continue;
        const dx = e.x - prime.x;
        const dy = e.y - prime.y;
        const d = Math.hypot(dx, dy);
        if (d > R + e.radius) continue;
        const def = SPECIES[e.species];
        if (def.group === 'resource' || e.species === 'virophage') continue;
        const falloff = 1 - Math.min(1, d / (R + e.radius)) * 0.5;
        if (def.group === 'agent') {
          killEntity(state, e, true);
          continue;
        }
        if (!def.invulnerable) {
          const shell = e.species === 'testate' ? 0.5 : 1;
          damageEntity(state, e, dmg * falloff * shell, true);
          e.stun = Math.max(e.stun, 0.5);
        }
        const push = 260 * (1 - d / (R + e.radius));
        e.vx += (dx / (d || 1)) * push;
        e.vy += (dy / (d || 1)) * push;
      }
      const cleared = clearAttachments(state, (a) => a.species !== 'mimivirus' || state.rng() < 0.6);
      const inf = p.infection;
      if (inf.colonies > 0) {
        inf.colonies = Math.max(0, inf.colonies - 2);
        emit(state, { type: 'cured', what: 'colony' });
      }
      inf.viralLoad = Math.max(0, inf.viralLoad - 12);
      // Autophagy recycles one misfolded organelle.
      const misfolded = p.organelles.find((o) => o.misfolded && o.type !== 'nucleus') ?? p.organelles.find((o) => o.misfolded);
      if (misfolded) {
        if (misfolded.type === 'nucleus') misfolded.misfolded = false;
        else {
          p.organelles.splice(p.organelles.indexOf(misfolded), 1);
          prime.biomass -= misfolded.mass * 0.5;
        }
        p.traitsDirty = true;
        emit(state, { type: 'cured', what: 'prion' });
      }
      if (cleared) emit(state, { type: 'cured', what: 'virus' });
      state.shockwaves.push({ x: prime.x, y: prime.y, t: 0, duration: 0.75, radius: R, strength: 1, color: '#c58bff' });
      break;
    }
    case 'toxicyst': {
      const angle = Math.atan2(input.aimY - prime.y, input.aimX - prime.x);
      const n = Math.max(1, Math.round(p.traits.dartCount));
      for (let i = 0; i < n; i++) {
        const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.36;
        const a = angle + spread;
        fireProjectile(
          state,
          prime.x + Math.cos(a) * prime.radius,
          prime.y + Math.sin(a) * prime.radius,
          a,
          700,
          p.traits.dartDamage,
          0.6,
          'player',
          p.traits.dartStun,
        );
      }
      break;
    }
    case 'rnai': {
      const inf = p.infection;
      const hadLoad = inf.viralLoad > 0 || inf.prophages > 0;
      inf.viralLoad = Math.max(0, inf.viralLoad - 55);
      if (inf.prophages > 0) inf.prophages--;
      inf.satelliteBoost = 0;
      const stripped = clearAttachments(state, (a) => a.species === 'viroid' || a.timer > a.injectAt * 0.3);
      if (hadLoad || stripped) {
        state.stats.infectionsCleared++;
        emit(state, { type: 'cured', what: stripped ? 'viroid' : 'virus' });
      }
      state.shockwaves.push({ x: prime.x, y: prime.y, t: 0, duration: 0.5, radius: prime.radius * 1.8, strength: 0.4, color: '#7dffb0' });
      break;
    }
    case 'encyst': {
      p.cystUntil = state.time + 3.5;
      if (p.capture) releaseCapture(state, true);
      shakeAttachments(state, 0.9);
      break;
    }
    case 'virophage': {
      const n = p.storedVirophages;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        spawnEntity(state, 'virophage', prime.x + Math.cos(a) * prime.radius, prime.y + Math.sin(a) * prime.radius, {
          vx: Math.cos(a) * 220,
          vy: Math.sin(a) * 220,
        });
      }
      p.storedVirophages = 0;
      p.traitsDirty = true;
      break;
    }
  }
  p.atp -= info.atp;
  const cooldown = id === 'dash' ? p.traits.dashCooldown : info.cooldown;
  p.cooldowns[id] = state.time + cooldown;
  emit(state, { type: 'ability', ability: id, x: prime.x, y: prime.y });
  return true;
}

export function updateProjectiles(state: GameState, dt: number) {
  const p = state.player;
  const units = livingUnits(p);
  for (const pr of state.projectiles) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) continue;
    if (pr.owner === 'player') {
      state.grid.query(pr.x, pr.y, 90, (e) => {
        const def = SPECIES[e.species];
        if (def.group === 'resource' || e.species === 'virophage' || e.attachedTo) return;
        if (Math.hypot(e.x - pr.x, e.y - pr.y) > e.radius + 4) return;
        if (def.group === 'agent') {
          killEntity(state, e, true);
        } else if (def.invulnerable) {
          // Deflected.
        } else {
          let dmg = pr.damage;
          if (e.species === 'testate') {
            // Only the aperture, where pseudopods emerge, is exposed.
            const incoming = Math.atan2(-pr.vy, -pr.vx);
            if (Math.abs(angleDiff(e.angle, incoming)) > 0.8) dmg *= 0.12;
          }
          damageEntity(state, e, dmg, true);
          if (!e.dead && pr.stun > 0) {
            e.stun = Math.max(e.stun, pr.stun);
            emit(state, { type: 'stun', x: e.x, y: e.y });
          }
        }
        pr.life = 0;
        return true;
      });
    } else if (!p.dead) {
      for (const u of units) {
        if (Math.hypot(u.x - pr.x, u.y - pr.y) < u.radius) {
          damageUnit(state, u, pr.damage, pr.x, pr.y, 'misc');
          pr.life = 0;
          break;
        }
      }
    }
  }
  state.projectiles = state.projectiles.filter((pr) => pr.life > 0);
  for (const s of state.shockwaves) s.t += dt;
  state.shockwaves = state.shockwaves.filter((s) => s.t < s.duration);
}
