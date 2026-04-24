---
phase: 09-admin-dashboard
plan: 01
subsystem: auth
tags: [admin, access-control, auth, env-config, next-app-router, route-group, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Better Auth session API, auth.api.getSession pattern
provides:
  - isAdminEmail(email) helper — case-insensitive, whitespace-trimmed membership check against ADMIN_EMAILS env var
  - requireAdmin() server-action guard — throws Unauthorized / Forbidden, returns Better Auth session on success
  - (admin) route group with server-side session + admin-email gate that silently redirects non-admins to /hive
  - Placeholder /admin page so the route renders end-to-end through the gate
  - ADMIN_EMAILS env entry documented in .env.example (empty by default — safe)
affects:
  - 09-02-plan-listing-pages  # will replace the placeholder page and consume admin layout
  - 09-03-temp-password       # will add generateTempPassword to src/lib/admin.ts
  - 09-04-reset-action        # will consume requireAdmin() in server action

# Tech tracking
tech-stack:
  added: []  # no new npm deps — admin gate built from existing Better Auth + Next.js primitives
  patterns:
    - "Env-var-gated admin identity (no schema change, no role column)"
    - "Layout-level server-side admin gate (redirects to /hive, not /login — doesn't leak route existence)"
    - "Module-scope env parsing for stable deployment-time config"
    - "TDD for pure helpers: vi.resetModules + dynamic import to re-evaluate module-scope env parse per test"

key-files:
  created:
    - src/lib/admin.ts
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/admin/page.tsx
    - tests/admin/is-admin-email.test.ts
  modified:
    - .env.example

key-decisions:
  - "Admin identity is an env-var allowlist (ADMIN_EMAILS) — no user.role column, no migration"
  - "Unauthenticated and non-admin both redirect to /hive (not /login) — denies route-existence disclosure"
  - "Env parse cached at module scope; tests use vi.resetModules + dynamic import to re-evaluate per case"
  - "generateTempPassword deferred to Plan 03 — not added here despite sharing the admin.ts module"

patterns-established:
  - "isAdminEmail: pure, synchronous, testable — no session/headers dependency"
  - "requireAdmin: async, throws on denial (not redirects) — safe to call from server actions in Plan 04"
  - "(admin) route group layout mirrors (app) layout shape (Header + max-w main), with the extra server-side gate"

requirements-completed: [ADMIN-01, ADMIN-02, ADMIN-03]
# Note: ADMIN-01/02/03 are delivered end-to-end across Plans 02 and 04.
# This plan delivers the access-control substrate (layout gate + requireAdmin) those plans depend on.
# The plan frontmatter lists all three because they cannot be completed without this plan's artifacts.

# Metrics
duration: ~13 min
completed: 2026-04-24
---

# Phase 9 Plan 1: Admin identity module + (admin) route group gate

**Env-var admin allowlist (`ADMIN_EMAILS`) with case-insensitive `isAdminEmail` + `requireAdmin` guard, plus a layout-level `(admin)` route group gate that silently redirects non-admins to `/hive`.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-04-24T20:26Z
- **Completed:** 2026-04-24T20:38Z
- **Tasks:** 2 (both `type="auto"`; Task 1 was TDD with RED+GREEN commits)
- **Files created:** 4
- **Files modified:** 1

## Accomplishments

- `src/lib/admin.ts` exports `isAdminEmail(email): boolean` and `requireAdmin(): Promise<Session>` — the single source of truth for admin identity consumed by Plan 02 (layout) and Plan 04 (reset action).
- `(admin)` route group at `src/app/(admin)/` with a server-side `layout.tsx` that runs `auth.api.getSession` + `isAdminEmail` and redirects non-admins to `/hive` per D-08/D-09.
- `ADMIN_EMAILS` documented in `.env.example` with safe-default comment (empty = zero admins per D-02).
- 11 passing unit tests covering D-01 (env parse), D-02 (safe default when unset/empty/whitespace), and D-03 (case-insensitive, whitespace-trimmed on both sides).

## Task Commits

Each task was committed atomically. Task 1 produced two commits (TDD RED → GREEN):

1. **Task 1 RED: Failing tests for isAdminEmail** — `26f48b1` (test)
2. **Task 1 GREEN: isAdminEmail + requireAdmin implementation** — `543fa45` (feat)
3. **Task 2: (admin) route group layout + placeholder page + .env.example entry** — `c9d4f0f` (feat)

**Deferred-items note:** `ccba5d2` (docs) — records pre-existing TypeScript errors in `tests/task/update-task-status.test.ts` (out of scope; see Deferred Issues below).

## Files Created/Modified

- `src/lib/admin.ts` — exports `isAdminEmail(email): boolean` and `requireAdmin(): Promise<Session>`; parses `ADMIN_EMAILS` once at module load with `.trim().toLowerCase().filter(Boolean)`; no `console.log`, no `generateTempPassword` (Plan 03's responsibility).
- `src/app/(admin)/layout.tsx` — server component; `await auth.api.getSession({ headers: await headers() })` + `isAdminEmail(session.user.email)`; both no-session and non-admin paths call `redirect("/hive")` (D-08/D-09). Reuses `<Header />` from `@/components/layout/header` per RESEARCH Open Question 2.
- `src/app/(admin)/admin/page.tsx` — minimal server component; renders a placeholder title + note so Task 2's verify loads `/admin` end-to-end. Plan 02 will replace this.
- `tests/admin/is-admin-email.test.ts` — `// @vitest-environment node`; 11 Vitest cases; uses `vi.resetModules()` + dynamic `import("@/lib/admin")` per case to re-evaluate module-scope env parsing; snapshots and restores `process.env.ADMIN_EMAILS` in `beforeEach` / `afterEach`.
- `.env.example` — appended 4 lines (comment block + `ADMIN_EMAILS=`) after the existing `BETTER_AUTH_*` entries; left blank intentionally (D-02 safe default).

## Decisions Made

- **Both unauthenticated and non-admin paths redirect to `/hive` (not `/login`).** Rationale per D-09 and RESEARCH Pattern 1: `/hive/page.tsx` already redirects unauthenticated callers to `/login`, so chaining through `/hive` reuses that redirect and keeps `/admin` indistinguishable from any other non-admin-viewable route (no 403, no "route exists" signal).
- **`generateTempPassword` deliberately NOT added in this plan** even though it lives in the same `admin.ts` module per RESEARCH. Plan 03 owns it. Avoiding it here keeps the diff scoped and prevents stubbing a function Plan 04 would depend on before Plan 03 defines its word lists.
- **Env parse cached at module scope.** ADMIN_EMAILS is a deployment-time constant; caching once per process is safe. Tests must therefore use `vi.resetModules()` + dynamic `import` to re-evaluate the module per case — documented in the test file's `loadIsAdminEmail` helper.
- **Admin layout reuses the existing `<Header />`** from `(app)` rather than a dedicated admin header. RESEARCH Open Question 2 recommended this for consistency; Plan 02 can override if needed.

## Deviations from Plan

None — plan executed exactly as written. All 11 TDD tests passed on first GREEN run; all grep-based acceptance criteria passed without rework; `npx tsc --noEmit` found no errors in admin files.

## Issues Encountered

**Worktree branch base was incorrect at session start.**

- **Discovered:** Immediately via the `worktree_branch_check` step.
- **Cause:** The worktree branch `worktree-agent-a8e4658c6b2e64f1a` was initially based on `f51f1f0` (main) rather than the required feature-branch HEAD `2aed5b6`.
- **Resolution:** Ran `git reset --soft 2aed5b6f8f19...`, unstaged with `git reset HEAD`, then `git checkout HEAD -- .planning/phases/09-admin-dashboard/ .planning/ROADMAP.md .planning/STATE.md` to restore files from the correct base.
- **Verification:** `git rev-parse HEAD` now returns `2aed5b6…`; `git log` shows the 4-plan phase plan commit at tip; `git status` is clean.
- **Impact:** None on code output — just a pre-execution branch hygiene step.

## Deferred Issues

Pre-existing TypeScript errors unrelated to Phase 9 surfaced during `npx tsc --noEmit`:

- `tests/task/update-task-status.test.ts:107` — Tuple type `[]` has no element at index `0`
- `tests/task/update-task-status.test.ts:108` — `setArg` is possibly `undefined`
- `tests/task/update-task-status.test.ts:153` — Conversion of type `null` to `Mock<...>` overlap
- `tests/task/update-task-status.test.ts:157` — Same

Logged to `.planning/phases/09-admin-dashboard/deferred-items.md`. Not addressed — out of this plan's scope (not caused by my changes). Should be cleaned up via a separate quick task.

## User Setup Required

None — no external service configuration required. `ADMIN_EMAILS` is documented in `.env.example`; setting it is a deployment-time concern and explicitly **not** required for this plan to be complete (empty value = zero admins is the safe default per D-02).

For manual smoke testing in Plan 02's wave: set `ADMIN_EMAILS=you@example.com` in `.env.local`, run `npm run dev`, and exercise the three redirect paths (admin → placeholder page, non-admin → `/hive`, unauthenticated → `/hive` → `/login`).

## Next Phase Readiness

**Ready for Plan 02** (admin listings):
- Plan 02 can `import { isAdminEmail } from "@/lib/admin"` if needed and extend `src/app/(admin)/admin/page.tsx`.
- The `(admin)` route group layout is in place and gates every `/admin/*` descendant.

**Ready for Plan 03** (temp password generator):
- Plan 03 adds `generateTempPassword` to `src/lib/admin.ts` — the module exists and the export shape is clean (no circular deps, no top-level side effects beyond env parse).

**Ready for Plan 04** (reset password action):
- Plan 04's `resetUserPassword` server action can call `await requireAdmin()` as its first line per D-10. Both `Unauthorized` and `Forbidden` errors are thrown, not redirected — correct for server-action semantics.

## Self-Check: PASSED

**Files verified exist on disk:**
- `src/lib/admin.ts` — FOUND
- `src/app/(admin)/layout.tsx` — FOUND
- `src/app/(admin)/admin/page.tsx` — FOUND
- `tests/admin/is-admin-email.test.ts` — FOUND
- `.env.example` — FOUND with `ADMIN_EMAILS=` line

**Commits verified in git log:**
- `26f48b1` (test RED) — FOUND
- `543fa45` (feat GREEN for admin.ts) — FOUND
- `c9d4f0f` (feat for route group + env) — FOUND
- `ccba5d2` (docs for deferred-items) — FOUND

**Test suite:** `npm test -- tests/admin/ --run` → 11/11 passing.

**TypeScript:** `npx tsc --noEmit` — zero errors attributable to this plan's files.

**Acceptance-criteria greps:** All Task 1 and Task 2 grep assertions pass (see inline verification output earlier in this session).

---
*Phase: 09-admin-dashboard*
*Completed: 2026-04-24*
