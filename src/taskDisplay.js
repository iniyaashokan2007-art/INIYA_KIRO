/**
 * TaskDisplay — handles all DOM rendering for the task list.
 *
 * Responsibilities:
 *   - Render the task list with filtering and sorting (render)
 *   - Show a confirmation dialog before deletion (showConfirmDialog)
 *   - Show a transient error toast notification (showError)
 *
 * Events consumed:
 *   "tasks:changed"  — re-renders the task list using the current active filter
 *   "storage:error"  — shows the error toast
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.2, 3.6, 4.1, 4.3, 4.5, 5.6
 */

import EventBus from './eventBus.js';

/**
 * Escape a string for safe insertion as HTML text / attribute value.
 * Prevents XSS from user-supplied task fields.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inject the modal overlay styles into the document once */
function injectModalStyles() {
  if (document.getElementById('confirm-dialog-styles')) return;
  const style = document.createElement('style');
  style.id = 'confirm-dialog-styles';
  style.textContent = `
    #confirm-dialog-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    #confirm-dialog-overlay.visible {
      display: flex;
    }

    .confirm-dialog {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: calc(100% - 32px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .confirm-dialog-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1a1a2e;
    }

    .confirm-dialog-message {
      font-size: 0.9375rem;
      color: #4a5568;
      line-height: 1.6;
    }

    .confirm-dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .confirm-dialog-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      min-width: 80px;
      padding: 8px 20px;
      border: none;
      border-radius: 4px;
      font-size: 0.9375rem;
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .confirm-dialog-btn:focus-visible {
      outline: 3px solid #0056b3;
      outline-offset: 2px;
    }

    .confirm-dialog-btn-delete {
      background-color: #c0392b;
      color: #ffffff;
    }

    .confirm-dialog-btn-delete:hover {
      background-color: #a93226;
    }

    .confirm-dialog-btn-cancel {
      background-color: #f5f7fa;
      color: #1a1a2e;
      border: 1.5px solid #d0d7de;
    }

    .confirm-dialog-btn-cancel:hover {
      background-color: #e8ecf0;
    }

    .task-content {
      flex: 1;
      min-width: 0;
    }

    .task-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }

    .task-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1a1a2e;
      flex: 1;
      min-width: 0;
      overflow-wrap: break-word;
    }

    .task-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .task-badge-high {
      background-color: #fdecea;
      color: #c0392b;
    }

    .task-badge-medium {
      background-color: #fef3e2;
      color: #e67e22;
    }

    .task-badge-low {
      background-color: #e8f5e9;
      color: #1a7a3f;
    }

    .task-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .task-subject,
    .task-due-date {
      font-size: 0.875rem;
      color: #4a5568;
    }

    .task-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-toggle,
    .btn-delete {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      min-width: 90px;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.1s ease;
      white-space: nowrap;
    }

    .btn-toggle:focus-visible,
    .btn-delete:focus-visible {
      outline: 3px solid #0056b3;
      outline-offset: 2px;
    }

    .btn-toggle:active,
    .btn-delete:active {
      transform: translateY(1px);
    }

    .btn-toggle {
      background-color: #0056b3;
      color: #ffffff;
    }

    .btn-toggle:hover {
      background-color: #004494;
    }

    .btn-delete {
      background-color: #fdecea;
      color: #c0392b;
      border: 1.5px solid #e74c3c;
    }

    .btn-delete:hover {
      background-color: #f9d6d4;
    }

    @media (min-width: 600px) {
      .task-actions {
        flex-direction: row;
        align-items: center;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Get (or create) the confirm-dialog overlay element in the DOM.
 * Reuses the element if it already exists.
 *
 * @returns {HTMLElement} The overlay element.
 */
function getOrCreateDialogOverlay() {
  let overlay = document.getElementById('confirm-dialog-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-dialog-title-text');
    document.body.appendChild(overlay);
  }
  return overlay;
}

const TaskDisplay = {
  /**
   * Tracks the currently active filter so the EventBus listener can re-render
   * with the correct filter.  Updated by FilterController.
   * @type {"All" | "Pending" | "Completed"}
   */
  _activeFilter: 'All',

  /**
   * Render the task list into #task-list.
   *
   * @param {Array<object>} tasks  - Full task array from TaskManager.
   * @param {"All"|"Pending"|"Completed"} filter - Active filter value.
   *
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.2, 5.1–5.3, 5.6
   */
  render(tasks, filter) {
    const container = document.getElementById('task-list');
    if (!container) return;

    // Clear the container
    container.innerHTML = '';

    // Normalise filter
    const activeFilter = filter || 'All';

    // Filter tasks
    const filtered =
      activeFilter === 'All'
        ? tasks
        : tasks.filter((t) => t.status === activeFilter);

    // Sort: primary by dueDate ascending (YYYY-MM-DD string compare works),
    //       secondary by createdAt ascending (Requirement 2.2)
    const sorted = [...filtered].sort((a, b) => {
      if (a.dueDate < b.dueDate) return -1;
      if (a.dueDate > b.dueDate) return 1;
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });

    // Empty-state handling (Requirements 2.7, 5.6)
    if (sorted.length === 0) {
      const emptyMessage =
        tasks.length === 0
          ? 'No study tasks yet. Add one above!'
          : `No ${activeFilter} tasks found.`;

      const li = document.createElement('li');
      li.className = 'empty-state';
      li.setAttribute('aria-label', emptyMessage);
      li.innerHTML = `
        <div class="empty-state-icon">📋</div>
        <p class="empty-state-text">${emptyMessage}</p>
      `;
      container.appendChild(li);
      return;
    }

    // Render each task (Requirements 2.1, 2.3–2.6, 3.2)
    sorted.forEach((task) => {
      const isCompleted = task.status === 'Completed';
      const priorityClass = `task-priority-${task.priority.toLowerCase()}`;
      const completedClass = isCompleted ? ' task-completed' : '';

      const li = document.createElement('li');
      li.className = `task-item ${priorityClass}${completedClass}`;
      li.setAttribute('data-task-id', task.id);

      const toggleLabel = isCompleted
        ? `Mark ${task.title} as pending`
        : `Mark ${task.title} as completed`;
      const toggleText = isCompleted ? '↩ Undo' : '✓ Complete';

      li.innerHTML = `
        <div class="task-content">
          <div class="task-header">
            <span class="task-title">${escapeHtml(task.title)}</span>
            <span class="task-badge task-badge-${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
          </div>
          <div class="task-meta">
            <span class="task-subject">📚 ${escapeHtml(task.subject)}</span>
            <span class="task-due-date">📅 ${escapeHtml(task.dueDate)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button
            class="btn-toggle"
            data-action="toggle"
            data-task-id="${escapeHtml(task.id)}"
            aria-label="${escapeHtml(toggleLabel)}"
            type="button"
          >${toggleText}</button>
          <button
            class="btn-delete"
            data-action="delete"
            data-task-id="${escapeHtml(task.id)}"
            aria-label="${escapeHtml(`Delete task ${task.title}`)}"
            type="button"
          >🗑 Delete</button>
        </div>
      `;

      container.appendChild(li);
    });
  },

  /**
   * Show a modal confirmation dialog before deleting a task.
   *
   * @param {string}   taskId    - The id of the task to confirm deletion for.
   * @param {Function} onConfirm - Called if the user clicks "Delete".
   * @param {Function} onCancel  - Called if the user clicks "Cancel".
   *
   * Requirements: 4.1, 4.3
   */
  showConfirmDialog(taskId, onConfirm, onCancel) {
    const overlay = getOrCreateDialogOverlay();

    overlay.innerHTML = `
      <div class="confirm-dialog">
        <h3 class="confirm-dialog-title" id="confirm-dialog-title-text">Delete Task</h3>
        <p class="confirm-dialog-message">Are you sure you want to delete this task?</p>
        <div class="confirm-dialog-actions">
          <button
            id="confirm-dialog-cancel"
            class="confirm-dialog-btn confirm-dialog-btn-cancel"
            type="button"
            aria-label="Cancel task deletion"
          >Cancel</button>
          <button
            id="confirm-dialog-delete"
            class="confirm-dialog-btn confirm-dialog-btn-delete"
            type="button"
            aria-label="Confirm task deletion"
          >Delete</button>
        </div>
      </div>
    `;

    overlay.classList.add('visible');

    // Focus the cancel button by default (safer default for destructive action)
    const cancelBtn = overlay.querySelector('#confirm-dialog-cancel');
    const deleteBtn = overlay.querySelector('#confirm-dialog-delete');

    // Defer focus so the overlay is visible first
    setTimeout(() => cancelBtn && cancelBtn.focus(), 0);

    const close = () => overlay.classList.remove('visible');

    // Keyboard: close on Escape
    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKeydown);
        close();
        if (typeof onCancel === 'function') onCancel();
      }
    };
    document.addEventListener('keydown', onKeydown);

    deleteBtn.addEventListener('click', () => {
      document.removeEventListener('keydown', onKeydown);
      close();
      if (typeof onConfirm === 'function') onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
      document.removeEventListener('keydown', onKeydown);
      close();
      if (typeof onCancel === 'function') onCancel();
    });

    // Click outside the dialog box = cancel
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.removeEventListener('keydown', onKeydown);
        close();
        if (typeof onCancel === 'function') onCancel();
      }
    }, { once: true });
  },

  /**
   * Show the error toast with the given message, then auto-hide after 4 s.
   *
   * @param {string} message - The error message to display.
   *
   * Requirements: 3.6, 4.5
   */
  showError(message) {
    const toast = document.getElementById('error-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('visible');

    // Clear any previously scheduled hide timer
    if (this._errorToastTimer) {
      clearTimeout(this._errorToastTimer);
    }

    this._errorToastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      this._errorToastTimer = null;
    }, 4000);
  },

  /** @private — holds the setTimeout handle for the error toast auto-hide */
  _errorToastTimer: null,
};

// ── Wire up styles (browser only) ────────────────────────────────────────────
if (typeof document !== 'undefined') {
  injectModalStyles();
}

// ── EventBus subscriptions ────────────────────────────────────────────────────

/**
 * Re-render whenever the task list changes.
 * Uses the stored _activeFilter so the current filter is respected.
 * Requirement 2.1, 2.2, 5.7
 */
EventBus.on('tasks:changed', (tasks) => {
  TaskDisplay.render(tasks, TaskDisplay._activeFilter || 'All');
});

/**
 * Show the error toast when a storage write fails.
 * Requirements: 3.6, 4.5
 */
EventBus.on('storage:error', (msg) => {
  TaskDisplay.showError(msg);
});

export default TaskDisplay;
