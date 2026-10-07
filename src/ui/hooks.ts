import { useSyncExternalStore } from 'react';
import type { Store } from '@/game/store';

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export const fmt = (v: number, digits = 0) => (Number.isFinite(v) ? v.toFixed(digits) : '0');

export function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
