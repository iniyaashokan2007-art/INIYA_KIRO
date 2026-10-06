/**
 * Property-based tests for StorageManager using fast-check.
 *
 * Core property under test:
 *   For any array of valid task objects, saving to localStorage and then
 *   loading it back produces an identical task list with no warnings.
 *
 * Additional properties:
 *   - Field values are preserved exactly (no mutation, truncation, or coercion).
 *   - Order is preserved (save/load is not a set operation).
 *   - An empty array round-trips cleanly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ─── localStorage mock ────────────────────────────────────────────────────────
// Set up before importing StorageManager so the module captures the stub.

const localStorageData = {};
const localStorageMock = {
  getItem:    vi.fn((key)        => localStorageData[key] ?? null),
  setItem:    vi.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key)        => { delete localStorageData[key]; }),
  clear:      vi.fn(()           => {
    Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  }),
};

vi.stubGlobal('localStorage', localStorageMock);

// ─── Module under test ────────────────────────────────────────────────────────
import StorageManager from '../src/storageManager.js';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/**
 * Generates a non-empty string of printable ASCII characters.
 * Avoids control characters that JSON survives but are unlikely in real data.
 */
const printableString = (minLength = 1, maxLength = 100) =>
  fc.string({ minLength, maxLength, unit: 'grapheme-ascii' });

/**
 * Generates a YYYY-MM-DD date string for a year between 2025 and 2099.
 * StorageManager does no date validation — any string is stored as-is.
 */
const dueDateArbitrary = fc.date({
  min: new Date('2025-01-01'),
  max: new Date('2099-12-31'),
}).map((d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
});

/** Generates a valid priority value. */
const priorityArbitrary = fc.constantFrom('Low', 'Medium', 'High');

/** Generates a valid status value. */
const statusArbitrary = fc.constantFrom('Pending', 'Completed');

/**
 * Generates a single well-formed task object with all six required fields
 * plus the optional `createdAt` timestamp.
 */
const taskArbitrary = fc.record({
  id:        fc.uuid(),
  title:     printableString(1, 100),
  subject:   printableString(1, 50),
  dueDate:   dueDateArbitrary,
  priority:  priorityArbitrary,
  status:    statusArbitrary,
  createdAt: fc.date().map((d) => d.toISOString()),
});

/**
 * Generates an array of 0–20 valid tasks.
 */
const taskArrayArbitrary = fc.array(taskArbitrary, { minLength: 0, maxLength: 20 });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StorageManager — property-based tests', () => {
  beforeEach(() => {
    // Wipe the in-memory store and reset call counts before each test run.
    localStorageMock.clear();
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((key) => localStorageData[key] ?? null);
    localStorageMock.setItem.mockImplementation((key, value) => { localStorageData[key] = value; });
  });

  it('save then load preserves the entire task list with no warnings', () => {
    fc.assert(
      fc.property(taskArrayArbitrary, (tasks) => {
        // Arrange: clear any state from a previous iteration
        localStorageMock.clear();

        // Act: save, then load
        const saveResult = StorageManager.save(tasks);
        const { tasks: loaded, warnings } = StorageManager.load();

        // Assert: save succeeded
        expect(saveResult).toEqual({ ok: true });

        // Assert: same number of tasks returned, no warnings
        expect(loaded).toHaveLength(tasks.length);
        expect(warnings).toHaveLength(0);

        // Assert: every task is returned with identical field values
        tasks.forEach((original, index) => {
          expect(loaded[index]).toEqual(original);
        });
      }),
      { numRuns: 200, verbose: false }
    );
  });

  it('save then load preserves task order', () => {
    fc.assert(
      fc.property(taskArrayArbitrary, (tasks) => {
        localStorageMock.clear();

        StorageManager.save(tasks);
        const { tasks: loaded } = StorageManager.load();

        // IDs must appear in the same order as the original array
        const originalIds = tasks.map((t) => t.id);
        const loadedIds   = loaded.map((t) => t.id);
        expect(loadedIds).toEqual(originalIds);
      }),
      { numRuns: 200, verbose: false }
    );
  });

  it('each individual field value is preserved exactly after a round-trip', () => {
    fc.assert(
      fc.property(taskArbitrary, (task) => {
        localStorageMock.clear();

        StorageManager.save([task]);
        const { tasks: loaded } = StorageManager.load();

        expect(loaded).toHaveLength(1);
        const restored = loaded[0];

        // Check every field individually for clear failure messages
        expect(restored.id).toBe(task.id);
        expect(restored.title).toBe(task.title);
        expect(restored.subject).toBe(task.subject);
        expect(restored.dueDate).toBe(task.dueDate);
        expect(restored.priority).toBe(task.priority);
        expect(restored.status).toBe(task.status);
        expect(restored.createdAt).toBe(task.createdAt);
      }),
      { numRuns: 300, verbose: false }
    );
  });

  it('an empty task array round-trips to an empty array with no warnings', () => {
    localStorageMock.clear();

    const saveResult = StorageManager.save([]);
    const { tasks: loaded, warnings } = StorageManager.load();

    expect(saveResult).toEqual({ ok: true });
    expect(loaded).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
