---
phase: 02-invite-flow
plan: 01
subsystem: invite-backend
tags: [schema, server-actions, queries, unit-tests, drizzle, nanoid]
dependency_graph:
  requires: []
  provides: [invite-token-schema, generateInvite-action, acceptInvite-action, getInviteByToken-query, getExpiredInvitePreview-query]
  affects: [02-02-invite-ui]
tech_stack:
  added: [nanoid]
  patterns: [atomic-update-returning, vi-hoisted-mocking, per-file-vitest-environment]
key_files:
  created:
    - src/lib/actions/invite.ts
    - src/lib/queries/invite.ts
    - src/db/migrations/0001_outstanding_thaddeus_ross.sql
    - tests/invite/helpers.ts
    - tests/invite/generate-invite.test.ts
    - tests/invite/accept-invite.test.ts
  modified:
    - src/db/schema.ts
decisions:
  - "Atomic token consumption uses update().where(isNull(usedAt) AND gt(expiresAt, now())).returning() — single-query race-condition-safe pattern"
  - "Per-file @vitest-environment node annotation used to avoid jsdom CSS ESM conflict without touching global vitest config"
  - "vi.hoisted() used for mock factory functions to satisfy Vitest's vi.mock() hoisting requirement"
  - "userRelations extended with createdInvites using relationName to disambiguate the two user FK references on invites table"
metrics:
  duration: 4min
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_changed: 7
---

# Phase 02 Plan 01: Invite Backend Summary

Invite token lifecycle backend: schema, server actions, queries, and passing unit tests for the atomic single-use invite flow.

## What Was Built

### Schema (src/db/schema.ts)

Added `invites` pgTable with columns: `id`, `hiveId` (FK hives), `token` (unique), `createdBy` (FK user), `expiresAt`, `usedAt` (nullable), `usedBy` (nullable FK user), `createdAt`. Added `invitesRelations` with named relation for the `createdBy` FK to resolve disambiguation. Updated `hivesRelations` to include `invites: many(invites)` and `userRelations` to include `createdInvites`.

Migration generated: `0001_outstanding_thaddeus_ross.sql`.

### Server Actions (src/lib/actions/invite.ts)

**`generateInvite(hiveId)`:** Queen-gated via `requireQueen`. Expires all prior active (unused) tokens for the same Hive by setting `expiresAt = now()`. Creates a new `nanoid(32)` token with 24-hour expiry. Returns the token string.

**`acceptInvite(token, userId)`:** Atomically marks the invite as used via `update().where(isNull(usedAt) AND gt(expiresAt, now())).returning()`. If `returning()` yields an empty array (token was used or expired), throws "already been used or has expired". On success, inserts a `hive_members` row with `role: "bee"` and calls `revalidatePath`.

### Queries (src/lib/queries/invite.ts)

**`getInviteByToken(token)`:** Returns `{ id, hiveId, hiveName, queenName, expiresAt, token }` for valid (unused, unexpired) tokens via 4-table join. Returns `null` for invalid tokens.

**`getExpiredInvitePreview(token)`:** Returns `{ hiveName, queenName }` for ANY token state including expired and used — omits the `isNull(usedAt)` and `gt(expiresAt, now())` filters. Returns `null` only for nonexistent tokens. Supports the D-11 expired-link UX ("Ask [Queen name] of [Hive name] for a new link").

### Unit Tests (tests/invite/)

- `helpers.ts`: `mockSession()` and `createMockDb()` shared factories
- `generate-invite.test.ts`: 5 tests — token length, requireQueen called, db.update for invalidation, db.insert with correct args including 24h expiry, Forbidden propagation
- `accept-invite.test.ts`: 5 tests — valid consumption returns hiveId, revalidatePath called, used token throws, expired token throws, no hive_members insert on failure

All 10 tests pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed plan's buggy `generateInvite` template**
- **Found during:** Task 1 implementation
- **Issue:** Plan's code sample at line 212 used `session.user.id` before destructuring `session` from `requireQueen`
- **Fix:** Used the corrected pattern already noted in the plan itself (lines 249-252): `const { session } = await requireQueen(hiveId)` before referencing `session.user.id`
- **Files modified:** src/lib/actions/invite.ts

**2. [Rule 2 - Missing critical functionality] Added named relation for invites.createdBy FK**
- **Found during:** Task 1 implementation
- **Issue:** The `invites` table has two FK references to `user` (createdBy and usedBy). Drizzle relations require disambiguation via `relationName` when a table has multiple FKs to the same target
- **Fix:** Added `relationName: "inviteCreator"` to both `userRelations.createdInvites` and `invitesRelations.creator`
- **Files modified:** src/db/schema.ts

**3. [Rule 3 - Blocking] Fixed jsdom CSS ESM conflict blocking test execution**
- **Found during:** Task 2 test run
- **Issue:** Global `jsdom` vitest environment loads CSS tooling (`@csstools/css-calc`) that uses ESM-only modules, causing `ERR_REQUIRE_ESM` when running unit tests
- **Fix:** Added `// @vitest-environment node` per-file annotation to both test files; these are pure unit tests with no DOM dependency
- **Files modified:** tests/invite/generate-invite.test.ts, tests/invite/accept-invite.test.ts

**4. [Rule 3 - Blocking] Used vi.hoisted() for mock factory functions**
- **Found during:** Task 2 test run
- **Issue:** Vitest hoists `vi.mock()` calls before variable declarations, so referencing outer `const` variables inside mock factories causes `ReferenceError: Cannot access before initialization`
- **Fix:** Wrapped all mock function declarations in `vi.hoisted()` to ensure they're available when mock factories execute
- **Files modified:** tests/invite/generate-invite.test.ts, tests/invite/accept-invite.test.ts

## Commits

| Hash | Message |
|------|---------|
| cf45784 | feat(02-01): add invites table, generateInvite/acceptInvite actions, and query functions |
| 50dbf42 | test(02-01): add unit tests for generateInvite and acceptInvite |

## Known Stubs

None. All functions are fully implemented and tested.

## Self-Check: PASSED

All files found. Both commits verified. 10/10 tests passing.
