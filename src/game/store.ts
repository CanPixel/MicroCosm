// Minimal external store for useSyncExternalStore: the engine publishes
// immutable snapshots; React subscribes without ever touching the frame loop.

export class Store<T> {
  private listeners = new Set<() => void>();

  constructor(private value: T) {}

  get = () => this.value;

  set(value: T) {
    this.value = value;
    for (const l of this.listeners) l();
  }

  update(fn: (v: T) => T) {
    this.set(fn(this.value));
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}
