---
phase: quick
plan: 260728-rvv
subsystem: tooling
tags: [linear, sync, descriptions, tooling]
key-files:
  modified:
    - scripts/linear-sync.mjs
    - .planning/linear-map.json
decisions:
  - "What was built" is sourced from each plan SUMMARY.md's `provides:` frontmatter block — those entries are already written as user-facing capability statements, so no rewriting is needed
  - "What will be delivered" is sourced from the ROADMAP.md goal and success criteria, rendered as an unchecked checklist so completed vs planned phases read differently at a glance
  - Change detection hashes the description we generate, never the one Linear returns — Linear normalizes markdown on write, so a text compare would rewrite all 34 issues on every run forever
  - Project uses both Linear fields — short plain-text `description` for the core value, rich markdown `content` for the overview document
  - upsertIssue now returns {issue, action} so the completion counter reports what actually happened
metrics:
  duration: ~15 minutes
  completed: 2026-07-28
---

# Quick Task 260728-rvv: Narrative Descriptions for the Linear Mirror

**One-liner:** Linear now reads as an overview of the project's whole arc — every completed phase describes what actually shipped, every future phase describes what it will deliver, and the project itself carries a full markdown overview with a per-milestone phase index.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Generate narrative descriptions from SUMMARY.md and PLAN.md | 6b50197 | scripts/linear-sync.mjs |
| 2 | Make description changes actually propagate | 6b50197 | scripts/linear-sync.mjs |

Both tasks landed in one commit — task 2's hash tracking is what makes task 1's output reach
Linear at all, so splitting them would have produced an intermediate commit whose behavior was
unobservable.

## What Was Built

**Phase issues** now branch on whether the phase has shipped work:

- Completed phases lead with `## What was built`, aggregating the `provides:` entries across all
  of that phase's plan summaries, followed by success criteria rendered as a checked list.
  Phase 9 produces 15 concrete capability bullets this way.
- Not-yet-started phases lead with `## What this will deliver`, carrying the roadmap goal and
  success criteria as an unchecked list.
- Both carry a `## Plans` checklist.

**Plan sub-issues** carry the first paragraph of their PLAN.md `<objective>` block, plus the
outcome one-liner and that plan's `provides:` entries once a SUMMARY.md exists.

**The project** gained a markdown overview: what Honey_Do is and its core value (read from
PROJECT.md), then a table per milestone showing every phase with its derived state and goal.

## Bugs Found and Fixed

1. **Description changes never propagated.** `upsertIssue` compared only title and state, so the
   improved descriptions would have been generated and then silently discarded for all 34
   existing issues. Fixed with a `descHash` recorded per issue in `linear-map.json`.

2. **Naive text comparison would have caused permanent churn.** Linear normalizes markdown on
   write — it rewrote `_italic_` as `*italic*` in the descriptions from task 260728-rl5. Hashing
   Linear's returned text against ours would report a diff on every run and rewrite all 34 issues
   forever. The hash is therefore taken over the *generated source*, never the API response.

3. **The completion counter lied.** A run that updated 34 descriptions printed
   `0 created, 0 state changes`, because the counter only compared state names. `upsertIssue` now
   returns the action it took and the summary line reads `N created, N updated`.

## Verification

- **Backfill** — all 34 existing issues plus the project were updated in one run.
- **No churn** — two consecutive follow-up runs both reported `0 created, 0 updated`, confirming
  the hash approach neutralizes Linear's markdown normalization.
- **Counter honesty** — deleting a single stored `descHash` and re-running produced exactly
  `0 created, 1 updated`, touching only HON-32.
- **Output inspected, not assumed** — read back Phase 9 (completed, 4 plans → 15 "what was built"
  bullets), Phase 11 (not started → unchecked deliverables), plan sub-issue 09-02 (objective +
  delivered), and the project overview document.
- **Regression** — `npx vitest run` 13 files / 89 tests pass; `npx eslint .` still exactly 8
  pre-existing warnings.

## Deviations from Plan

Tasks 1 and 2 were committed together rather than atomically, for the reason given above.

## Known Limitations

- Plan sub-issues show an `## Outcome` section only when the summary has a `**One-liner:**` line;
  summaries without one fall back to the objective and delivered list.
- Still manual-trigger only — `make linear-sync` must be run for any of this to refresh.
- Quick tasks, pending todos, and the 21 v1.2 requirements remain unsynced.

## Self-Check: PASSED

- `scripts/linear-sync.mjs` — FOUND (description generators + hash tracking present)
- `.planning/linear-map.json` — FOUND (34 entries, each carrying a `descHash`)
- Commit 6b50197 — FOUND
