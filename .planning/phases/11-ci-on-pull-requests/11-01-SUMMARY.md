---
phase: 11-ci-on-pull-requests
plan: 01
subsystem: ci
tags: [github-actions, eslint, typescript, ci, tooling]

# Dependency graph
requires: []
provides:
  - "`npm run typecheck` script (tsc --noEmit) — repo now typechecks clean, 0 errors"
  - "Zero-warning lint baseline — `npx eslint . --max-warnings 0` exits clean for the first time"
  - ".github/workflows/ci.yml — runs typecheck, lint, and the unit suite on every PR into main"
  - "argsIgnorePattern '^_' on no-unused-vars, aligning the linter with the _cols/_table convention the test mocks already used"
  - "Documented suppression of react-hooks/incompatible-library on the react-hook-form watch() call driving the 160-char counter"
affects: [12-legal-pages, 13-repo-visibility, 14-structured-logging, 15-security-headers, 16-sentry, 17-uptime]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CI gate = typecheck + lint(--max-warnings 0) + vitest run, as three separately-named steps so failures self-identify"
    - "CI never runs npm run build (it is drizzle-kit migrate && next build, requires a live DB) and provisions no Postgres"

key-files:
  created:
    - .github/workflows/ci.yml
  modified:
    - package.json
    - eslint.config.mjs
    - tests/task/update-task-status.test.ts
    - tests/task/create-task.test.ts
    - tests/task/helpers.ts
    - src/app/(app)/help/page.tsx
    - src/components/tasks/task-creation-form.tsx

metrics:
  duration: ~20 minutes
  completed: 2026-07-28
---

# Phase 11 Plan 01: Clean Baseline + CI Workflow

**One-liner:** The repo now passes a zero-tolerance typecheck/lint/test gate, and a GitHub Actions workflow enforces that exact gate on every pull request into `main`.

## Tasks Completed

| Task | Name | Commit |
|------|------|--------|
| 1 | Add typecheck script and fix the 4 type errors | 8cd8253 |
| 2 | Clear remaining lint warnings to zero | 588cfec |
| 3 | Add the GitHub Actions workflow | 7a36e80 |

## Success Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `npm run typecheck` exists and reports zero errors | **Met** — script added, `tsc --noEmit` exits 0 |
| 2 | `npm run lint` reports zero errors and zero warnings | **Met** — 8 → 0 |
| 3 | Opening a PR triggers a GitHub Actions run | **Pending** — workflow committed but unproven until a real PR exists (plan 11-02) |
| 4 | A failing check blocks merging | **Not started** — plan 11-02 |
| 5 | No database, no `npm run build` | **Met** — verified below |

## How the Four Type Errors Were Fixed

- **107/108** — `mockUpdateSet` was declared zero-arg (`vi.fn(() => ...)`), so `mock.calls` had
  tuple type `[][]` and `calls[0][0]` was an out-of-range index. Declaring the parameter the
  production code actually passes (`_values: Record<string, unknown>`) types it correctly.
- **153/157** — `capturedTxUpdate` is assigned only inside the transaction callback, so TS still
  saw its `null` initializer at the use sites and rejected both direct casts. Narrowed once
  through `unknown` into a local, which also removed a duplicated cast.

## How the Eight Lint Warnings Went to Zero

- **4 cleared by config** — added `argsIgnorePattern: "^_"` to `@typescript-eslint/no-unused-vars`.
  This is not warning-hiding: the codebase already used `_cols` / `_table` / `_cond` to signal
  intentionally-unused parameters, so the config now matches the convention in use. Unused
  *variables* and imports are still reported.
- **3 deleted** — genuinely unused imports: `ClipboardList`, `mockTask`, `vi`.
- **1 suppressed in scope** — `react-hooks/incompatible-library` on `watch("text")`, per the
  locked decision in CONTEXT.md, with the rationale written next to it.

## Verification

- `npm run typecheck` — exits 0.
- `npx eslint . --max-warnings 0` — exits 0.
- `npx vitest run` — 13 files / 89 tests pass, unchanged from baseline.
- All three run in sequence locally, exactly as the workflow defines them.
- Workflow parsed as valid YAML; single job `ci` (so the branch-protection check context will be
  `ci`); asserted no `build` string anywhere in the file.
- **Criterion 5 evidenced, not assumed** — `grep` confirms 7 test files mock `@/lib/db` and no
  test anywhere references `DATABASE_URL`, `postgres(`, `new Pool`, or `drizzle(`.

## Deviations from Plan

None. The `argsIgnorePattern` change was anticipated in the plan as the enabler for the `_values`
type fix, and it cleared 4 warnings as predicted.

## Notes for Plan 11-02

- The check context to mark required will be **`ci`** (job id, no `name:` override).
- The workflow triggers on `push` to `main` as well as PRs, specifically so the check has
  default-branch history and appears in the protection dropdown.
- Criterion 3 cannot be marked met until a real PR has actually triggered a run.
