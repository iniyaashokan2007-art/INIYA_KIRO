/**
 * Integration smoke tests
 * Covers: Requirements 7.2, 7.3, 3.1, 3.3, 3.4, 4.2, 4.4, 6.2
 *
 * These tests exercise the full module stack (StorageManager → TaskManager →
 * EventBus → StatisticsPanel) without a real browser DOM, focusing on data
 * consistency across the lifecycle: create → toggle complete → delete.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── localStorage mock ─────────────────────────────────────────────────────────
const _ls = {};
const localStorageMock = {
  getItem:    vi.fn((k)    => _ls[k] ?? null),
  setItem:    vi.fn((k, v) => { _ls[k] = v; }),
  removeItem: vi.fn((k)    => { delete _ls[k]; }),
  clear:      vi.fn(()     => { Object.keys(_ls).forEach(k => delete _ls[k]); }),
};
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => crypto_counter()) });

let _uuidCounter = 0;
function crypto_counter() {
  return `uuid-${++_uuidCounter}`;
}

// ── Minimal DOM stub (just enough for StatisticsPanel and TaskDisplay) ────────
function makeStatsDOMElement(id) {
  let _text = '';
  return {
    id,
    get textContent() { return _text; },
    set textContent(v) { _text = String(v); },
    style: { width: '' },
    attributes: {},
    setAttribute(n, v) { this.attributes[n] = v; },
    getAttribute(n) { return this.attributes[n]; },
  };
}

function setupIntegrationDOM() {
  const taskList = {
    _children: [],
    get innerHTML() { return ''; },
    set innerHTML(v) { if (v === '' || v == null) this._children = []; },
    appendChild(c) { this._children.push(c); },
  };

  const elements = {
    'stat-total':       makeStatsDOMElement('stat-total'),
    'stat-completed':   makeStatsDOMElement('stat-completed'),
    'stat-pending':     makeStatsDOMElement('stat-pending'),
    'stat-percentage':  makeStatsDOMElement('stat-percentage'),
    'progress-display': makeStatsDOMElement('progress-display'),
    'progress-bar-fill':makeStatsDOMElement('progress-bar-fill'),
    'task-list':        taskList,
    'error-toast':      makeStatsDOMElement('error-toast'),
  };

  const progressTrack = {
    attributes: {},
    setAttribute(n, v) { this.attributes[n] = v; },
    getAttribute(n)    { return this.attributes[n]; },
  };

  vi.stubGlobal('document', {
    getElementById:    vi.fn((id) => elements[id] ?? null),
    querySelector:     vi.fn((sel) => {
      if (sel === ".progress-track[role='progressbar']") return progressTrack;
      return null;
    }),
    querySelectorAll:  vi.fn(() => []),
    createElement:     vi.fn((tag) => {
      const el = {
        _tag: tag, _classes: [], _attrs: {}, _html: '', textContent: '',
        style: { width: '' }, attributes: {},
        get className() { return this._classes.join(' '); },
        set className(v) { this._classes = v ? v.split(/\s+/).filter(Boolean) : []; },
        get innerHTML() { return this._html; },
        set innerHTML(v) { this._html = v; },
        classList: {
          add(...c) { c.forEach(x => { if (!el._classes.includes(x)) el._classes.push(x); }); },
          remove(...c) { c.forEach(x => { el._classes = el._classes.filter(y => y !== x); }); },
          contains(c) { return el._classes.includes(c); },
          toggle(c, f) {
            if (f === true)  { if (!el._classes.includes(c)) el._classes.push(c); }
            else if (f === false) { el._classes = el._classes.filter(x => x !== c); }
            else { el._classes.includes(c) ? el._classes.splice(el._classes.indexOf(c),1) : el._classes.push(c); }
          },
        },
        setAttribute(n, v) { this._attrs[n] = v; this.attributes[n] = v; },
        getAttribute(n)    { return this._attrs[n]; },
        removeAttribute(n) { delete this._attrs[n]; delete this.attributes[n]; },
        appendChild(child) {},
        addEventListener() {},
        querySelector()    { return null; },
        querySelectorAll() { return []; },
      };
      return el;
    }),
    body:             { appendChild: vi.fn() },
    head:             { appendChild: vi.fn() },
    addEventListener: vi.fn(),
  });

  return { elements, progressTrack };
}

// ── Module imports ────────────────────────────────────────────────────────────
import EventBus       from '../src/eventBus.js';
import StorageManager from '../src/storageManager.js';
import TaskManager    from '../src/taskManager.js';
import StatisticsPanel from '../src/statisticsPanel.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function futureDateString(offset = 5) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Smoke tests — initialisation
// ═════════════════════════════════════════════════════════════════════════════

describe('Application initialisation', () => {
  let dom;

  beforeEach(() => {
    dom = setupIntegrationDOM();
    localStorageMock.clear();
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((k)    => _ls[k] ?? null);
    localStorageMock.setItem.mockImplementation((k, v) => { _ls[k] = v; });
    EventBus.handlers = {};
    TaskManager.initialise([]);
  });

  // Requirement 7.3 — empty localStorage → empty task list, no errors
  it('initialises without errors when localStorage is empty', () => {
    const { tasks, warnings } = StorageManager.load();
    expect(() => TaskManager.initialise(tasks)).not.toThrow();
    expect(tasks).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(TaskManager.getTasks()).toHaveLength(0);
  });

  // Requirement 7.2 — valid stored tasks are loaded correctly
  it('initialises without errors when localStorage contains valid tasks', () => {
    const stored = [
      { id: 'a1', title: 'Stored Task', subject: 'Biology', dueDate: futureDateString(), priority: 'High', status: 'Pending', createdAt: new Date().toISOString() },
    ];
    _ls['studyPlannerTasks'] = JSON.stringify(stored);
    localStorageMock.getItem.mockImplementation((k) => _ls[k] ?? null);

    const { tasks, warnings } = StorageManager.load();
    expect(() => TaskManager.initialise(tasks)).not.toThrow();
    expect(tasks).toHaveLength(1);
    expect(warnings).toHaveLength(0);
    expect(TaskManager.getTasks()[0].title).toBe('Stored Task');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// End-to-end task lifecycle
// ═════════════════════════════════════════════════════════════════════════════

describe('End-to-end task lifecycle', () => {
  let dom;

  beforeEach(() => {
    _uuidCounter = 0;
    dom = setupIntegrationDOM();
    localStorageMock.clear();
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((k)    => _ls[k] ?? null);
    localStorageMock.setItem.mockImplementation((k, v) => { _ls[k] = v; });
    EventBus.handlers = {};
    TaskManager.initialise([]);
    // Re-register StatisticsPanel's permanent handler after reset
    // (it's a permanent handler so it survives, but reset _permanentHandlers side-channel is reset too)
    // Re-import is cached; we just need to ensure permanent handlers are active.
  });

  it('create → statistics update correctly', () => {
    // Wire StatisticsPanel to EventBus for this test
    EventBus.onPermanent('tasks:changed', (tasks) => StatisticsPanel.update(tasks));

    const result = TaskManager.createTask('Review Chapter 5', 'Biology', futureDateString(), 'High');

    expect(result.isValidationError).toBeUndefined();
    expect(result.status).toBe('Pending');

    // Statistics panel should reflect 1 task
    expect(dom.elements['stat-total'].textContent).toBe('1');
    expect(dom.elements['stat-pending'].textContent).toBe('1');
    expect(dom.elements['stat-completed'].textContent).toBe('0');
    expect(dom.elements['stat-percentage'].textContent).toBe('0%');
  });

  it('create → toggle complete → statistics update correctly', () => {
    EventBus.onPermanent('tasks:changed', (tasks) => StatisticsPanel.update(tasks));

    const task = TaskManager.createTask('Study Algebra', 'Math', futureDateString(), 'Medium');
    expect(task.status).toBe('Pending');

    // Toggle to Completed
    TaskManager.toggleCompletion(task.id);
    expect(TaskManager.getTasks()[0].status).toBe('Completed');

    expect(dom.elements['stat-completed'].textContent).toBe('1');
    expect(dom.elements['stat-percentage'].textContent).toBe('100%');
    expect(dom.elements['progress-bar-fill'].style.width).toBe('100%');

    // Toggle back to Pending (involution - Requirement 3.5)
    TaskManager.toggleCompletion(task.id);
    expect(TaskManager.getTasks()[0].status).toBe('Pending');
    expect(dom.elements['stat-completed'].textContent).toBe('0');
    expect(dom.elements['stat-percentage'].textContent).toBe('0%');
  });

  it('create → delete → task list and statistics are consistent', () => {
    EventBus.onPermanent('tasks:changed', (tasks) => StatisticsPanel.update(tasks));

    const task = TaskManager.createTask('Task to Delete', 'History', futureDateString(), 'Low');
    expect(TaskManager.getTasks()).toHaveLength(1);
    expect(dom.elements['stat-total'].textContent).toBe('1');

    // Delete the task (Requirement 4.2, 4.4)
    TaskManager.deleteTask(task.id);
    expect(TaskManager.getTasks()).toHaveLength(0);

    expect(dom.elements['stat-total'].textContent).toBe('0');
    expect(dom.elements['stat-pending'].textContent).toBe('0');
    expect(dom.elements['stat-percentage'].textContent).toBe('0%');
    expect(dom.elements['progress-bar-fill'].style.width).toBe('0%');
  });

  it('localStorage is consistent after create → toggle → delete lifecycle', () => {
    const task = TaskManager.createTask('History Essay', 'History', futureDateString(), 'Medium');

    // After create: localStorage has 1 task
    let { tasks: loadedAfterCreate } = StorageManager.load();
    expect(loadedAfterCreate).toHaveLength(1);
    expect(loadedAfterCreate[0].status).toBe('Pending');

    // After toggle: localStorage reflects Completed status
    TaskManager.toggleCompletion(task.id);
    let { tasks: loadedAfterToggle } = StorageManager.load();
    expect(loadedAfterToggle[0].status).toBe('Completed');

    // After delete: localStorage is empty
    TaskManager.deleteTask(task.id);
    let { tasks: loadedAfterDelete } = StorageManager.load();
    expect(loadedAfterDelete).toHaveLength(0);
  });
});
