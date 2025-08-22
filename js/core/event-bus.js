// Lightweight pub/sub with once() support
export class EventBus {
  constructor() {
    this.listeners = new Map(); // event -> Set<fn>
  }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }
  once(event, fn) {
    const off = this.on(event, (...args) => {
      off();
      fn(...args);
    });
    return off;
  }
  off(event, fn) {
    const set = this.listeners.get(event);
    if (set) set.delete(fn);
  }
  emit(event, ...args) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(...args);
      } catch (e) {
        console.error(`[EventBus:${event}]`, e);
      }
    }
  }
}
export const bus = new EventBus();
