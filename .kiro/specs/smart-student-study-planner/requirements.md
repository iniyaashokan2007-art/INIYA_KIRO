# Requirements Document

## Introduction

The Smart Student Study Planner is a browser-based web application designed for college students to manage their daily study tasks. The application enables students to create, track, and complete study tasks, filter them by status, and view progress statistics — all without requiring a backend or internet connection. Task data persists across page refreshes using browser localStorage. The application targets a clean, responsive interface suitable for both desktop and mobile use.

---

## Glossary

- **Study_Planner**: The complete web application being described in this document.
- **Task**: A single study item created by the user, consisting of a title, subject, priority, due date, and completion status.
- **Dashboard**: The main view of the application displaying all tasks and progress statistics.
- **Task_Form**: The UI component that collects input from the user to create a new task.
- **Task_List**: The UI component that renders all tasks matching the current filter.
- **Filter**: A selection control that limits the Task_List to show All, Pending, or Completed tasks.
- **Progress_Bar**: A visual indicator showing the percentage of completed tasks.
- **Statistics_Panel**: The UI component displaying total, completed, pending, and completion percentage values.
- **Storage_Manager**: The module responsible for reading and writing task data to browser localStorage.
- **Task_Manager**: The module responsible for creating, updating, and deleting tasks in memory.
- **Task_Display**: The module responsible for rendering the task list and empty states in the UI.
- **UI_Layout**: The responsive layout system governing panel arrangement and accessibility.
- **Priority**: A categorical ranking of task urgency — Low, Medium, or High.
- **Completion_Status**: A boolean state of a task — either Pending or Completed.

---

## Requirements

### Requirement 1: Add a Study Task

**User Story:** As a college student, I want to add a new study task with relevant details, so that I can keep track of what I need to study and when.

#### Acceptance Criteria

1. WHEN the user submits the task creation form, THE Task_Manager SHALL create a new task record containing a title (1–100 characters), a subject (1–50 characters), a due date, and a priority level selected from the values Low, Medium, or High.
2. WHEN the user opens the task creation form, THE Task_Manager SHALL display the priority field pre-selected to Medium and the due date field empty with no default value.
3. IF the user submits the task creation form with the title field empty or exceeding 100 characters, THEN THE Task_Manager SHALL reject the submission and display an error message indicating the title requirement.
4. IF the user submits the task creation form with the subject field empty or exceeding 50 characters, THEN THE Task_Manager SHALL reject the submission and display an error message indicating the subject requirement.
5. IF the user submits the task creation form with the due date field empty, THEN THE Task_Manager SHALL reject the submission and display an error message indicating that a due date is required.
6. IF the user submits the task creation form with a due date earlier than the current calendar date, THEN THE Task_Manager SHALL reject the submission and display an error message indicating that the due date must be today or a future date.
7. IF the user submits the task creation form with no priority level selected, THEN THE Task_Manager SHALL reject the submission and display an error message indicating that a priority level is required.
8. WHEN THE Task_Manager successfully creates a task, THE Task_Manager SHALL assign the task a status of Pending and add it to the task list within 500 milliseconds.

---

### Requirement 2: Display Tasks on the Dashboard

**User Story:** As a college student, I want to see all my study tasks displayed on a dashboard, so that I have a clear overview of my workload.

#### Acceptance Criteria

1. WHEN the user navigates to the task list view, THE Task_Display SHALL render one list entry per task stored in the task list, showing the title, subject, due date, and priority level for each task.
2. WHEN the user navigates to the task list view, THE Task_Display SHALL apply a default filter of All and a default sort order of Due Date Ascending.
3. WHILE the task list contains at least one task with status Completed, THE Task_Display SHALL render that task's list entry with a strikethrough applied to the title text and an opacity of 0.5.
4. WHILE the task list contains at least one task with priority level High, THE Task_Display SHALL render that task's list entry with a solid red left border of width 4px.
5. WHILE the task list contains at least one task with priority level Medium, THE Task_Display SHALL render that task's list entry with a solid orange left border of width 4px.
6. WHILE the task list contains at least one task with priority level Low, THE Task_Display SHALL render that task's list entry with a solid green left border of width 4px.
7. WHEN the task list contains no tasks, THE Task_Display SHALL render an empty-state message in place of the list indicating that no tasks have been created.

---

### Requirement 3: Mark a Task as Completed

**User Story:** As a college student, I want to mark a study task as completed, so that I can track my progress through my study list.

#### Acceptance Criteria

1. WHEN the user activates the completion toggle on a Pending task, THE Task_Manager SHALL update that task's status to Completed within 500 milliseconds.
2. WHEN the user activates the completion toggle on a Pending task, THE Task_Display SHALL apply a strikethrough to the task title and set the entry opacity to 0.5 within 500 milliseconds of the status change.
3. WHEN THE Task_Manager updates a task's status to Completed, THE Statistics_Panel SHALL recalculate and display the updated completion count and percentage within 500 milliseconds.
4. WHEN THE Task_Manager updates a task's status to Completed, THE Storage_Manager SHALL persist the updated task list to localStorage within 500 milliseconds.
5. WHEN the user activates the completion toggle on a Completed task, THE Task_Manager SHALL update that task's status to Pending within 500 milliseconds, and THE Task_Display SHALL remove the strikethrough and restore the entry opacity to 1.0, and THE Statistics_Panel SHALL recalculate and display the updated completion count and percentage, and THE Storage_Manager SHALL persist the updated task list to localStorage.
6. IF THE Storage_Manager fails to persist the task status change to localStorage, THEN THE Task_Manager SHALL retain the updated status in memory for the current session and display an error message indicating that the change could not be saved.

---

### Requirement 4: Delete a Task

**User Story:** As a college student, I want to delete a task I no longer need, so that my task list stays relevant and uncluttered.

#### Acceptance Criteria

1. WHEN the user activates the delete control on a task, THE Task_Display SHALL present a confirmation prompt asking the user to confirm or cancel the deletion before any data is removed.
2. WHEN the user confirms the deletion prompt, THE Task_Manager SHALL remove the task from the task list within 500 milliseconds and THE Task_Display SHALL remove the corresponding list entry within 500 milliseconds.
3. WHEN the user cancels the deletion prompt, THE Task_Manager SHALL retain the task unchanged and THE Task_Display SHALL dismiss the confirmation prompt without modifying the task list.
4. WHEN THE Task_Manager removes a task, THE Storage_Manager SHALL persist the updated task list to localStorage within 500 milliseconds.
5. IF THE Storage_Manager fails to persist the deletion to localStorage, THEN THE Task_Manager SHALL restore the deleted task to the in-memory task list and THE Task_Display SHALL restore the task's list entry and display an error message indicating that the deletion could not be saved.
6. WHEN THE Task_Manager removes a task, THE Statistics_Panel SHALL recalculate and display the updated task count and completion percentage within 500 milliseconds.

---

### Requirement 5: Filter Tasks by Status

**User Story:** As a college student, I want to filter my tasks by status, so that I can focus on only the tasks that are relevant to my current context.

#### Acceptance Criteria

1. WHEN the user selects the All filter option, THE Task_Display SHALL render all tasks regardless of status.
2. WHEN the user selects the Pending filter option, THE Task_Display SHALL render only tasks whose status is Pending.
3. WHEN the user selects the Completed filter option, THE Task_Display SHALL render only tasks whose status is Completed.
4. WHEN the user navigates to the task list view, THE Task_Display SHALL apply the All filter as the default active filter.
5. WHILE a filter is active, THE Task_Display SHALL render the selected filter control in a visually distinct state compared to the unselected filter controls by applying a filled background to the selected control and no fill to the unselected controls.
6. WHEN the active filter is Pending or Completed and no tasks match that status, THE Task_Display SHALL render an empty-state message in place of the task list indicating that no tasks match the selected filter.
7. WHEN a task's status changes while the Pending or Completed filter is active and the task no longer matches that filter, THE Task_Display SHALL remove that task's list entry from the visible list within 500 milliseconds of the status change.
8. WHEN the user navigates away from the task list view and then returns, THE Task_Display SHALL restore the filter that was active at the time of navigation.

---

### Requirement 6: Display Progress Statistics

**User Story:** As a college student, I want to see simple statistics about my study tasks, so that I can quickly understand how much work I have completed and how much remains.

#### Acceptance Criteria

1. WHEN the user navigates to the statistics view, THE Statistics_Panel SHALL display the total number of tasks, the number of completed tasks, the number of pending tasks, and the completion percentage rounded to the nearest whole number.
2. WHEN THE Task_Manager creates, deletes, or updates any task, THE Statistics_Panel SHALL recalculate all displayed statistics within 500 milliseconds.
3. WHEN the task list contains zero tasks, THE Statistics_Panel SHALL display a total of 0, completed of 0, pending of 0, and a completion percentage of 0%.
4. IF the total task count is zero, THEN THE Statistics_Panel SHALL render the progress bar with zero filled width, with the left edge of the filled region anchored to the left boundary of the bar track and the right edge coinciding with the left boundary of the bar track.
5. IF the completion percentage is greater than 0% and less than 100%, THEN THE Statistics_Panel SHALL render the progress bar with the left edge of the filled region anchored to the left boundary of the bar track and the right edge positioned at the point along the bar track that corresponds to the completion percentage of the total track width.
6. IF the completion percentage is 100%, THEN THE Statistics_Panel SHALL render the progress bar with the filled region spanning the full width of the bar track, with the left edge anchored to the left boundary and the right edge anchored to the right boundary of the bar track.
7. WHEN THE Task_Manager creates, deletes, or updates any task, THE Statistics_Panel SHALL update the progress bar fill position within 500 milliseconds.

---

### Requirement 7: Persist Tasks Using localStorage

**User Story:** As a college student, I want my study tasks to be saved in my browser, so that my task list is still available after I close or refresh the page.

#### Acceptance Criteria

1. WHEN THE Task_Manager creates, updates, or deletes a task, THE Storage_Manager SHALL write the complete current task list to the browser's localStorage under the key `studyPlannerTasks` within 500 milliseconds.
2. WHEN the application initialises, THE Storage_Manager SHALL read the value stored under the key `studyPlannerTasks` from localStorage and load it into the Task_Manager before the task list is rendered.
3. IF the value stored under the key `studyPlannerTasks` in localStorage is absent, null, or not valid JSON, THEN THE Storage_Manager SHALL initialise the task list as an empty array and THE Task_Display SHALL render the empty-state message.
4. IF the value stored under the key `studyPlannerTasks` in localStorage is valid JSON but one or more task objects are missing any of the required fields title, subject, dueDate, priority, or status, THEN THE Storage_Manager SHALL discard only the malformed task objects, load the remaining well-formed tasks into the Task_Manager, and display an error message indicating that some tasks could not be restored.
5. THE Storage_Manager SHALL preserve all field values of each task through a write-then-read cycle such that the value read from localStorage for every field of every task is identical to the value that was written.

---

### Requirement 8: Responsive and Accessible User Interface

**User Story:** As a college student, I want the application to work well on both my laptop and my phone, so that I can manage my tasks from any device.

#### Acceptance Criteria

1. WHEN the user loads the application on a viewport width of 1024 pixels or greater, THE UI_Layout SHALL display the task list panel and the statistics panel side by side in a two-column arrangement, with all interactive controls and text content fully within the viewport boundaries and no content clipped or overflowing.
2. WHEN the user loads the application on a viewport width of 767 pixels or less, THE UI_Layout SHALL stack the task list panel and the statistics panel in a single-column vertical arrangement, with the task list panel above the statistics panel.
3. WHEN the user loads the application on a viewport width between 768 pixels and 1023 pixels inclusive, THE UI_Layout SHALL render all interactive controls and text content fully within the viewport boundaries with no content clipped or overflowing.
4. THE UI_Layout SHALL render all text content at a contrast ratio of at least 4.5:1 between the text colour and its background colour, as defined by the WCAG 2.1 AA success criterion 1.4.3.
5. THE UI_Layout SHALL render all interactive controls at a minimum touch target size of 44×44 pixels.
6. THE UI_Layout SHALL assign each interactive control an ARIA label whose value describes the action that control performs, such that the label is sufficient for a screen reader user to identify the control's purpose without additional context.
7. THE UI_Layout SHALL assign a tab focus order to interactive controls such that pressing the Tab key moves focus through all interactive controls in the sequence they appear in the document from top to bottom and left to right, with no interactive control skipped.
