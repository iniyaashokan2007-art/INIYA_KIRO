/**
 * app.js — application entry point.
 *
 * Runs the startup sequence on DOMContentLoaded:
 *   1. Load persisted tasks from localStorage via StorageManager
 *   2. Initialise TaskManager with the loaded tasks
 *   3. Show an error if any tasks were malformed (Requirement 7.4)
 *   4. Initialise FilterController (restores saved filter)
 *   5. Emit "tasks:changed" to paint the initial task list and statistics
 *
 * Requirements: 7.2, 7.3, 7.4, 2.1, 2.2, 6.1
 */

import StorageManager    from './storageManager.js';
import TaskManager       from './taskManager.js';
import TaskDisplay       from './taskDisplay.js';
import StatisticsPanel   from './statisticsPanel.js';
import FormController    from './formController.js';
import FilterController  from './filterController.js';
import EventBus          from './eventBus.js';

document.addEventListener('DOMContentLoaded', () => {
  // Step 1 & 2: Load from storage, seed TaskManager
  const { tasks, warnings } = StorageManager.load();
  TaskManager.initialise(tasks);

  // Step 3: Surface warnings about malformed stored tasks (Requirement 7.4)
  if (warnings && warnings.length > 0) {
    TaskDisplay.showError(
      `Some tasks could not be restored: ${warnings.join('; ')}`
    );
  }

  // Step 4: Initialise controllers (form wiring + filter restoration)
  FormController.init();
  FilterController.init();

  // Step 5: Wire task action buttons via event delegation on the task list
  // container (Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4)
  const taskListContainer = document.getElementById('task-list');
  if (taskListContainer) {
    taskListContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const taskId = btn.dataset.taskId;
      if (!taskId) return;

      if (action === 'toggle') {
        // Requirement 3.1, 3.5: toggle completion status
        TaskManager.toggleCompletion(taskId);

      } else if (action === 'delete') {
        // Requirement 4.1: show confirmation before deleting
        TaskDisplay.showConfirmDialog(
          taskId,
          () => TaskManager.deleteTask(taskId),  // onConfirm
          () => {}                                // onCancel — do nothing
        );
      }
    });
  }

  // Step 6: Paint initial UI — emit tasks:changed so all listeners update
  EventBus.emit('tasks:changed', TaskManager.getTasks());
});






