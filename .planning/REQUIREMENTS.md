# Requirements: Honey_Do

**Defined:** 2026-03-26
**Core Value:** People in a household can assign tasks to each other and actually get them done, because the gamified bee-themed experience makes chores feel like play rather than nagging.

## v1.0 Requirements (Complete)

All v1.0 requirements shipped. See MILESTONES.md for details.

### Authentication

- [x] **AUTH-01**: User can create account with email and password
- [x] **AUTH-02**: User can log in and stay logged in across browser refresh
- [x] **AUTH-03**: User can log out from any page

### Hive Management

- [x] **HIVE-01**: Queen can create a new Hive
- [x] **HIVE-02**: Queen can name the Hive
- [x] **HIVE-03**: Queen can generate an invite link to bring Bees into the Hive
- [x] **HIVE-04**: Invited user can join a Hive via invite link and create an account
- [x] **HIVE-05**: Roles are enforced: Queen (creates/assigns tasks), Bee (receives tasks), QueenBee (creates AND receives tasks)

### Tasks

- [x] **TASK-01**: Queen or QueenBee can create a task with text (160-char limit)
- [x] **TASK-02**: Task must be assigned a honey value (5, 10, 20, or custom number)
- [x] **TASK-03**: Task must be assigned to a Bee or QueenBee
- [x] **TASK-04**: Assigned tasks appear on the assignee's Honeycomb (personal to-do list)
- [x] **TASK-05**: Assignee can mark a task "in progress"
- [x] **TASK-06**: Assignee can mark a task "done" and earn the honey value
- [x] **TASK-07**: Completed tasks are visible in a separate completed area

### Leaderboard

- [x] **LEAD-01**: Hive shows a leaderboard ranking members by total honeys earned

### Theme & Personality

- [x] **THEME-01**: Full bee theme with honeycomb UI patterns, bee puns, and buzzy personality
- [x] **THEME-02**: Dynamic contextual copy based on task load (e.g. "whoa! better get to work!" / "go play golf!")

### Deployment

- [x] **DEPLOY-01**: App deployed to Vercel with Neon PostgreSQL, accessible on a public URL with automatic deploys from main

## v1.1 Requirements (Partially complete — Phases 8 and 10 deferred)

Requirements for milestone v1.1: Landing Page & Polish. Phases 7 and 9 shipped; Phase 8 was never
started and is deferred, not cancelled.

### Landing Page

- [x] **LAND-01**: First-time visitor sees a marketing-style landing page explaining what Honey_Do is, with a signup CTA
- [x] **LAND-02**: Landing page includes a "how it works" section showing the core loop (create hive, assign tasks, earn honeys)
- [x] **LAND-03**: Landing page has an "already buzzin'? sign in here" link for returning users
- [x] **LAND-04**: Logged-in user bypasses the landing page and goes straight to the dashboard

### Hive Management

- [ ] **HIVE-06**: User can leave a hive they belong to (with confirmation) — *deferred, Phase 8 not started*

### Tasks

- [ ] **TASK-11**: Queen or QueenBee can set an optional due date when creating a task — *deferred, Phase 8 not started*
- [ ] **TASK-12**: Due date is displayed on task cards in the Honeycomb — *deferred, Phase 8 not started*

### Admin

- [x] **ADMIN-01**: Admin can view a list of all users with email and signup date
- [x] **ADMIN-02**: Admin can view a list of all hives with member count and creation date
- [x] **ADMIN-03**: Admin can reset a user's password

## v1.2 Requirements

Requirements for milestone v1.2: Productionization. Operator-facing rather than end-user-facing —
these make the app safe to run, not more capable.

### Continuous Integration

- [ ] **CI-01**: `npm run typecheck` exists and `tsc --noEmit` reports zero errors across the repo
- [ ] **CI-02**: `npm run lint` reports zero errors and zero warnings
- [ ] **CI-03**: Every pull request targeting `main` automatically runs typecheck, lint, and the unit test suite
- [ ] **CI-04**: A pull request whose checks fail cannot be merged into `main`
- [ ] **CI-05**: CI completes without provisioning a database and without running `npm run build`

### Security Hardening

- [ ] **SEC-01**: Every response carries X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy
- [ ] **SEC-02**: Every response carries a Strict-Transport-Security header
- [ ] **SEC-03**: A Content-Security-Policy is served in Report-Only mode and verified to produce zero violations across every route
- [ ] **SEC-04**: The Content-Security-Policy is promoted from Report-Only to enforcing
- [ ] **SEC-05**: Security headers are present on redirect responses from the auth middleware, not only on normal responses
- [ ] **SEC-06**: The GitHub repository is private

### Legal Pages

- [ ] **LEGAL-01**: A Privacy Policy page is publicly reachable at `/privacy` without authentication
- [ ] **LEGAL-02**: A Terms of Use page is publicly reachable at `/terms` without authentication
- [ ] **LEGAL-03**: Both pages are linked from the landing page
- [ ] **LEGAL-04**: The Privacy Policy names the data collected, the sub-processors used (Vercel, Neon, Sentry), retention, and how a user requests deletion

### Observability

- [ ] **OBS-01**: `/api/health` queries the database and returns a 500 status when the database is unreachable
- [ ] **OBS-02**: Unhandled client-side and server-side errors are captured in Sentry
- [ ] **OBS-03**: Sentry is configured not to transmit PII — user emails and task text are scrubbed before send
- [ ] **OBS-04**: Sentry receives source maps so production stack traces resolve to original source
- [ ] **OBS-05**: Server routes and Server Actions emit structured JSON logs with secrets redacted
- [ ] **OBS-06**: An uptime monitor polls `/api/health` and alerts on repeated failure

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Colonies

- **COLN-01**: Hives can form Colonies to compete across households
- **COLN-02**: Colony leaderboard aggregates all Bees and QueenBees across Hives

### Gamification

- **GAME-01**: Badges earned at honey milestones (e.g. "Worker Bee" at 100 honeys)
- **GAME-02**: Levels or ranks based on accumulated honeys
- **GAME-03**: Custom rewards set by Queen (e.g. "500 honeys = pick dinner")

### Notifications

- **NOTF-01**: Email notification when assigned a new task
- **NOTF-02**: In-app notification badge for new tasks

### Tasks (Extended)

- **TASK-08**: Recurring task scheduling (weekly, monthly chores)
- **TASK-09**: Task deadlines / due dates
- **TASK-10**: Task photo proof on completion

### Social

- **SOCL-01**: Activity feed showing recent completions
- **SOCL-02**: Streak tracking for consistent task completion

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| OAuth / social login | Email/password sufficient for v1; adds third-party complexity |
| Native mobile app | Web-first; validate PMF before investing in native |
| Real-time updates / WebSockets | Standard request/response is fine for household scale |
| Subtasks / task dependencies | Fights the "it's a game" positioning; 160-char limit keeps tasks atomic |
| File / photo attachments | Storage costs and moderation surface area; not core loop |
| Public Hive registration | Privacy risk; invite-only by design |
| Money / real-reward economy | Legal and trust complexity; honeys are symbolic |
| Task marketplace (browse & claim) | Fights the assignment model; Queen assigns, Bee accepts |
| Multi-hive membership | Deferred — v1.1 adds leave-hive only; multi-hive (up to 3) is future scope |
| Calendar integration | Due dates added in v1.1, but calendar sync (Google/Apple) deferred |
| Task descriptions / instructions | Longer description field deferred; 160-char title sufficient for now |
| Self-service password reset | Deferred; admin can reset passwords in v1.1 |
| Self-service account deletion | Deferred; Privacy Policy directs users to email a deletion request instead |
| Neon preview database branching | Deferred past v1.2; previews cannot build today, but they also cannot reach prod data, so it is safe to leave |
| Custom domain | Deferred past v1.2; the Vercel URL is adequate for household-scale use |
| Vercel spend caps / cost alerts | Deferred past v1.2; dashboard-only config with no CLI or API surface |
| Playwright E2E tests | Deferred past v1.2; 89 passing unit tests cover business logic, and no preview environment exists to run E2E against |
| README / ARCHITECTURE.md rewrite | Deferred past v1.2; documentation pass belongs with a later milestone |
| Nonce-based CSP with strict-dynamic | Forces every page into dynamic rendering, which would kill static generation for the landing page. A `'self'`-based CSP gets most of the benefit at no rendering cost |
| Sentry Session Replay | Would capture typed task text, which for a household app can be genuinely personal. Privacy cost outweighs debugging value |
| Sentry performance tracing / profiling | Burns free-tier quota for insight this app's traffic does not justify |
| pino log drains / transports in production | Open Next 16 + Turbopack bugs break worker-thread transports; plain JSON to stdout avoids the failure mode entirely |
| CI matrix builds across Node versions | Single deployment target (Vercel, Node 22) makes a matrix pure cost |
| Coverage thresholds in CI | Encourages gaming the metric; the suite already covers the paths that matter |
| `middleware.ts` → `proxy.ts` codemod | Deferred; CSP lands in `next.config.ts` and does not require touching the auth-critical middleware file |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| HIVE-01 | Phase 1 | Complete |
| HIVE-02 | Phase 1 | Complete |
| HIVE-03 | Phase 2 | Complete |
| HIVE-04 | Phase 2 | Complete |
| HIVE-05 | Phase 1 | Complete |
| TASK-01 | Phase 3 | Complete |
| TASK-02 | Phase 3 | Complete |
| TASK-03 | Phase 3 | Complete |
| TASK-04 | Phase 3 | Complete |
| TASK-05 | Phase 3 | Complete |
| TASK-06 | Phase 3 | Complete |
| TASK-07 | Phase 3 | Complete |
| LEAD-01 | Phase 4 | Complete |
| THEME-01 | Phase 5 | Complete |
| THEME-02 | Phase 5 | Complete |
| DEPLOY-01 | Phase 6 | Complete |
| LAND-01 | Phase 7 | Complete |
| LAND-02 | Phase 7 | Complete |
| LAND-03 | Phase 7 | Complete |
| LAND-04 | Phase 7 | Complete |
| HIVE-06 | Phase 8 | Deferred |
| TASK-11 | Phase 8 | Deferred |
| TASK-12 | Phase 8 | Deferred |
| ADMIN-01 | Phase 9 | Complete |
| ADMIN-02 | Phase 9 | Complete |
| ADMIN-03 | Phase 9 | Complete |
| CI-01 | TBD | Pending |
| CI-02 | TBD | Pending |
| CI-03 | TBD | Pending |
| CI-04 | TBD | Pending |
| CI-05 | TBD | Pending |
| SEC-01 | TBD | Pending |
| SEC-02 | TBD | Pending |
| SEC-03 | TBD | Pending |
| SEC-04 | TBD | Pending |
| SEC-05 | TBD | Pending |
| SEC-06 | TBD | Pending |
| LEGAL-01 | TBD | Pending |
| LEGAL-02 | TBD | Pending |
| LEGAL-03 | TBD | Pending |
| LEGAL-04 | TBD | Pending |
| OBS-01 | TBD | Pending |
| OBS-02 | TBD | Pending |
| OBS-03 | TBD | Pending |
| OBS-04 | TBD | Pending |
| OBS-05 | TBD | Pending |
| OBS-06 | TBD | Pending |

**Coverage:**
- v1.0 requirements: 19 total, 19 complete
- v1.1 requirements: 10 total, 7 complete, 3 deferred (Phase 8 never started)
- v1.2 requirements: 21 total, 0 complete — phase mapping pending roadmap creation
- Unmapped: 21 (v1.2, awaiting roadmapper)

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-07-27 — v1.2 Productionization requirements added (21); v1.1 statuses corrected to reflect Phases 7 and 9 shipped*
