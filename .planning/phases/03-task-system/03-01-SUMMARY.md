---
phase: 03-task-system
plan: 01
subsystem: task-data-layer
tags: [schema, server-actions, drizzle, tdd, transactions]
dependency_graph:
  requires:
    - 02-02 (hiveMembers table and requireQueen helper)
  provides:
    - tasks table with taskStatusEnum
    - createTask, updateTaskStatus, deleteTask server actions
    - getTasksForHive query
  affects:
    - 03-02 (UI plan consumes these actions and query)
tech_stack:
  added: []
  patterns:
    - db.transaction() for atomic honey award + task completion
    - requireAssignee helper mirrors requireQueen pattern
    - TDD: RED commit then GREEN commit for server actions
key_files:
  created:
    - src/db/schema.ts (tasks table, taskStatusEnum, indexes, relations)
    - src/db/migrations/0002_amused_smasher.sql
    - src/lib/actions/task.ts (createTask, updateTaskStatus, deleteTask)
    - src/lib/queries/task.ts (getTasksForHive)
    - tests/task/helpers.ts (mockSession, mockMember, mockTask)
    - tests/task/create-task.test.ts (8 test cases)
    - tests/task/update-task-status.test.ts (8 test cases)
  modified:
    - src/db/schema.ts (added tasks table + updated relations)
decisions:
  - taskStatusEnum uses open/in_progress/done — sequential transitions enforced in server action not DB constraint
  - requireAssignee helper pattern mirrors requireQueen for consistent auth guard structure
  - db.transaction() wraps both task status update and honeyCount increment to ensure atomic accounting
  - Migration applied only if DATABASE_URL is available — generated SQL committed to repo
metrics:
  duration: 3 minutes
  completed_date: "2026-04-01"
  tasks_completed: 3
  files_changed: 7
---

# Phase 3 Plan 01: Task System Data Layer Summary

**One-liner:** Tasks schema with taskStatusEnum, sequential transition guards, and atomic honey award via db.transaction.

## What Was Built

The complete backend data layer for Honey_Do's core task lifecycle:

1. **tasks table** — New table in `src/db/schema.ts` with `taskStatusEnum` ("open", "in_progress", "done"), FK to `hiveMembers.id` for assignee, two performance indexes, and full relations.

2. **Server actions** (`src/lib/actions/task.ts`) — Three exported server actions:
   - `createTask`: validates text (1-160 chars), honeyValue (1-100 integer), assigneeId; requires Queen role via `requireQueen`
   - `updateTaskStatus`: enforces sequential transitions (open → in_progress → done only); uses `db.transaction()` to atomically mark task done + increment `hiveMembers.honeyCount` via `sql` template
   - `deleteTask`: requires Queen role, rejects completed tasks

3. **Query layer** (`src/lib/queries/task.ts`) — `getTasksForHive` joins tasks → hiveMembers → user to fetch assignee display name, ordered by createdAt.

4. **Unit tests** — 16 new tests across two files covering all validation, permission, transition, and atomic honey award behaviors.

## Commits

| Hash | Description |
|------|-------------|
| 2dcb3be | feat(03-01): add tasks table schema, taskStatusEnum, indexes, and migration |
| 5041922 | test(03-01): add failing tests for task server actions (RED) |
| 873786d | feat(03-01): implement createTask, updateTaskStatus, deleteTask server actions (GREEN) |
| 4aebb84 | feat(03-01): add getTasksForHive query with assignee name join |

## Test Results

- 40/40 tests passing (24 pre-existing + 16 new)
- 7 test files total

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired. No placeholder values, no hardcoded mock data in production code.

## Self-Check

- [x] src/db/schema.ts exists with taskStatusEnum, tasks table, indexes, relations
- [x] src/db/migrations/0002_amused_smasher.sql generated
- [x] src/lib/actions/task.ts exports createTask, updateTaskStatus, deleteTask
- [x] src/lib/queries/task.ts exports getTasksForHive
- [x] tests/task/helpers.ts, create-task.test.ts, update-task-status.test.ts created
- [x] All 40 tests pass
- [x] Commits 2dcb3be, 5041922, 873786d, 4aebb84 exist
