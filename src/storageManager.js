/**
 * StorageManager — handles persistence of the task list to/from localStorage.
 *
 * Usage:
 *   import StorageManager from './storageManager.js';
 *
 *   const { ok, error } = StorageManager.save(tasks);
 *   const { tasks, warnings } = StorageManager.load();
 */

/** The localStorage key used to store all tasks. */
const STORAGE_KEY = "studyPlannerTasks";

/**
 * The set of fields every task object must have to be considered well-formed.
 * Requirement 7.4: tasks missing any of these are discarded with a warning.
 */
const REQUIRED_FIELDS = ["id", "title", "subject", "dueDate", "priority", "status"];

const StorageManager = {
  /**
   * Serialise the task array and write it to localStorage.
   *
   * @param {Array<object>} tasks - The current in-memory task list.
   * @returns {{ ok: true } | { ok: false, error: string }}
   *   Returns `{ ok: true }` on success.
   *   Returns `{ ok: false, error }` on QuotaExceededError or any other write failure.
   *
   * Requirement 7.1 — writes the complete task list under "studyPlannerTasks".
   */
  save(tasks) {
    try {
      const serialised = JSON.stringify(tasks);
      localStorage.setItem(STORAGE_KEY, serialised);
      return { ok: true };
    } catch (err) {
      // Catches QuotaExceededError, SecurityError, and any other exception.
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  },

  /**
   * Read and deserialise the task list from localStorage.
   *
   * - Missing/null key → `{ tasks: [], warnings: [] }`
   * - Invalid JSON        → `{ tasks: [], warnings: [] }`
   * - Valid JSON with malformed objects → malformed objects discarded, warning per object
   *
   * @returns {{ tasks: Array<object>, warnings: string[] }}
   *
   * Requirements 7.2, 7.3, 7.4, 7.5
   */
  load() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (_err) {
      // localStorage access itself failed (e.g. SecurityError in a sandboxed frame).
      return { tasks: [], warnings: [] };
    }

    // Requirement 7.3 — absent or null value → empty list, no warnings.
    if (raw === null || raw === undefined) {
      return { tasks: [], warnings: [] };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      // Requirement 7.3 — invalid JSON → empty list, no warnings.
      return { tasks: [], warnings: [] };
    }

    // Guard: stored value must be an array to be usable.
    if (!Array.isArray(parsed)) {
      return { tasks: [], warnings: [] };
    }

    const tasks = [];
    const warnings = [];

    for (const item of parsed) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const missingField = REQUIRED_FIELDS.find(
          (field) => !(field in item) || item[field] === undefined
        );

        if (!missingField) {
          // Well-formed — keep it (Requirement 7.5: all fields preserved).
          tasks.push(item);
        } else {
          // Malformed — discard and record a warning (Requirement 7.4).
          const identifier = item.title || item.id || "unknown";
          warnings.push(`Task missing required fields: ${identifier}`);
        }
      } else {
        // Non-object entries are silently dropped (they are not tasks at all).
        warnings.push(`Task missing required fields: unknown`);
      }
    }

    return { tasks, warnings };
  },
};

export default StorageManager;
