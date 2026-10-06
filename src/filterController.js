/**
 * FilterController — manages the All / Pending / Completed filter buttons.
 *
 * Responsibilities:
 *   - On init: restore active filter from sessionStorage (default "All")
 *   - Apply visually distinct active state to the active button
 *   - On click: update active filter, persist to sessionStorage, re-render task list
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8
 */

import TaskDisplay from './taskDisplay.js';
import TaskManager from './taskManager.js';

const SESSION_KEY = 'studyPlannerFilter';

const FilterController = {
  /** @type {"All"|"Pending"|"Completed"} */
  _activeFilter: 'All',

  /**
   * Initialise the filter controller.
   * Call once after DOMContentLoaded.
   */
  init() {
    // Requirement 5.8: restore persisted filter; default to "All"
    const stored = sessionStorage.getItem(SESSION_KEY);
    const validFilters = ['All', 'Pending', 'Completed'];
    this._activeFilter = validFilters.includes(stored) ? stored : 'All';

    // Sync TaskDisplay so its EventBus listener uses the same filter
    TaskDisplay._activeFilter = this._activeFilter;

    this._applyActiveState(this._activeFilter);
    this._attachListeners();
  },

  /**
   * Set the active filter, persist it, update button states, and re-render.
   *
   * @param {"All"|"Pending"|"Completed"} filter
   */
  setFilter(filter) {
    this._activeFilter = filter;
    TaskDisplay._activeFilter = filter;
    sessionStorage.setItem(SESSION_KEY, filter);
    this._applyActiveState(filter);
    TaskDisplay.render(TaskManager.getTasks(), filter);
  },

  /**
   * Apply the `.active` class and `aria-pressed` attribute to the matching button.
   * @param {"All"|"Pending"|"Completed"} filter
   * @private
   */
  _applyActiveState(filter) {
    const buttons = {
      All:       document.getElementById('filter-all'),
      Pending:   document.getElementById('filter-pending'),
      Completed: document.getElementById('filter-completed'),
    };

    Object.entries(buttons).forEach(([key, btn]) => {
      if (!btn) return;
      const isActive = key === filter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  },

  /**
   * Attach click listeners to all three filter buttons.
   * @private
   */
  _attachListeners() {
    const buttons = {
      All:       document.getElementById('filter-all'),
      Pending:   document.getElementById('filter-pending'),
      Completed: document.getElementById('filter-completed'),
    };

    Object.entries(buttons).forEach(([filter, btn]) => {
      if (!btn) return;
      btn.addEventListener('click', () => this.setFilter(filter));
    });
  },
};

export default FilterController;
