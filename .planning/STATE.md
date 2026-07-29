---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Productionization
status: planning
last_updated: "2026-07-28T01:47:38.247Z"
last_activity: 2026-07-28
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-27)

**Core value:** People in a household can assign tasks to each other and actually get them done, because the gamified bee-themed experience makes chores feel like play rather than nagging.
**Current focus:** Milestone v1.2 — Productionization

## Current Position

Phase: 11 of 17 (CI on Pull Requests) — ready to plan
Plan: — (no plans yet)
Status: Roadmap approved. Phase 11 has no CONTEXT.md — discuss-phase or plan-phase next.
Last activity: 2026-07-28 — Completed quick task 260728-rl5: GSD→Linear sync (`make linear-sync`)

Progress (v1.2): [░░░░░░░░░░] 0% (0/7 phases)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Carried from v1.0:

- Stack: Next.js 15 App Router + Drizzle ORM + Better Auth 1.5.6 + PostgreSQL (Neon for deploy)
- Schema: Honey counter is stored per-Hive-membership (not globally) to support future Colonies without migration
- Deployment: Neon-Vercel integration, conditional driver switching for local/prod

### Pending Todos

- **UAT: No leave-hive feature** — users blocked from joining partner's hive because single-hive enforcement has no exit path. Addressed in Phase 8. See `.planning/todos/pending/uat-multi-hive-block.md`
- **UAT: Feature requests** — due dates (addressed in Phase 8), welcome email, task descriptions, task categories/tags, calendar integration. See `.planning/todos/pending/uat-feature-requests.md`
- **UAT: Admin dashboard** — Addressed in Phase 9. See `.planning/todos/pending/uat-admin-dashboard.md`

### Roadmap Evolution

- Phase 10 added (2026-04-24): Email Notifications — transactional emails for welcome, invite, task assigned, task completed
- Milestone v1.2 Productionization started (2026-07-27), phases continue at 11. v1.1 parked
  incomplete: Phase 8 (App Polish) and Phase 10 (Email Notifications) deferred, not cancelled.
  Their ROADMAP.md entries and phase directories are intentionally left intact — do NOT run
  `phases.clear`, there is no completed-milestone archive to restore from.

### Blockers/Concerns

- **Preview deployments cannot build.** Neon-Vercel integration only injects `DATABASE_URL`
  into Production, so preview builds fail at `drizzle-kit migrate` (`url: undefined`). Safe
  (no preview can reach prod data) but previews are non-functional. Deferred out of v1.2.
- **Sentry + uptime monitor need credentials.** Those phases will pause for a user-generated
  API token before they can complete.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260423-swx | Add help page for logged-in users explaining roles honeys leaderboard tasks invites | 2026-04-24 | 0efe6ac | [260423-swx](./quick/260423-swx-add-help-page-for-logged-in-users-explai/) |
| 260728-rl5 | Build one-way GSD to Linear sync script with make target | 2026-07-28 | 544f6cc | [260728-rl5](./quick/260728-rl5-build-one-way-gsd-to-linear-sync-script-/) |

## Session Continuity

Last session: 2026-07-28
Stopped at: Quick task 260728-rl5 complete — GSD→Linear sync live. Linear project `Honey_Do`
(team HON) now mirrors all 17 phases + plans; refresh with `make linear-sync`. Next action is
still Phase 11 (CI on Pull Requests), which has no CONTEXT.md yet.
Resume file: none

**Linear mirror (added 2026-07-28):** `.planning/` remains the source of truth; Linear is a
read-only dashboard and hand-edits there are reverted on the next sync. Sync is MANUAL — Linear
goes stale until someone runs `make linear-sync`. `.planning/linear-map.json` holds the issue-ID
map (safe to commit, no secrets; safe to delete, issues re-match by title). Requires
`LINEAR_API_KEY` in `.env.local`.

**Verified baselines as of 2026-07-27** (re-check before trusting; they gate Phase 11):
- `npx tsc --noEmit` FAILS — 4 errors, all in `tests/task/update-task-status.test.ts` (107, 108, 153, 157). Zero in `src/`.
- `npx vitest run` PASSES — 13 files, 89 tests.
- `npx eslint .` — 8 warnings, 0 errors. CI will use `--max-warnings 0`, so these must be fixed.
- CI needs NO Postgres container: every DB-touching test mocks `vi.mock("@/lib/db", ...)`.
- CI must NOT run `npm run build` (it is `drizzle-kit migrate && next build`).
- Stack is Next.js **16.2.1** / React 19.2.4 / Node v22.11.0 — CLAUDE.md's "Next.js 15.x + Auth.js v5" is STALE (app uses Better Auth 1.5.6).
- `src/app/api/health/route.ts` returns a hardcoded 200 and never queries the DB (Phase 17 fixes).
- `gh` + `vercel` CLIs authenticated; user has repo ADMIN. Branch protection and the private flip are scriptable.
- main protection today: PR required, 0 approvals, enforce_admins FALSE, required_status_checks NULL.
