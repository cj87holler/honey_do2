# Phase 11: CI on Pull Requests — Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Every pull request targeting `main` is automatically checked for type errors, lint violations, and
test failures, and cannot merge until all three pass.

In scope: a `typecheck` npm script, fixing the pre-existing type errors and lint warnings that
would otherwise fail a zero-tolerance gate, a GitHub Actions workflow, one real PR to prove the
workflow runs, and branch protection wired to the resulting check.

Out of scope: Playwright/E2E, build verification in CI, database provisioning in CI, preview
deployments, and any other v1.2 phase.
</domain>

<decisions>
## Implementation Decisions

### Zero-tolerance lint gate — how the React Compiler warning is cleared

`npx eslint .` reports 8 warnings. Seven are trivial unused-variable warnings. The eighth is
different in kind:

```
src/components/tasks/task-creation-form.tsx:40:23
  react-hooks/incompatible-library  Compilation Skipped: Use of incompatible library
```

It flags `watch("text")` from react-hook-form, which powers the 160-character counter.

**Decision: scoped `eslint-disable-next-line` with an explanatory comment.** Not a refactor to
`useWatch`, and not disabling the rule repo-wide.

Rationale — two facts drove this:
- **React Compiler is not enabled** in `next.config.ts`. The warning is advisory about code that
  would not be compiled anyway, so it has zero runtime impact today.
- **No test covers `task-creation-form.tsx`.** Refactoring `watch` → `useWatch` would ship an
  unverified change to the 160-character limit, which is a hard project constraint in CLAUDE.md.
  Trading a real regression risk for a cosmetic lint win during a CI-setup phase is a bad deal.

A scoped suppression keeps the rule active everywhere else, and the warning returns the moment
anyone enables React Compiler — which is exactly when it should be revisited.

### Branch protection strictness

**Decision: required status checks AND `enforce_admins: true`.**

Success criterion 4 says a PR with a failing check is blocked from merging. Today
`enforce_admins` is `false` and the user has repo ADMIN, so without this the criterion would be
only nominally true — the user could always merge red. Enforcing for admins makes it genuinely
true. It stays reversible: `enforce_admins` can be flipped off manually for an emergency merge.

Not chosen: requiring an approving review. On a solo project that would block the user from
merging their own PRs entirely.

### PR strategy

**Decision: PR `dev` → `main`, per the existing documented workflow.**

`docs/DEV_WORKFLOW.md` (committed 2026-06-17) already establishes: work on `dev`, push, then
`gh pr create --base main --head dev`, squash merge. `dev` is currently 13 commits ahead of
`main`. No new branch convention is invented for this phase — the phase's own commits land on
`dev` and ride the same PR that proves the gate.

### Ordering constraint

Criterion 4 explicitly requires configuring required status checks **after** the workflow has run
once on a real PR, so the check name can be selected from GitHub's dropdown rather than typed from
memory. This makes the phase inherently two-staged with a human-visible checkpoint in the middle,
and the second stage cannot be completed until GitHub has seen a real run.

### Claude's Discretion

- Exact workflow file layout, job/step naming, and action versions
- Node version pinning (repo runs v22.11.0; `package.json` declares no `engines`)
- Dependency install strategy (`npm ci` against the committed `package-lock.json`)
- Concurrency/cancel-in-progress settings
- How the 4 type errors in `tests/task/update-task-status.test.ts` are narrowed
</decisions>

<canonical_refs>
## Canonical References

### Requirements & Roadmap
- `.planning/ROADMAP.md` → "Phase 11: CI on Pull Requests" — goal, 5 success criteria, CI-01..CI-05
- `.planning/STATE.md` → verified baselines recorded 2026-07-27

### Existing Workflow Documentation
- `docs/DEV_WORKFLOW.md` — the dev → PR → main loop this phase must fit into

### Config
- `eslint.config.mjs` — flat config, `eslint-config-next` core-web-vitals + typescript
- `next.config.ts` — confirms React Compiler is NOT enabled
- `package.json` — scripts: dev, build, start, lint, test. No `typecheck`, no `engines`.
</canonical_refs>

<code_context>
## Verified Baselines (re-checked 2026-07-28, this session)

- `npx tsc --noEmit` — **4 errors**, all in `tests/task/update-task-status.test.ts`
  (107:48 TS2493, 108:12 TS18048, 153:30 TS2352, 157:25 TS2352). Zero in `src/`.
- `npx vitest run` — **passes**, 13 files / 89 tests.
- `npx eslint .` — **8 warnings, 0 errors**.
- No `.github/workflows/` directory exists.
- `package-lock.json` present; npm is the package manager. No `packageManager` field.
- Node v22.11.0 locally.

### Correction to STATE.md's recorded baseline

STATE.md says the 8 lint warnings are all "in test files". That is **wrong** — 2 of the 8 are in
`src/`:
- `src/app/(app)/help/page.tsx:8:3` — unused `ClipboardList` import
- `src/components/tasks/task-creation-form.tsx:40:23` — `react-hooks/incompatible-library`

The remaining 6 are in `tests/`. This matters because the second `src/` warning is the
non-trivial one addressed above.

### Concerns / Things to Verify During Execution

- **CI must not run `npm run build`** — `build` is `drizzle-kit migrate && next build`, which
  requires a live database. Criterion 5 makes this explicit.
- **CI needs no Postgres container** — every DB-touching test mocks `vi.mock("@/lib/db", ...)`.
  Re-confirm this holds before relying on it.
- **Stale `worktree-agent-*` branches** exist locally from earlier GSD runs. Unrelated to this
  phase, but they pollute `git branch` output.
</code_context>

<deferred>
- Playwright / E2E in CI — explicitly deferred out of v1.2
- Build verification in CI — blocked by the database requirement in `npm run build`
- Preview deployments — blocked, `DATABASE_URL` is Production-only (a standing v1.2 blocker)
- Enabling React Compiler — out of scope; would reopen the `watch()` decision above
- Adding test coverage for `task-creation-form.tsx` — real gap, but belongs to a polish phase
</deferred>
