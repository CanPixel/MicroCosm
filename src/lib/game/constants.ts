// Central tuning table for the simulation.
// Time-based values are in seconds / per-second units so the sim is framerate-independent.

export const INITIAL_CELL_SIZE = 50;
export const MAX_CELL_SCORE = 600;
export const MIN_CELL_SIZE_FOR_DEATH = 5;

// Player movement (px/second)
export const MAX_SPEED = 360;
export const STARVING_SPEED_FACTOR = 0.46;
// Exponential smoothing rates (higher = snappier), applied as 1 - exp(-rate * dt)
export const VELOCITY_SMOOTHING = 5.0;
export const CAMERA_SMOOTHING = 3.1;
export const ZOOM_SMOOTHING = 3.1;

// Camera
export const INITIAL_ZOOM = 2.0;
export const MIN_ZOOM = 0.8;
export const ZOOM_OUT_FACTOR = 0.02;
export const USER_ZOOM_MIN = 0.7;
export const USER_ZOOM_MAX = 2.4;
export const USER_ZOOM_STEP = 0.1;
export const CAMERA_ZOOM_MIN = 0.55;
export const CAMERA_ZOOM_MAX = 4.8;

// Sugar
export const MAX_SUGAR = 70;
export const BASE_SUGAR_SPAWN_INTERVAL = 2.4; // seconds
export const SUGAR_SPAWN_BATCH = 4;
export const SUGAR_LIFETIME = 20; // seconds
export const SUGAR_MIN_SIZE = 4;
export const SUGAR_MAX_SIZE = 12;

// Antivirals
export const MAX_ANTIVIRALS = 3;
export const ANTIVIRAL_SPAWN_INTERVAL = 15; // seconds

// Combat / damage
export const COLLISION_DAMAGE = 15;
export const DAMAGE_COOLDOWN = 3; // seconds of solid invulnerability
export const FLICKER_DURATION = 2; // seconds of flickering afterwards
export const TOTAL_INVINCIBILITY_DURATION = DAMAGE_COOLDOWN + FLICKER_DURATION;
export const DEATH_ANIMATION_DURATION = 2; // seconds

// Energy (per second)
export const BASE_ENERGY_DRAIN = 0.65;
export const MOVEMENT_ENERGY_DRAIN = 2.9; // at full speed
export const STARVATION_SIZE_DRAIN = 0.65;

// Infection
export const INFECTION_DURATION = 30; // seconds until the cell bursts
export const INFECTION_ENERGY_DRAIN_MULTIPLIER = 2.5;

// Internal economy
export const BASE_ATP_CAPACITY = 100;
export const BASE_GLUCOSE_CAPACITY = 80;
export const BASE_INTEGRITY = 100;
export const ATP_PER_GLUCOSE = 2.4;
export const BASE_GLUCOSE_CONVERSION = 1.4;
export const THREAT_WAVE_SECONDS = 45;

// Rendering hints
export const RENDER_PADDING = 300;
export const MAX_THEME_SIZE = 300;

// World generation
export const AMBIENT_ACTIVE_CHANCE = 0.15;
