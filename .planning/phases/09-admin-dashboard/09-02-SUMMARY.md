---
phase: 09-admin-dashboard
plan: 02
subsystem: admin
tags: [admin, drizzle, server-component, table, vitest, tdd]

# Dependency graph
requires:
  - phase: 09-admin-dashboard, plan: 01
    provides: src/lib/admin.ts (isAdminEmail/requireAdmin), (admin) route group layout, placeholder /admin page
provides:
  - listAllUsers() — Drizzle read query returning {id, email, name, createdAt} ordered by createdAt asc
  - listAllHives() — Drizzle read query returning {id, name, createdAt, memberCount} via leftJoin so zero-member hives still appear
  - UsersTable server component — email + name + signup date + disabled "Reset password" button stub for Plan 04
  - HivesTable server component — name + member count + creation date
  - /admin page rendering both tables in parallel via Promise.all
affects:
  - 09-04-reset-action  # will replace the disabled Reset button stub with a client component wired to the server action

# Tech tracking
tech-stack:
  added: []  # no new npm deps — uses existing drizzle-orm + Next.js server components
  patterns:
    - "Read-only Drizzle queries with restricted column projection (T-9-07 information disclosure mitigation)"
    - "leftJoin + count + groupBy for aggregating member counts so zero-member hives still appear"
    - "Server-component table rendering — no client-side state, no hydration cost"
    - "Promise.all for independent server queries on the same page"

key-files:
  created:
    - src/lib/queries/admin.ts
    - src/components/admin/users-table.tsx
    - src/components/admin/hives-table.tsx
    - tests/admin/list-users.test.ts
    - tests/admin/list-hives.test.ts
  modified:
    - src/app/(admin)/admin/page.tsx  # replaces Plan 01's placeholder with the real listings

key-decisions:
  - "Restrict user projection to {id, email, name, createdAt} only — no password hashes, no account columns (T-9-07)"
  - "Use leftJoin + count + groupBy for hive member counts so zero-member hives appear with memberCount: 0"
  - "Reset password button is rendered DISABLED with a 'Wired in Plan 04' title — keeps Plan 04's diff small"
  - "Run listAllUsers and listAllHives in parallel via Promise.all — they share no inputs"

patterns-established:
  - "Admin queries live in src/lib/queries/admin.ts, separate from src/lib/admin.ts (auth primitives)"
  - "Server-component tables render dates with toLocaleDateString({ year, month: 'short', day: 'numeric' }) for readability"

requirements-completed: [ADMIN-01, ADMIN-02]

# Metrics
duration: ~12 min (agent timed out before SUMMARY; orchestrator completed final commit + summary)
completed: 2026-04-24
---

# Phase 9 Plan 2: Admin user and hive listing pages

**Drizzle read queries (`listAllUsers`, `listAllHives`) plus server-component tables (`UsersTable`, `HivesTable`) rendered on `/admin`. Replaces Plan 01's placeholder page with the real listings; lays the visual groundwork for Plan 04's reset action.**

## Performance

- **Duration:** ~12 min (agent + orchestrator finalization)
- **Tasks:** 2 (both `type="auto"`; Task 1 was TDD with RED+GREEN commits)
- **Files created:** 5
- **Files modified:** 1

## Accomplishments

- `src/lib/queries/admin.ts` exports `listAllUsers()` and `listAllHives()` — minimal projections, ordered by `createdAt` ascending for predictable scanning.
- `UsersTable` server component renders email, name, signup date, plus a disabled "Reset password" button per row stubbed for Plan 04.
- `HivesTable` server component renders hive name, member count, and creation date — uses left-join semantics so zero-member hives still appear.
- `/admin` page now runs both queries in parallel via `Promise.all` and renders both tables.
- 11 new Vitest cases passing (`tests/admin/list-users.test.ts` + `tests/admin/list-hives.test.ts`); 22 admin tests total pass when combined with Plan 01's 11.

## Task Commits

1. **Task 1 RED: Failing tests for listAllUsers + listAllHives** — `56b4fbd` (test)
2. **Task 1 GREEN: listAllUsers + listAllHives implementation** — `b7f5244` (feat)
3. **Task 2: Render UsersTable + HivesTable on /admin** — `5f5d0e0` (feat)

## Files Created/Modified

- `src/lib/queries/admin.ts` — `listAllUsers()` selects `{id, email, name, createdAt}` from `user`, ordered ascending. `listAllHives()` left-joins `hiveMembers` on `hives.id`, aggregates `count(hiveMembers.id)`, groups by `hives.id, hives.name, hives.createdAt`, ordered ascending.
- `src/components/admin/users-table.tsx` — server component (no `"use client"`); renders the projected user fields plus a disabled `<Button variant="secondary" size="sm" disabled title="Wired in Plan 04">Reset password</Button>` per row.
- `src/components/admin/hives-table.tsx` — server component; renders projected hive fields + member count.
- `src/app/(admin)/admin/page.tsx` — async server component; runs both queries in parallel via `Promise.all`; renders `<UsersTable users={users} />` and `<HivesTable hives={hivesList} />` in stacked sections.
- `tests/admin/list-users.test.ts` — Vitest cases covering projection, ordering, and result shape.
- `tests/admin/list-hives.test.ts` — Vitest cases covering left-join semantics (zero-member hives appear), member-count aggregation, and ordering.

## Decisions Made

- **Restricted user projection.** Returning only `{id, email, name, createdAt}` from `listAllUsers` mitigates T-9-07 (information disclosure) — no password hashes, no account-table columns, no extra metadata.
- **Left-join for hive member counts.** Using `leftJoin` + `count(hiveMembers.id)` + `groupBy` ensures zero-member hives still appear in the listing (with `memberCount: 0`). An inner join would silently drop them.
- **Disabled Reset button stub.** Rendering the button now (disabled, with a `title="Wired in Plan 04"` hint) keeps Plan 04's diff small — Plan 04 only needs to wrap the button in a client interactive component, not restructure the table.
- **Parallel query execution.** `Promise.all([listAllUsers(), listAllHives()])` since the queries share no inputs and don't depend on each other — no need to serialize.

## Deviations from Plan

None — implementation followed the plan exactly. The agent's stream timed out after Task 2 was wired up but before the final commit + SUMMARY were written; the orchestrator finalized the commit and authored this SUMMARY using the agent's untracked working-tree state.

## Issues Encountered

**Agent stream timeout.** The executor agent committed Tasks 1 RED + Task 1 GREEN, then completed all of Task 2's working-tree edits (components written, page rewired, tests passing) but timed out before staging, committing, or writing SUMMARY.md. The orchestrator inspected the worktree state, verified `npm test -- tests/admin/ --run` passed (22/22), committed Task 2, and wrote this SUMMARY.

No code rework was required — all Task 2 logic was already in place and correct.

## Self-Check: PASSED

**Files verified exist on disk:**
- `src/lib/queries/admin.ts` — FOUND
- `src/components/admin/users-table.tsx` — FOUND
- `src/components/admin/hives-table.tsx` — FOUND
- `src/app/(admin)/admin/page.tsx` — MODIFIED to render both tables
- `tests/admin/list-users.test.ts` — FOUND
- `tests/admin/list-hives.test.ts` — FOUND

**Commits verified in git log:**
- `56b4fbd` (test RED for queries) — FOUND
- `b7f5244` (feat GREEN for queries) — FOUND
- `5f5d0e0` (feat for tables + page) — FOUND

**Test suite:** `npm test -- tests/admin/ --run` → 22/22 passing (11 from Plan 01 + 11 from Plan 02).

---
*Phase: 09-admin-dashboard*
*Completed: 2026-04-24*
