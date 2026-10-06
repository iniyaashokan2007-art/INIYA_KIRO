/**
 * TaskManager — owns in-memory task state and coordinates CRUD operations.
 *
 * Usage:
 *   import TaskManager from './taskManager.js';
 *
 *   TaskManager.initialise(tasks);
 *   const result = TaskManager.createTask(title, subject, dueDate, priority);
 *   // result is either a Task object or a ValidationError object (isValidationError: true)
 *
 * Events emitted:
 *   "tasks:changed"  — payload: shallow copy of the full task array
 *   "storage:error"  — payload: error message string
 */

import EventBus from './eventBus.js';
import StorageManager from './storageManager.js';

/** Valid priority values (Requirement 1.7) */
const VALID_PRIORITIES = ["Low", "Medium", "High"];

/**
 * Build a ValidationError object.
 * NOT a thrown exception — it is returned to the caller.
 *
 * @param {string} field   - The form field that failed validation.
 * @param {string} message - Human-readable error description.
 * @returns {{ isValidationError: true, field: string, message: string }}
 */
function validationError(field, message) {
  return { isValidationError: true, field, message };
}

/**
 * Return today's date as a "YYYY-MM-DD" string in local time.
 * Used for due-date validation (Requirement 1.6).
 */
function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** In-memory task array. Mutated only through the public API methods. */
let _tasks = [];

const TaskManager = {
  /**
   * Seed the in-memory task array (called on app initialisation after
   * StorageManager.load returns the persisted list).
   *
   * @param {Array<object>} tasks
   */
  initialise(tasks) {
    _tasks = Array.isArray(tasks) ? tasks : [];
  },

  /**
   * Validate all fields and, on success, create and persist a new task.
   *
   * Validation order: title → subject → dueDate → priority.
   * Returns the first validation error encountered (fail-fast).
   *
   * Requirements: 1.1–1.8
   *
   * @param {string} title
   * @param {string} subject
   * @param {string} dueDate  - "YYYY-MM-DD" string
   * @param {string} priority - "Low" | "Medium" | "High"
   * @returns {object} Task on success, or ValidationError on failure.
   */
  createTask(title, subject, dueDate, priority) {
    // --- Validation (Requirements 1.3–1.7) ---

    // Title: required, 1–100 characters
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return validationError("title", "Title is required.");
    }
    if (title.trim().length > 100) {
      return validationError("title", "Title must be 100 characters or fewer.");
    }

    // Subject: required, 1–50 characters
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return validationError("subject", "Subject is required.");
    }
    if (subject.trim().length > 50) {
      return validationError("subject", "Subject must be 50 characters or fewer.");
    }

    // Due date: required, must be >= today's calendar date
    if (!dueDate || typeof dueDate !== "string" || dueDate.trim().length === 0) {
      return validationError("dueDate", "Due date is required.");
    }
    const today = todayDateString();
    if (dueDate.trim() < today) {
      return validationError(
        "dueDate",
        "Due date must be today or a future date."
      );
    }

    // Priority: required, must be one of the valid values
    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      return validationError(
        "priority",
        "Priority must be Low, Medium, or High."
      );
    }

    // --- Construction (Requirements 1.1, 1.8) ---
    const task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      subject: subject.trim(),
      dueDate: dueDate.trim(),
      priority,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    _tasks.push(task);

    // Persist; on failure keep the task in memory for the session (Requirement 3.6)
    const result = StorageManager.save(_tasks);
    if (!result.ok) {
      EventBus.emit("storage:error", result.error);
    }

    EventBus.emit("tasks:changed", this.getTasks());
    return task;
  },

  /**
   * Toggle a task's status between "Pending" and "Completed".
   *
   * On StorageManager failure: retain the mutation in memory and emit
   * "storage:error" (Requirement 3.6).
   *
   * Requirements: 3.1, 3.4, 3.5, 3.6
   *
   * @param {string} taskId
   */
  toggleCompletion(taskId) {
    const task = _tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Flip status
    task.status = task.status === "Pending" ? "Completed" : "Pending";

    const result = StorageManager.save(_tasks);
    if (!result.ok) {
      // Keep the in-memory mutation but surface the error (Requirement 3.6)
      EventBus.emit("storage:error", result.error);
    }

    EventBus.emit("tasks:changed", this.getTasks());
  },

  /**
   * Remove a task from the task list.
   *
   * On StorageManager failure: restore the task to the array and emit
   * "storage:error" (Requirement 4.5).
   *
   * Requirements: 4.1, 4.2, 4.4, 4.5
   *
   * @param {string} taskId
   */
  deleteTask(taskId) {
    const index = _tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return;

    // Remove from memory
    const [removed] = _tasks.splice(index, 1);

    const result = StorageManager.save(_tasks);
    if (!result.ok) {
      // Rollback: restore the task to its original position (Requirement 4.5)
      _tasks.splice(index, 0, removed);
      EventBus.emit("storage:error", result.error);
      // Still emit tasks:changed so the UI reflects the restored state
      EventBus.emit("tasks:changed", this.getTasks());
      return;
    }

    EventBus.emit("tasks:changed", this.getTasks());
  },

  /**
   * Return a shallow copy of the in-memory task array.
   * Callers receive a copy so they cannot accidentally mutate internal state.
   *
   * @returns {Array<object>}
   */
  getTasks() {
    return [..._tasks];
  },

  /**
   * Return the subset of tasks matching the given filter.
   *
   * @param {"All" | "Pending" | "Completed"} filter
   * @returns {Array<object>}
   */
  getFilteredTasks(filter) {
    if (filter === "All") {
      return this.getTasks();
    }
    return _tasks.filter((t) => t.status === filter);
  },
};

export default TaskManager;
