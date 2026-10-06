/**
 * FormController — manages the task creation form.
 *
 * Responsibilities:
 *   - Pre-select priority to "Medium" on load, leave dueDate empty
 *   - Intercept form submit, read fields, call TaskManager.createTask
 *   - Display inline field-level error messages on ValidationError
 *   - Clear form and reset priority to "Medium" on success
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

import TaskManager from './taskManager.js';

const FormController = {
  /** @private — the <form> element */
  _form: null,

  /**
   * Initialise the form controller.
   * Call once after DOMContentLoaded.
   */
  init() {
    this._form = document.getElementById('task-form');
    if (!this._form) return;

    // Requirement 1.2: pre-select priority to "Medium", dueDate stays empty
    const priorityEl = document.getElementById('task-priority');
    if (priorityEl) priorityEl.value = 'Medium';

    const dueDateEl = document.getElementById('task-due-date');
    if (dueDateEl) dueDateEl.value = '';

    this._form.addEventListener('submit', (e) => this._handleSubmit(e));
  },

  /**
   * Handle form submission.
   * @param {Event} e
   * @private
   */
  _handleSubmit(e) {
    e.preventDefault();

    // Clear all previous inline errors
    this._clearErrors();

    const title    = (document.getElementById('task-title')?.value    || '').trim();
    const subject  = (document.getElementById('task-subject')?.value  || '').trim();
    const dueDate  = (document.getElementById('task-due-date')?.value || '').trim();
    const priority = document.getElementById('task-priority')?.value  || '';

    const result = TaskManager.createTask(title, subject, dueDate, priority);

    if (result && result.isValidationError) {
      // Map field name from TaskManager to DOM error element id
      const errorElementId = {
        title:    'error-title',
        subject:  'error-subject',
        dueDate:  'error-due-date',
        priority: 'error-priority',
      }[result.field];

      if (errorElementId) {
        const errorEl = document.getElementById(errorElementId);
        if (errorEl) errorEl.textContent = result.message;
      }

      // Mark the failing input as invalid for accessibility
      const inputId = {
        title:    'task-title',
        subject:  'task-subject',
        dueDate:  'task-due-date',
        priority: 'task-priority',
      }[result.field];
      if (inputId) {
        const inputEl = document.getElementById(inputId);
        if (inputEl) inputEl.setAttribute('aria-invalid', 'true');
      }
      return;
    }

    // Success — clear the form and reset priority to Medium (Requirement 1.8)
    this._resetForm();
  },

  /**
   * Clear all inline error messages and aria-invalid attributes.
   * @private
   */
  _clearErrors() {
    const errorIds = ['error-title', 'error-subject', 'error-due-date', 'error-priority'];
    errorIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });

    const inputIds = ['task-title', 'task-subject', 'task-due-date', 'task-priority'];
    inputIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.removeAttribute('aria-invalid');
    });
  },

  /**
   * Reset the form fields to their default state.
   * @private
   */
  _resetForm() {
    if (this._form) this._form.reset();

    // Explicitly reset priority back to "Medium" (form.reset() uses HTML default)
    const priorityEl = document.getElementById('task-priority');
    if (priorityEl) priorityEl.value = 'Medium';

    // Ensure dueDate is empty
    const dueDateEl = document.getElementById('task-due-date');
    if (dueDateEl) dueDateEl.value = '';

    // Clear any stale error messages
    this._clearErrors();
  },
};

export default FormController;
