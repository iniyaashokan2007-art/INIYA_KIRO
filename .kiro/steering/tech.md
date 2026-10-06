# Tech Stack: Smart Student Study Planner

## Runtime Environment

- **Browser-only** single-page application — no Node.js server, no build step, no bundler.
- Entry point: `index.html` loads `src/app.js` as a native ES module (`type="module"`).
- All inter-module communication uses named ES module `import`/`export`; no CommonJS.

## Languages & Standards

- **HTML5** — semantic elements (`<header>`, `<main>`, `<section>`, `<form>`, `<ul>`) with full ARIA attributes.
- **CSS** — plain CSS inside a `<style>` block in `index.html`; CSS custom properties (variables) for the design token system; responsive via `@media` breakpoints (≤767 px, 768–1023 px, ≥1024 px).
- **JavaScript (ES2020+)** — vanilla JS with no runtime dependencies; uses `crypto.randomUUID()`, optional chaining, and native ES modules.

## Package Manager & Tooling

- **npm** — used only for dev dependencies.
- **Vitest** (`^1.6.0`) — test runner for the unit and integration test suite.
  - Run all tests once: `npm test` (aliased to `vitest run --reporter=verbose`).
  - Never run `vitest` in watch mode in automated contexts; use `--run` for single-pass execution.

## Persistence

- **`localStorage`** — stores the serialised task array under the key `studyPlannerTasks`.
- **`sessionStorage`** — stores the active filter value under the key `studyPlannerFilter`.
- All storage access is wrapped in try/catch; failures surface through the EventBus as `storage:error` events.

## Architecture Patterns

### Module Responsibilities (Single Responsibility)
Each `src/*.js` file owns one concern:

| Module | Responsibility |
|---|---|
| `eventBus.js` | Pub/sub dispatcher; inter-module communication |
| `taskManager.js` | In-memory task state; CRUD operations; validation |
| `storageManager.js` | `localStorage` serialise/deserialise |
| `taskDisplay.js` | DOM rendering: task list, confirm dialog, error toast |
| `statisticsPanel.js` | Statistics counters and progress bar DOM updates |
| `formController.js` | Form wiring, field validation display, form reset |
| `filterController.js` | Filter button state, `sessionStorage` persistence |
| `app.js` | Startup sequence; event delegation for task actions |

### Event-Driven Communication
- Modules communicate via `EventBus`, not direct imports of each other.
- Two events are in use:
  - `tasks:changed` — payload: shallow-copied task array; triggers re-render and statistics update.
  - `storage:error` — payload: error message string; triggers error toast.
- `EventBus.onPermanent` is used for handlers registered at module-load time (e.g. `StatisticsPanel`) so they survive test-suite `handlers = {}` resets.

### Validation Pattern
- `TaskManager.createTask` returns either a plain task object or a `ValidationError` object `{ isValidationError: true, field, message }`.
- Validation is **fail-fast**: returns on the first failing field.
- `FormController` reads `isValidationError` and maps `field` → DOM error element.

### Security
- All user-supplied strings are HTML-escaped via `escapeHtml()` before insertion into the DOM (prevents XSS).
- `data-action` / `data-task-id` attributes drive event delegation in `app.js` — never `innerHTML` with raw user data for functional logic.

## Accessibility Standards

- All interactive elements meet a **44 × 44 px** minimum touch target size.
- Focus styles use `outline: 3px solid #0056b3` on `:focus-visible`.
- Buttons carry descriptive `aria-label` attributes.
- Filter buttons use `role="group"` + `aria-pressed`.
- The task list uses `aria-live="polite"` for dynamic updates.
- The error toast uses `role="alert"` + `aria-live="assertive"`.
- The progress bar uses `role="progressbar"` with `aria-valuenow/min/max`.
- The confirmation dialog uses `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.

## CSS Design Tokens

All colours, spacing, and radii are defined as CSS custom properties in `:root` (inside `index.html`). Prefer referencing `var(--token-name)` in new CSS rather than hardcoding values.

Key tokens:

| Token | Value |
|---|---|
| `--color-primary` | `#0056b3` |
| `--color-error` | `#c0392b` |
| `--color-priority-high` | `#c0392b` |
| `--color-priority-medium` | `#e67e22` |
| `--color-priority-low` | `#1a7a3f` |
| `--spacing-md` | `16px` |
| `--spacing-lg` | `24px` |
| `--radius` | `8px` |

## Responsive Layout

- **≥1024 px**: two-column grid (`2fr 1fr`) — task panel left, statistics panel right.
- **768–1023 px**: single-column, full-width.
- **≤767 px**: single-column; task panel stacks above statistics panel.
