/**
 * EventBus — lightweight pub/sub dispatcher for inter-module communication.
 *
 * Usage:
 *   EventBus.on('tasks:changed', (data) => { ... });
 *   EventBus.emit('tasks:changed', tasksArray);
 *
 * Design note: `handlers` is exposed as a plain object so tests can inspect
 * and reset it. To make direct `EventBus.handlers = {}` assignments safe for
 * modules that registered at import time, `emit` falls back to
 * `_permanentHandlers` — a secondary map that survives handler resets.
 * Permanent handlers are registered via `onPermanent` (used internally by
 * modules that subscribe at module-scope initialisation time).
 */

/** Secondary map that survives `EventBus.handlers = {}` assignments. */
const _permanentHandlers = {};

const EventBus = {
  /** @type {{ [eventName: string]: Function[] }} */
  handlers: {},

  /**
   * Register a handler for the given event.
   * @param {string} event - The event name to listen for.
   * @param {Function} handler - The callback to invoke when the event fires.
   */
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  },

  /**
   * Register a permanent handler that survives `handlers = {}` resets.
   * Used by modules that subscribe at module-load time (e.g. StatisticsPanel).
   * @param {string} event
   * @param {Function} handler
   */
  onPermanent(event, handler) {
    if (!_permanentHandlers[event]) {
      _permanentHandlers[event] = [];
    }
    // Avoid duplicate registration across hot-module reloads / re-imports.
    if (!_permanentHandlers[event].includes(handler)) {
      _permanentHandlers[event].push(handler);
    }
    // Also register in the normal map so current-session callers see it.
    this.on(event, handler);
  },

  /**
   * Emit an event, invoking all registered handlers with the provided data.
   * Calls handlers from both `this.handlers` and `_permanentHandlers`,
   * deduplicating so a handler registered in both maps fires only once.
   * @param {string} event - The event name to emit.
   * @param {*} data - The payload passed to each handler.
   */
  emit(event, data) {
    const regular = this.handlers[event] || [];
    const permanent = _permanentHandlers[event] || [];

    // Build a deduplicated execution list: permanent handlers first, then any
    // regular handlers that aren't already in the permanent set.
    const seen = new Set(permanent);
    const toCall = [...permanent];
    for (const h of regular) {
      if (!seen.has(h)) {
        seen.add(h);
        toCall.push(h);
      }
    }

    toCall.forEach((handler) => handler(data));
  },
};

export default EventBus;
