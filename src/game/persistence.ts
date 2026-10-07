import type { Quality } from './render/renderer';
import type { SpeciesId } from './sim/types';

// Local-only persistence: Field Journal discoveries, personal records and
// settings. Storage can be unavailable (private mode), so every access is
// guarded and the game works without it.

export type Records = {
  runs: number;
  bestGeneration: number;
  bestCells: number;
  longestRun: number;
  mostSpecies: number;
  victories: number;
};

export type Settings = {
  master: number;
  music: number;
  sfx: number;
  quality: Quality;
  reducedMotion: boolean;
  muted: boolean;
  tutorial: boolean;
};

const KEYS = { journal: 'microcosm.journal.v1', records: 'microcosm.records.v1', settings: 'microcosm.settings.v1' };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is optional.
  }
}

export function loadJournal(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEYS.journal);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveJournal(journal: Record<string, number>) {
  write(KEYS.journal, journal);
}

export function recordDiscovery(journal: Record<string, number>, species: SpeciesId) {
  journal[species] = (journal[species] ?? 0) + 1;
  saveJournal(journal);
}

export const DEFAULT_RECORDS: Records = { runs: 0, bestGeneration: 1, bestCells: 1, longestRun: 0, mostSpecies: 0, victories: 0 };

export function loadRecords(): Records {
  return read(KEYS.records, DEFAULT_RECORDS);
}

export function saveRecords(r: Records) {
  write(KEYS.records, r);
}

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function loadSettings(): Settings {
  return read(KEYS.settings, {
    master: 0.8,
    music: 0.65,
    sfx: 0.85,
    quality: 'high' as Quality,
    reducedMotion: prefersReduced(),
    muted: false,
    tutorial: true,
  });
}

export function saveSettings(s: Settings) {
  write(KEYS.settings, s);
}
