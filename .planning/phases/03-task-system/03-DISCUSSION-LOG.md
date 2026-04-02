# Phase 3: Task System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 03-task-system
**Areas discussed:** Task creation UX, Honeycomb view, Task lifecycle, Honey value picker

---

## Task Creation UX

### Where should the task creation form live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on dashboard | Compact form, always visible to Queens. No navigation away. | ✓ |
| Modal/dialog | Button opens modal. Clean dashboard but adds dismiss step. | |
| Dedicated page | Full-page form. Most room but heavy for 160-char tasks. | |

**User's choice:** Inline on dashboard

### Can Queens assign tasks to themselves?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes | Queen in assignee dropdown. Supports couples use case. | ✓ |
| No | Queens excluded. Cleaner separation. | |

**User's choice:** Yes

### 160-char counter visibility?

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | "42/160" below input. Twitter/SMS pattern. | ✓ |
| Only near limit | Appears at 120+. Less noise. | |
| You decide | Claude picks. | |

**User's choice:** Always visible

---

## Honeycomb View

### What does the Honeycomb look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Section on dashboard | "Your Honeycomb" + "All Tasks" sections. | ✓ |
| Separate page | /hive/[id]/honeycomb. Dedicated space. | |
| Tabs on dashboard | Tab switcher. Compact but cramped. | |

**User's choice:** Section on dashboard

### How should completed tasks be shown?

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible section | Below active, collapsed by default with count badge. | ✓ |
| Always visible below | Dimmed, always shown. | |
| Separate tab/page | Clean but adds navigation. | |

**User's choice:** Collapsible section below active tasks

### Can Bees see other members' tasks?

| Option | Description | Selected |
|--------|-------------|----------|
| Everyone sees all | Transparent, social accountability. | ✓ |
| Bees only see own | Queens see everything, Bees see theirs only. | |
| You decide | Claude picks. | |

**User's choice:** Everyone sees all tasks

---

## Task Lifecycle

### Who can mark tasks in progress/done?

| Option | Description | Selected |
|--------|-------------|----------|
| Only the assignee | Respects ownership. Queens can't mark others' tasks. | ✓ |
| Assignee or any Queen | Queens can also update. Useful but micromanaging. | |
| You decide | Claude picks. | |

**User's choice:** Only the assignee

### Can completed tasks be re-opened?

| Option | Description | Selected |
|--------|-------------|----------|
| No — done is done | Honeys awarded permanently. Create new task if needed. | ✓ |
| Yes — Queen can re-open | Honeys revoked. More flexible but complex. | |
| You decide | Claude picks. | |

**User's choice:** No — done is done

### Can Queens delete tasks?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — open/in-progress | No honeys awarded for deleted tasks. | ✓ |
| No — tasks permanent | Once created, stay forever. | |
| You decide | Claude picks. | |

**User's choice:** Yes — Queen can delete open/in-progress tasks

---

## Honey Value Picker

### How should the picker work?

| Option | Description | Selected |
|--------|-------------|----------|
| Quick-select + custom | Buttons (5, 10, 20) + "Custom" reveals number input. | ✓ |
| Dropdown + custom | Select dropdown with presets. More compact. | |
| Number input only | Just a number field. Simplest. | |

**User's choice:** Quick-select buttons + custom input

### Min/max for custom values?

| Option | Description | Selected |
|--------|-------------|----------|
| Min 1, max 100 | Prevents 0-value and absurd inflation. | ✓ |
| Min 1, no max | Freedom but could break leaderboard. | |
| You decide | Claude picks. | |

**User's choice:** Min 1, max 100

---

## Claude's Discretion

- Database schema design for tasks table
- Task card/row design
- Loading and empty states
- Delete confirmation UX
- Exact inline form layout

## Deferred Ideas

- Dynamic contextual copy — Phase 5
- Task deadlines/due dates — v2
- Recurring tasks — v2
- Task photo proof — v2
- Activity feed — v2
