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
  ATP_PER_GLUCOSE,
  BASE_ATP_CAPACITY,
  BASE_GLUCOSE_CAPACITY,
  BASE_GLUCOSE_CONVERSION,
  BASE_INTEGRITY,
  THREAT_WAVE_SECONDS,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  USER_ZOOM_MAX,
  USER_ZOOM_MIN,
  MAX_ORGANELLE_LEVEL,
  DIVISION_DURATION,
  DIVISION_ATP_COST,
  DIVISION_GLUCOSE_COST,
  DIVISION_BIOMASS_COST,
  DIVISION_MIN_SIZE,
  DIVISION_MIN_INTEGRITY_RATIO,
  DIVISION_MIN_ARCHITECTURE_SCORE,
} from './constants';
import { architectureBonuses, firstOpenSlot, STANCE_TRAITS } from './architecture';
import { fractalNoise2D, mulberry32 } from './rng';
import { chunkKey, generateChunk, maxDimension, WORLD_CHUNK_SIZE } from './world';
import {
  AntiviralParticle,
  Organism,
  PlayerState,
  SimEvent,
  SimInput,
  SugarParticle,
  Vec2,
  OrganelleType,
  CellStage,
  DeathCause,
  MetabolicStance,
  AutomationRule,
} from './types';

export type ViewInfo = { width: number; height: number };

export type CameraState = {
  pos: Vec2;
  zoom: number;
  autoZoom: number;
  zoomMultiplier: number;
};

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
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    size: INITIAL_CELL_SIZE,
    score: INITIAL_CELL_SIZE,
    energy: 100,
    glucose: 32,
    biomass: 0,
    integrity: BASE_INTEGRITY,
    maxIntegrity: BASE_INTEGRITY,
    organelleLevels: { mitochondrion: 0, golgi: 0, nucleus: 0 },
    shieldUntil: 0,
    boostUntil: 0,
    lysosomeCooldownUntil: 0,
    kills: 0,
    starving: false,
    invulnerableUntil: 0,
    flickering: false,
    infected: false,
    infectionStart: 0,
    infectionProgress: 0,
    metabolicStance: 'forage',
    automation: { rnai: false, autophagy: false },
    architecture: [],
    sugarsEaten: 0,
    stage: 'forage',
    divisionActive: false,
    divisionProgress: 0,
    won: false,
    deathCause: null,
    dying: false,
    dyingSince: 0,
    dead: false,
  };

  const camera: CameraState = {
    pos: { x: player.pos.x, y: player.pos.y },
    zoom: INITIAL_ZOOM,
    autoZoom: INITIAL_ZOOM,
    zoomMultiplier: 1,
  };

  const state = {
    time: 0,
    player,
    camera,
    organisms: [] as Organism[],
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
    threatLevel: 1,
  };

  let sugarCounter = 0;
  let antiviralCounter = 0;
  let nextSugarSpawnAt = 0;
  let nextAntiviralSpawnAt = 0;
  let nextWaveAt = THREAT_WAVE_SECONDS;
  let loadedAtChunk = '';
  let starterSystemsSpawned = false;
  const loadedChunks = new Set<string>();
  const consumedOrganisms = new Set<string>();
  const pendingEvents: SimEvent[] = [];
  const spawnProtectionUntil = 5;

  function getArchitectureBonuses() {
    return architectureBonuses(player.architecture);
  }

  function deriveStage(): CellStage {
    if (player.won) return 'complete';
    if (player.divisionActive) return 'division';
    if (player.sugarsEaten < 8) return 'forage';
    if (state.collectedOrganelles.size < 3) return 'assemble';
    const stabilized = (['mitochondrion', 'golgi', 'nucleus'] as OrganelleType[])
      .every((type) => player.organelleLevels[type] >= 1);
    if (!stabilized || getArchitectureBonuses().score < DIVISION_MIN_ARCHITECTURE_SCORE) return 'stabilize';
    return 'replicate';
  }

  function updateStage(events: SimEvent[]) {
    const next = deriveStage();
    if (next === player.stage) return;
    player.stage = next;
    events.push({ type: 'stageChanged', stage: next });
  }

  function installOrganelle(type: OrganelleType) {
    if (player.architecture.some((unit) => unit.type === type)) return;
    // Engulfed systems enter where phagocytosis deposited them. Their first
    // arrangement is viable but deliberately incoherent, so the player must
    // transport the nucleus inward and establish a useful metabolic ring.
    const arrivalSlot: Record<OrganelleType, number> = {
      mitochondrion: 0,
      golgi: 6,
      nucleus: 8,
    };
    const occupied = new Set(player.architecture.map((unit) => unit.slot));
    const slot = occupied.has(arrivalSlot[type])
      ? firstOpenSlot(player.architecture, type)
      : arrivalSlot[type];
    if (slot === null) return;
    player.architecture.push({ id: `${type}-0`, type, slot });
    pendingEvents.push({ type: 'architectureChanged' });
  }

  function clearInfection() {
    if (!player.infected) return;
    player.infected = false;
    player.infectionProgress = 0;
    pendingEvents.push({ type: 'cured' });
  }

  function reduceViralLoad(amount: number) {
    if (!player.infected) return;
    const current = Math.min(((state.time - player.infectionStart) / INFECTION_DURATION) * 100, 100);
    const reduced = Math.max(0, current - amount);
    if (reduced <= 0) {
      clearInfection();
    } else {
      player.infectionProgress = reduced;
      player.infectionStart = state.time - (reduced / 100) * INFECTION_DURATION;
    }
  }

  function ensureWorldChunks(view: ViewInfo, force = false) {
    const centerX = Math.floor(player.pos.x / WORLD_CHUNK_SIZE);
    const centerY = Math.floor(player.pos.y / WORLD_CHUNK_SIZE);
    const radiusX = Math.max(2, Math.ceil((view.width / camera.zoom / 2 + RENDER_PADDING) / WORLD_CHUNK_SIZE) + 1);
    const radiusY = Math.max(2, Math.ceil((view.height / camera.zoom / 2 + RENDER_PADDING) / WORLD_CHUNK_SIZE) + 1);
    const centerKey = `${chunkKey(centerX, centerY)}:${radiusX}:${radiusY}`;
    if (!force && centerKey === loadedAtChunk) return;
    loadedAtChunk = centerKey;

    const wanted = new Set<string>();
    let membershipChanged = false;
    for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
      for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
        const key = chunkKey(x, y);
        wanted.add(key);
        if (loadedChunks.has(key)) continue;
        loadedChunks.add(key);
        const waveSpeed = Math.pow(1.08, state.threatLevel - 1);
        const arrivals = generateChunk(seed, x, y)
          .filter((organism) => !consumedOrganisms.has(organism.id));
        for (const organism of arrivals) {
          if (organism.autonomous) organism.speed *= waveSpeed;
        }
        state.organisms.push(...arrivals);
        membershipChanged = true;
      }
    }

    for (const key of [...loadedChunks]) {
      if (!wanted.has(key)) loadedChunks.delete(key);
    }
    const retained = state.organisms.filter((organism) => wanted.has(chunkKey(organism.chunk.x, organism.chunk.y)));
    if (retained.length !== state.organisms.length) membershipChanged = true;
    state.organisms = retained;
    if (membershipChanged) state.organismsVersion++;
  }

  const upgradeCosts = (type: OrganelleType) => {
    const level = player.organelleLevels[type];
    if (level >= MAX_ORGANELLE_LEVEL) return { glucose: 0, biomass: 0 };
    return {
      glucose: Math.round(14 + level * 11),
      biomass: Math.round(4 + level * 5),
    };
  };

  function upgrade(type: OrganelleType): boolean {
    if (!state.collectedOrganelles.has(type)) return false;
    if (player.organelleLevels[type] >= MAX_ORGANELLE_LEVEL) return false;
    const cost = upgradeCosts(type);
    if (player.glucose < cost.glucose || player.biomass < cost.biomass) return false;
    player.glucose -= cost.glucose;
    player.biomass -= cost.biomass;
    player.organelleLevels[type]++;
    const slot = firstOpenSlot(player.architecture, type);
    if (slot !== null) {
      player.architecture.push({
        id: `${type}-${player.organelleLevels[type]}`,
        type,
        slot,
      });
      pendingEvents.push({ type: 'architectureChanged' });
    }
    if (type === 'nucleus') {
      player.maxIntegrity += 18;
      player.integrity = Math.min(player.maxIntegrity, player.integrity + 28);
    }
    pendingEvents.push({ type: 'upgrade', organelle: type });
    return true;
  }

  function moveOrganelle(unitId: string, targetSlot: number): boolean {
    if (targetSlot < 0 || targetSlot > 8) return false;
    const moving = player.architecture.find((unit) => unit.id === unitId);
    if (!moving) return false;
    if (moving.slot === targetSlot) return true;
    const occupying = player.architecture.find((unit) => unit.slot === targetSlot);
    const previousSlot = moving.slot;
    moving.slot = targetSlot;
    if (occupying) occupying.slot = previousSlot;
    pendingEvents.push({ type: 'architectureChanged' });
    return true;
  }

  function setMetabolicStance(stance: MetabolicStance): boolean {
    if (!(stance in STANCE_TRAITS) || player.metabolicStance === stance) return false;
    player.metabolicStance = stance;
    pendingEvents.push({ type: 'stanceChanged', stance });
    return true;
  }

  function setAutomation(rule: AutomationRule, enabled: boolean): boolean {
    const unlocked = rule === 'rnai'
      ? player.organelleLevels.nucleus >= 1
      : player.organelleLevels.golgi >= 1;
    if (!unlocked || player.automation[rule] === enabled) return false;
    player.automation[rule] = enabled;
    pendingEvents.push({ type: 'automationChanged', rule, enabled });
    return true;
  }

  function divisionReadiness() {
    const bonuses = getArchitectureBonuses();
    const systemsReady = (['mitochondrion', 'golgi', 'nucleus'] as OrganelleType[])
      .every((type) => state.collectedOrganelles.has(type) && player.organelleLevels[type] >= 1);
    const checks = {
      systems: systemsReady,
      architecture: bonuses.score >= DIVISION_MIN_ARCHITECTURE_SCORE,
      size: player.size >= DIVISION_MIN_SIZE,
      energy: player.energy >= DIVISION_ATP_COST,
      glucose: player.glucose >= DIVISION_GLUCOSE_COST,
      biomass: player.biomass >= DIVISION_BIOMASS_COST,
      integrity: player.integrity / player.maxIntegrity >= DIVISION_MIN_INTEGRITY_RATIO,
      genome: !player.infected,
    };
    return {
      ready: Object.values(checks).every(Boolean) && !player.divisionActive && !player.won,
      checks,
      costs: {
        energy: DIVISION_ATP_COST,
        glucose: DIVISION_GLUCOSE_COST,
        biomass: DIVISION_BIOMASS_COST,
      },
    };
  }

  function beginDivision(): boolean {
    const readiness = divisionReadiness();
    if (!readiness.ready) return false;
    player.energy -= DIVISION_ATP_COST;
    player.glucose -= DIVISION_GLUCOSE_COST;
    player.biomass -= DIVISION_BIOMASS_COST;
    player.divisionActive = true;
    player.divisionProgress = 0;
    player.metabolicStance = 'replicate';
    pendingEvents.push({ type: 'divisionStarted' });
    return true;
  }

  function objectiveTarget(): { x: number; y: number; label: string } | null {
    const nearest = <T extends { x: number; y: number }>(items: T[]) => {
      let match: T | null = null;
      let distance = Number.POSITIVE_INFINITY;
      for (const item of items) {
        const candidate = Math.hypot(item.x - player.pos.x, item.y - player.pos.y);
        if (candidate < distance) {
          match = item;
          distance = candidate;
        }
      }
      return match;
    };

    if (player.infected) {
      const antiviral = nearest(state.antivirals);
      if (antiviral) return { x: antiviral.x, y: antiviral.y, label: 'antiviral vesicle' };
    }

    if (player.stage === 'assemble') {
      const missing = (['mitochondrion', 'golgi', 'nucleus'] as OrganelleType[])
        .filter((type) => !state.collectedOrganelles.has(type));
      const candidates = state.organisms.filter(
        (organism) => organism.organelleType && missing.includes(organism.organelleType),
      );
      const starter = candidates.find((organism) => organism.id.startsWith('starter-'));
      if (starter?.organelleType) {
        const type = starter.organelleType;
        const label = type === 'mitochondrion' ? 'mitochondrion' : type === 'golgi' ? 'Golgi body' : 'nuclear vesicle';
        return { x: starter.pos.x, y: starter.pos.y, label };
      }
      const target = nearest(candidates.map((organism) => ({ ...organism.pos, type: organism.organelleType! })));
      if (target) {
        const label = target.type === 'mitochondrion' ? 'mitochondrion' : target.type === 'golgi' ? 'Golgi body' : 'nuclear vesicle';
        return { x: target.x, y: target.y, label };
      }
    }

    if (player.stage === 'forage' || player.stage === 'stabilize' || player.stage === 'replicate') {
      const sugar = nearest(state.sugars);
      if (sugar) return { x: sugar.x, y: sugar.y, label: 'glucose crystal' };
    }

    return null;
  }

  function activate(type: OrganelleType): boolean {
    if (!state.collectedOrganelles.has(type)) return false;
    if (type === 'mitochondrion' && player.energy >= 22 && state.time >= player.boostUntil) {
      player.energy -= 22;
      player.boostUntil = state.time + 5 + player.organelleLevels.mitochondrion;
      pendingEvents.push({ type: 'ability', organelle: type });
      return true;
    }
    if (type === 'nucleus' && player.energy >= 28 && state.time >= player.shieldUntil) {
      player.energy -= 28;
      player.shieldUntil = state.time + 4 + player.organelleLevels.nucleus * 0.7;
      if (player.infected && player.organelleLevels.nucleus >= 1) {
        reduceViralLoad(45 + player.organelleLevels.nucleus * 15);
      }
      pendingEvents.push({ type: 'ability', organelle: type });
      return true;
    }
    if (type === 'golgi' && player.energy >= 34 && state.time >= player.lysosomeCooldownUntil) {
      player.energy -= 34;
      player.lysosomeCooldownUntil = state.time + Math.max(5, 11 - player.organelleLevels.golgi);
      let digested = 0;
      state.organisms = state.organisms.filter((o) => {
        const hostile = o.kind === 'infectious' || (o.harmful && o.kind === 'ambient');
        if (hostile && Math.hypot(o.pos.x - player.pos.x, o.pos.y - player.pos.y) < getArchitectureBonuses().lysosomeRadius) {
          digested++;
          consumedOrganisms.add(o.id);
          return false;
        }
        return true;
      });
      if (digested) {
        player.biomass += digested * (3 + player.organelleLevels.golgi);
        player.kills += digested;
        state.organismsVersion++;
      }
      if (player.infected && player.organelleLevels.golgi >= 1) {
        reduceViralLoad(55 + player.organelleLevels.golgi * 15);
      }
      pendingEvents.push({ type: 'ability', organelle: type });
      return true;
    }
    return false;
  }

  function abilityState(type: OrganelleType) {
    const cost = type === 'mitochondrion' ? 22 : type === 'nucleus' ? 28 : 34;
    const readyAt = type === 'mitochondrion'
      ? player.boostUntil
      : type === 'nucleus'
        ? player.shieldUntil
        : player.lysosomeCooldownUntil;
    return {
      cost,
      cooldown: Math.max(0, readyAt - state.time),
      active: type === 'mitochondrion'
        ? state.time < player.boostUntil
        : type === 'nucleus'
          ? state.time < player.shieldUntil
          : false,
    };
  }

  function setZoomMultiplier(value: number) {
    camera.zoomMultiplier = clamp(value, USER_ZOOM_MIN, USER_ZOOM_MAX);
  }

  // Spawn sugars just off-screen in a ring around the camera, biased toward
  // richer regions of the nutrient noise field.
  function spawnSugars(count: number, view: ViewInfo, immediate = false) {
    for (let i = 0; i < count; i++) {
      let best: { x: number; y: number } | null = null;
      let bestDensity = -1;
      for (let attempt = 0; attempt < 4; attempt++) {
        const angle = rng() * Math.PI * 2;
        const baseRadius = immediate
          ? (Math.min(view.width, view.height) / camera.zoom) * 0.42
          : Math.max(view.width, view.height) / (2 * camera.zoom) + 100;
        const radius = baseRadius * (0.8 + rng() * 0.4);
        const x = camera.pos.x + Math.cos(angle) * radius;
        const y = camera.pos.y + Math.sin(angle) * radius;
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
      const angle = rng() * Math.PI * 2;
      const radius = 320 + rng() * 700;
      state.antivirals.push({
        id: `antiviral-${antiviralCounter++}`,
        x: camera.pos.x + Math.cos(angle) * radius,
        y: camera.pos.y + Math.sin(angle) * radius,
      });
    }
    state.antiviralsVersion++;
  }

  function spawnThreatWave(level: number, view: ViewInfo) {
    const count = Math.min(4, 1 + Math.floor(level / 2));
    const distance = Math.max(view.width, view.height) / Math.max(0.8, camera.zoom) * 0.62 + 140;
    for (let index = 0; index < count; index++) {
      const angle = rng() * Math.PI * 2;
      const pos = {
        x: player.pos.x + Math.cos(angle) * distance,
        y: player.pos.y + Math.sin(angle) * distance,
      };
      const heading = Math.atan2(player.pos.y - pos.y, player.pos.x - pos.x);
      const size = 40 + rng() * 18;
      state.organisms.push({
        id: `wave-${level}-${index}-${Math.floor(state.time * 10)}`,
        chunk: {
          x: Math.floor(pos.x / WORLD_CHUNK_SIZE),
          y: Math.floor(pos.y / WORLD_CHUNK_SIZE),
        },
        species: 'giantVirus',
        kind: 'infectious',
        harmful: true,
        devourable: false,
        autonomous: true,
        pos,
        heading,
        displayRotation: heading * 180 / Math.PI,
        speed: 64 + level * 7,
        size,
        collisionRadius: size * 0.42,
        render: {
          duration: 24 + rng() * 12,
          delay: -rng() * 10,
          opacity: 1,
          initialRotation: heading * 180 / Math.PI,
          animationDirection: index % 2 ? 'reverse' : 'normal',
        },
      });
    }
    state.organismsVersion++;
  }

  function initialSpawns(view: ViewInfo) {
    ensureWorldChunks(view, true);
    if (!starterSystemsSpawned) {
      starterSystemsSpawned = true;
      const starterSystems: OrganelleType[] = ['mitochondrion', 'golgi', 'nucleus'];
      state.organisms.push(...starterSystems.map((type, index): Organism => {
        const angle = -Math.PI * 0.7 + index * Math.PI * 0.7;
        const radius = 300 + index * 85;
        return {
          id: `starter-${type}`,
          chunk: { x: 0, y: 0 },
          species: type,
          kind: 'organelle',
          organelleType: type,
          harmful: false,
          devourable: false,
          autonomous: false,
          pos: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
          heading: 0,
          displayRotation: index * 37,
          speed: 0,
          size: 34,
          collisionRadius: 17,
          render: {
            duration: 30 + index * 4,
            delay: -index * 3,
            opacity: 1,
            initialRotation: index * 37,
            animationDirection: index % 2 ? 'reverse' : 'normal',
          },
        };
      }));
      state.organismsVersion++;
    }
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

  function startDying(events: SimEvent[], cause: DeathCause) {
    if (player.dying) return;
    player.dying = true;
    player.deathCause = cause;
    player.dyingSince = state.time;
    events.push({ type: 'died' });
  }

  function applyDamage(events: SimEvent[]) {
    player.invulnerableUntil = state.time + TOTAL_INVINCIBILITY_DURATION;
    const penalty = Math.max(0, Math.min(COLLISION_DAMAGE, player.size - MIN_CELL_SIZE_FOR_DEATH - 1));
    player.size = Math.max(MIN_CELL_SIZE_FOR_DEATH, player.size - penalty);
    player.score = player.size;
    events.push({ type: 'damaged' });
  }

  function step(dt: number, input: SimInput, view: ViewInfo): SimEvent[] {
    const events: SimEvent[] = pendingEvents.splice(0);
    if (player.dead || player.won) return events;

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
    const protectedFromCollision = invulnerable || now < spawnProtectionUntil;
    player.flickering =
      invulnerable && now > player.invulnerableUntil - (TOTAL_INVINCIBILITY_DURATION - DAMAGE_COOLDOWN);

    // --- Player movement ---
    const bonuses = getArchitectureBonuses();
    const stance = STANCE_TRAITS[player.metabolicStance];
    const boost = now < player.boostUntil ? 1.55 : 1;
    const divisionSpeed = player.divisionActive ? 0.62 : 1;
    const maxSpeed = (player.starving ? MAX_SPEED * STARVING_SPEED_FACTOR : MAX_SPEED)
      * boost * bonuses.movementSpeed * stance.speed * divisionSpeed;
    const inputLen = Math.hypot(input.moveX, input.moveY);
    const dirX = inputLen > 0 ? input.moveX / Math.max(1, inputLen) : 0;
    const dirY = inputLen > 0 ? input.moveY / Math.max(1, inputLen) : 0;
    const velAlpha = smoothing(VELOCITY_SMOOTHING, dt);
    player.vel.x += (dirX * maxSpeed - player.vel.x) * velAlpha;
    player.vel.y += (dirY * maxSpeed - player.vel.y) * velAlpha;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;

    // --- Camera & zoom ---
    const sizeForZoom = Math.max(MIN_CELL_SIZE_FOR_DEATH, player.size);
    camera.autoZoom = Math.max(MIN_ZOOM, INITIAL_ZOOM / (1 + (sizeForZoom - INITIAL_CELL_SIZE) * ZOOM_OUT_FACTOR));
    const targetZoom = clamp(camera.autoZoom * camera.zoomMultiplier, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX);
    camera.zoom += (targetZoom - camera.zoom) * smoothing(ZOOM_SMOOTHING, dt);
    const camAlpha = smoothing(CAMERA_SMOOTHING, dt);
    camera.pos.x += (player.pos.x - camera.pos.x) * camAlpha;
    camera.pos.y += (player.pos.y - camera.pos.y) * camAlpha;
    ensureWorldChunks(view);

    // --- Autonomous organism movement ---
    for (const o of state.organisms) {
      if (!o.autonomous) continue;
      // Occasionally wander (expected ~0.3 direction changes per second).
      if (rng() < 0.3 * dt) {
        o.heading += (rng() - 0.5) * (Math.PI / 2);
      }
      const vx = Math.cos(o.heading);
      const vy = Math.sin(o.heading);
      o.heading = Math.atan2(vy, vx);
      o.pos.x += vx * o.speed * dt;
      o.pos.y += vy * o.speed * dt;
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

    if (now >= nextWaveAt) {
      state.threatLevel++;
      for (const o of state.organisms) {
        if (o.autonomous) o.speed *= 1.08;
      }
      nextWaveAt += THREAT_WAVE_SECONDS;
      spawnThreatWave(state.threatLevel, view);
      events.push({ type: 'wave', level: state.threatLevel });
    }

    // A folded regulatory RNA program can trigger lysosomal autophagy before
    // a nearby infectious bloom reaches the membrane. Automation still pays
    // the full ATP cost and respects the organelle cooldown.
    if (
      player.automation.autophagy
      && player.organelleLevels.golgi >= 1
      && player.energy >= 34
      && now >= player.lysosomeCooldownUntil
    ) {
      const reflexRadius = bonuses.lysosomeRadius * 0.82;
      const dangerNearby = state.organisms.some((organism) => {
        const hostile = organism.kind === 'infectious' || (organism.harmful && organism.kind === 'ambient');
        return hostile && Math.hypot(organism.pos.x - player.pos.x, organism.pos.y - player.pos.y) < reflexRadius;
      });
      if (dangerNearby) activate('golgi');
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
        player.sugarsEaten++;
        player.glucose = Math.min(
          BASE_GLUCOSE_CAPACITY + player.organelleLevels.nucleus * 15,
          player.glucose + 8.5 * mult * bonuses.glucoseUptake * stance.uptake,
        );
        sizeGained += mult;
        events.push({ type: 'sugarEaten', size: sugar.size });
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
            installOrganelle(o.organelleType);
            state.collectedVersion++;
            events.push({ type: 'organelleCollected', organelle: o.organelleType });
          }
        }
        continue;
      }

      if (protectedFromCollision || now < player.shieldUntil) continue;

      if (o.kind === 'infectious') {
        removedOrganisms.add(o.id);
        if (!player.infected) {
          player.infected = true;
          player.infectionStart = now;
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
        player.biomass += Math.max(1, bonus * 0.18 * (1 + player.organelleLevels.golgi * 0.2));
        player.kills++;
        removedOrganisms.add(o.id);
        events.push({ type: 'devoured' });
      } else {
        const damage = 18 * stance.damage * (1 - bonuses.damageReduction);
        player.integrity = Math.max(0, player.integrity - damage);
        applyDamage(events);
      }
    }

    if (removedOrganisms.size > 0) {
      for (const id of removedOrganisms) consumedOrganisms.add(id);
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
    const atpCapacity = BASE_ATP_CAPACITY + player.organelleLevels.mitochondrion * 18;
    const conversionRate = BASE_GLUCOSE_CONVERSION
      * (1 + player.organelleLevels.mitochondrion * 0.55)
      * bonuses.atpConversion;
    const glucoseUsed = Math.min(
      player.glucose,
      conversionRate * dt,
      Math.max(0, atpCapacity - player.energy) / ATP_PER_GLUCOSE,
    );
    player.glucose -= glucoseUsed;
    player.energy = Math.min(
      atpCapacity,
      player.energy + glucoseUsed * ATP_PER_GLUCOSE,
    );

    const speed = Math.hypot(player.vel.x, player.vel.y);
    const sizeDrainFactor = 1 + (player.size - INITIAL_CELL_SIZE) / 200;
    let drain = (BASE_ENERGY_DRAIN * sizeDrainFactor + (speed / MAX_SPEED) * MOVEMENT_ENERGY_DRAIN) * stance.drain;
    if (player.divisionActive) drain *= 1.22;
    if (player.infected) drain *= INFECTION_ENERGY_DRAIN_MULTIPLIER;

    if (player.starving) {
      if (energyGain > 0 || player.energy > 4) {
        player.starving = false;
        player.energy = Math.min(BASE_ATP_CAPACITY + player.organelleLevels.mitochondrion * 18, player.energy + energyGain);
      } else {
        player.size = Math.max(0, player.size - STARVATION_SIZE_DRAIN * dt);
        player.score = player.size;
      }
    } else {
      player.energy = clamp(player.energy + energyGain - drain * dt, 0, atpCapacity);
      if (player.energy <= 0) player.starving = true;
    }

    // --- Anabolism: Golgi-directed packaging converts surplus ATP and glucose
    // into persistent cell material. The replication stance deliberately turns
    // this slow background flux into a meaningful strategic commitment.
    if (state.collectedOrganelles.has('golgi') && player.glucose > 8 && player.energy > 12) {
      const synthesisRate = (0.12 + player.organelleLevels.golgi * 0.1)
        * bonuses.biomassSynthesis * stance.synthesis;
      const synthesis = Math.min(
        synthesisRate * dt,
        (player.glucose - 8) / 1.1,
        (player.energy - 12) / 1.35,
      );
      if (synthesis > 0) {
        player.glucose -= synthesis * 1.1;
        player.energy -= synthesis * 1.35;
        player.biomass += synthesis;
      }
    }

    // Homeostatic membrane repair is deliberately active rather than free.
    // It consumes the same ATP/glucose reserves needed for growth and division,
    // giving the player a reason to change stance before structural damage
    // becomes irreversible.
    if (
      player.metabolicStance === 'homeostasis'
      && player.integrity < player.maxIntegrity
      && player.energy > 18
      && player.glucose > 4
    ) {
      const repairRate = 0.9 + player.organelleLevels.nucleus * 0.45;
      const repaired = Math.min(player.maxIntegrity - player.integrity, repairRate * dt);
      player.integrity += repaired;
      player.energy = Math.max(0, player.energy - repaired * 0.24);
      player.glucose = Math.max(0, player.glucose - repaired * 0.06);
    }

    // --- Infection countdown ---
    if (player.infected) {
      const replicationRate = 1
        - Math.min(0.45, player.organelleLevels.nucleus * 0.15)
        - bonuses.viralResistance;
      player.infectionProgress = Math.min(((now - player.infectionStart) / INFECTION_DURATION) * 100 * replicationRate, 100);
      if (
        player.automation.rnai
        && player.organelleLevels.nucleus >= 1
        && player.infectionProgress >= 20
        && player.energy >= 28
        && now >= player.shieldUntil
      ) {
        activate('nucleus');
      }
      if (player.divisionActive) {
        player.divisionActive = false;
        player.divisionProgress = 0;
        events.push({ type: 'divisionCancelled' });
      }
      if (player.infected && player.infectionProgress >= 100) startDying(events, 'genome-hijack');
    }

    // --- Controlled cytokinesis ---
    if (player.divisionActive) {
      const stable = !player.starving && player.energy > 8 && player.integrity / player.maxIntegrity >= 0.45;
      if (stable) {
        player.divisionProgress = Math.min(100, player.divisionProgress + (dt / DIVISION_DURATION) * 100);
      } else {
        player.divisionProgress = Math.max(0, player.divisionProgress - dt * 1.5);
      }
      if (player.divisionProgress >= 100) {
        player.divisionActive = false;
        player.won = true;
        player.stage = 'complete';
        events.push({ type: 'won' });
      }
    }

    if (player.size <= MIN_CELL_SIZE_FOR_DEATH) startDying(events, 'starvation');
    if (player.integrity <= 0) startDying(events, 'membrane-rupture');
    updateStage(events);

    return events;
  }

  return {
    state,
    step,
    initialSpawns,
    seed,
    upgrade,
    upgradeCosts,
    activate,
    abilityState,
    setZoomMultiplier,
    moveOrganelle,
    setMetabolicStance,
    setAutomation,
    getArchitectureBonuses,
    divisionReadiness,
    beginDivision,
    objectiveTarget,
  };
}

export type Simulation = ReturnType<typeof createSimulation>;
