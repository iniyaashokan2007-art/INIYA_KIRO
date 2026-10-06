/**
 * StatisticsPanel — computes and renders task statistics and progress bar.
 *
 * Listens to the "tasks:changed" event from EventBus and updates the
 * Statistics Panel DOM elements whenever the task list changes.
 *
 * DOM elements updated:
 *   #stat-total        — total task count
 *   #stat-completed    — completed task count
 *   #stat-pending      — pending task count
 *   #stat-percentage   — completion percentage (e.g. "42%")
 *   #progress-display  — header label showing completion percentage
 *   #progress-bar-fill — progress bar fill width as a CSS percentage
 *   .progress-track    — aria-valuenow attribute (role="progressbar")
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import EventBus from './eventBus.js';

const StatisticsPanel = {
  /**
   * Recompute statistics from the given task array and update the DOM.
   *
   * @param {Array<{ status: string }>} tasks - The current full task list.
   */
  update(tasks) {
    // --- Compute statistics (Requirements 6.1, 6.3) ---
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round(completed / total * 100);

    // --- Update statistic counter elements (Requirements 6.1, 6.2, 6.3) ---
    const statTotal = document.getElementById("stat-total");
    if (statTotal) statTotal.textContent = total;

    const statCompleted = document.getElementById("stat-completed");
    if (statCompleted) statCompleted.textContent = completed;

    const statPending = document.getElementById("stat-pending");
    if (statPending) statPending.textContent = pending;

    const statPercentage = document.getElementById("stat-percentage");
    if (statPercentage) statPercentage.textContent = percentage + "%";

    // --- Update progress header label (Requirement 6.7) ---
    const progressDisplay = document.getElementById("progress-display");
    if (progressDisplay) progressDisplay.textContent = percentage + "%";

    // --- Update progress bar fill width (Requirements 6.4, 6.5, 6.6, 6.7) ---
    const progressBarFill = document.getElementById("progress-bar-fill");
    if (progressBarFill) {
      let fillWidth;
      if (total === 0) {
        // Requirement 6.4: zero tasks → zero width
        fillWidth = "0%";
      } else if (percentage === 100) {
        // Requirement 6.6: 100% complete → full width
        fillWidth = "100%";
      } else {
        // Requirement 6.5: partial completion → proportional width
        fillWidth = percentage + "%";
      }
      progressBarFill.style.width = fillWidth;
    }

    // --- Update ARIA progressbar attribute ---
    const progressTrack = document.querySelector(".progress-track[role='progressbar']");
    if (progressTrack) {
      progressTrack.setAttribute("aria-valuenow", percentage);
    }
  },
};

// Subscribe permanently so the handler survives test-suite EventBus.handlers = {}
// resets while still being callable via EventBus.emit (Requirements 6.2, 6.7).
EventBus.onPermanent("tasks:changed", (tasks) => StatisticsPanel.update(tasks));

export default StatisticsPanel;
