# Roadmap: Honey_Do

## Overview

Honey_Do ships in five phases that build directly on each other. Foundation establishes the schema, auth, and Hive core — everything else depends on these being correct. The invite flow is built second, before tasks, so that multi-user testing is possible throughout the rest of development. The task system delivers the core product loop. The leaderboard layers on the honey accounting that task completion establishes. Theme and copy polish come last but are not optional — the bee theme is the competitive differentiator, not a skin.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Database schema, email/password auth, and Hive creation with roles (completed 2026-03-29)
- [ ] **Phase 2: Invite Flow** - Queen generates invite link, Bee joins via link and creates account
- [x] **Phase 3: Task System** - Task creation, assignment, status transitions, honey accounting, and Honeycomb view (completed 2026-04-03)
- [x] **Phase 4: Leaderboard** - Hive leaderboard ranked by honeys earned (completed 2026-04-04)
- [x] **Phase 5: Theme & Copy** - Full bee theme, honeycomb UI patterns, and dynamic contextual copy engine (completed 2026-04-06)
- [ ] **Phase 6: Deployment** - Vercel deploy with Neon PostgreSQL, environment config, production readiness

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
- [ ] 06-01-PLAN.md — Install Neon driver, conditional db.ts driver switch, drizzle config for unpooled migrations, build script, health check endpoint
- [ ] 06-02-PLAN.md — Provision Neon + Vercel, configure env vars, deploy, verify full app functionality
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-29 |
| 2. Invite Flow | 0/2 | Planned | - |
| 3. Task System | 2/2 | Complete | 2026-04-03 |
| 4. Leaderboard | 1/1 | Complete   | 2026-04-04 |
| 5. Theme & Copy | 2/2 | Complete   | 2026-04-06 |
| 6. Deployment | 0/2 | Planned | - |
