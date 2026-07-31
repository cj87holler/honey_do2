---
phase: 13
slug: repo-visibility-private
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-30
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `13-RESEARCH.md` § Validation Architecture.

**Nature of this phase:** no application code changes. Validation is entirely
CLI-observational — it verifies live GitHub and Vercel state before and after a one-time,
outward-facing administrative action. There is nothing to unit test.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — CLI-observational (`gh`, `vercel`, `git`) |
| **Config file** | none |
| **Quick run command** | `gh repo view --json visibility,isPrivate --jq '{visibility,isPrivate}'` |
| **Full suite command** | Run every row of the Per-Task Verification Map in order |
| **Estimated runtime** | ~2 min for CLI checks; SC2 adds one merge-to-`main` deploy cycle (~2–4 min) |

The repo's existing automated suite (`npx vitest run`, `npx tsc --noEmit`, `npx eslint .`) is
**not** a validation surface for this phase — no source files change. It runs anyway via the
`ci` workflow on any PR this phase opens.

---

## Sampling Rate

- **After every task commit:** N/A — this phase has no code-producing tasks.
- **After the flip task:** Run the quick command plus the branch-protection diff immediately.
  These two are the highest-signal checks and must run before anything else proceeds.
- **After every plan wave:** Full map below.
- **Before `/gsd:verify-work`:** SC1 and SC2 both green; protection-diff outcome recorded
  either way.
- **Max feedback latency:** ~5 s for SC1 and the protection diff; up to ~4 min for SC2
  (bounded by Vercel's Production build).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| baseline | 01 | 1 | SEC-06 | T-13-02 | Pre-flip state captured so a silent regression is detectable | CLI capture | `gh api repos/cj87holler/honey_do2/branches/main/protection > .planning/phases/13-repo-visibility-private/pre-flip-protection.json` | N/A — capture, not assertion | ⬜ pending |
| plan-check | 01 | 1 | SEC-06 | T-13-02 | Account plan known before an irreversible-ish change | CLI | `gh api user --jq '.plan.name'` (needs `gh auth refresh -h github.com -s user` first — current token lacks the `user` scope) | N/A | ⬜ pending |
| flip | 01 | 1 | SEC-06 | T-13-01 | Repository source is no longer publicly readable | CLI/observational | `gh repo view --json visibility,isPrivate --jq '{visibility,isPrivate}'` → expect `{"visibility":"PRIVATE","isPrivate":true}` | N/A — this IS the verification (SC1) | ⬜ pending |
| protection-diff | 01 | 1 | SEC-06 (regression guard) | T-13-02 | Phase 11's merge gate did not silently disappear | CLI/observational | `diff <(gh api repos/cj87holler/honey_do2/branches/main/protection) .planning/phases/13-repo-visibility-private/pre-flip-protection.json` → expect no differences; a 404 means protection was dropped | N/A | ⬜ pending |
| deploy-trigger | 01 | 1 | SEC-06 (SC2) | T-13-03 | GitHub→Vercel integration survived the visibility change | CLI/observational | After a trivial commit merged to `main`: `gh api repos/cj87holler/honey_do2/deployments --jq '.[0] \| {environment,created_at,sha}'` cross-checked against `vercel list` showing a fresh Production row | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**SC2 must be measured on `main`, not on a PR preview.** This project's Preview deployments have
failed on every run for weeks for an unrelated, already-documented reason (Neon injects
`DATABASE_URL` into Production only, so previews die at `drizzle-kit migrate`). A failing
preview after the flip is expected noise and is **not** evidence the integration broke. The
signal being tested is *deploy triggered*, not *deploy succeeded* — a Production deploy on
`main` gives both signals cleanly.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — no test framework, fixtures, or stubs
need to be built. The only Wave 0-shaped prerequisite is a **credential scope refresh**, which
is interactive and cannot be run unattended:

- [ ] `gh auth refresh -h github.com -s user` — required before `gh api user --jq '.plan.name'`
      can resolve the account plan. Must be run by the user in their own terminal.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Anonymous visitor cannot read the repo | SEC-06 (SC1, stronger form) | Requires an unauthenticated client; `gh` is always authenticated as the owner | Open `https://github.com/cj87holler/honey_do2` in a logged-out browser or private window — expect a 404 |
| Account plan is Free vs. Pro | SEC-06 (risk gate) | `gh auth refresh` opens an interactive browser flow | User runs `gh auth refresh -h github.com -s user`, then `gh api user --jq '.plan.name'` |
| Secret scanning / push protection still active | not a stated SC — pitfall watch | GitHub silently deactivates these on private Free repos with no error | `gh api repos/cj87holler/honey_do2 --jq '.security_and_analysis'` before and after; record the delta |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or documented manual instructions
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (credential scope refresh acknowledged)
- [ ] No watch-mode flags
- [ ] Feedback latency < 240s
- [ ] Pre-flip baseline captured before the flip task runs — non-negotiable ordering
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
