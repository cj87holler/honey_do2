---
phase: 11-ci-on-pull-requests
plan: 02
subsystem: ci
tags: [github-actions, branch-protection, ci, github]

# Dependency graph
requires:
  - phase: 11-ci-on-pull-requests
    provides: .github/workflows/ci.yml and a green typecheck/lint/test baseline
provides:
  - "PR #2 (dev → main) with a passing CI run — the proving run that made the check name selectable"
  - "`ci` registered as a required status check on main, with strict (up-to-date) enforcement"
  - "enforce_admins: true on main — a red check now blocks merging even for the repo owner"
  - "Directly observed proof that a failing check blocks merging (throwaway PR #3 reported mergeStateStatus BLOCKED)"
affects: [12-legal-pages, 13-repo-visibility, 14-structured-logging, 15-security-headers, 16-sentry, 17-uptime]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Branch protection is written via a full PUT — the API replaces the whole object, so every existing field must be re-sent or it is silently dropped"
    - "Only `ci` is required, deliberately not the Vercel check: previews cannot build in this project, so requiring Vercel would permanently block every merge"

key-files:
  created: []
  modified: []

metrics:
  duration: ~10 minutes
  completed: 2026-07-28
---

# Phase 11 Plan 02: Prove and Enforce the Gate

**One-liner:** The CI workflow ran green on a real pull request, `ci` is now a required status check on `main` with admin enforcement, and a deliberately-failing PR was observed being blocked from merging.

## Tasks Completed

| Task | Name | Result |
|------|------|--------|
| 1 | Push dev and open the proving PR | PR [#2](https://github.com/cj87holler/honey_do2/pull/2), 16 commits pushed |
| 2 | Confirm the workflow runs and passes | Run 30415151081 — **success in 43s**, check name `ci` |
| 3 | Make the check required, enforced for admins | Applied and read back |
| 4 | Demonstrate a failing check blocks the merge | PR #3 → `mergeStateStatus: BLOCKED`, then closed |

## Phase Success Criteria — Final Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `npm run typecheck` exists, zero errors | **Met** (plan 01) |
| 2 | `npm run lint` zero errors and warnings | **Met** (plan 01) |
| 3 | Opening a PR triggers a GHA run of typecheck, lint, tests | **Met** — run 30415151081 on PR #2 |
| 4 | A failing check is blocked from merging by required checks | **Met** — observed on PR #3 |
| 5 | No database provisioned, no `npm run build` | **Met** (plan 01) |

## Branch Protection — Before and After

| Setting | Before | After |
|---------|--------|-------|
| `required_status_checks` | `null` | `{ strict: true, contexts: ["ci"] }` |
| `enforce_admins` | `false` | `true` |
| `required_approving_review_count` | 0 | 0 (unchanged) |
| `allow_force_pushes` / `allow_deletions` | false | false (unchanged) |

The protection endpoint is a full replace, not a patch, so the existing
`required_pull_request_reviews` block had to be re-sent explicitly — omitting it would have
silently dropped the PR-required rule. Result was read back from the API and diffed against what
STATE.md recorded, rather than trusting the write.

**Only `ci` is required.** The Vercel check also runs on PRs and currently fails, because preview
deployments cannot build in this project (`DATABASE_URL` is injected into Production only — a
standing v1.2 blocker). Requiring it would have permanently blocked every merge.

## How Criterion 4 Was Actually Proven

Rather than inferring blocking from the settings, it was observed:

1. Branched `ci-gate-proof` off `dev` (so the branch carried the workflow), added a file with a
   deliberate `TS2322` error, pushed, opened PR #3.
2. CI failed in 31s. Log confirms the right cause:
   `tests/ci-gate-proof.test.ts(6,11): error TS2322: Type 'string' is not assignable to type 'number'`.
3. `gh pr view 3 --json mergeable,mergeStateStatus` → `{"mergeStateStatus":"BLOCKED","mergeable":"MERGEABLE"}`.
   `MERGEABLE` means no merge conflicts; `BLOCKED` is protection refusing the merge.
4. PR #3 closed, local and remote `ci-gate-proof` branches deleted. Verified: 0 matching remote
   refs, 0 local branches, PR state `CLOSED`.

A real `gh pr merge` was deliberately not attempted — if protection had been misconfigured it
would have merged a type error into `main`. `BLOCKED` plus the read-back API state is sufficient
evidence without that risk.

## Deviations from Plan

The proof branch was cut from `dev` rather than `main`. The plan said to use a throwaway branch,
which this was, but branching from `main` would have been wrong: `main` does not yet contain
`.github/workflows/ci.yml`, so no CI run would have triggered at all. The PR would still have shown
as blocked — but for a missing required check, not a *failing* one, which is not what criterion 4
claims. Branching from `dev` produced a genuine red run.

## Open Item

**PR #2 is open and unmerged.** Phase 11's work is complete and verified, but it has not shipped to
production. The phase is intentionally left unchecked in ROADMAP.md so it surfaces as *In Review* —
merging PR #2 is a human decision, and merging it is what closes the phase out.
