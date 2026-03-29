---
phase: 01-foundation
plan: 02
subsystem: auth-ui
tags: [auth, forms, react-hook-form, zod, better-auth, tailwind, ui-components]

# Dependency graph
requires:
  - 01-01 (Next.js scaffold, Better Auth, auth-client.ts, cn() utility, bee theme tokens)
provides:
  - Button UI primitive with primary/secondary/ghost variants
  - Input UI primitive with label, error, and bee-theme styling
  - AuthLayout: centered max-w-sm layout for /signup and /login
  - AppLayout: full-width layout with persistent Header for authenticated routes
  - Header: "Honey Do" wordmark + logout button via authClient.signOut()
  - SignupForm: name/email/password with Zod validation, signUp.email(), redirects to /hive/create
  - LoginForm: email/password with Zod validation, signIn.email(), redirects to /hive
  - /signup and /login pages
affects: [01-03]

# Tech tracking
tech-stack:
  added:
    - "@hookform/resolvers@^5.2.2"
  patterns:
    - Button/Input as reusable primitives, accepting className override via cn()
    - Form components are "use client" with react-hook-form + zodResolver
    - Server errors shown as inline banners above the form (not toasts)
    - Loading state: disabled button with "Loading..." text on isSubmitting
    - AuthLayout for unauthenticated pages, AppLayout for authenticated pages

key-files:
  created:
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/app/(auth)/layout.tsx
    - src/app/(app)/layout.tsx
    - src/components/layout/header.tsx
    - src/components/auth/signup-form.tsx
    - src/components/auth/login-form.tsx
    - src/app/(auth)/signup/page.tsx
    - src/app/(auth)/login/page.tsx
  modified:
    - package.json (added @hookform/resolvers)
    - package-lock.json

key-decisions:
  - "Header created alongside Task 1 layouts (not as a separate Task 3 stub/replace cycle) — avoids forward reference compile error while keeping all header code in one commit"
  - "src/app/page.tsx redirect to /login was already done in Plan 01-01 — Task 2 step 5 was a no-op"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 01 Plan 02: Auth UI Summary

**Signup, login, and logout UI with react-hook-form + Zod validation, bee-themed Button/Input primitives, and exact UI-SPEC copy**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T02:34:49Z
- **Completed:** 2026-03-29T02:38:05Z
- **Tasks:** 3
- **Files modified:** 9 new files + 2 modified (package.json, package-lock.json)

## Accomplishments

- Created Button and Input UI primitives with bee-theme Tailwind classes (honey accent, bee text color, stone backgrounds)
- Created AuthLayout (centered, max-w-sm) and AppLayout (full-width with Header) route groups
- Created Header with "Honey Do" wordmark and logout button using authClient.signOut()
- Created SignupForm with name/email/password fields, Zod validation, signUp.email(), and redirect to /hive/create per D-01
- Created LoginForm with email/password fields, Zod validation, signIn.email(), and redirect to /hive
- Both forms implement exact copy from UI-SPEC.md, inline server error banners, and loading states

## Task Commits

Each task was committed atomically:

1. **Task 1+3: UI primitives, layouts, and header** - `a3ab32f` (feat)
2. **Task 2: Signup and login forms with validation** - `27a2e7c` (feat)

Note: Tasks 1 and 3 were combined in one commit because the Header was created alongside the AppLayout to resolve the forward reference compile error (AppLayout imports Header).

## Files Created/Modified

- `src/components/ui/button.tsx` - Reusable button with primary/secondary/ghost variants and sm/md sizes
- `src/components/ui/input.tsx` - Reusable input with label, error display, and bee-theme styling
- `src/app/(auth)/layout.tsx` - Centered layout for /signup and /login pages
- `src/app/(app)/layout.tsx` - App shell layout with Header for authenticated routes
- `src/components/layout/header.tsx` - "Honey Do" wordmark + "Log out" ghost button via authClient.signOut()
- `src/components/auth/signup-form.tsx` - Client form: name/email/password, Zod schema, signUp.email(), /hive/create redirect
- `src/components/auth/login-form.tsx` - Client form: email/password, Zod schema, signIn.email(), /hive redirect
- `src/app/(auth)/signup/page.tsx` - Route page wrapping SignupForm
- `src/app/(auth)/login/page.tsx` - Route page wrapping LoginForm
- `package.json` - Added @hookform/resolvers@^5.2.2

## Decisions Made

- **Tasks 1 and 3 combined into one commit:** AppLayout imports Header; creating them separately would cause a TypeScript compile error at the Task 1 verification step. Created Header in full (not as a stub) alongside the layouts. Header code fully matches Task 3 spec — no re-work needed.
- **page.tsx redirect already done:** Plan 01-01 already created `src/app/page.tsx` with `redirect("/login")`. Task 2 step 5 was skipped as a no-op.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed with one intentional deviation: Task 1 and Task 3 were combined into a single commit to avoid a TypeScript forward reference error. All acceptance criteria were met in both tasks.

## Known Stubs

None — all components are fully wired to authClient. SignupForm calls signUp.email() and redirects to /hive/create. LoginForm calls signIn.email() and redirects to /hive. Header calls signOut() and redirects to /login.

---
*Phase: 01-foundation*
*Completed: 2026-03-29*

## Self-Check: PASSED

All 9 expected source files exist in worktree. Both task commits (a3ab32f, 27a2e7c) confirmed in git log. SUMMARY.md created at correct path in main repo .planning directory.
