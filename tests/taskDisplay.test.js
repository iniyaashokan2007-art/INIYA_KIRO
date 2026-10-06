/**
 * TaskDisplay unit tests
 * Covers: Requirements 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 5.6
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── localStorage mock (needed before imports) ────────────────────────────────
const localStorageData = {};
const localStorageMock = {
  getItem: vi.fn((key) => localStorageData[key] ?? null),
  setItem: vi.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageData[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }),
};
vi.stubGlobal('localStorage', localStorageMock);

// ── Minimal DOM element factory ──────────────────────────────────────────────

/**
 * Create a lightweight mock DOM element.
 * - `className = "foo bar"` correctly populates `_classes`
 * - `innerHTML = ""` resets inner state
 * - `setAttribute / getAttribute` use a plain map
 */
function makeElement(tag = 'li') {
  const el = {
    _tag: tag,
    _classes: [],
    _attrs: {},
    _html: '',
    _children: [],
    id: '',
    textContent: '',
    style: { width: '' },
    attributes: {},
    // Syncs _classes when className is assigned as a string
    get className() { return this._classes.join(' '); },
    set className(v) { this._classes = v ? v.split(/\s+/).filter(Boolean) : []; },
    get innerHTML() { return this._html; },
    set innerHTML(v) {
      this._html = v;
      // Setting innerHTML to '' is used as "clear children" by TaskDisplay.render
      if (v === '' || v === null) this._children = [];
    },
    classList: {
      add(...cls)       { cls.forEach(c => { if (!el._classes.includes(c)) el._classes.push(c); }); },
      remove(...cls)    { cls.forEach(c => { el._classes = el._classes.filter(x => x !== c); }); },
      contains(c)       { return el._classes.includes(c); },
      toggle(c, force) {
        if (force === true)        { if (!el._classes.includes(c)) el._classes.push(c); }
        else if (force === false)  { el._classes = el._classes.filter(x => x !== c); }
        else { el._classes.includes(c) ? el._classes.splice(el._classes.indexOf(c), 1) : el._classes.push(c); }
      },
    },
    setAttribute(name, value) { this._attrs[name] = value; this.attributes[name] = value; },
    getAttribute(name)        { return this._attrs[name]; },
    removeAttribute(name)     { delete this._attrs[name]; delete this.attributes[name]; },
    appendChild(child)        { this._children.push(child); },
    addEventListener()        {},
    querySelector()           { return null; },
    querySelectorAll()        { return []; },
    focus()                   {},
    closest()                 { return null; },
  };
  return el;
}

/**
 * Set up a fresh document stub with all the elements TaskDisplay.render touches.
 * Returns references to key elements for assertion.
 */
function setupDOM() {
  const taskList   = makeElement('ul');
  taskList.id      = 'task-list';
  const errorToast = makeElement('div');
  errorToast.id    = 'error-toast';

  const elements = {
    'task-list':   taskList,
    'error-toast': errorToast,
  };

  vi.stubGlobal('document', {
    getElementById:    vi.fn((id) => elements[id] ?? null),
    querySelector:     vi.fn(() => null),
    querySelectorAll:  vi.fn(() => []),
    createElement:     vi.fn((tag) => makeElement(tag)),
    body:              { appendChild: vi.fn() },
    head:              { appendChild: vi.fn() },
    addEventListener:  vi.fn(),
  });

  return { taskList, errorToast };
}

// ── Module imports (after globals stubbed) ────────────────────────────────────
import EventBus    from '../src/eventBus.js';
import TaskDisplay from '../src/taskDisplay.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function task(overrides = {}) {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    title:     'Default Task',
    subject:   'Math',
    dueDate:   '2099-01-01',
    priority:  'Medium',
    status:    'Pending',
    createdAt: '2099-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── render() tests ────────────────────────────────────────────────────────────

describe('TaskDisplay.render', () => {
  let dom;

  beforeEach(() => {
    dom = setupDOM();
    EventBus.handlers = {};
    TaskDisplay._activeFilter = 'All';
  });

  // Requirement 2.1 — one entry per task
  it('renders one list item per task with "All" filter', () => {
    const tasks = [task(), task(), task()];
    TaskDisplay.render(tasks, 'All');
    expect(dom.taskList._children).toHaveLength(3);
  });

  it('renders only Pending tasks when filter is "Pending"', () => {
    const tasks = [task({ status: 'Pending' }), task({ status: 'Pending' }), task({ status: 'Completed' })];
    TaskDisplay.render(tasks, 'Pending');
    expect(dom.taskList._children).toHaveLength(2);
  });

  it('renders only Completed tasks when filter is "Completed"', () => {
    const tasks = [task({ status: 'Pending' }), task({ status: 'Completed' })];
    TaskDisplay.render(tasks, 'Completed');
    expect(dom.taskList._children).toHaveLength(1);
  });

  // Requirement 2.7 — empty state when no tasks at all
  it('renders an empty-state item when task list is empty', () => {
    TaskDisplay.render([], 'All');
    expect(dom.taskList._children).toHaveLength(1);
    const item = dom.taskList._children[0];
    expect(item._classes).toContain('empty-state');
  });

  // Requirement 5.6 — empty state when filter matches nothing
  it('renders an empty-state item when filter matches no tasks', () => {
    TaskDisplay.render([task({ status: 'Pending' })], 'Completed');
    expect(dom.taskList._children).toHaveLength(1);
    expect(dom.taskList._children[0]._classes).toContain('empty-state');
  });

  // Requirement 2.4 — High → task-priority-high
  it('applies task-priority-high class for High priority tasks', () => {
    TaskDisplay.render([task({ priority: 'High' })], 'All');
    expect(dom.taskList._children[0]._classes).toContain('task-priority-high');
  });

  // Requirement 2.5 — Medium → task-priority-medium
  it('applies task-priority-medium class for Medium priority tasks', () => {
    TaskDisplay.render([task({ priority: 'Medium' })], 'All');
    expect(dom.taskList._children[0]._classes).toContain('task-priority-medium');
  });

  // Requirement 2.6 — Low → task-priority-low
  it('applies task-priority-low class for Low priority tasks', () => {
    TaskDisplay.render([task({ priority: 'Low' })], 'All');
    expect(dom.taskList._children[0]._classes).toContain('task-priority-low');
  });

  // Requirement 2.3 — Completed → task-completed (drives CSS strikethrough + opacity)
  it('applies task-completed class to Completed tasks', () => {
    TaskDisplay.render([task({ status: 'Completed' })], 'All');
    expect(dom.taskList._children[0]._classes).toContain('task-completed');
  });

  it('does NOT apply task-completed class to Pending tasks', () => {
    TaskDisplay.render([task({ status: 'Pending' })], 'All');
    expect(dom.taskList._children[0]._classes).not.toContain('task-completed');
  });

  it('sets data-task-id on each rendered list item', () => {
    const t = task({ id: 'test-abc' });
    TaskDisplay.render([t], 'All');
    expect(dom.taskList._children[0]._attrs['data-task-id']).toBe('test-abc');
  });

  // Clearing behaviour — second render should not accumulate children
  it('clears stale items before re-rendering', () => {
    const tasks = [task(), task(), task()];
    TaskDisplay.render(tasks, 'All');
    expect(dom.taskList._children).toHaveLength(3);

    TaskDisplay.render(tasks.slice(0, 1), 'All');
    expect(dom.taskList._children).toHaveLength(1);
  });
});

// ── showError() tests ─────────────────────────────────────────────────────────

describe('TaskDisplay.showError', () => {
  let dom;

  beforeEach(() => {
    dom = setupDOM();
    EventBus.handlers = {};
  });

  it('sets the toast textContent and adds "visible" class', () => {
    vi.useFakeTimers();
    TaskDisplay.showError('Something went wrong');
    expect(dom.errorToast.textContent).toBe('Something went wrong');
    expect(dom.errorToast._classes).toContain('visible');
    vi.useRealTimers();
  });

  it('removes "visible" class after 4 seconds', () => {
    vi.useFakeTimers();
    TaskDisplay.showError('Error msg');
    expect(dom.errorToast._classes).toContain('visible');
    vi.advanceTimersByTime(4000);
    expect(dom.errorToast._classes).not.toContain('visible');
    vi.useRealTimers();
  });
});
