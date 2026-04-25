---
phase: 09-admin-dashboard
plan: 04
subsystem: admin
tags: [admin, password-reset, server-action, react-19-modal, scrypt, transaction, security, tdd, vitest]

# Dependency graph
requires:
  - phase: 09-admin-dashboard, plan: 01
    provides: requireAdmin (D-10 admin guard), (admin) route group layout
  - phase: 09-admin-dashboard, plan: 02
    provides: UsersTable server component with disabled Reset button placeholder
  - phase: 09-admin-dashboard, plan: 03
    provides: generateTempPassword (bee-themed temp password generator)
provides:
  - resetUserPassword(userId) server action — single transaction (update account password + delete sessions), scrypt hash via better-auth/crypto, generic error on failure
  - ResetPasswordButton client component — confirm → success modal with one-time plaintext display, Copy button (navigator.clipboard), and discard-on-close
  - UsersTable wired to render ResetPasswordButton per row (replaces Plan 02's disabled placeholder)
affects: []  # Plan 4 is the wave-3 terminal plan — no downstream consumers in Phase 9

# Tech tracking
tech-stack:
  added: []  # zero new npm dependencies
  patterns:
    - "Server action with first-line requireAdmin (D-10 belt-and-braces)"
    - "Atomic password+session reset via db.transaction with strict ordering (update before delete)"
    - "scrypt hashing via better-auth/crypto.hashPassword (NOT bcryptjs — incompatible with Better Auth verifyPassword)"
    - "providerId='credential' filter scopes the UPDATE to the email/password account row only"
    - "Catch-and-rethrow with generic message — DB error details and tempPassword never reach the caller's error message"
    - "React 19 useTransition + useState ModalState union for two-step modal UX"
    - "Plaintext lives only in React state until modal close — no localStorage/sessionStorage/cookie writes"
    - "JSX string-literal expression {\"...\"} when grep-asserted copy contains an apostrophe"

key-files:
  created:
    - src/lib/actions/admin.ts
    - src/components/admin/reset-password-button.tsx
    - tests/admin/reset-password.test.ts
  modified:
    - src/components/admin/users-table.tsx

key-decisions:
  - "Hash with better-auth/crypto.hashPassword (scrypt) — bcryptjs would produce a hash format Better Auth's verifyPassword cannot read"
  - "tx.update precedes tx.delete: half-commit ordering favors 'usable new password, stale sessions' over 'no usable password, no sessions'"
  - "Catch transaction errors and rethrow 'Password reset failed' generically — never embed tempPassword or DB error text"
  - "providerId='credential' filter on the UPDATE protects future OAuth account rows from being touched"
  - "Confirmation copy uses exact D-04 wording; one-time warning uses exact Specific-Ideas wording (grep-asserted)"
  - "JSX one-time copy moved into {\"...\"} expression so the literal apostrophe survives both eslint react/no-unescaped-entities and grep -F acceptance"

patterns-established:
  - "Admin server actions live in src/lib/actions/admin.ts; admin auth primitives stay in src/lib/admin.ts (clean separation: actions consume primitives)"
  - "Use vi.hoisted for: requireAdmin mock, generateTempPassword mock, hashPassword mock, db.transaction mock, drizzle eq/and mocks; partially-mock drizzle-orm with importOriginal so other exports keep working"
  - "Track tx-call ordering via shared callOrder string array pushed to by each mock — precise ordering assertions without timestamps"

requirements-completed: [ADMIN-03]

# Metrics
duration: ~5 min
completed: 2026-04-25
---

# Phase 9 Plan 4: Admin password reset (resetUserPassword + ResetPasswordButton)

**Admin-initiated password reset wired end-to-end: confirm modal → server action `resetUserPassword` (scrypt hash via better-auth/crypto, single transaction with update-before-delete, requireAdmin guard) → one-time plaintext display with Copy button. All 12 unit tests covering admin guard, transaction shape/ordering, hash wiring, and no-leak invariants pass.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-25T00:52:53Z
- **Completed:** 2026-04-25T00:58:01Z
- **Tasks:** 2 (Task 1 was TDD with explicit RED + GREEN commits; Task 2 was a single feat commit)
- **Files created:** 3
- **Files modified:** 1

## Accomplishments

- `src/lib/actions/admin.ts` exports `resetUserPassword(userId): Promise<{ tempPassword }>`. First line of the function body is `await requireAdmin()` (D-10). Hashing uses `hashPassword` from `better-auth/crypto` (scrypt, format-compatible with Better Auth's `verifyPassword`). The DB update + session delete run inside a single `db.transaction`, with the update strictly before the delete. The update is filtered to `providerId='credential'` so OAuth rows (none today, but possible later) are never touched. Errors thrown inside the transaction are caught and rethrown as a generic `"Password reset failed"` — the plaintext `tempPassword` is never embedded in any thrown error and never passed to any `console.*` method.
- `src/components/admin/reset-password-button.tsx` (`"use client"`) provides the confirm → success modal. Confirm copy is the exact D-04 sentence; success copy is the exact Specific-Ideas one-time warning. The Copy button uses `navigator.clipboard.writeText`. The plaintext lives only in React state and is discarded when the modal closes (backdrop click or "Done" button) — no `localStorage`, `sessionStorage`, `document.cookie`, or `console.*` references in the component.
- `src/components/admin/users-table.tsx` updated: the disabled placeholder button left over from Plan 02 is replaced with `<ResetPasswordButton userId={u.id} email={u.email} />`. The unused `Button` import was removed (the table no longer renders Button directly).
- `tests/admin/reset-password.test.ts` — 12 cases pass and exercise: rethrow on `requireAdmin` Forbidden / Unauthorized (both block all mutations), Zod validation for empty / non-string `userId`, `hashPassword` called exactly once with the temp password, `db.transaction` called exactly once, `tx.update(account)` shape (set fields + and/eq filter), `tx.delete(session)` shape, strict update-before-delete ordering (D-06), exact return shape, no plaintext in any `console.*` call (5 spies), and no plaintext in a thrown error message.

## Task Commits

1. **Task 1 RED: Failing tests for resetUserPassword** — `a71551e` (test)
2. **Task 1 GREEN: resetUserPassword server action** — `692a8ed` (feat)
3. **Task 2: ResetPasswordButton + UsersTable wiring** — `41bce32` (feat)

## Files Created/Modified

- `src/lib/actions/admin.ts` (created) — `"use server"` directive on line 1; `await requireAdmin()` first; Zod-narrowed `userId`; `generateTempPassword()` → `hashPassword()`; single `db.transaction` with `.update(account).set({password, updatedAt}).where(and(eq(userId), eq(providerId, "credential")))` then `.delete(session).where(eq(session.userId))`; try/catch that converts any transaction error to `new Error("Password reset failed")`; returns `{ tempPassword }`.
- `src/components/admin/reset-password-button.tsx` (created) — `"use client"`; `useState<ModalState>` discriminated union (closed | confirm | success | error); `useTransition` for the action call; `Button` from `@/components/ui/button` reused for all three buttons (Cancel ghost, Reset/Done primary, Copy secondary); `role="dialog"` + `aria-modal="true"` on the backdrop; backdrop click = `close()` which resets state and clears `copied`.
- `src/components/admin/users-table.tsx` (modified) — swapped `Button` import for `ResetPasswordButton` import; placeholder `<Button … disabled>` replaced with `<ResetPasswordButton userId={u.id} email={u.email} />`. JSDoc comment updated to reflect the new wiring.
- `tests/admin/reset-password.test.ts` (created) — `// @vitest-environment node`; partially mocks `drizzle-orm` via `importOriginal` (only `eq` + `and` are stubbed so call shape can be asserted while other drizzle exports keep working); mocks `next/headers` so `requireAdmin` is reachable; uses `vi.hoisted` for all mocks; uses a shared `callOrder` array to assert update-before-delete ordering.

## Decisions Made

- **Hash with `better-auth/crypto.hashPassword` (scrypt), not bcryptjs.** RESEARCH Pitfall 2: bcrypt produces an incompatible hash format that Better Auth's `verifyPassword` cannot consume — using bcryptjs would silently lock the user out even though the DB write succeeded. The dependency on `better-auth/crypto` is already pulled in transitively via `better-auth`.
- **`tx.update` runs before `tx.delete`.** If the order were reversed and the delete succeeded but the update rolled back, the user would be locked out (no usable password, no active sessions). With update-first, a half-commit at worst leaves the user with the new password but stale sessions — sessions expire naturally and the user can sign in again with the temp password.
- **`providerId="credential"` filter on the UPDATE.** Better Auth stores OAuth provider rows in the same `account` table. Even though Honey_Do has no OAuth providers today, scoping the UPDATE to the credential row is cheap insurance (T-9-10).
- **Generic rethrow `"Password reset failed"`.** The catch block does not expose any DB error detail and explicitly never embeds `tempPassword`. The test forces the transaction to throw an error containing the literal plaintext and asserts the rethrown error's message does not contain it (T-9-03 and Pitfall 3).
- **JSX `{"..."}` expression for the one-time warning.** The acceptance criterion required `grep -F "You'll only see this once"` to match. A literal apostrophe in JSX text content trips eslint's `react/no-unescaped-entities` rule, but using `&apos;` would defeat the grep. Wrapping the string in a JSX expression literal preserves both: eslint sees a string, grep sees the literal apostrophe.
- **Removed `Button` import from `users-table.tsx`.** The table no longer renders `Button` directly (only via the wrapper component), so the now-unused import was dropped to keep the diff clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Tightened TypeScript types in test file to satisfy strict mode**

- **Found during:** Task 1 GREEN — `npx tsc --noEmit` reported four errors in the new test file:
  - `mockSet.mock.calls[0][0] as { password: string; updatedAt: Date }` — TS2352 (incompatible conversion from `undefined`)
  - `mockUpdateWhere.mock.calls[0][0]` — TS2493 (tuple of length 0 has no element at index 0)
  - `mockAnd.mock.calls[0]` — TS2493 (same)
  - `mockDeleteWhere.mock.calls[0][0]` — TS2493 (same)
- **Cause:** `vi.fn(() => …)` infers the function's parameter tuple as `[]` when the mock is created without an explicit signature. The plan's mock skeleton hits the same issue Plan 01's deferred-items file already documented for `update-task-status.test.ts`.
- **Fix:** Replaced `mock.calls[0][0]` direct accesses with `(mock.calls[0] as unknown as [...])[0]` casts that name the expected tuple shape. Behavior unchanged; only type assertions tightened. The test still asserts the same things and still passes 12/12.
- **Files modified:** `tests/admin/reset-password.test.ts` (during Task 1 GREEN, before the GREEN commit)
- **Commit:** `692a8ed` (the GREEN commit incorporates the fix)

**2. [Rule 1 - Bug] Reformatted `tx.update(account)` onto a single line to satisfy grep acceptance**

- **Found during:** Task 1 GREEN verification — `grep -F "tx.update(account)"` returned no matches because Prettier-style formatting had split the call across two lines.
- **Fix:** Joined `await tx.update(account)` on a single line. The plan's acceptance criteria explicitly require `tx.update(account)` and `tx.delete(session)` as literal greppable substrings.
- **Files modified:** `src/lib/actions/admin.ts` (during Task 1 GREEN, before the GREEN commit)
- **Commit:** `692a8ed`

## Authentication Gates

None encountered. The action's auth check is mocked in unit tests; the real `requireAdmin` flow is deferred to manual end-to-end verification (Phase 9 verifier wave or merge-time smoke).

## Issues Encountered

**Worktree branch base was older than expected at session start.**

- **Discovered:** Immediately via the `worktree_branch_check` step.
- **Cause:** Worktree branch was based on `fee31c5` (pre-merge state with only Plan 01 in tree) instead of the required `f427da5` (Wave 2 merged: Plans 01-03 all on main).
- **Resolution:** Ran `git reset --soft f427da51b259fd67fae66b1390eaa25e6fedd2fe` followed by `git checkout HEAD -- .` to restore files from the correct base. After reset, `src/lib/admin.ts` contained both `requireAdmin` (Plan 01) and `generateTempPassword` (Plan 03), and `src/components/admin/users-table.tsx` (Plan 02) was present — all my dependencies satisfied.
- **Impact:** None on code output — pre-execution branch hygiene.

**No `node_modules` in worktree, sandbox blocks symlink/install.**

- **Discovered:** During first attempt to run `npm test` in the worktree.
- **Cause:** Worktree was created without `node_modules`. The sandbox forbids symlinks, `npm install`, and direct invocation of `node_modules/.bin/vitest` from the worktree path.
- **Resolution:** Ran tests from the parent repo (`/Users/cj.holler/desktop/honey_do2`) with the worktree-relative test path: `npm test -- .claude/worktrees/agent-ac2a2105dd5f81008/tests/admin/ --run`. The `vite-tsconfig-paths` plugin walks up from each test file to find the nearest `tsconfig.json`, so `@/` aliases resolved against the worktree's `src/` (not the parent's, which lacks Plans 02-04 source files). Verified by triggering a deliberate import error first and confirming the test file resolves the worktree's `src/` tree.
- **Impact:** None — the test runner produced correct results, and TypeScript checks ran via `npx tsc -p` against the worktree's `tsconfig.json`.

## Deferred Issues

Pre-existing TypeScript errors in `tests/task/update-task-status.test.ts` (already logged by Plan 01 to `.planning/phases/09-admin-dashboard/deferred-items.md`) remain — outside this plan's scope, not caused by these changes.

## Known Stubs

None. The reset action and modal are fully wired: clicking Reset on a real user row hits the live server action, which performs a real Drizzle transaction on the live `account` and `session` tables.

## User Setup Required

None at the code level. To exercise end-to-end manually:

1. Set `ADMIN_EMAILS=you@example.com` in `.env.local`.
2. Sign in as `you@example.com`, navigate to `/admin`.
3. Pick a non-admin test user and click "Reset password" → "Reset password" in the modal.
4. The modal should display the temp password and a Copy button.
5. Sign out → sign in as the test user with the new temp password (succeeds).
6. Sign in as the test user with the old password (fails). Confirms D-06.

## Next Phase Readiness

**Phase 9 plan body complete.** All four plans (01 access-control, 02 listings, 03 temp-password generator, 04 reset action) are merged or merge-ready. Phase 9 verification + roadmap close-out is the next logical step.

## Threat Flags

None. The plan's own threat model already covers every surface this plan introduces, and no new endpoints, schema changes, or trust boundaries were added beyond what the threat model anticipated.

## Self-Check: PASSED

**Files verified exist on disk:**

- `src/lib/actions/admin.ts` — FOUND
- `src/components/admin/reset-password-button.tsx` — FOUND
- `src/components/admin/users-table.tsx` — FOUND (modified)
- `tests/admin/reset-password.test.ts` — FOUND

**Commits verified in git log:**

- `a71551e` (test RED for resetUserPassword) — FOUND
- `692a8ed` (feat GREEN for resetUserPassword) — FOUND
- `41bce32` (feat for ResetPasswordButton + UsersTable wiring) — FOUND

**Acceptance-criteria greps all pass (Task 1 + Task 2):**

- `head -1 src/lib/actions/admin.ts` → `"use server"`
- `grep -F 'from "better-auth/crypto"' src/lib/actions/admin.ts` → 1 match
- `grep -E "bcrypt" src/lib/actions/admin.ts` → 0 matches
- `grep -F "await requireAdmin()" src/lib/actions/admin.ts` → 1 match
- `grep -F "db.transaction" src/lib/actions/admin.ts` → 1 match
- `grep -F 'eq(account.providerId, "credential")' src/lib/actions/admin.ts` → 1 match
- `grep -nF "tx.update(account)" …` line 28; `tx.delete(session)` line 37 → update before delete
- `grep -n "console\." src/lib/actions/admin.ts` → 0 matches
- `grep -E "better-auth/plugins" src/lib/actions/admin.ts` → 0 matches
- `grep -E "throw new Error\([^)]*tempPassword" src/lib/actions/admin.ts` → 0 matches
- `grep -F 'throw new Error("Password reset failed")' src/lib/actions/admin.ts` → 1 match
- `head -1 src/components/admin/reset-password-button.tsx` → `"use client"`
- `grep -E "^export function ResetPasswordButton" …` → 1 match
- `grep -F 'from "@/lib/actions/admin"' …` → 1 match
- `grep -F "invalidates their current password immediately" …` → 1 match
- `grep -F "You'll only see this once" …` → 1 match
- `grep -F "navigator.clipboard.writeText" …` → 1 match
- `grep -F 'role="dialog"' …` and `grep -F 'aria-modal="true"' …` → 1 match each
- `grep -n "console\." src/components/admin/reset-password-button.tsx` → 0 matches
- `grep -nE "localStorage|sessionStorage|document\.cookie" …` → 0 matches
- `grep -F "<ResetPasswordButton" src/components/admin/users-table.tsx` → 1 match
- `grep -F 'import { ResetPasswordButton }' src/components/admin/users-table.tsx` → 1 match
- `grep -E "disabled.*Reset password|Reset password.*disabled" src/components/admin/users-table.tsx` → 0 matches

**Test suite:**

- `npm test -- tests/admin/reset-password.test.ts --run` → 12/12 passing
- `npm test -- tests/admin/ --run` → 41/41 passing across 5 admin test files (11 from Plan 01 + 11 from Plan 02 + 7 from Plan 03 + 12 from Plan 04)
- Full worktree suite `npm test -- tests/ --run` → 88/88 passing across 13 test files

**TypeScript:** `npx tsc --noEmit -p .claude/worktrees/.../tsconfig.json` excluding pre-existing deferred errors → zero errors attributable to this plan's files.

---
*Phase: 09-admin-dashboard*
*Completed: 2026-04-25*
