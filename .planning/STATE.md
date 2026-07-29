---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Productionization
status: planning
last_updated: "2026-07-28T01:47:38.247Z"
last_activity: 2026-07-28
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
  percent: 29
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-27)

**Core value:** People in a household can assign tasks to each other and actually get them done, because the gamified bee-themed experience makes chores feel like play rather than nagging.
**Current focus:** Milestone v1.2 — Productionization

## Current Position

Phase: 13 of 17 (Repo Visibility -> Private) — ready to plan
Plan: — (no plans yet)
Status: Phase 12 COMPLETE and merged (PR #4 -> main, 8324f2e). /privacy and /terms are live.
Phase 13 (Repo Visibility -> Private) has no CONTEXT.md yet.
Last activity: 2026-07-28 — Phase 12 merged: /privacy + /terms shipped to production

Progress (v1.2): [███░░░░░░░] 29% (2/7 phases)

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
- **`honeydoapp@gmail.com` must be created.** Published on /privacy and /terms as the ONLY route
  for account-deletion requests (there is no in-app delete feature). Must be a real monitored
  inbox before real users see those pages. Defined in `src/lib/legal.ts` — one line to change.
- **Legal pages have had no visual review.** Verified by HTTP content only; the browser extension
  was unavailable. Worth a look before merging.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260423-swx | Add help page for logged-in users explaining roles honeys leaderboard tasks invites | 2026-04-24 | 0efe6ac | [260423-swx](./quick/260423-swx-add-help-page-for-logged-in-users-explai/) |
| 260728-rl5 | Build one-way GSD to Linear sync script with make target | 2026-07-28 | 544f6cc | [260728-rl5](./quick/260728-rl5-build-one-way-gsd-to-linear-sync-script-/) |
| 260728-rvv | Add rich project and phase descriptions to Linear sync | 2026-07-28 | 6b50197 | [260728-rvv](./quick/260728-rvv-add-rich-project-and-phase-descriptions-/) |

## Session Continuity

Last session: 2026-07-28
Stopped at: Phases 11 and 12 both shipped to main. CI gate is live and required (enforce_admins
true); /privacy and /terms are public. dev is reconciled with main. Next action is Phase 13.

**PR workflow note:** main uses squash merge, so after each merge `dev` must be reconciled via
`git merge origin/main` or the next PR re-proposes everything. Phase 11's reconcile hit an add/add
conflict (a commit landed after the PR head); resolve to dev when dev is the superset.
Resume file: none

**Linear mirror (added 2026-07-28):** `.planning/` remains the source of truth; Linear is a
read-only dashboard and hand-edits there are reverted on the next sync. Sync is MANUAL — Linear
goes stale until someone runs `make linear-sync`. `.planning/linear-map.json` holds the issue-ID
map (safe to commit, no secrets; safe to delete, issues re-match by title). Requires
`LINEAR_API_KEY` in `.env.local`.

Issue descriptions are generated from planning artifacts, so **the quality of a phase's Linear
description depends on its `*-SUMMARY.md` having a `provides:` frontmatter block** — that block is
the sole source for "what was built". Phases whose summaries omit it will sync with an empty
"What was built" section. Worth keeping in mind when writing future summaries.

**Verified baselines as of 2026-07-27** (re-check before trusting; they gate Phase 11):
- `npx tsc --noEmit` FAILS — 4 errors, all in `tests/task/update-task-status.test.ts` (107, 108, 153, 157). Zero in `src/`.
- `npx vitest run` PASSES — 13 files, 89 tests.
- `npx eslint .` — 8 warnings, 0 errors. CI will use `--max-warnings 0`, so these must be fixed.
- CI needs NO Postgres container: every DB-touching test mocks `vi.mock("@/lib/db", ...)`.
- CI must NOT run `npm run build` (it is `drizzle-kit migrate && next build`).
- Stack is Next.js **16.2.1** / React 19.2.4 / Node v22.11.0 — CLAUDE.md's "Next.js 15.x + Auth.js v5" is STALE (app uses Better Auth 1.5.6).
- `src/app/api/health/route.ts` returns a hardcoded 200 and never queries the DB (Phase 17 fixes).
- `gh` + `vercel` CLIs authenticated; user has repo ADMIN. Branch protection and the private flip are scriptable.
- main protection NOW (changed 2026-07-28 by Phase 11): PR required, 0 approvals,
  enforce_admins TRUE, required_status_checks {strict:true, contexts:["ci"]}.
  Only `ci` is required — the Vercel check is deliberately NOT required because previews
  cannot build here, and requiring it would permanently block every merge.
