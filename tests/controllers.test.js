/**
 * FormController and FilterController unit tests
 * Covers: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.4, 5.5, 5.8
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Global mocks (before any module imports) ──────────────────────────────────

// localStorage
const localStorageData = {};
const localStorageMock = {
  getItem: vi.fn((key) => localStorageData[key] ?? null),
  setItem: vi.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageData[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }),
};
vi.stubGlobal('localStorage', localStorageMock);

// sessionStorage
const sessionStorageData = {};
const sessionStorageMock = {
  getItem: vi.fn((key) => sessionStorageData[key] ?? null),
  setItem: vi.fn((key, value) => { sessionStorageData[key] = value; }),
  removeItem: vi.fn((key) => { delete sessionStorageData[key]; }),
  clear: vi.fn(() => { Object.keys(sessionStorageData).forEach(k => delete sessionStorageData[k]); }),
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

// crypto
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'mock-uuid') });

// ── DOM element factory ───────────────────────────────────────────────────────

function makeInput(id, type = 'text', defaultValue = '') {
  return {
    id,
    type,
    value: defaultValue,
    _attrs: {},
    setAttribute(n, v) { this._attrs[n] = v; },
    getAttribute(n)    { return this._attrs[n]; },
    removeAttribute(n) { delete this._attrs[n]; },
    addEventListener:  vi.fn(),
    focus:             vi.fn(),
  };
}

function makeButton(id) {
  const btn = {
    id,
    _classes: [],
    _attrs:   {},
    get className() { return this._classes.join(' '); },
    set className(v) { this._classes = v ? v.split(/\s+/).filter(Boolean) : []; },
    classList: {
      add(...cls)      { cls.forEach(c => { if (!btn._classes.includes(c)) btn._classes.push(c); }); },
      remove(...cls)   { cls.forEach(c => { btn._classes = btn._classes.filter(x => x !== c); }); },
      contains(c)      { return btn._classes.includes(c); },
      toggle(c, force) {
        if (force === true)       { if (!btn._classes.includes(c)) btn._classes.push(c); }
        else if (force === false) { btn._classes = btn._classes.filter(x => x !== c); }
        else { btn._classes.includes(c) ? btn._classes.splice(btn._classes.indexOf(c),1) : btn._classes.push(c); }
      },
    },
    setAttribute(n, v) { this._attrs[n] = v; },
    getAttribute(n)    { return this._attrs[n]; },
    removeAttribute(n) { delete this._attrs[n]; },
    addEventListener:  vi.fn(),
  };
  return btn;
}

function makeForm(id) {
  const form = {
    id,
    _resetCalled: false,
    reset() { this._resetCalled = true; },
    addEventListener: vi.fn(),
  };
  return form;
}

function makeErrorSpan(id) {
  return {
    id,
    textContent: '',
    setAttribute() {},
  };
}

// ── Module imports ────────────────────────────────────────────────────────────
import EventBus        from '../src/eventBus.js';
import TaskManager     from '../src/taskManager.js';
import TaskDisplay     from '../src/taskDisplay.js';
import FormController  from '../src/formController.js';
import FilterController from '../src/filterController.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function futureDateString(offsetDays = 1) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// FormController tests
// ═════════════════════════════════════════════════════════════════════════════

describe('FormController', () => {
  let elements;
  let submitHandler;

  function setupFormDOM() {
    const form        = makeForm('task-form');
    const titleInput  = makeInput('task-title');
    const subjectInput= makeInput('task-subject');
    const dueDateInput= makeInput('task-due-date', 'date');
    const prioritySel = makeInput('task-priority');
    prioritySel.value = 'Medium';
    const errorTitle  = makeErrorSpan('error-title');
    const errorSubject= makeErrorSpan('error-subject');
    const errorDueDate= makeErrorSpan('error-due-date');
    const errorPriority= makeErrorSpan('error-priority');

    // Capture the submit handler when form.addEventListener is called
    form.addEventListener.mockImplementation((event, handler) => {
      if (event === 'submit') submitHandler = handler;
    });

    elements = {
      'task-form':    form,
      'task-title':   titleInput,
      'task-subject': subjectInput,
      'task-due-date':dueDateInput,
      'task-priority':prioritySel,
      'error-title':  errorTitle,
      'error-subject':errorSubject,
      'error-due-date':errorDueDate,
      'error-priority':errorPriority,
    };

    vi.stubGlobal('document', {
      getElementById:   vi.fn((id) => elements[id] ?? null),
      querySelector:    vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      createElement:    vi.fn(() => ({ textContent:'', style:{}, classList:{add:vi.fn(),remove:vi.fn()}, setAttribute:vi.fn() })),
      body:             { appendChild: vi.fn() },
      head:             { appendChild: vi.fn() },
      addEventListener: vi.fn(),
    });
  }

  beforeEach(() => {
    submitHandler = null;
    setupFormDOM();
    EventBus.handlers = {};
    TaskManager.initialise([]);
    localStorageMock.clear();
    vi.clearAllMocks();
    // Re-wire mocks after clear
    localStorageMock.getItem.mockImplementation((k) => localStorageData[k] ?? null);
    localStorageMock.setItem.mockImplementation((k, v) => { localStorageData[k] = v; });
    // Re-stub sessionStorage after clear
    sessionStorageMock.getItem.mockImplementation((k) => sessionStorageData[k] ?? null);
    sessionStorageMock.setItem.mockImplementation((k, v) => { sessionStorageData[k] = v; });
    // Re-stub form listener
    elements['task-form'].addEventListener.mockImplementation((event, handler) => {
      if (event === 'submit') submitHandler = handler;
    });

    FormController.init();
  });

  // Requirement 1.2 — priority pre-selected to Medium on load
  it('pre-selects priority to "Medium" on init', () => {
    expect(elements['task-priority'].value).toBe('Medium');
  });

  // Requirement 1.2 — dueDate left empty on load
  it('leaves the due-date field empty on init', () => {
    expect(elements['task-due-date'].value).toBe('');
  });

  // Requirement 1.3 — empty title shows error
  it('shows an error for empty title', () => {
    elements['task-title'].value   = '';
    elements['task-subject'].value = 'Math';
    elements['task-due-date'].value = futureDateString();
    elements['task-priority'].value = 'Medium';

    const fakeEvent = { preventDefault: vi.fn() };
    submitHandler(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(elements['error-title'].textContent).not.toBe('');
  });

  // Requirement 1.4 — empty subject shows error
  it('shows an error for empty subject', () => {
    elements['task-title'].value   = 'Study';
    elements['task-subject'].value = '';
    elements['task-due-date'].value = futureDateString();
    elements['task-priority'].value = 'Medium';

    const fakeEvent = { preventDefault: vi.fn() };
    submitHandler(fakeEvent);

    expect(elements['error-subject'].textContent).not.toBe('');
  });

  // Requirement 1.5 — missing due date shows error
  it('shows an error for missing due date', () => {
    elements['task-title'].value   = 'Study';
    elements['task-subject'].value = 'Math';
    elements['task-due-date'].value = '';
    elements['task-priority'].value = 'Medium';

    const fakeEvent = { preventDefault: vi.fn() };
    submitHandler(fakeEvent);

    expect(elements['error-due-date'].textContent).not.toBe('');
  });

  // Requirement 1.6 — past due date shows error
  it('shows an error for a past due date', () => {
    elements['task-title'].value   = 'Study';
    elements['task-subject'].value = 'Math';
    elements['task-due-date'].value = '2000-01-01';
    elements['task-priority'].value = 'Medium';

    const fakeEvent = { preventDefault: vi.fn() };
    submitHandler(fakeEvent);

    expect(elements['error-due-date'].textContent).not.toBe('');
  });

  // Requirement 1.8 — clears form and resets priority on success
  it('resets the form and priority to "Medium" after successful creation', () => {
    elements['task-title'].value    = 'Study JS';
    elements['task-subject'].value  = 'Computer Science';
    elements['task-due-date'].value = futureDateString(5);
    elements['task-priority'].value = 'High';

    const fakeEvent = { preventDefault: vi.fn() };
    submitHandler(fakeEvent);

    // form.reset() should have been called
    expect(elements['task-form']._resetCalled).toBe(true);
    // priority reset back to Medium
    expect(elements['task-priority'].value).toBe('Medium');
  });

  // Error messages are cleared when a new (valid) submission is made
  it('clears previous error messages on a successful submission', () => {
    // First: invalid submission to set an error
    elements['task-title'].value   = '';
    elements['task-subject'].value = 'Math';
    elements['task-due-date'].value = futureDateString();
    elements['task-priority'].value = 'Medium';
    submitHandler({ preventDefault: vi.fn() });
    expect(elements['error-title'].textContent).not.toBe('');

    // Second: valid submission
    elements['task-title'].value   = 'Valid Title';
    submitHandler({ preventDefault: vi.fn() });
    expect(elements['error-title'].textContent).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FilterController tests
// ═════════════════════════════════════════════════════════════════════════════

describe('FilterController', () => {
  let btnAll, btnPending, btnCompleted;
  let renderSpy;

  function setupFilterDOM() {
    btnAll       = makeButton('filter-all');
    btnPending   = makeButton('filter-pending');
    btnCompleted = makeButton('filter-completed');

    const elements = {
      'filter-all':       btnAll,
      'filter-pending':   btnPending,
      'filter-completed': btnCompleted,
    };

    vi.stubGlobal('document', {
      getElementById:   vi.fn((id) => elements[id] ?? null),
      querySelector:    vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      createElement:    vi.fn(() => ({ textContent:'', style:{}, classList:{add:vi.fn(),remove:vi.fn()}, setAttribute:vi.fn() })),
      body:             { appendChild: vi.fn() },
      head:             { appendChild: vi.fn() },
      addEventListener: vi.fn(),
    });
  }

  beforeEach(() => {
    // Clear sessionStorage between tests
    Object.keys(sessionStorageData).forEach(k => delete sessionStorageData[k]);
    sessionStorageMock.getItem.mockImplementation((k) => sessionStorageData[k] ?? null);
    sessionStorageMock.setItem.mockImplementation((k, v) => { sessionStorageData[k] = v; });

    setupFilterDOM();
    EventBus.handlers = {};
    TaskManager.initialise([]);

    // Spy on TaskDisplay.render
    renderSpy = vi.spyOn(TaskDisplay, 'render').mockImplementation(() => {});
  });

  afterEach(() => {
    renderSpy.mockRestore();
  });

  // Requirement 5.4 — default filter is "All"
  it('defaults to "All" when sessionStorage has no saved filter', () => {
    FilterController.init();
    expect(FilterController._activeFilter).toBe('All');
  });

  // Requirement 5.8 — restores saved filter from sessionStorage
  it('restores "Pending" filter from sessionStorage on init', () => {
    sessionStorageData['studyPlannerFilter'] = 'Pending';
    FilterController.init();
    expect(FilterController._activeFilter).toBe('Pending');
  });

  it('restores "Completed" filter from sessionStorage on init', () => {
    sessionStorageData['studyPlannerFilter'] = 'Completed';
    FilterController.init();
    expect(FilterController._activeFilter).toBe('Completed');
  });

  it('ignores invalid sessionStorage values and defaults to "All"', () => {
    sessionStorageData['studyPlannerFilter'] = 'garbage';
    FilterController.init();
    expect(FilterController._activeFilter).toBe('All');
  });

  // Requirement 5.5 — active button has "active" class, others do not
  it('marks "All" button as active by default', () => {
    FilterController.init();
    expect(btnAll._classes).toContain('active');
    expect(btnPending._classes).not.toContain('active');
    expect(btnCompleted._classes).not.toContain('active');
  });

  it('marks only the active button with aria-pressed="true"', () => {
    FilterController.init();
    expect(btnAll._attrs['aria-pressed']).toBe('true');
    expect(btnPending._attrs['aria-pressed']).toBe('false');
    expect(btnCompleted._attrs['aria-pressed']).toBe('false');
  });

  // setFilter updates active state and persists to sessionStorage
  it('setFilter("Pending") marks Pending button as active', () => {
    FilterController.init();
    FilterController.setFilter('Pending');
    expect(btnPending._classes).toContain('active');
    expect(btnAll._classes).not.toContain('active');
    expect(btnCompleted._classes).not.toContain('active');
  });

  it('setFilter persists the chosen filter to sessionStorage', () => {
    FilterController.init();
    FilterController.setFilter('Completed');
    expect(sessionStorageData['studyPlannerFilter']).toBe('Completed');
  });

  it('setFilter calls TaskDisplay.render with the new filter', () => {
    FilterController.init();
    FilterController.setFilter('Pending');
    expect(renderSpy).toHaveBeenCalledWith(expect.any(Array), 'Pending');
  });
});
