import {
  ANTIVIRAL_SPAWN_INTERVAL,
  BASE_ENERGY_DRAIN,
  BASE_SUGAR_SPAWN_INTERVAL,
  COLLISION_DAMAGE,
  DAMAGE_COOLDOWN,
  DEATH_ANIMATION_DURATION,
  INFECTION_DURATION,
  INFECTION_ENERGY_DRAIN_MULTIPLIER,
  INITIAL_CELL_SIZE,
  INITIAL_ZOOM,
  MAX_ANTIVIRALS,
  MAX_CELL_SCORE,
  MAX_SPEED,
  MAX_SUGAR,
  MIN_CELL_SIZE_FOR_DEATH,
  MIN_ZOOM,
  MOVEMENT_ENERGY_DRAIN,
  RENDER_PADDING,
  STARVATION_SIZE_DRAIN,
  STARVING_SPEED_FACTOR,
  SUGAR_LIFETIME,
  SUGAR_MAX_SIZE,
  SUGAR_MIN_SIZE,
  SUGAR_SPAWN_BATCH,
  TOTAL_INVINCIBILITY_DURATION,
  VELOCITY_SMOOTHING,
  CAMERA_SMOOTHING,
  ZOOM_SMOOTHING,
  ZOOM_OUT_FACTOR,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import { fractalNoise2D, mulberry32 } from './rng';
import { generateWorld, maxDimension } from './world';
import {
  AntiviralParticle,
  Organism,
  PlayerState,
  SimEvent,
  SimInput,
  SugarParticle,
  Vec2,
} from './types';

export type ViewInfo = { width: number; height: number };

export type CameraState = { pos: Vec2; zoom: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Framerate-independent exponential smoothing factor.
const smoothing = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

function lerpAngleDeg(a: number, b: number, t: number): number {
  const delta = ((b - a + 180) % 360 + 360) % 360 - 180;
  return a + delta * t;
}

export function createSimulation(seed = Math.floor(Math.random() * 0xffffffff)) {
  const rng = mulberry32(seed ^ 0x5f356495);
  const nutrientSeed = Math.floor(rng() * 0xffffffff);

  const player: PlayerState = {
    pos: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    size: INITIAL_CELL_SIZE,
    score: INITIAL_CELL_SIZE,
    energy: 100,
    starving: false,
    invulnerableUntil: 0,
    flickering: false,
    infected: false,
    infectionStart: 0,
    infectionProgress: 0,
    dying: false,
    dyingSince: 0,
    dead: false,
  };

  const camera: CameraState = { pos: { x: player.pos.x, y: player.pos.y }, zoom: 1 };

  const state = {
    time: 0,
    player,
    camera,
    organisms: generateWorld(seed) as Organism[],
    sugars: [] as SugarParticle[],
    antivirals: [] as AntiviralParticle[],
    collectedOrganelles: new Set<string>(),
    eligibleOrganelles: new Set<string>(),
    // Bumped whenever list membership changes, so the renderer knows when to
    // rebuild its React lists without diffing every frame.
    organismsVersion: 0,
    sugarsVersion: 0,
    antiviralsVersion: 0,
    collectedVersion: 0,
    eligibleVersion: 0,
  };

  let sugarCounter = 0;
  let antiviralCounter = 0;
  let nextSugarSpawnAt = 0;
  let nextAntiviralSpawnAt = 0;

  // Spawn sugars just off-screen in a ring around the camera, biased toward
  // richer regions of the nutrient noise field.
  function spawnSugars(count: number, view: ViewInfo, immediate = false) {
    for (let i = 0; i < count; i++) {
      let best: { x: number; y: number } | null = null;
      let bestDensity = -1;
      for (let attempt = 0; attempt < 4; attempt++) {
        const angle = rng() * Math.PI * 2;
        const baseRadius = immediate
          ? Math.min(view.width, view.height) * 0.7
          : Math.max(view.width, view.height) / (2 * camera.zoom) + 100;
        const radius = baseRadius * (0.8 + rng() * 0.4);
        const x = clamp(camera.pos.x + Math.cos(angle) * radius, 0, WORLD_WIDTH);
        const y = clamp(camera.pos.y + Math.sin(angle) * radius, 0, WORLD_HEIGHT);
        const density = fractalNoise2D(x, y, 1 / 600, nutrientSeed);
        if (density > bestDensity) {
          bestDensity = density;
          best = { x, y };
        }
      }
      if (!best) continue;
      state.sugars.push({
        id: `sugar-${sugarCounter++}`,
        x: best.x,
        y: best.y,
        size: Math.round(rng() * (SUGAR_MAX_SIZE - SUGAR_MIN_SIZE) + SUGAR_MIN_SIZE),
        createdAt: state.time,
      });
    }
    state.sugarsVersion++;
  }

  function spawnAntivirals(count: number) {
    for (let i = 0; i < count; i++) {
      state.antivirals.push({
        id: `antiviral-${antiviralCounter++}`,
        x: rng() * WORLD_WIDTH,
        y: rng() * WORLD_HEIGHT,
      });
    }
    state.antiviralsVersion++;
  }

  function initialSpawns(view: ViewInfo) {
    spawnSugars(20, view, true);
    spawnAntivirals(3);
  }

  // Circle (player) vs the wall's core rectangle.
  function collidesWithWall(organism: Organism, radius: number): boolean {
    if (typeof organism.size === 'number') return false;
    const { width, height } = organism.size;
    // Match the draft's forgiving hitbox: the short axis only counts 60%.
    const coreW = width < height ? width * 0.6 : width;
    const coreH = height <= width ? height * 0.6 : height;
    const dx = Math.abs(player.pos.x - organism.pos.x) - coreW / 2;
    const dy = Math.abs(player.pos.y - organism.pos.y) - coreH / 2;
    if (dx > radius || dy > radius) return false;
    if (dx <= 0 || dy <= 0) return true;
    return dx * dx + dy * dy <= radius * radius;
  }

  function startDying(events: SimEvent[]) {
    if (player.dying) return;
    player.dying = true;
    player.dyingSince = state.time;
    events.push({ type: 'died' });
  }

  function applyDamage(events: SimEvent[]) {
    player.invulnerableUntil = state.time + TOTAL_INVINCIBILITY_DURATION;
    const penalty = Math.min(COLLISION_DAMAGE, player.size - MIN_CELL_SIZE_FOR_DEATH - 1);
    player.size = Math.max(MIN_CELL_SIZE_FOR_DEATH, player.size - penalty);
    player.score = player.size;
    events.push({ type: 'damaged' });
  }

  function step(dt: number, input: SimInput, view: ViewInfo): SimEvent[] {
    const events: SimEvent[] = [];
    if (player.dead) return events;

    // Clamp dt so a background tab doesn't teleport the world on resume.
    dt = clamp(dt, 0, 0.1);
    state.time += dt;
    const now = state.time;

    // --- Death animation / final death ---
    if (player.dying) {
      if (now - player.dyingSince >= DEATH_ANIMATION_DURATION) {
        player.dead = true;
      }
      return events;
    }

    const invulnerable = now < player.invulnerableUntil;
    player.flickering =
      invulnerable && now > player.invulnerableUntil - (TOTAL_INVINCIBILITY_DURATION - DAMAGE_COOLDOWN);

    // --- Player movement ---
    const maxSpeed = player.starving ? MAX_SPEED * STARVING_SPEED_FACTOR : MAX_SPEED;
    const inputLen = Math.hypot(input.moveX, input.moveY);
    const dirX = inputLen > 0 ? input.moveX / Math.max(1, inputLen) : 0;
    const dirY = inputLen > 0 ? input.moveY / Math.max(1, inputLen) : 0;
    const velAlpha = smoothing(VELOCITY_SMOOTHING, dt);
    player.vel.x += (dirX * maxSpeed - player.vel.x) * velAlpha;
    player.vel.y += (dirY * maxSpeed - player.vel.y) * velAlpha;
    player.pos.x = clamp(player.pos.x + player.vel.x * dt, 0, WORLD_WIDTH);
    player.pos.y = clamp(player.pos.y + player.vel.y * dt, 0, WORLD_HEIGHT);

    // --- Camera & zoom ---
    const sizeForZoom = Math.max(MIN_CELL_SIZE_FOR_DEATH, player.size);
    const targetZoom = Math.max(MIN_ZOOM, INITIAL_ZOOM / (1 + (sizeForZoom - INITIAL_CELL_SIZE) * ZOOM_OUT_FACTOR));
    camera.zoom += (targetZoom - camera.zoom) * smoothing(ZOOM_SMOOTHING, dt);
    const camAlpha = smoothing(CAMERA_SMOOTHING, dt);
    camera.pos.x += (player.pos.x - camera.pos.x) * camAlpha;
    camera.pos.y += (player.pos.y - camera.pos.y) * camAlpha;

    // --- Autonomous organism movement ---
    for (const o of state.organisms) {
      if (!o.autonomous) continue;
      // Occasionally wander (expected ~0.3 direction changes per second).
      if (rng() < 0.3 * dt) {
        o.heading += (rng() - 0.5) * (Math.PI / 2);
      }
      let vx = Math.cos(o.heading);
      let vy = Math.sin(o.heading);
      const nx = o.pos.x + vx * o.speed * dt;
      const ny = o.pos.y + vy * o.speed * dt;
      if (nx <= 0 || nx >= WORLD_WIDTH) vx = -vx;
      if (ny <= 0 || ny >= WORLD_HEIGHT) vy = -vy;
      o.heading = Math.atan2(vy, vx);
      o.pos.x = clamp(o.pos.x + vx * o.speed * dt, 0, WORLD_WIDTH);
      o.pos.y = clamp(o.pos.y + vy * o.speed * dt, 0, WORLD_HEIGHT);
      const targetDeg = (o.heading * 180) / Math.PI;
      o.displayRotation = lerpAngleDeg(o.displayRotation, targetDeg, smoothing(3, dt));
    }

    // --- Spawning ---
    const growthFactor = Math.max(1, (player.size - INITIAL_CELL_SIZE) / 100);
    if (now >= nextSugarSpawnAt) {
      if (state.sugars.length < MAX_SUGAR) spawnSugars(SUGAR_SPAWN_BATCH, view);
      nextSugarSpawnAt = now + BASE_SUGAR_SPAWN_INTERVAL / growthFactor;
    }
    if (now >= nextAntiviralSpawnAt) {
      if (state.antivirals.length < MAX_ANTIVIRALS) spawnAntivirals(1);
      nextAntiviralSpawnAt = now + ANTIVIRAL_SPAWN_INTERVAL;
    }

    // --- View rect (for sugar despawn) ---
    const renderW = view.width / camera.zoom + RENDER_PADDING * 2;
    const renderH = view.height / camera.zoom + RENDER_PADDING * 2;
    const viewLeft = camera.pos.x - renderW / 2;
    const viewRight = camera.pos.x + renderW / 2;
    const viewTop = camera.pos.y - renderH / 2;
    const viewBottom = camera.pos.y + renderH / 2;

    // --- Sugar consumption + expiry ---
    const playerRadius = player.size / 2;
    let scoreGained = 0;
    let sizeGained = 0;
    let energyGain = 0;
    const survivingSugars: SugarParticle[] = [];
    for (const sugar of state.sugars) {
      const dist = Math.hypot(player.pos.x - sugar.x, player.pos.y - sugar.y);
      if (dist < playerRadius) {
        const mult = sugar.size / 8;
        scoreGained += 3.5 * mult;
        energyGain += 3 * mult;
        sizeGained += mult;
        continue;
      }
      const offScreen = sugar.x < viewLeft || sugar.x > viewRight || sugar.y < viewTop || sugar.y > viewBottom;
      if (offScreen && now - sugar.createdAt > SUGAR_LIFETIME) continue;
      survivingSugars.push(sugar);
    }
    if (survivingSugars.length !== state.sugars.length) {
      state.sugars = survivingSugars;
      state.sugarsVersion++;
    }

    // --- Antivirals (cure infection) ---
    const survivingAntivirals = state.antivirals.filter((a) => {
      const dist = Math.hypot(player.pos.x - a.x, player.pos.y - a.y);
      if (dist < playerRadius) {
        if (player.infected) {
          player.infected = false;
          player.infectionProgress = 0;
          events.push({ type: 'cured' });
        }
        return false;
      }
      return true;
    });
    if (survivingAntivirals.length !== state.antivirals.length) {
      state.antivirals = survivingAntivirals;
      state.antiviralsVersion++;
    }

    // --- Organism interactions ---
    const newEligible = new Set<string>();
    const removedOrganisms = new Set<string>();

    for (const o of state.organisms) {
      const dimension = maxDimension(o.size);

      if (o.kind === 'organelle' && player.size > dimension) {
        newEligible.add(o.id);
      }

      let colliding: boolean;
      if (o.kind === 'wall') {
        colliding = collidesWithWall(o, playerRadius);
      } else {
        const dist = Math.hypot(player.pos.x - o.pos.x, player.pos.y - o.pos.y);
        colliding = dist < playerRadius + o.collisionRadius;
      }
      if (!colliding) continue;

      if (o.kind === 'organelle') {
        if (o.organelleType && player.size > dimension) {
          removedOrganisms.add(o.id);
          if (!state.collectedOrganelles.has(o.organelleType)) {
            state.collectedOrganelles.add(o.organelleType);
            state.collectedVersion++;
            events.push({ type: 'organelleCollected', organelle: o.organelleType });
          }
        }
        continue;
      }

      if (invulnerable) continue;

      if (o.kind === 'infectious') {
        if (!player.infected) {
          player.infected = true;
          player.infectionStart = now;
          removedOrganisms.add(o.id);
          events.push({ type: 'infected' });
        }
        continue;
      }

      if (!o.harmful) continue;

      if (o.devourable && player.size > dimension) {
        const bonus = dimension * 0.2;
        scoreGained += bonus;
        sizeGained += bonus / 5;
        energyGain += bonus / 2;
        removedOrganisms.add(o.id);
      } else {
        applyDamage(events);
      }
    }

    if (removedOrganisms.size > 0) {
      state.organisms = state.organisms.filter((o) => !removedOrganisms.has(o.id));
      state.organismsVersion++;
    }

    if (
      newEligible.size !== state.eligibleOrganelles.size ||
      ![...newEligible].every((id) => state.eligibleOrganelles.has(id))
    ) {
      state.eligibleOrganelles = newEligible;
      state.eligibleVersion++;
    }

    // --- Growth ---
    if (scoreGained > 0 && player.score < MAX_CELL_SCORE) {
      player.score = Math.min(MAX_CELL_SCORE, Math.round(player.score + scoreGained));
      player.size = Math.min(MAX_CELL_SCORE, player.size + sizeGained);
    }

    // --- Energy & starvation ---
    const speed = Math.hypot(player.vel.x, player.vel.y);
    const sizeDrainFactor = 1 + (player.size - INITIAL_CELL_SIZE) / 200;
    let drain = BASE_ENERGY_DRAIN * sizeDrainFactor + (speed / MAX_SPEED) * MOVEMENT_ENERGY_DRAIN;
    if (player.infected) drain *= INFECTION_ENERGY_DRAIN_MULTIPLIER;

    if (player.starving) {
      if (energyGain > 0) {
        player.starving = false;
        player.energy = Math.min(100, energyGain);
      } else {
        player.size = Math.max(0, player.size - STARVATION_SIZE_DRAIN * dt);
        player.score = player.size;
      }
    } else {
      player.energy = clamp(player.energy + energyGain - drain * dt, 0, 100);
      if (player.energy <= 0) player.starving = true;
    }

    // --- Infection countdown ---
    if (player.infected) {
      player.infectionProgress = Math.min(((now - player.infectionStart) / INFECTION_DURATION) * 100, 100);
      if (player.infectionProgress >= 100) startDying(events);
    }

    if (player.size <= MIN_CELL_SIZE_FOR_DEATH) startDying(events);

    return events;
  }

  return { state, step, initialSpawns, seed };
}

export type Simulation = ReturnType<typeof createSimulation>;
