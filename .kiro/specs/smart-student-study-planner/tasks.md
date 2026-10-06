# Implementation Plan: Smart Student Study Planner

## Overview

Implement the Smart Student Study Planner as a browser-based, single-file vanilla HTML/CSS/JS application with localStorage persistence. The build follows the module separation defined in the design: `Task_Manager`, `Storage_Manager`, `Task_Display`, `Statistics_Panel`, `Event Dispatcher`, and UI Controllers (`FilterController`, `FormController`). Each step produces working, integrated code with no orphaned modules.

---

## Tasks

- [x] 1. Scaffold the project structure and base HTML/CSS shell
  - Create `index.html` with the full page skeleton: header, two-column layout (task list panel + statistics panel), task creation form, filter controls, task list container, and statistics/progress bar placeholders
  - Add embedded `<style>` block (or linked `style.css`) with CSS variables, responsive breakpoints (≥1024 px two-column, ≤767 px single-column), WCAG 4.5:1 contrast-compliant colour palette, and 44×44 px minimum touch targets for all interactive controls
  - Add ARIA labels to every interactive control (form inputs, buttons, filter controls, task action controls)
  - Establish tab focus order matching document order (top-to-bottom, left-to-right)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 2. Implement the Event Dispatcher
  - [x] 2.1 Create the `EventBus` object with `on(event, handler)` and `emit(event, data)` methods inside a `<script>` block (or `eventBus.js`)
    - Handlers map: `{ [eventName]: [handler, ...] }`
    - `emit` iterates all registered handlers for the event, passing `data`
    - _Requirements: (internal wiring — supports all inter-module communication)_

- [x] 3. Implement Storage_Manager
  - [x] 3.1 Write the `StorageManager` module with `save(tasks)` and `load()` methods
    - `save`: `JSON.stringify` → `localStorage.setItem("studyPlannerTasks", ...)` → return `{ ok: true }` on success, catch and return `{ ok: false, error }` on any write failure
    - `load`: `localStorage.getItem("studyPlannerTasks")` → `JSON.parse` → filter out objects missing any of `id`, `title`, `subject`, `dueDate`, `priority`, `status` → return `{ tasks, warnings }`; on missing/null/parse-error return `{ tasks: [], warnings: [] }`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 3.2 Write property test for StorageManager — Property 1: serialisation round-trip
    - **Property 1: Task serialisation round-trip preserves all fields**
    - Generate random valid task arrays → `save` → `load` → assert deep equality of every field of every task
    - Tag: `// Feature: smart-student-study-planner, Property 1`
    - **Validates: Requirements 7.1, 7.5**

  - [ ]* 3.3 Write property test for StorageManager — Property 7: partial-load correctness
    - **Property 7: Partial-load preserves all well-formed tasks and discards only malformed ones**
    - Generate JSON arrays mixing well-formed and malformed task objects → `load` → assert only well-formed tasks returned and `warnings` is non-empty
    - Tag: `// Feature: smart-student-study-planner, Property 7`
    - **Validates: Requirements 7.3, 7.4**

  - [ ]* 3.4 Write unit tests for StorageManager
    - `save` then `load` returns identical data
    - `load` with missing key returns empty array
    - `load` with invalid JSON returns empty array
    - `load` with mixed valid/invalid objects filters correctly
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Implement Task_Manager
  - [x] 4.1 Write the `TaskManager` module with `initialise(tasks)`, `createTask(title, subject, dueDate, priority)`, `toggleCompletion(taskId)`, `deleteTask(taskId)`, `getTasks()`, and `getFilteredTasks(filter)` methods
    - `initialise`: store tasks array in memory
    - `createTask`: validate all fields per design rules (title 1–100 chars, subject 1–50 chars, dueDate ≥ today, priority one of Low/Medium/High); on failure return `{ field, message }` ValidationError without mutating state; on success assign UUID via `crypto.randomUUID()`, set `status: "Pending"`, set `createdAt` ISO datetime, push to array, call `StorageManager.save`, emit `"tasks:changed"`, return task
    - `toggleCompletion`: flip status Pending↔Completed, call `StorageManager.save`; on save failure retain mutation in memory, emit `"storage:error"`; emit `"tasks:changed"`
    - `deleteTask`: remove task from array, call `StorageManager.save`; on save failure restore task to array and emit `"storage:error"`; emit `"tasks:changed"`
    - `getTasks`: return shallow copy of in-memory array
    - `getFilteredTasks`: filter by status matching the `filter` argument ("All" returns all)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 3.4, 3.5, 3.6, 4.1, 4.2, 4.4, 4.5_

  - [ ]* 4.2 Write property test for Task_Manager — Property 2: invalid inputs always rejected
    - **Property 2: Invalid inputs are always rejected and the task list is unchanged**
    - Generate inputs with at least one invalid field → `createTask` → assert `ValidationError` returned and `getTasks()` unchanged
    - Tag: `// Feature: smart-student-study-planner, Property 2`
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7**

  - [ ]* 4.3 Write property test for Task_Manager — Property 3: valid creation always sets status to Pending
    - **Property 3: Valid task creation always sets status to Pending**
    - Generate any valid title/subject/dueDate/priority combination → `createTask` → assert `status === "Pending"` and task present in `getTasks()`
    - Tag: `// Feature: smart-student-study-planner, Property 3`
    - **Validates: Requirements 1.1, 1.8**

  - [ ]* 4.4 Write property test for Task_Manager — Property 4: completion toggle is an involution
    - **Property 4: Completion toggle is an involution**
    - Generate any task + call `toggleCompletion` twice on same id → assert `status` equals its original value
    - Tag: `// Feature: smart-student-study-planner, Property 4`
    - **Validates: Requirements 3.1, 3.5**

  - [ ]* 4.5 Write unit tests for Task_Manager
    - `createTask` with valid data returns task with correct fields
    - `createTask` with each invalid field permutation returns ValidationError
    - `toggleCompletion` Pending→Completed and Completed→Pending
    - `deleteTask` removes correct task and leaves others intact
    - `getFilteredTasks("Pending")` / `("Completed")` / `("All")` return correct subsets
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 3.5, 4.2, 5.1, 5.2, 5.3_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Statistics_Panel
  - [ ] 6.1 Write the `StatisticsPanel` module with an `update(tasks)` method and wire it to `EventBus.on("tasks:changed", ...)`
    - Compute `total`, `completed`, `pending`, and `percentage` (using `Math.round(completed / total * 100)`, returning `0` when `total === 0`)
    - Update the DOM elements for each statistic
    - Set the progress bar filled-region CSS `width` to `percentage + "%"`; when total is 0 set width to `"0%"`; when percentage is 100 set width to `"100%"`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 6.2 Write property test for Statistics_Panel — Property 6: statistics always consistent with task list
    - **Property 6: Statistics and progress bar are always consistent with the task list**
    - Generate arbitrary task list states (via sequences of creates/toggles/deletes) → assert `total`, `completed`, `pending`, `percentage`, and progress bar CSS width all match computed formula
    - Tag: `// Feature: smart-student-study-planner, Property 6`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

  - [ ]* 6.3 Write unit tests for Statistics_Panel
    - Zero tasks: all values 0 and progress bar width `"0%"`
    - One task Pending: total 1, completed 0, pending 1, percentage `"0%"`
    - All tasks Completed: percentage `"100%"` and progress bar `"100%"`
    - Mixed tasks: percentage rounds to nearest whole number
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6_

- [ ] 7. Implement Task_Display
  - [ ] 7.1 Write the `TaskDisplay` module with `render(tasks, filter)`, `showConfirmDialog(taskId, onConfirm, onCancel)`, and `showError(message)` methods; wire to `EventBus.on("tasks:changed", ...)`
    - `render`: clear the task list container, apply `getFilteredTasks(filter)`, sort by `dueDate` ascending (secondary: `createdAt` ascending); for each task create a list entry showing title, subject, due date, and priority badge; apply priority left border (High → 4px solid red, Medium → 4px solid orange, Low → 4px solid green); apply strikethrough + opacity 0.5 for Completed tasks; show empty-state message when filtered list is empty
    - `showConfirmDialog`: render an inline or modal confirmation prompt with Confirm and Cancel actions
    - `showError`: display an error toast/banner with the given message
    - Subscribe to `"storage:error"` to call `showError`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.2, 3.6, 4.1, 4.3, 4.5, 5.6_

  - [ ]* 7.2 Write property test for Task_Display — Property 5: filter correctness
    - **Property 5: Filter correctness — rendered list is exactly the matching subset**
    - Generate any task list + any filter value → call `render` → assert rendered task entries match exactly the set produced by the filter predicate (every matching task present, no non-matching task present)
    - Tag: `// Feature: smart-student-study-planner, Property 5`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.7**

  - [ ]* 7.3 Write unit tests for Task_Display
    - Renders one entry per task in the list
    - Applies correct priority border colour per task
    - Applies strikethrough and opacity 0.5 to Completed tasks
    - Renders empty-state message when task list (or filtered subset) is empty
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 5.6_

- [ ] 8. Implement FormController and FilterController
  - [ ] 8.1 Write the `FormController` — attach a `submit` listener to the task creation form
    - On submit: read title, subject, dueDate, priority values; call `TaskManager.createTask`; on `ValidationError` display an inline error message below the failing field; on success clear the form and reset priority to "Medium"
    - On form open (page load): pre-select priority to "Medium", leave dueDate empty
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 8.2 Write the `FilterController` — manage All / Pending / Completed filter buttons
    - On page load: read active filter from `sessionStorage["studyPlannerFilter"]`; default to "All" if absent; apply visually distinct state (filled background) to active button
    - On filter button click: update active filter, write to `sessionStorage["studyPlannerFilter"]`, update button visual states, call `TaskDisplay.render` with new filter
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8_

  - [ ] 8.3 Attach task action event listeners (completion toggle and delete button) to the task list container via event delegation
    - Completion toggle: call `TaskManager.toggleCompletion(taskId)` → EventBus emits `"tasks:changed"` → `TaskDisplay.render` and `StatisticsPanel.update` re-run
    - Delete button: call `TaskDisplay.showConfirmDialog(taskId, onConfirm, onCancel)` → on confirm call `TaskManager.deleteTask(taskId)` → on cancel dismiss prompt
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 8.4 Write unit tests for FormController and FilterController
    - `FormController` shows inline errors for each invalid field
    - `FormController` clears form and resets priority after successful creation
    - `FilterController` defaults to "All" when sessionStorage is empty
    - `FilterController` restores active filter from sessionStorage on page load
    - `FilterController` applies filled background to active filter button only
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.4, 5.5, 5.8_

- [ ] 9. Wire all modules together in the application initialisation block
  - [ ] 9.1 Add a `DOMContentLoaded` listener that runs the startup sequence:
    1. Call `StorageManager.load()` → pass `tasks` to `TaskManager.initialise(tasks)`
    2. If `warnings` is non-empty, call `TaskDisplay.showError` with the warning message
    3. Call `FilterController.init()` to restore the active filter
    4. Emit `"tasks:changed"` (or directly call `TaskDisplay.render` and `StatisticsPanel.update`) to paint the initial UI
    - _Requirements: 7.2, 7.3, 7.4, 2.1, 2.2, 6.1_

  - [ ]* 9.2 Write integration smoke tests
    - Application initialises without errors when localStorage is empty
    - Application initialises without errors when localStorage contains valid tasks
    - End-to-end task lifecycle: create → toggle complete → delete → verify task list, statistics, and localStorage state are consistent at each step
    - _Requirements: 7.2, 7.3, 3.1, 3.3, 3.4, 4.2, 4.4, 6.2_

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- All modules are implemented as plain JS objects or IIFEs inside `<script>` tags (or as `.js` files loaded via `<script src="...">`) — no bundler required
- Property-based tests use **fast-check** (`npm install --save-dev fast-check`); unit tests use **Vitest** or **Jest** with a localStorage mock (`jest-localstorage-mock` or equivalent)
- Each property test is tagged with `// Feature: smart-student-study-planner, Property N` for traceability
- Each task references specific requirements for full traceability to requirements.md
- Checkpoints at Tasks 5 and 10 ensure incremental validation before integration

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "8.1", "8.2"] },
    { "id": 6, "tasks": ["8.3", "8.4"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["9.2"] }
  ]
}
```
