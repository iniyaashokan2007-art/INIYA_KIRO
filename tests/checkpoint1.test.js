/**
 * Checkpoint 1 smoke tests
 * Covers: EventBus, StorageManager, TaskManager
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Shared localStorage mock ────────────────────────────────────────────────
// Must be set up before importing modules that reference localStorage at
// import-time.  We use vi.stubGlobal so every module in this test file sees it.

const localStorageData = {};
const localStorageMock = {
  getItem: vi.fn((key) => localStorageData[key] ?? null),
  setItem: vi.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageData[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }),
};

vi.stubGlobal('localStorage', localStorageMock);

// Stub crypto.randomUUID so TaskManager can call it outside a browser
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-1234'),
});

// ─── Module imports (after globals are stubbed) ───────────────────────────────
import EventBus from '../src/eventBus.js';
import StorageManager from '../src/storageManager.js';
import TaskManager from '../src/taskManager.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a valid future date string in YYYY-MM-DD format */
function futureDateString(offsetDays = 1) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── EventBus ─────────────────────────────────────────────────────────────────
describe('EventBus', () => {
  beforeEach(() => {
    // Reset handlers between tests to avoid cross-test pollution
    EventBus.handlers = {};
  });

  it('registers a handler and delivers the emitted payload', () => {
    const received = [];
    EventBus.on('test:event', (data) => received.push(data));
    EventBus.emit('test:event', { value: 42 });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ value: 42 });
  });

  it('supports multiple handlers for the same event', () => {
    let count = 0;
    EventBus.on('tick', () => count++);
    EventBus.on('tick', () => count++);
    EventBus.emit('tick', null);

    expect(count).toBe(2);
  });

  it('does not throw when emitting an event with no registered handlers', () => {
    expect(() => EventBus.emit('no:handlers', {})).not.toThrow();
  });
});

// ─── StorageManager ───────────────────────────────────────────────────────────
describe('StorageManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Re-wire the mock functions after clear
    localStorageMock.getItem.mockImplementation((key) => localStorageData[key] ?? null);
    localStorageMock.setItem.mockImplementation((key, value) => { localStorageData[key] = value; });
  });

  it('save returns { ok: true } when localStorage.setItem succeeds', () => {
    const result = StorageManager.save([]);
    expect(result).toEqual({ ok: true });
    expect(localStorageMock.setItem).toHaveBeenCalledOnce();
  });

  it('load returns { tasks: [], warnings: [] } when storage is empty', () => {
    const result = StorageManager.load();
    expect(result).toEqual({ tasks: [], warnings: [] });
  });

  it('load returns { tasks: [], warnings: [] } on invalid JSON', () => {
    localStorageData['studyPlannerTasks'] = '{not valid json';
    const result = StorageManager.load();
    expect(result).toEqual({ tasks: [], warnings: [] });
  });

  it('save then load round-trips a valid task array', () => {
    const tasks = [
      { id: 'abc', title: 'Test', subject: 'Math', dueDate: '2099-01-01', priority: 'High', status: 'Pending' },
    ];
    StorageManager.save(tasks);
    const { tasks: loaded, warnings } = StorageManager.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject(tasks[0]);
    expect(warnings).toHaveLength(0);
  });
});

// ─── TaskManager ──────────────────────────────────────────────────────────────
describe('TaskManager', () => {
  const validDate = futureDateString(5);

  beforeEach(() => {
    // Reset TaskManager state and localStorage between tests
    TaskManager.initialise([]);
    localStorageMock.clear();
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((key) => localStorageData[key] ?? null);
    localStorageMock.setItem.mockImplementation((key, value) => { localStorageData[key] = value; });
    // Reset EventBus handlers
    EventBus.handlers = {};
  });

  it('createTask with valid data returns a task with status "Pending"', () => {
    const result = TaskManager.createTask('Study JS', 'Computer Science', validDate, 'Medium');

    expect(result.isValidationError).toBeUndefined();
    expect(result.status).toBe('Pending');
    expect(result.title).toBe('Study JS');
    expect(result.subject).toBe('Computer Science');
    expect(result.dueDate).toBe(validDate);
    expect(result.priority).toBe('Medium');
    expect(result.id).toBeTruthy();
  });

  it('createTask with empty title returns a validation error', () => {
    const result = TaskManager.createTask('', 'Math', validDate, 'Low');

    expect(result.isValidationError).toBe(true);
    expect(result.field).toBe('title');
  });

  it('createTask with empty subject returns a validation error', () => {
    const result = TaskManager.createTask('Study', '', validDate, 'Low');

    expect(result.isValidationError).toBe(true);
    expect(result.field).toBe('subject');
  });

  it('createTask with a past due date returns a validation error', () => {
    const result = TaskManager.createTask('Study', 'Math', '2000-01-01', 'Low');

    expect(result.isValidationError).toBe(true);
    expect(result.field).toBe('dueDate');
  });

  it('createTask with an invalid priority returns a validation error', () => {
    const result = TaskManager.createTask('Study', 'Math', validDate, 'Ultra');

    expect(result.isValidationError).toBe(true);
    expect(result.field).toBe('priority');
  });

  it('createTask does not mutate the task list on validation failure', () => {
    TaskManager.createTask('', 'Math', validDate, 'Low');
    expect(TaskManager.getTasks()).toHaveLength(0);
  });

  it('createTask adds the task to getTasks() on success', () => {
    TaskManager.createTask('Task A', 'History', validDate, 'High');
    expect(TaskManager.getTasks()).toHaveLength(1);
  });
});
