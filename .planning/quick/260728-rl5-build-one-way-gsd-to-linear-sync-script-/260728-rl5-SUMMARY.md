---
phase: quick
plan: 260728-rl5
subsystem: tooling
tags: [linear, sync, planning, tooling, graphql]
key-files:
  created:
    - scripts/linear-sync.mjs
    - .planning/linear-map.json
  modified:
    - Makefile
    - .env.example
decisions:
  - One-way GSD to Linear only; two-way sync rejected as fragile glue for a solo project
  - All Linear IDs resolved at runtime from team key HON — no hardcoded UUIDs in the repo
  - Workflow states matched by name first, falling back to Linear's semantic state `type`, so a renamed workflow still resolves
  - Title-convention fallback (`Phase N:` / `NN-MM:`) backs up linear-map.json so a lost map cannot produce duplicates
  - Plans partially summarized derive In Progress; fully summarized derive In Review — refines the original sketch, which left this case undefined
  - `--check` made non-mutating after it was caught creating the Linear project on its first run
  - linear-map.json committed to the repo (contains only UUIDs, no secrets) so sync is stable from a fresh clone
metrics:
  duration: ~25 minutes
  completed: 2026-07-28
---

# Quick Task 260728-rl5: GSD → Linear Sync

**One-liner:** `make linear-sync` mirrors all 17 GSD phases and their plans into Linear team HON as a read-only dashboard, deriving Backlog / Todo / In Progress / In Review / Done from what is actually on disk in `.planning/`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write scripts/linear-sync.mjs | dda4ce5 | scripts/linear-sync.mjs, .planning/linear-map.json |
| 2 | Wire up make targets and document the credential | 544f6cc | Makefile, .env.example |

## What Was Built

A single dependency-free ESM script (Node 22 native `fetch`) in four layers: a Linear GraphQL
client, `.planning/` readers, a status reconciler, and a CLI with `--dry-run`, `--check`, and
`--help`.

Linear structure created: project **Honey_Do** → milestones **v1.0 / v1.1 / v1.2** → 17 phase
issues (HON-5 … HON-38) → 17 plan sub-issues.

Status derivation, in precedence order:

| # | Condition | Linear state |
|---|-----------|--------------|
| 1 | Phase checked `- [x]` in ROADMAP.md | Done |
| 2 | No phase directory | Backlog |
| 3 | `.continue-here*.md`, `HANDOFF.json`, or STATE.md reporting the phase as executing | In Progress |
| 4 | Every `*-PLAN.md` has a matching `*-SUMMARY.md` | In Review |
| 5 | Only some plans summarized | In Progress |
| 6 | Plans exist, none summarized | Todo |
| 7 | CONTEXT.md/SPEC.md but no plans | Todo |
| 8 | Phase dir exists but empty | Backlog |

## Verification

All five behaviors were exercised against the real workspace, not just reasoned about:

- **Status derivation** — a synthetic fixture in the scratchpad covered all 8 precedence rules;
  every case resolved to the expected state, including the two ambiguous partial-summary cases.
- **Real sync** — 34 issues created across 17 phases; states matched the roadmap exactly
  (Phases 1-7 and 9 Done, Phases 8 and 10-17 Backlog).
- **Idempotency** — immediate re-run reported `0 created, 0 state changes`.
- **Map-loss resilience** — deleted `.planning/linear-map.json` and re-ran; still `0 created`,
  confirming the title-convention fallback prevents duplicates.
- **Update path + read-only contract** — an issue was tampered with directly in Linear (title
  changed, state forced to In Progress); the next sync reverted both, proving Linear edits do not
  survive and do not leak back into `.planning/`.

Regression: `npx vitest run` 89/89 pass. `npx eslint .` still reports exactly the 8 pre-existing
warnings in test files — the new script adds none, so it does not raise the bar Phase 11 has to clear.

## Deviations from Plan

Two, both improvements caught during execution:

1. **`--check` was mutating.** Its first run created the Linear project as a side effect. A check
   command must not write, so it now reports the missing project instead of creating it. The
   project it created was legitimate and was kept.
2. **Milestone-assignment fallback added.** `projectMilestoneId` on `IssueCreateInput` is the
   field most likely to drift across Linear API versions, so issue creation retries without it and
   warns rather than failing the whole sync. It was accepted on the real run, so the fallback is
   currently untested — it is insurance, not verified behavior.

## Known Limitations

- **Manual trigger only.** Nothing fires the sync automatically; Linear goes stale until
  `make linear-sync` is run. Hook/CI automation was explicitly deferred.
- **Phases and plans only.** Quick tasks, pending todos, and the 21 v1.2 requirements are not
  synced.
- **"In Review" is not yet PR-aware.** It currently means "all plans summarized." Once Phase 11
  lands CI, the more useful signal is "PR open, checks green, awaiting approval" — that upgrade
  needs the CI gate to exist first.
- The milestone-assignment retry path has not been exercised (see Deviations).

## Self-Check: PASSED

- `scripts/linear-sync.mjs` — FOUND
- `.planning/linear-map.json` — FOUND (34 issue mappings)
- `Makefile` — FOUND (`linear-sync`, `linear-sync-dry` targets resolve via `make -n`)
- `.env.example` — FOUND (`LINEAR_API_KEY` documented)
- Commit dda4ce5 — FOUND
- Commit 544f6cc — FOUND
