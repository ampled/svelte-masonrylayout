/**
 * EvEmitter v2.1.1
 * Lil' event emitter
 * MIT License
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventListener = (...args: any[]) => void;

export class EvEmitter {
  _events = new Map<string, EventListener[]>();
  _onceEvents = new Map<string, Set<EventListener>>();

  on(eventName: string, listener: EventListener): this {
    if (!eventName || !listener) return this;

    // get or create listeners array
    let listeners = this._events.get(eventName);
    if (!listeners) {
      listeners = [];
      this._events.set(eventName, listeners);
    }

    // only add once
    if (!listeners.includes(listener)) {
      listeners.push(listener);
    }

    return this;
  }

  once(eventName: string, listener: EventListener): this {
    if (!eventName || !listener) return this;

    // add event
    this.on(eventName, listener);

    // set once flag using Set for better performance
    let onceListeners = this._onceEvents.get(eventName);
    if (!onceListeners) {
      onceListeners = new Set();
      this._onceEvents.set(eventName, onceListeners);
    }
    onceListeners.add(listener);

    return this;
  }

  off(eventName: string, listener: EventListener): this {
    const listeners = this._events.get(eventName);
    if (!listeners || !listeners.length) return this;

    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    return this;
  }

  emitEvent(eventName: string, args?: unknown[]): this {
    const listeners = this._events.get(eventName);
    if (!listeners || !listeners.length) return this;

    // copy over to avoid interference if .off() in listener
    const listenersCopy = listeners.slice(0);
    args = args || [];

    // once stuff
    const onceListeners = this._onceEvents.get(eventName);

    for (const listener of listenersCopy) {
      const isOnce = onceListeners && onceListeners.has(listener);
      if (isOnce) {
        // remove listener
        // remove before trigger to prevent recursion
        this.off(eventName, listener);
        // unset once flag
        onceListeners.delete(listener);
      }
      // trigger listener
      listener.apply(this, args);
    }

    return this;
  }

  allOff(): this {
    this._events.clear();
    this._onceEvents.clear();
    return this;
  }
}
