# Honey_Do

## What This Is

Honey_Do is a fun, gamified task management app for households. Housemates (roommates, couples, families) create and assign small tasks to each other, earn "honeys" (points) for completing them, and compete on a leaderboard. The whole experience is wrapped in a playful bee theme — Hives, Queens, Bees, Honeycombs, and bee puns everywhere.

## Core Value

People in a household can assign tasks to each other and actually get them done, because the gamified bee-themed experience makes chores feel like play rather than nagging.

## Requirements

### Validated

- [x] Users can sign up with email/password and log in — Validated in Phase 1: Foundation
- [x] Queens can name the Hive — Validated in Phase 1: Foundation
- [x] A Queen creates a Hive and invites others via link — Validated in Phase 2: Invite Flow
- [x] Roles: Queen (creates/assigns tasks), Bee (receives tasks) — Validated in Phase 3: Task System
- [x] Tasks are open text (160 char limit), assigned to a Bee or QueenBee — Validated in Phase 3: Task System
- [x] Tasks have a honey value: 5, 10, 20, or custom (any number) — Validated in Phase 3: Task System
- [x] Assigned tasks appear on the assignee's Honeycomb (their to-do list) — Validated in Phase 3: Task System
- [x] Tasks can be marked "in progress" or "done" — Validated in Phase 3: Task System
- [x] Completed tasks area visible separately — Validated in Phase 3: Task System
- [x] Leaderboard within a Hive based on honeys earned — Validated in Phase 4: Leaderboard

### Active
- [ ] Playful, dynamic copy based on task load ("whoa! better get to work!" / "go play golf!")
- [ ] Full bee theme with puns, honeycomb UI patterns, buzzy personality

### Out of Scope

- Colonies (Hive-vs-Hive competition) — deferred to v2
- Badges / levels / unlockable rewards — future iteration, v1 is points only
- Notifications (email or push) — deferred, users check their honeycomb manually
- OAuth / social login — email/password is sufficient for v1
- Native mobile app — web app first
- Real-time updates / WebSockets — standard request/response is fine for v1

## Context

- This is a consumer-facing app for households (couples, roommates, families)
- The tone is lighthearted and fun — this is NOT a productivity tool, it's a game that happens to get chores done
- The bee theme is central to the brand identity, not just a veneer
- Target users are non-technical people living together who need a low-friction way to coordinate tasks
- The README references a Makefile-based dev setup with good instructions

## Constraints

- **Tech stack**: Next.js + PostgreSQL — keep it lightweight
- **Dev setup**: Makefile-driven with clear documentation for getting up and running
- **Task text**: 160 character limit
- **Honey values**: 5, 10, 20, or custom entry (any number)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Invite-based onboarding | Queen creates Hive, invites Bees via link — simpler than open registration with join codes | — Pending |
| Email/password auth | Simplest auth for v1, OAuth deferred | — Pending |
| Colonies deferred to v2 | Focus on single-Hive experience first — Colonies add cross-Hive complexity | — Pending |
| Honeys are leaderboard points only | Badges/rewards/levels are future scope — keep v1 simple | — Pending |
| No notifications in v1 | Users check their Honeycomb manually — reduces complexity | — Pending |
| Full bee theme | Bee puns everywhere, honeycomb UI patterns, buzzy personality — it's the brand | — Pending |
| Web app only | Desktop/mobile browser via Next.js, no native mobile for v1 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 after Phase 4 completion*
