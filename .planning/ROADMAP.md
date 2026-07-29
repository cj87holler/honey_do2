# Roadmap: Honey_Do

## Overview

Honey_Do ships in phases that build directly on each other. Foundation establishes the schema, auth, and Hive core — everything else depends on these being correct. The invite flow is built second, before tasks, so that multi-user testing is possible throughout the rest of development. The task system delivers the core product loop. The leaderboard layers on the honey accounting that task completion establishes. Theme and copy polish come next — the bee theme is the competitive differentiator, not a skin. Deployment closes v1.0.

v1.1 (Landing Page & Polish) adds a public marketing landing page, UAT-identified app improvements (leave-hive, due dates), and an admin dashboard for user/hive oversight.

v1.2 (Productionization) hardens the already-live app for real users: CI gating on pull requests, security headers with a safely-staged CSP rollout, legal pages, structured logging, error tracking, and uptime monitoring. This phase set is operator-facing — it makes the app safe to keep running, not more capable for end users. There is no working preview-deployment environment for this app (Vercel previews can't reach a database), so every phase in this milestone ships changes straight to production; sequencing is deliberately conservative as a result. Phases 8 and 10 from v1.1 remain deferred, not cancelled, and are not part of this milestone.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

### v1.0 (Complete)

- [x] **Phase 1: Foundation** - Database schema, email/password auth, and Hive creation with roles (completed 2026-03-29)
- [x] **Phase 2: Invite Flow** - Queen generates invite link, Bee joins via link and creates account (completed 2026-03-31)
- [x] **Phase 3: Task System** - Task creation, assignment, status transitions, honey accounting, and Honeycomb view (completed 2026-04-03)
- [x] **Phase 4: Leaderboard** - Hive leaderboard ranked by honeys earned (completed 2026-04-04)
- [x] **Phase 5: Theme & Copy** - Full bee theme, honeycomb UI patterns, and dynamic contextual copy engine (completed 2026-04-06)
- [x] **Phase 6: Deployment** - Vercel deploy with Neon PostgreSQL, environment config, production readiness (completed 2026-04-14)

### v1.1 (Landing Page & Polish)

- [x] **Phase 7: Landing Page** - Marketing-style landing page as the public entry point with smart routing for logged-in users (completed 2026-04-23)
- [ ] **Phase 8: App Polish** - Leave-hive feature and optional due dates on tasks (UAT-identified gaps)
- [x] **Phase 9: Admin Dashboard** - Admin tool for viewing all users and hives, and resetting passwords (completed 2026-04-26)
- [ ] **Phase 10: Email Notifications** - Transactional emails for key user events (welcome, invite received, task assigned/completed)

### v1.2 (Productionization)

- [x] **Phase 11: CI on Pull Requests** - GitHub Actions gate on main: typecheck, lint, and tests must pass before merge (completed 2026-07-28)
- [ ] **Phase 12: Legal Pages** - Public Privacy Policy and Terms of Use pages linked from the landing page
- [ ] **Phase 13: Repo Visibility → Private** - GitHub repository flipped from public to private
- [ ] **Phase 14: Structured Logging** - pino-based structured JSON logging with secret redaction on server routes
- [ ] **Phase 15: Security Headers & CSP** - Hardened HTTP headers and a Content-Security-Policy rolled out Report-Only → enforcing
- [ ] **Phase 16: Sentry Error Tracking** - Client/server error capture with PII scrubbing, source maps, and finalized Privacy Policy sub-processor language
- [ ] **Phase 17: Uptime Monitoring** - `/api/health` verifies real database connectivity and an external monitor alerts on downtime

## Phase Details

### Phase 1: Foundation
**Goal**: Users can securely access their accounts and a Queen can create and configure a named Hive with roles enforced
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, HIVE-01, HIVE-02, HIVE-05
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password
  2. User can log in and remain logged in across browser refresh
  3. User can log out from any page
  4. Queen can create a new Hive and give it a name
  5. Role model is enforced: Queen can assign tasks, Bee can only receive tasks, QueenBee can both create and receive tasks
**Plans:** 3/3 plans complete
Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js, Docker/PostgreSQL, Drizzle schema, Better Auth config, Makefile, Vitest
- [x] 01-02-PLAN.md — Auth UI: signup, login, logout, middleware route protection
- [x] 01-03-PLAN.md — Hive creation, dashboard, member list, role badges, inline rename
**UI hint**: yes

### Phase 2: Invite Flow
**Goal**: A Queen can invite Bees into the Hive via a shareable link, and invited users can join with minimal friction
**Depends on**: Phase 1
**Requirements**: HIVE-03, HIVE-04
**Success Criteria** (what must be TRUE):
  1. Queen can generate an invite link for their Hive
  2. Following an invite link shows the Hive name and Queen name before any sign-up form appears
  3. Invited user can create an account and land inside the Hive in one flow
  4. Invite tokens are single-use and expired tokens are rejected
**Plans:** 2 plans
Plans:
- [x] 02-01-PLAN.md — Invites table schema, generateInvite/acceptInvite server actions, getInviteByToken query, unit tests
- [x] 02-02-PLAN.md — InvitePanel in dashboard, /invite/[token] landing page, invite-aware signup form, e2e verification
**UI hint**: yes

### Phase 3: Task System
**Goal**: Queen or QueenBee can create and assign tasks, assignees can work through their Honeycomb, and honey is awarded on completion
**Depends on**: Phase 2
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06, TASK-07
**Success Criteria** (what must be TRUE):
  1. Queen or QueenBee can create a task with text (up to 160 characters) and a honey value (5, 10, 20, or custom)
  2. Task can be assigned to a specific Hive member and appears on their Honeycomb
  3. Assignee can mark a task "in progress" and then "done"
  4. Completing a task awards the task's honey value to the assignee
  5. Completed tasks are visible in a separate completed area
**Plans:** 2/2 plans complete
Plans:
- [x] 03-01-PLAN.md — Tasks table schema, server actions (create/status/delete), query layer, unit tests
- [x] 03-02-PLAN.md — Honeycomb UI, task creation form, task cards, status buttons, dashboard integration
**UI hint**: yes

### Phase 4: Leaderboard
**Goal**: Hive members can see where they stand relative to each other by total honeys earned
**Depends on**: Phase 3
**Requirements**: LEAD-01
**Success Criteria** (what must be TRUE):
  1. Hive shows all members ranked by total honeys earned
  2. Scores display as absolute values ("45 honeys") with no "last place" callout
  3. Leaderboard updates immediately after a task is marked done
**Plans:** 1/1 plans complete
Plans:
- [x] 04-01-PLAN.md — Leaderboard component with rank logic, crown/honey emojis, dashboard integration, MemberList removal
**UI hint**: yes

### Phase 5: Theme & Copy
**Goal**: The full bee experience is present across the entire app — honeycomb UI patterns, bee puns, and dynamic copy that responds to each user's task load
**Depends on**: Phase 4
**Requirements**: THEME-01, THEME-02
**Success Criteria** (what must be TRUE):
  1. Every page reflects the bee theme: honeycomb visual patterns, amber/yellow color language, and bee-pun copy throughout
  2. The app is fully usable on a 375px mobile screen (invite links open on phones)
  3. Dynamic contextual copy changes based on the user's current task load with at least 8 distinct variants per task-load state
  4. Theme is applied in interaction design (micro-interactions, completion moments), not only in text copy
**Plans:** 2/2 plans complete
Plans:
- [x] 05-01-PLAN.md — CSS foundation: honeycomb pattern vars, SVG background, keyframes, HoneycombPattern component, header redesign, mobile touch targets
- [x] 05-02-PLAN.md — DashboardGreeting copy engine (32 variants), bee-themed badges, completion flash, card reveal, leaderboard rank-1, empty state copy, visual verification
**UI hint**: yes

### Phase 6: Deployment
**Goal**: Deploy the app to Vercel with Neon PostgreSQL, environment configuration, and production readiness
**Depends on**: Phase 5
**Requirements**: DEPLOY-01
**Success Criteria** (what must be TRUE):
  1. App is deployed and accessible on a public Vercel URL
  2. Neon PostgreSQL is provisioned and connected with production schema
  3. Environment variables are configured for production (auth, database, app URL)
  4. Deployment pipeline works: push to main triggers automatic deploy
**Plans:** 2 plans
Plans:
- [x] 06-01-PLAN.md — Install Neon driver, conditional db.ts driver switch, drizzle config for unpooled migrations, build script, health check endpoint
- [x] 06-02-PLAN.md — Provision Neon + Vercel, configure env vars, deploy, verify full app functionality
**UI hint**: no

### Phase 7: Landing Page
**Goal**: First-time visitors see a marketing-style landing page that explains Honey_Do and drives signups, while logged-in users are routed directly to their dashboard
**Depends on**: Phase 6
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04
**Success Criteria** (what must be TRUE):
  1. A logged-out visitor hitting the root URL sees a landing page with hero copy, a signup CTA, and a "how it works" section
  2. The "how it works" section shows the core loop: create a hive, assign tasks, earn honeys
  3. A returning user can find and click an "already buzzin'? sign in here" link without scrolling through the signup flow
  4. A logged-in user who navigates to the root URL is immediately redirected to their dashboard without seeing the landing page
**Plans:** 1 plans
Plans:
- [x] 07-01-PLAN.md — Session-aware root page with marketing landing page (hero, how-it-works, CTA sections)
**UI hint**: yes

### Phase 8: App Polish
**Goal**: Users can leave a hive they no longer belong in, and task creators can attach optional due dates that are visible on task cards
**Depends on**: Phase 7
**Requirements**: HIVE-06, TASK-11, TASK-12
**Success Criteria** (what must be TRUE):
  1. A Hive member can leave their Hive from within the app after confirming a prompt — they are removed from the Hive immediately
  2. A Queen or QueenBee can optionally set a due date when creating a task, or skip it
  3. Tasks with a due date show that date on the task card in the Honeycomb
  4. Tasks without a due date display normally with no empty placeholder
**Plans**: TBD
**UI hint**: yes

### Phase 9: Admin Dashboard
**Goal**: An admin user can audit the platform's users and hives, and can reset a user's password when needed
**Depends on**: Phase 8
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):
  1. An admin can view a list of all registered users with each user's email and signup date
  2. An admin can view a list of all hives with each hive's member count and creation date
  3. An admin can reset any user's password (sets a temporary password or triggers a reset mechanism)
  4. The admin area is inaccessible to non-admin users — unauthorized access is rejected
**Plans:** 4 plans
Plans:
- [x] 09-01-PLAN.md — Admin identity module (isAdminEmail, requireAdmin) + (admin) route group layout gate + .env.example
- [x] 09-02-PLAN.md — listAllUsers + listAllHives Drizzle queries + UsersTable + HivesTable rendered on /admin
- [x] 09-03-PLAN.md — generateTempPassword bee-themed generator with TDD unit tests
- [x] 09-04-PLAN.md — resetUserPassword server action + ResetPasswordButton confirm-and-show-once modal, wired into UsersTable
**UI hint**: yes

### Phase 10: Email Notifications
**Goal**: Users receive transactional emails for key events so they don't have to check the app to know something happened
**Depends on**: Phase 9
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. New users receive a welcome email when they create an account
  2. A user receives an email when they are invited to a Hive
  3. An assignee receives an email when a task is assigned to them
  4. A task creator receives an email when their assigned task is marked done
  5. Users can opt out of non-essential notifications (welcome and account emails are not opt-out)
**Plans**: TBD
**UI hint**: no

### Phase 11: CI on Pull Requests
**Goal**: Every pull request targeting main is automatically checked for type errors, lint violations, and test failures, and cannot merge until all three pass
**Depends on**: Nothing (first phase of v1.2; gates every phase that follows it)
**Requirements**: CI-01, CI-02, CI-03, CI-04, CI-05
**Success Criteria** (what must be TRUE):
  1. `npm run typecheck` exists as a package.json script, and running it reports zero errors across the repo (the 4 pre-existing errors in `tests/task/update-task-status.test.ts` are fixed as part of this phase)
  2. `npm run lint` reports zero errors and zero warnings (the 8 pre-existing warnings in test files are fixed as part of this phase)
  3. Opening a pull request against main automatically triggers a GitHub Actions run of typecheck, lint, and the unit test suite
  4. A pull request with a failing check is blocked from merging by required status checks on main (configured only after the workflow has run once on a real PR, so the exact check name can be selected from GitHub's dropdown rather than typed from memory)
  5. The CI workflow completes without provisioning a database and without invoking `npm run build`
**Plans:** 2/2 plans complete
Plans:
- [x] 11-01-PLAN.md — Clean the typecheck/lint baseline to zero and add the GitHub Actions workflow
- [x] 11-02-PLAN.md — Prove the gate on a real PR, then require the check on main with enforce_admins
**UI hint**: no

### Phase 12: Legal Pages
**Goal**: Visitors can read Honey_Do's privacy and terms commitments before signing up, from pages linked off the landing page
**Depends on**: Phase 11 (first real PR to prove out the new CI gate before riskier phases begin)
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03
**Success Criteria** (what must be TRUE):
  1. Visiting `/privacy` without being logged in shows a Privacy Policy page
  2. Visiting `/terms` without being logged in shows a Terms of Use page
  3. The landing page has visible links to both `/privacy` and `/terms`
**Plans:** 1/1 plans complete
Plans:
- [x] 12-01-PLAN.md — Legal constants, /privacy and /terms public pages, footer links, disclosure tests
**UI hint**: yes

**Note**: LEGAL-04 (naming Sentry as a sub-processor with an accurate description of what data it receives) is deliberately NOT satisfied by this phase. This phase drafts the sub-processor section with generic language ("we use an error-tracking service that may receive technical error data"). LEGAL-04 is mapped to Phase 16 and is only satisfied once Sentry's PII-scrubbing configuration (OBS-03) is locked in and the paragraph is rewritten to match it — see rationale below.

### Phase 13: Repo Visibility → Private
**Goal**: The GitHub repository is no longer publicly visible
**Depends on**: Phase 11 (CI must already be gating merges before this low-risk, independent change lands)
**Requirements**: SEC-06
**Success Criteria** (what must be TRUE):
  1. The repository's visibility is set to Private, confirmed via `gh repo view`
  2. A trivial commit pushed after the flip still triggers an automatic Vercel deploy, confirming the GitHub-Vercel integration survived the visibility change
**Plans**: TBD
**UI hint**: no

### Phase 14: Structured Logging
**Goal**: Server routes and Server Actions emit structured, secret-redacted JSON logs instead of ad hoc console statements
**Depends on**: Phase 11
**Requirements**: OBS-05
**Success Criteria** (what must be TRUE):
  1. A shared `pino` logger module exists and is used by auth, task-mutation, invite, and admin server actions/routes
  2. Logging a request/session object through the shared logger redacts cookies, passwords, session tokens, and `DATABASE_URL` rather than printing them in the clear
  3. In production (`NODE_ENV=production`) the logger emits plain JSON to stdout with no `transport` configured; `pino-pretty` is used only in development
  4. `src/middleware.ts` does not import the logger (it runs on the Edge runtime by default, where pino's transport machinery fails to import)
**Plans**: TBD
**UI hint**: no

### Phase 15: Security Headers & CSP
**Goal**: Every response is protected by a hardened set of security headers, and a Content-Security-Policy has been safely rolled out from Report-Only to enforcing without breaking the live app — the app's only production environment
**Depends on**: Phase 11
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. A local production-mode build test (`npm run build && npm run start`, `NODE_ENV=production`) empirically determines whether a `script-src 'self'`-only CSP breaks Next.js's inline hydration scripts, and the shipped policy reflects that finding either way (documented decision, not assumed from documentation alone)
  2. Every production response carries X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and Strict-Transport-Security headers
  3. A Content-Security-Policy is served in `Content-Security-Policy-Report-Only` mode and a manual click-through of every route class (login, signup, dashboard, task creation, leaderboard, invite flow, admin) shows zero illegitimate violations in the browser console
  4. The Content-Security-Policy is promoted from Report-Only to enforcing, and the same route click-through still shows fully working interactivity with no console errors
  5. Security headers are present on the redirect responses issued by `src/middleware.ts`, not only on normal (non-redirect) responses
**Plans**: TBD
**UI hint**: no

**Research flag**: This phase needs deeper research during planning. STACK.md, ARCHITECTURE.md, and FEATURES.md independently recommend a static, non-nonce CSP; PITFALLS.md directly contradicts this, arguing that Next.js's own RSC hydration payload is delivered via inline `<script>` tags that a strict `script-src 'self'`-only policy would silently block app-wide with no server-side error signal. Do not resolve this from documentation alone — success criterion 1 above requires empirically testing it via a local production-mode build before anything ships, since there is no preview environment to catch a bad rollout.

### Phase 16: Sentry Error Tracking
**Goal**: Unhandled client- and server-side errors are captured in Sentry with PII scrubbed and source maps resolved, and the Privacy Policy accurately reflects Sentry as a sub-processor once its data-handling configuration is locked in
**Depends on**: Phase 15 (CSP must be fully landed, verified, and stable in `next.config.ts` before Sentry's setup wizard wraps it with `withSentryConfig`); Phase 12 (the Privacy Policy draft must already exist before its error-tracking paragraph can be finalized)
**Requirements**: OBS-02, OBS-03, OBS-04, LEGAL-04
**Success Criteria** (what must be TRUE):
  1. A deliberately triggered client-side error and a deliberately triggered server-side error both appear in the Sentry dashboard within a few minutes
  2. Sentry is configured with `sendDefaultPii: false` and no Session Replay, and a manual check of a captured event's payload confirms task text and user emails are absent
  3. A production stack trace in Sentry resolves to original TypeScript source rather than minified/bundled output
  4. The Privacy Policy's sub-processor section is rewritten to accurately name Sentry and describe exactly what data is and isn't transmitted, matching the PII configuration shipped in this phase (this is what satisfies LEGAL-04)
  5. Re-checking the production CSP header after the Sentry deploy confirms `next.config.ts`'s `headers()` output is unchanged from Phase 15 — the wizard's `withSentryConfig` wrapper did not clobber the hand-written CSP
**Plans**: TBD
**UI hint**: no

**Rationale for LEGAL-04 placement**: LEGAL-04 requires the Privacy Policy to accurately name Sentry as a sub-processor and describe its data handling — that description can only be accurate once Sentry's PII-scrubbing configuration (OBS-03) is decided, which happens in this phase, not in Phase 12. Rather than leaving LEGAL-04 unmapped or duplicating it across two phases, it is mapped here in full: Phase 12 ships the Privacy Policy with deliberately generic sub-processor language so LEGAL-01/02/03 (public reachability, linking) can ship early and independently, and this phase closes the loop by rewriting that one paragraph to match what actually shipped.

### Phase 17: Uptime Monitoring
**Goal**: `/api/health` reflects real database connectivity, and an external monitor alerts when it goes down
**Depends on**: Phase 11
**Requirements**: OBS-01, OBS-06
**Success Criteria** (what must be TRUE):
  1. `/api/health` returns a 500 status when the database is unreachable and a 200 status when the database responds normally (the current handler is hardcoded and never queries the database — this phase fixes that)
  2. An uptime monitor is configured to poll `/api/health` on a 5-minute interval
  3. The monitor alerts via email after 2 consecutive failures, with recovery notification enabled
**Plans**: TBD
**UI hint**: no

## Progress

**Execution Order:**
v1.0 phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6
v1.1 phases execute in numeric order: 7 -> 8 -> 9 -> 10
v1.2 phases execute in numeric order: 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17
  (Phase 16 additionally depends on Phase 15 completing and stabilizing in production, and on Phase 12 already existing, before it starts — see Phase 16's Depends on line)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-29 |
| 2. Invite Flow | 2/2 | Complete | 2026-03-31 |
| 3. Task System | 2/2 | Complete | 2026-04-03 |
| 4. Leaderboard | 1/1 | Complete | 2026-04-04 |
| 5. Theme & Copy | 2/2 | Complete | 2026-04-06 |
| 6. Deployment | 2/2 | Complete | 2026-04-14 |
| 7. Landing Page | 1/1 | Complete | 2026-04-23 |
| 8. App Polish | 0/TBD | Not started | - |
| 9. Admin Dashboard | 4/4 | Complete (UAT passed) | 2026-04-26 |
| 10. Email Notifications | 0/TBD | Not started | - |
| 11. CI on Pull Requests | 0/TBD | Not started | - |
| 12. Legal Pages | 0/TBD | Not started | - |
| 13. Repo Visibility → Private | 0/TBD | Not started | - |
| 14. Structured Logging | 0/TBD | Not started | - |
| 15. Security Headers & CSP | 0/TBD | Not started | - |
| 16. Sentry Error Tracking | 0/TBD | Not started | - |
| 17. Uptime Monitoring | 0/TBD | Not started | - |
