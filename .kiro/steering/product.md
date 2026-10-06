# Product: Smart Student Study Planner

## Overview

Smart Student Study Planner is a browser-based single-page application that helps students organise their study tasks and track completion progress. It requires no backend, no login, and no network connection — everything runs in the browser with data persisted in `localStorage`.

## Target Users

Students who need a lightweight, distraction-free tool to create, track, and manage study tasks across subjects.

## Core Features

### Task Creation (Requirements 1.x)
- Users fill in a form with four required fields: **Title** (1–100 chars), **Subject** (1–50 chars), **Due Date** (today or future), and **Priority** (Low / Medium / High).
- Priority defaults to **Medium**; the due date field starts empty.
- Validation is fail-fast: the first failing field gets an inline error message; the form does not submit until all fields are valid.
- On success the form resets with priority back to Medium.

### Task Display (Requirements 2.x)
- Tasks are listed sorted by **due date ascending**, with `createdAt` as the tiebreaker.
- Each task card shows: title, priority badge (colour-coded), subject, and due date.
- Completed tasks are rendered with strikethrough and reduced opacity.
- An empty-state message is shown when the list is empty or the active filter returns no results.

### Task Completion Toggle (Requirements 3.x)
- A **Complete / Undo** button on each task card toggles status between `Pending` and `Completed`.
- The toggle is reflected immediately in the UI and persisted to `localStorage`.
- If the storage write fails, the in-memory mutation is kept and an error toast is shown.

### Task Deletion (Requirements 4.x)
- Clicking **Delete** opens a modal confirmation dialog before the task is removed.
- The dialog can be dismissed with the Cancel button, clicking the backdrop, or pressing Escape.
- If the storage write fails after deletion, the task is **rolled back** to the array and an error toast is shown.

### Filtering (Requirements 5.x)
- Three filter buttons — **All**, **Pending**, **Completed** — filter the displayed list without affecting stored data.
- The active filter is persisted to `sessionStorage` and restored on page reload.
- Filter buttons use `aria-pressed` to communicate state to assistive technologies.

### Statistics Panel (Requirements 6.x)
- Always-visible panel showing: **Total**, **Completed**, **Pending**, and **% Complete** counters.
- A progress bar animates to reflect the current completion percentage.
- All counters update reactively whenever the task list changes.

### Persistence (Requirements 7.x)
- The full task array is written to `localStorage` under the key `studyPlannerTasks` after every mutation.
- On load, malformed task objects (missing required fields) are discarded with a warning toast, not silently ignored.
- Invalid JSON or a missing key produces an empty list with no error.

## Non-Goals

- No user accounts, authentication, or server-side storage.
- No editing of existing tasks (creation and deletion only).
- No due-date reminders or notifications beyond the UI.
- No multi-device sync.
