# Project Structure: Smart Student Study Planner

## Directory Layout

```
smart-student-study-planner/
├── index.html                  # Single HTML file: markup, all CSS, and the module entry-point tag
├── package.json                # npm metadata; defines the "test" script
├── package-lock.json           # Locked dependency tree
│
├── src/                        # All application source modules (ES modules)
│   ├── app.js                  # Entry point — startup sequence, event delegation
│   ├── eventBus.js             # Pub/sub dispatcher
│   ├── taskManager.js          # In-memory task state; CRUD + validation
│   ├── storageManager.js       # localStorage read/write
│   ├── taskDisplay.js          # DOM rendering: list, confirm dialog, error toast
│   ├── statisticsPanel.js      # Statistics counters + progress bar
│   ├── formController.js       # Form wiring, inline error display, form reset
│   └── filterController.js     # Filter buttons + sessionStorage persistence
│
└── tests/                      # Vitest test suite
    ├── checkpoint1.test.js     # Smoke tests for core requirements
    ├── controllers.test.js     # FormController + FilterController unit tests
    ├── integration.test.js     # End-to-end flow tests
    ├── statisticsPanel.test.js # StatisticsPanel unit tests
    └── taskDisplay.test.js     # TaskDisplay unit tests
```

## File Placement Rules

- **Application source** belongs in `src/`. One module per file; one clear responsibility per module.
- **Tests** belong in `tests/`. Test files are named `<scope>.test.js`.
- **Styles** live in the `<style>` block inside `index.html` — no separate CSS files.
- **No build output directory** — the project has no bundler, so there is no `dist/` or `build/` folder.
- **No `src/` subdirectories** — the source is intentionally flat; do not introduce nested folders unless the module count grows substantially.

## Module Dependency Graph

```
index.html
  └── src/app.js
        ├── eventBus.js          (no dependencies)
        ├── storageManager.js    (no dependencies)
        ├── taskManager.js       ← eventBus, storageManager
        ├── taskDisplay.js       ← eventBus
        ├── statisticsPanel.js   ← eventBus
        ├── formController.js    ← taskManager
        └── filterController.js  ← taskDisplay, taskManager
```

`eventBus.js` and `storageManager.js` are leaf modules — they import nothing from `src/`.
All other modules import `eventBus.js`; none of them import `app.js`.

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Source files | camelCase | `taskManager.js` |
| Test files | camelCase + `.test.js` | `taskDisplay.test.js` |
| Exported default objects | PascalCase singleton | `TaskManager`, `EventBus` |
| Private methods/properties | `_` prefix | `_activeFilter`, `_handleSubmit` |
| CSS IDs (DOM targets) | kebab-case | `task-list`, `stat-total` |
| CSS classes | kebab-case | `task-item`, `btn-delete` |
| `localStorage` key | camelCase string | `studyPlannerTasks` |
| `sessionStorage` key | camelCase string | `studyPlannerFilter` |
| EventBus event names | `noun:verb` | `tasks:changed`, `storage:error` |

## Key DOM IDs

These IDs are referenced by JavaScript and must not be renamed without updating the corresponding module.

| ID | Owner module | Purpose |
|---|---|---|
| `task-form` | `formController.js` | Task creation form |
| `task-title` | `formController.js` | Title input |
| `task-subject` | `formController.js` | Subject input |
| `task-due-date` | `formController.js` | Due date input |
| `task-priority` | `formController.js` | Priority select |
| `error-title` | `formController.js` | Inline title error span |
| `error-subject` | `formController.js` | Inline subject error span |
| `error-due-date` | `formController.js` | Inline due date error span |
| `error-priority` | `formController.js` | Inline priority error span |
| `task-list` | `taskDisplay.js` | `<ul>` that receives rendered task `<li>` elements |
| `filter-all` | `filterController.js` | "All" filter button |
| `filter-pending` | `filterController.js` | "Pending" filter button |
| `filter-completed` | `filterController.js` | "Completed" filter button |
| `stat-total` | `statisticsPanel.js` | Total task count display |
| `stat-completed` | `statisticsPanel.js` | Completed count display |
| `stat-pending` | `statisticsPanel.js` | Pending count display |
| `stat-percentage` | `statisticsPanel.js` | Percentage display |
| `progress-display` | `statisticsPanel.js` | Progress header label |
| `progress-bar-fill` | `statisticsPanel.js` | Progress bar fill element |
| `error-toast` | `taskDisplay.js` | Fixed-position error toast |

## Task Object Shape

Every task stored in `localStorage` and held in memory must conform to this shape:

```js
{
  id:        string,   // crypto.randomUUID()
  title:     string,   // trimmed, 1–100 chars
  subject:   string,   // trimmed, 1–50 chars
  dueDate:   string,   // "YYYY-MM-DD"
  priority:  "Low" | "Medium" | "High",
  status:    "Pending" | "Completed",
  createdAt: string,   // ISO 8601 timestamp
}
```

`StorageManager.load()` discards any object missing one of these six required fields: `id`, `title`, `subject`, `dueDate`, `priority`, `status`.

## Adding New Features — Checklist

1. **Does it touch task state?** → extend `TaskManager`. Return a `ValidationError` object (not a thrown exception) for invalid input.
2. **Does it need to react to task changes?** → subscribe to `tasks:changed` via `EventBus.on` (or `onPermanent` if registering at module-load time).
3. **Does it render to the DOM?** → add the markup to `index.html` and the rendering logic to the appropriate controller or display module.
4. **Does it need new styles?** → add CSS custom properties to `:root` if introducing new design tokens; add rules to the `<style>` block in `index.html`.
5. **Does it persist data?** → route through `StorageManager.save()` and handle `{ ok: false }` by emitting `storage:error`.
6. **Does it need tests?** → add a `tests/<scope>.test.js` file and run `npm test` to verify.
