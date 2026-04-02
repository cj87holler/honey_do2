---
phase: 02-invite-flow
plan: 02
subsystem: ui
tags: [react, nextjs, server-components, tailwind, testing-library, vitest]

# Dependency graph
requires:
  - phase: 02-invite-flow/02-01
    provides: [invite-token-schema, generateInvite-action, acceptInvite-action, getInviteByToken-query, getExpiredInvitePreview-query]
provides:
  - InvitePanel component — inline link generation + copy button for Queens
  - InviteSignupForm component — signup form that chains to acceptInviteAsCurrentUser after account creation
  - /invite/[token] landing page with three-state logic (expired, logged-in, logged-out)
  - acceptInviteAsCurrentUser server action wrapper
  - Unit tests covering all invite page render states
affects: [03-task-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-component-direct-call-testing, inline-link-reveal-ux, client-component-async-chain]

key-files:
  created:
    - src/components/invite/invite-panel.tsx
    - src/components/invite/invite-signup-form.tsx
    - src/app/invite/[token]/page.tsx
    - tests/invite/invite-page.test.tsx
  modified:
    - src/components/hive/member-list.tsx
    - src/components/hive/hive-dashboard.tsx
    - src/app/(app)/hive/[id]/page.tsx
    - src/lib/actions/invite.ts
    - src/lib/queries/hive.ts

key-decisions:
  - "acceptInviteAsCurrentUser wrapper reads session from headers server-side — avoids relying on client signUp result for userId"
  - "Invite landing page placed outside (app) route group to bypass middleware auth protection"
  - "InviteSignupForm chains authClient.signUp.email() then acceptInviteAsCurrentUser() client-side — sequential async calls with orphaned-account fallback"
  - "Server component testing pattern: call async component function directly, render JSX result with @testing-library/react"

patterns-established:
  - "Inline reveal pattern: no modal/popup — generate link inline in situ within member list section"
  - "Client-side auth chain: signUp → server action → router.push (with catch fallback for partial failures)"
  - "Server component unit testing: await ComponentFn(props) directly, then render(result)"

requirements-completed: [HIVE-03, HIVE-04]

# Metrics
duration: ~15min
completed: 2026-04-01
---

# Phase 02 Plan 02: Invite UI Summary

**Queen-side InvitePanel with inline link reveal/copy, /invite/[token] landing page with welcome card + signup-then-join flow, and four passing unit tests covering all three render states**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-01
- **Completed:** 2026-04-01
- **Tasks:** 4 (including human-verify checkpoint)
- **Files modified:** 9

## Accomplishments
- InvitePanel component shows "Invite a Bee" button for Queens, reveals generated link inline with Copy/Copied! feedback — no modal
- /invite/[token] server component handles three states: expired token (shows Queen name via getExpiredInvitePreview), logged-in visitor (auto-join or block), logged-out visitor (welcome card + signup form + login link)
- InviteSignupForm chains account creation to acceptInviteAsCurrentUser then redirects to Hive dashboard
- Full end-to-end invite lifecycle verified manually: generate, copy, open in incognito, signup, land in Hive, expired token message

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InvitePanel component and update MemberList/HiveDashboard** - `f846b91` (feat)
2. **Task 2: Create invite landing page and invite-aware signup form** - `a743148` (feat)
3. **Task 3: Create unit tests for invite landing page render states** - `caa5504` (test)
4. **Task 4: Verify complete invite flow end-to-end** - human-verify checkpoint (approved)

## Files Created/Modified
- `src/components/invite/invite-panel.tsx` - "use client" inline link generator with copy-to-clipboard for Queens
- `src/components/invite/invite-signup-form.tsx` - "use client" signup form that chains to acceptInviteAsCurrentUser after authClient.signUp.email()
- `src/app/invite/[token]/page.tsx` - Public server component with expired/logged-in/logged-out three-state logic
- `tests/invite/invite-page.test.tsx` - 4 unit tests covering all InvitePage render states
- `src/components/hive/member-list.tsx` - Added isQueen and hiveId props, renders InvitePanel for Queens
- `src/components/hive/hive-dashboard.tsx` - Derives isQueen from members+currentUserId, passes to MemberList
- `src/app/(app)/hive/[id]/page.tsx` - Passes userId and isQueen-enabling props to HiveDashboard
- `src/lib/actions/invite.ts` - Added acceptInviteAsCurrentUser wrapper (reads session from headers)
- `src/lib/queries/hive.ts` - Added userId: hiveMembers.userId to getHiveWithMembers select

## Decisions Made
- **acceptInviteAsCurrentUser as server action wrapper:** After authClient.signUp.email() on the client, the userId is not reliably available from the response. The server action reads the fresh session cookie instead — correct and safe.
- **Landing page outside (app):** /invite/[token] must be publicly accessible without auth middleware blocking. Placed at src/app/invite/ (top level, not inside route groups).
- **Sequential async chain in InviteSignupForm:** signUp → acceptInviteAsCurrentUser → router.push. Wrapped in try/catch — on acceptInvite failure, redirect to /hive (no-hive route) as orphaned-account fallback.
- **Server component test pattern:** Await the async component directly (`await InvitePage({ params: ... })`), then render the JSX result. Avoids needing Next.js test utilities.

## Deviations from Plan

None - plan executed exactly as written. Task 4 (human-verify) was approved with all 11 verification steps passing.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Invite flow is complete and tested end-to-end
- Phase 03 (task-flow) can begin — Hive membership infrastructure is fully in place
- Login redirect support (?redirect= query param) may need verification if the login form doesn't yet handle it

---
*Phase: 02-invite-flow*
*Completed: 2026-04-01*

## Self-Check: PASSED

- src/components/invite/invite-panel.tsx — FOUND
- src/components/invite/invite-signup-form.tsx — FOUND
- src/app/invite/[token]/page.tsx — FOUND
- tests/invite/invite-page.test.tsx — FOUND
- Commit f846b91 — FOUND
- Commit a743148 — FOUND
- Commit caa5504 — FOUND
