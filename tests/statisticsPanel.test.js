/**
 * StatisticsPanel unit tests
 * Covers: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Shared localStorage mock (required before module imports) ────────────────
const localStorageData = {};
const localStorageMock = {
  getItem: vi.fn((key) => localStorageData[key] ?? null),
  setItem: vi.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageData[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }),
};
vi.stubGlobal('localStorage', localStorageMock);

// ─── DOM mock helpers ──────────────────────────────────────────────────────────

/**
 * Creates a minimal DOM environment with all elements StatisticsPanel touches.
 * Returns a map of element references for easy assertion.
 *
 * The real DOM stores textContent as a string regardless of the type assigned,
 * so we mirror that behaviour with a getter/setter pair.
 */
function setupDOM() {
  const elements = {};

  // Helper that creates a div with a given id and registers it in the map.
  // textContent is stored internally as a string, matching real DOM behaviour.
  function el(id) {
    let _textContent = '';
    const div = {
      id,
      get textContent() { return _textContent; },
      set textContent(v) { _textContent = String(v); },
      style: { width: '' },
      attributes: {},
    };
    div.setAttribute = (name, value) => { div.attributes[name] = value; };
    div.getAttribute = (name) => div.attributes[name];
    elements[id] = div;
    return div;
  }

  const statTotal       = el('stat-total');
  const statCompleted   = el('stat-completed');
  const statPending     = el('stat-pending');
  const statPercentage  = el('stat-percentage');
  const progressDisplay = el('progress-display');
  const progressBarFill = el('progress-bar-fill');

  // .progress-track element (role="progressbar")
  const progressTrack = {
    attributes: { 'aria-valuenow': '0' },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
  };

  // Stub document.getElementById and document.querySelector
  vi.stubGlobal('document', {
    getElementById: vi.fn((id) => elements[id] ?? null),
    querySelector: vi.fn((selector) => {
      if (selector === ".progress-track[role='progressbar']") return progressTrack;
      return null;
    }),
  });

  return { statTotal, statCompleted, statPending, statPercentage, progressDisplay, progressBarFill, progressTrack };
}

// ─── Module import (after globals are stubbed) ────────────────────────────────
// StatisticsPanel registers its "tasks:changed" handler at import time.
// We capture it here so integration tests can restore it after each reset.
import EventBus from '../src/eventBus.js';
import StatisticsPanel from '../src/statisticsPanel.js';

// Snapshot the handler registered by the module at import time
const importedTasksChangedHandlers = [...(EventBus.handlers['tasks:changed'] ?? [])];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StatisticsPanel.update', () => {
  let dom;

  beforeEach(() => {
    dom = setupDOM();
    EventBus.handlers = {};
  });

  // --- Requirement 6.3: zero tasks ---
  it('displays zeros and 0% when task list is empty', () => {
    StatisticsPanel.update([]);

    expect(dom.statTotal.textContent).toBe('0');
    expect(dom.statCompleted.textContent).toBe('0');
    expect(dom.statPending.textContent).toBe('0');
    expect(dom.statPercentage.textContent).toBe('0%');
    expect(dom.progressDisplay.textContent).toBe('0%');
  });

  // --- Requirement 6.4: empty list → progress bar at 0% width ---
  it('sets progress bar fill to "0%" when total is zero', () => {
    StatisticsPanel.update([]);
    expect(dom.progressBarFill.style.width).toBe('0%');
  });

  // --- aria-valuenow reflects percentage ---
  it('sets aria-valuenow to 0 when task list is empty', () => {
    StatisticsPanel.update([]);
    expect(dom.progressTrack.attributes['aria-valuenow']).toBe(0);
  });

  // --- Requirement 6.1: correct stats with mixed tasks ---
  it('computes correct totals with a mix of Pending and Completed tasks', () => {
    const tasks = [
      { status: 'Completed' },
      { status: 'Completed' },
      { status: 'Pending' },
      { status: 'Pending' },
      { status: 'Pending' },
    ];
    StatisticsPanel.update(tasks);

    expect(dom.statTotal.textContent).toBe('5');
    expect(dom.statCompleted.textContent).toBe('2');
    expect(dom.statPending.textContent).toBe('3');
    expect(dom.statPercentage.textContent).toBe('40%');
    expect(dom.progressDisplay.textContent).toBe('40%');
    expect(dom.progressBarFill.style.width).toBe('40%');
    expect(dom.progressTrack.attributes['aria-valuenow']).toBe(40);
  });

  // --- Requirement 6.6: 100% → fill full width ---
  it('sets progress bar fill to "100%" when all tasks are completed', () => {
    const tasks = [
      { status: 'Completed' },
      { status: 'Completed' },
    ];
    StatisticsPanel.update(tasks);

    expect(dom.statPercentage.textContent).toBe('100%');
    expect(dom.progressBarFill.style.width).toBe('100%');
    expect(dom.progressTrack.attributes['aria-valuenow']).toBe(100);
  });

  // --- Requirement 6.5: partial percentage ---
  it('sets correct progress bar fill for partial completion', () => {
    // 1 of 3 completed = 33%
    const tasks = [
      { status: 'Completed' },
      { status: 'Pending' },
      { status: 'Pending' },
    ];
    StatisticsPanel.update(tasks);

    expect(dom.statPercentage.textContent).toBe('33%');
    expect(dom.progressBarFill.style.width).toBe('33%');
  });

  // --- Percentage rounded to nearest whole number ---
  it('rounds completion percentage to the nearest whole number', () => {
    // 2 of 3 = 66.666... → rounds to 67
    const tasks = [
      { status: 'Completed' },
      { status: 'Completed' },
      { status: 'Pending' },
    ];
    StatisticsPanel.update(tasks);

    expect(dom.statPercentage.textContent).toBe('67%');
    expect(dom.progressDisplay.textContent).toBe('67%');
  });

  // --- Single task Pending ---
  it('handles a single Pending task correctly', () => {
    StatisticsPanel.update([{ status: 'Pending' }]);

    expect(dom.statTotal.textContent).toBe('1');
    expect(dom.statCompleted.textContent).toBe('0');
    expect(dom.statPending.textContent).toBe('1');
    expect(dom.statPercentage.textContent).toBe('0%');
    expect(dom.progressBarFill.style.width).toBe('0%');
  });

  // --- Single task Completed ---
  it('handles a single Completed task correctly', () => {
    StatisticsPanel.update([{ status: 'Completed' }]);

    expect(dom.statTotal.textContent).toBe('1');
    expect(dom.statCompleted.textContent).toBe('1');
    expect(dom.statPending.textContent).toBe('0');
    expect(dom.statPercentage.textContent).toBe('100%');
    expect(dom.progressBarFill.style.width).toBe('100%');
  });
});

// ─── EventBus wiring ──────────────────────────────────────────────────────────
describe('StatisticsPanel EventBus integration', () => {
  let dom;

  beforeEach(() => {
    dom = setupDOM();
    // NOTE: EventBus.on is called at module import time, so the handler is
    // already registered. We just reset other handlers.
    EventBus.handlers = { 'tasks:changed': EventBus.handlers['tasks:changed'] };
  });

  // --- Requirement 6.2: stats update when tasks:changed fires ---
  it('updates statistics when EventBus emits "tasks:changed"', () => {
    const tasks = [
      { status: 'Completed' },
      { status: 'Pending' },
    ];

    EventBus.emit('tasks:changed', tasks);

    expect(dom.statTotal.textContent).toBe('2');
    expect(dom.statCompleted.textContent).toBe('1');
    expect(dom.statPending.textContent).toBe('1');
    expect(dom.statPercentage.textContent).toBe('50%');
  });

  it('updates to zero stats when EventBus emits an empty task list', () => {
    EventBus.emit('tasks:changed', []);

    expect(dom.statTotal.textContent).toBe('0');
    expect(dom.statPercentage.textContent).toBe('0%');
    expect(dom.progressBarFill.style.width).toBe('0%');
  });
});
