# Phase 13: Repo Visibility → Private - Research

**Researched:** 2026-07-30
**Domain:** GitHub repository administration (visibility, branch protection, Actions billing, GitHub↔Vercel integration)
**Confidence:** MEDIUM — the mechanics of the flip are HIGH confidence (empirically verified in this repo); the single biggest risk (does branch protection survive) is MEDIUM/LOW because the one fact that would fully resolve it — this account's exact GitHub plan — could not be verified with the current CLI auth scope.

## Summary

This phase is a GitHub repo-settings change, not a code change. The mechanics are simple —
`gh repo edit --visibility private --accept-visibility-change-consequences` — but the phase's
real content is in the *verification*, because two things could silently break and neither would
show up in the app itself: branch protection on `main`, and the GitHub→Vercel deploy webhook.

The repo (`cj87holler/honey_do2`) is a **personal (non-org) account**, currently **public**, with
classic branch protection live on `main` (`enforce_admins: true`,
`required_status_checks: {strict: true, contexts: ["ci"]}`, shipped in Phase 11). Multiple
corroborating sources (GitHub's own community discussions through 2025–2026, and `gh repo edit
--help`'s own bundled warning text on this machine's gh 2.89.0) agree that **classic branch
protection rules and rulesets are both restricted to public repositories on GitHub Free for
personal accounts — private-repo branch/ruleset protection requires GitHub Pro or higher.** If
this account is on Free, flipping to private will very likely silently drop the Phase 11
protection the moment the flip happens, with no error and no warning banner — `gh repo edit`
still returns success either way.

**This account's actual plan (Free vs. Pro) could not be determined in this research session.**
The installed `gh` token has scopes `gist, read:org, repo, workflow` — it does NOT have the
`user` scope, and GitHub's `/user` endpoint only returns the `plan` object when the `user` scope
is present (confirmed empirically: the response came back tagged `"user_view_type":"public"`,
the unauthenticated view). Getting the plan requires either `gh auth refresh -h github.com -s
user` (interactive device-flow re-auth) or checking https://github.com/settings/billing manually
— both are one-time, low-risk, read-only actions appropriate for the execute-phase pre-flight,
not for this research session (execution should not silently expand its own OAuth grant without
being asked to).

The second risk — GitHub Actions billing — is low. Private repos on Free get 2,000 free Linux
minutes/month; this repo's CI workflow (typecheck + lint + test, `ubuntu-latest`, no build, no DB)
ran in 43 seconds on its one real PR (Phase 11 SUMMARY.md), i.e. ~1 billed minute per run at 1x
multiplier. Even generous PR volume for a household hobby project stays two orders of magnitude
under the free allotment.

The third risk — does the Vercel integration survive — is well-scoped by an existing, already-
documented blocker: Preview deployments in this project fail today for an unrelated reason (Neon
injects `DATABASE_URL` into Production only, so `drizzle-kit migrate` fails on every preview
build). That means a post-flip Preview build failing is **expected noise, not a regression
signal**. The clean signal is whether a deployment record gets created at all (proves the webhook
still fires) and, for a fully unambiguous result, whether a **Production** deploy (triggered by
merging to `main`) still completes successfully — Production is the one environment that
currently works end-to-end.

**Primary recommendation:** Capture branch-protection JSON and repo metadata before the flip,
run the flip, immediately re-read branch protection to detect silent loss, and use a merge-to-
`main` (not just an open PR) as the clean Vercel-trigger signal since Preview is known-broken for
an unrelated, already-documented reason.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| SEC-06 | The GitHub repository is private | Standard Stack (verified `gh repo edit` flip command), Common Pitfalls 1/4/5 (risks the flip can trigger), Code Examples (exact pre-flip capture, flip, and post-flip verification commands), Validation Architecture (SC1/SC2 verification map) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Directive | Source | Relevance to Phase 13 |
|-----------|--------|------------------------|
| Tech stack: Next.js + PostgreSQL, "keep it lightweight" | CLAUDE.md Constraints | Not implicated — this phase touches no app code, dependencies, or database |
| Dev setup: Makefile-driven with clear documentation | CLAUDE.md Constraints | No new Makefile target is needed; this is a one-time administrative `gh`/`vercel` CLI operation, not a repeatable dev-workflow step |
| GSD Workflow Enforcement — file-changing tools only through a GSD command (`/gsd:execute-phase`, `/gsd:quick`, `/gsd:debug`) | CLAUDE.md | The visibility flip and branch-protection reads are `gh api`/`gh repo edit` calls rather than file edits, but the same discipline applies: execute via `/gsd:execute-phase` so the action, its verification, and any deviation are tracked in STATE.md/SUMMARY.md rather than run ad hoc outside a GSD session |
| "Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it" | CLAUDE.md | The visibility flip is a repo-level edit with real, partly-irreversible consequences (see Pitfall 1, Rollback notes) — treat it with at least the same caution as a file edit and keep it inside the GSD execution flow |

## Architectural Responsibility Map

This phase has no application-tier capabilities (no Browser/SSR/API/DB code changes). Mapping
adapted to the operational surfaces actually involved:

| Capability | Primary Owner | Secondary Owner | Rationale |
|------------|---------------|------------------|-----------|
| Repository visibility | GitHub repo settings (`gh repo edit`) | — | Single source of truth is the GitHub API; no app code reads or depends on visibility |
| Branch protection enforcement | GitHub branch protection API (`branches/{branch}/protection`) | GitHub plan/billing (gates availability on private repos) | Protection rules are stored per-repo but their *availability* is gated by account plan, not by repo settings — this is the coupling that creates the phase's main risk |
| CI execution | GitHub Actions (`.github/workflows/ci.yml`, Phase 11) | GitHub Actions billing (private repos are metered) | Workflow itself is unchanged by this phase; only its billing model changes |
| Deploy triggering | GitHub↔Vercel App integration (webhook on push/PR) | Vercel project settings | Vercel is authorized via the "Vercel" GitHub App, not a personal token — App-based integrations are the type most likely to survive a visibility change cleanly (see Pitfall 3) |
| Secret/dependency scanning | GitHub security features (`security_and_analysis` block) | — | Currently enabled (public-repo free tier); likely becomes unavailable/inactive on private without GitHub Advanced Security |

## Standard Stack

No new libraries or packages are introduced by this phase — it is a GitHub account/repo
configuration change executed via existing CLIs. There is no `## Package Legitimacy Audit`
section because no packages are installed.

### Tools already present and verified on this machine

| Tool | Version (verified) | Purpose | Confidence |
|------|---------------------|---------|------------|
| `gh` (GitHub CLI) | 2.89.0 (2026-03-26) | `gh repo edit`, `gh api`, branch protection reads | `[VERIFIED: gh --version, this session]` |
| `vercel` (Vercel CLI) | 51.2.0 | `vercel list` to confirm deployment records | `[VERIFIED: vercel --version, this session]` |
| `git` | ambient (already in use) | trivial commit for the verification step | `[VERIFIED: repo already git-managed]` |

**Installation:** None required — both CLIs are already installed and authenticated
(`gh auth status` shows an active, authenticated `github.com` session with `repo`+`workflow`
scopes; `vercel list` returned live project data in this session).

## Package Legitimacy Audit

N/A — this phase installs no packages.

## Architecture Patterns

### Operational Runbook Diagram

```
[Pre-flip capture]                  [Flip]                       [Post-flip verify]
                                                                                    
gh api .../branches/main/  ──┐                                                     
  protection  (save JSON)    │                                                     
                              │      gh repo edit \                gh repo view →
gh repo view --json          ─┼──►    --visibility private   ──►    visibility=PRIVATE
  visibility,isPrivate        │       --accept-visibility-           isPrivate=true
                              │       change-consequences                          
gh auth refresh -s user      ─┘            │                       gh api .../branches/main/
  → gh api user --jq .plan.name            │                         protection  (diff vs saved)
  (determine Free vs Pro)                  │                              │
                                            │                         404? ──► protection LOST
                                            │                                  (confirms Free-plan
                                            │                                   risk; see Pitfall 1)
                                            ▼                              │
                                    repo now PRIVATE                  200? ──► protection SURVIVED
                                                                                (likely Pro plan)
                                                                                    │
                                                                                    ▼
                                                              [Vercel trigger check]
                                                              git checkout -b sec06-verify
                                                              trivial commit → push → PR
                                                              → merge to main (through normal
                                                                CI-gated flow, squash merge)
                                                              gh api .../deployments
                                                                → new Production entry,
                                                                  sha matches, status Ready
                                                              (Preview entry may show Error —
                                                               that is the PRE-EXISTING
                                                               DATABASE_URL-on-preview bug,
                                                               not a regression from this phase)
```

### Pattern: Read-back verification, not trust-the-write

Phase 11's own SUMMARY.md documents this exact pattern already used successfully in this repo:
"Result was read back from the API and diffed against what STATE.md recorded, rather than
trusting the write." Apply the same discipline here — `gh repo edit`'s exit code 0 only proves
the *visibility* field changed; it says nothing about whether branch protection survived. Always
re-`GET` after the mutating call.

### Anti-Patterns to Avoid

- **Trusting `gh repo edit`'s success exit code as proof branch protection is intact.** The
  visibility flip and the protection-availability check are two independent GitHub subsystems;
  a successful visibility change can coexist with silently dropped protection.
- **Using an open (unmerged) PR as the Vercel-trigger signal.** It only proves a Preview
  deployment was *attempted* — which is already known to fail here for an unrelated reason, so a
  failed Preview after the flip is ambiguous evidence. Merging to `main` and checking the
  Production deployment is unambiguous.
- **Retrying `gh repo edit --visibility private` if it appears to hang or is run twice.** It is
  not a safe blind-retry command — re-running it while already private, or immediately toggling
  back and forth, can compound the "detach forks / lose watchers" consequences GitHub warns about
  (moot here since forks/stars are currently 0, but worth avoiding as a habit).

## Don't Hand-Roll

Not applicable — this phase does not build software. There is no custom solution to avoid
building; the task is entirely "use the GitHub CLI/API correctly and verify."

## Common Pitfalls

### Pitfall 1: Branch protection silently dropped on Free-plan private repos
**What goes wrong:** After the flip, `main` has no required status checks and no
`enforce_admins` — a red CI run or a direct push can land on `main` with nothing blocking it,
undoing Phase 11's entire guarantee, with no error message anywhere.
**Why it happens:** GitHub Free restricts both classic branch protection rules *and* the newer
rulesets to public repos for personal (non-org) accounts; Pro and above unlock them for private
repos too. `[CITED: GitHub community discussions #174400, #174419, #190190, #198686 — cross-
referenced against gh CLI 2.89.0's own bundled `gh repo edit --help` warning text, which lists
"Disabling push rulesets" as a documented consequence of a visibility change]`. This is
consistent across 2025–2026 sources with no contradicting official statement found. **Note: this
was NOT confirmed by directly fetching a current github.com/en/get-started/learning-about-github
page that enumerates it line-by-line for personal accounts specifically — WebFetch on that page
returned an inconclusive/partial read. Treat as MEDIUM confidence, not HIGH, until re-verified
against this account's actual plan.**
**How to avoid:** Before flipping, determine the account's plan
(`gh auth refresh -h github.com -s user` then `gh api user --jq '.plan.name'`, or check
https://github.com/settings/billing). If Free: either (a) accept the regression consciously and
document it — since this is a solo-maintainer repo, "no branch protection" mostly loses the
*self*-discipline value Phase 11 added, not multi-contributor safety — or (b) upgrade to GitHub
Pro (~$4/mo) before flipping to keep protection. Either way, capture the pre-flip protection JSON
and diff it post-flip so the outcome is *known*, not assumed.
**Warning signs:** `gh api repos/{owner}/{repo}/branches/main/protection` returns `404 Branch not
protected` (or a `403`/plan-upgrade message) immediately after the flip.

### Pitfall 2: Confusing "Preview deploy failed" with "integration broke"
**What goes wrong:** A trivial commit is pushed, a Preview deployment shows `Error` status, and
that gets misread as proof the GitHub↔Vercel integration didn't survive the visibility change —
triggering unnecessary rollback or debugging.
**Why it happens:** This project's Preview deployments have failed on every single run for
weeks, for a documented, unrelated reason: Neon only injects `DATABASE_URL` into the Production
environment, so `drizzle-kit migrate` fails with `url: undefined` on every preview build
(`.planning/STATE.md` Blockers/Concerns; also directly observed in this session — 9 of the last
9 Preview entries in `vercel list` show `Error`, all in 4–19 seconds, consistent with an early
build-step failure, not a webhook failure). `[VERIFIED: vercel list, this session]`
**How to avoid:** Use `gh api repos/{owner}/{repo}/deployments` to confirm a *new deployment
record was created at all* (proves the webhook fired) — that is what "integration survived"
means, independent of build success. For a success/failure signal, use the Production
environment (triggered by merging to `main`), which has a clean track record: the last 3
Production entries observed in this session were all `Ready` in 39–59s.
**Warning signs:** None if you check the right environment; the failure mode is a false-positive
"it's broken" conclusion from checking the wrong one.

### Pitfall 3: Assuming the flip breaks GitHub Actions
**What goes wrong:** Worrying the CI workflow itself needs changes for a private repo.
**Why it happens:** Private repos have metered Actions minutes vs. public's unlimited — easy to
conflate "metered" with "broken."
**How to avoid:** No workflow change needed. `ubuntu-latest` runners bill at 1x; this workflow
(typecheck + lint + test, no DB, no build) completed in 43s on its one observed real run
(`.planning/phases/11-ci-on-pull-requests/11-02-SUMMARY.md`), i.e. ≈1 billed minute per run.
Free private-repo allotment is 2,000 Linux minutes/month `[CITED: docs.github.com/en/billing —
via WebSearch cross-referenced against docs.github.com/en/actions/concepts/billing-and-usage,
current as of 2026]`. Even at ~30 PR-triggered runs/month (each push+PR event pair ≈2 runs), that
is ~60 minutes/month — comfortably inside the free tier. No action needed; flag as FYI only.
**Warning signs:** A billing email from GitHub about exceeding the Actions minutes allotment —
extremely unlikely given the above math, and the account's default $0 Actions spending limit
means jobs would simply stop (not silently overcharge) if it were ever exceeded.

### Pitfall 4: `gh repo edit --visibility private` fails without the consequences flag
**What goes wrong:** Running the bare `--visibility private` flag errors out.
**Why it happens:** gh 2.89.0 (installed here) requires `--accept-visibility-change-consequences`
whenever `--visibility` is passed — confirmed directly from this machine's `gh repo edit --help`
output in this session. `[VERIFIED: gh repo edit --help, this session, gh 2.89.0]`
**How to avoid:** Always pass both flags together:
`gh repo edit cj87holler/honey_do2 --visibility private --accept-visibility-change-consequences`
**Warning signs:** `gh: the flag --accept-visibility-change-consequences is required...` error
text.

### Pitfall 5: Secret scanning silently stops working
**What goes wrong:** `security_and_analysis.secret_scanning` and `.secret_scanning_push_protection`
are currently `enabled` on this repo (verified this session). Both are GitHub's free-for-public-
repos feature; on a private Free-plan repo, secret scanning for private repos is part of paid
GitHub Advanced Security. It is plausible these flags read back as `disabled` (or become
inert/no-op) after the flip.
**Why it happens:** Same plan-gating mechanism as branch protection, applied to a different
feature family. `[CITED: WebSearch cross-referencing GitHub's public-repo secret-scanning
announcements vs. GitHub Advanced Security private-repo pricing pages — MEDIUM confidence,
not independently confirmed against this specific account's plan]`
**How to avoid:** Not a blocker for SEC-06 (which only requires visibility=private), but worth a
one-line note in the phase's execution summary so it isn't discovered by surprise later. Capture
`gh api repos/{owner}/{repo} --jq '.security_and_analysis'` before and after the flip alongside
the branch-protection diff.
**Warning signs:** `secret_scanning.status` reads `disabled` post-flip despite not being touched.

## Code Examples

### Pre-flip baseline capture
```bash
# Source: this session, gh 2.89.0 / GitHub REST API — VERIFIED live against this repo
gh repo view --json visibility,isPrivate,owner,nameWithOwner
# {"isPrivate":false,"nameWithOwner":"cj87holler/honey_do2","owner":{"login":"cj87holler"},"visibility":"PUBLIC"}

gh api repos/cj87holler/honey_do2/branches/main/protection > /tmp/main-protection-preflip.json
# Currently: required_status_checks {strict:true, contexts:["ci"]}, enforce_admins.enabled:true,
# required_pull_request_reviews.required_approving_review_count:0

gh api repos/cj87holler/honey_do2 --jq '{private,visibility,security_and_analysis,allow_forking,forks_count,stargazers_count}' > /tmp/repo-meta-preflip.json
# forks_count:0, stargazers_count:0 — the "lose stars/detach forks" consequence GitHub warns
# about is a non-issue for this specific repo; nothing to lose.

# Determine plan (requires broader token scope — do this once, explicitly, at execution time):
gh auth refresh -h github.com -s user
gh api user --jq '.plan.name'
```

### The flip itself
```bash
# Source: gh repo edit --help, this session, gh 2.89.0 — VERIFIED
gh repo edit cj87holler/honey_do2 --visibility private --accept-visibility-change-consequences
```

### Post-flip verification (success criterion 1)
```bash
gh repo view --json visibility,isPrivate --jq '{visibility,isPrivate}'
# Expected: {"visibility":"PRIVATE","isPrivate":true}
```

### Post-flip protection diff (regression check, not a stated success criterion but required
### to avoid re-discovering Phase 11's protection is gone weeks later)
```bash
gh api repos/cj87holler/honey_do2/branches/main/protection > /tmp/main-protection-postflip.json
diff /tmp/main-protection-preflip.json /tmp/main-protection-postflip.json
# No diff → protection survived (Pro plan, most likely)
# postflip command errors "404 Branch not protected" → protection was dropped (Free plan)
```

### Post-flip Vercel trigger verification (success criterion 2) — use Production, not Preview
```bash
git checkout -b sec06-visibility-verify
# trivial, harmless change — e.g. a one-line comment in a low-risk file
git commit -am "chore(13): trivial commit to verify Vercel deploy trigger post-privacy-flip"
git push -u origin sec06-visibility-verify
gh pr create --title "chore: verify Vercel deploy post-visibility-flip" --body "SEC-06 verification — see 13-RESEARCH.md"
# Wait for CI (if protection survived, this is enforced; if not, merge is still possible but
# should still be done through the normal PR flow for consistency).
gh pr merge --squash   # main uses squash merge per STATE.md PR workflow note
git checkout dev && git merge origin/main   # reconcile dev, per existing STATE.md convention

# Confirm a fresh Production deployment fired and succeeded:
gh api repos/cj87holler/honey_do2/deployments --jq '.[0:3] | .[] | {environment, created_at, sha}'
vercel list | head -5
# Expected: a new row, Environment=Production, Status=Ready, Age reflecting "just now"/minutes,
# sha matching the merge commit. A concurrently-created Preview row showing Error is EXPECTED
# and unrelated (see Pitfall 2) — do not treat it as a failure of this phase.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Classic branch protection (`branches/{branch}/protection`) | Repository Rulesets (`repos/{owner}/{repo}/rulesets`) | Rulesets GA'd 2023–2024 | This repo still uses classic protection (Phase 11 shipped it that way; `gh api .../rulesets` returns `[]` — confirmed this session). Both classic protection and rulesets are gated the same way for private personal-account repos on Free, so migrating to rulesets would not sidestep the risk in Pitfall 1. No reason to migrate as part of this phase. |

**Deprecated/outdated:** None directly relevant — no need to touch the branch-protection
mechanism type in this phase, only its plan-dependent availability.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | This GitHub account is on the Free plan (not Pro/Team) | Summary, Pitfall 1 | If actually Pro, the entire branch-protection-loss risk doesn't materialize and the extra pre/post-flip protection-diff step is just harmless due diligence — low downside either way. If actually Free and this assumption is wrong in the *other* direction (i.e., protection turns out to be fine anyway due to some grandfathering), the plan should still verify empirically rather than trust this assumption |
| A2 | GitHub Free's private-repo restriction covers *this specific* personal account exactly as described in community discussions (no grandfathering, no recent policy change past training-data cutoff) | Pitfall 1 | If GitHub quietly extended free private branch protection to personal accounts since these sources were written, the pre-flip mitigation work (plan check, possible Pro upgrade) would be unnecessary but harmless — the empirical post-flip diff check catches this regardless |
| A3 | Vercel's GitHub integration is authorized as a GitHub App (not a legacy OAuth/personal-token webhook) | Summary, Architectural Responsibility Map | If it were an old-style webhook tied to a specific user's repo-scoped permissions rather than an App installation, there's a higher chance the visibility flip requires re-authorizing access; this was not directly confirmed (no UI access to Vercel's GitHub integration settings page in this session) — the deployments-API check in the verification step will surface this either way, since a broken integration means zero new deployment records appear |
| A4 | Secret scanning / push protection becomes inactive (not necessarily literally "disabled" in the API response) on private Free repos | Pitfall 5 | Low impact — not a stated success criterion; worst case is a stale assumption that gets corrected by the direct before/after API diff already recommended |

## Open Questions

1. **What GitHub plan is `cj87holler`'s account actually on?**
   - What we know: it's a personal (User, not Organization) account; the current `gh` auth token
     lacks the `user` scope needed to read `.plan.name` from `/user`.
   - What's unclear: Free vs. Pro — this is the single fact that resolves Pitfall 1 with certainty.
   - Recommendation: at execute-phase time, run `gh auth refresh -h github.com -s user` (one-time,
     interactive, read-only scope expansion) then `gh api user --jq '.plan.name'`, or check
     https://github.com/settings/billing directly. Do this BEFORE the flip so the plan can decide
     whether an upgrade is warranted.

2. **Is Vercel's GitHub App installed at the App level or authorized per-repo via a personal
   token?**
   - What we know: deployments exist and are attributed to `vercel[bot]` as creator in the
     GitHub deployments API (observed this session) — this is consistent with (but not
     conclusive proof of) an App-based integration, which typically survives visibility changes
     more gracefully than personal-token-based webhooks.
   - What's unclear: whether any re-authorization step would be silently required.
   - Recommendation: the deployments-API check in the Code Examples section directly answers
     this empirically post-flip — no separate investigation needed before execution.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| `gh` CLI, authenticated | Flip + all verification | ✓ | 2.89.0 | — |
| `gh` token `user` scope | Reading `.plan.name` | ✗ (only `gist, read:org, repo, workflow`) | — | `gh auth refresh -h github.com -s user` (interactive, one-time) |
| `vercel` CLI, authenticated | Deployment verification (secondary to `gh api .../deployments`) | ✓ | 51.2.0 | `gh api repos/{owner}/{repo}/deployments` alone is sufficient if `vercel` were unavailable |
| GitHub repo ADMIN permission | `gh repo edit --visibility` | ✓ (confirmed by successful `11-02-SUMMARY.md` branch-protection writes, same account) | — | — |

**Missing dependencies with no fallback:** none — the `user` scope gap has a documented,
one-command fallback.

**Missing dependencies with fallback:** `user` OAuth scope (fallback: `gh auth refresh`).

## Validation Architecture

### Test Framework

Not applicable in the unit/integration-test sense — this phase has no code paths to unit test.
Validation is entirely CLI-observational, verifying live GitHub/Vercel state before and after a
one-time administrative action.

| Property | Value |
|----------|-------|
| Framework | None (CLI-observational, `gh` + `vercel` + `git`) |
| Config file | none |
| Quick run command | `gh repo view --json visibility,isPrivate` |
| Full suite command | see "Phase Requirements → Test Map" below — run all rows in sequence |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| SEC-06 (SC1) | Repo visibility is Private | CLI/observational | `gh repo view --json visibility,isPrivate --jq '{visibility,isPrivate}'` — expect `{"visibility":"PRIVATE","isPrivate":true}` | N/A — no test file, this IS the verification |
| SEC-06 (SC2) | A trivial commit after the flip still triggers an automatic Vercel deploy | CLI/observational | `gh api repos/cj87holler/honey_do2/deployments --jq '.[0] \| {environment,created_at,sha}'` after a merge to `main`, cross-checked with `vercel list` showing a fresh `Ready` Production row | N/A |
| (regression guard, not a stated SC) | Branch protection on `main` did not silently disappear | CLI/observational | `diff <(gh api repos/cj87holler/honey_do2/branches/main/protection) <pre-flip capture>` | N/A |

### Sampling Rate

- **Per task commit:** N/A — no code tasks in this phase.
- **Per wave merge:** Full runbook above (baseline capture → flip → SC1 check → protection diff →
  SC2 check via merge-to-main).
- **Phase gate:** All three checks above must pass (or their outcomes explicitly documented, in
  the case of the protection diff, since a "protection lost" outcome is a known possible result
  that gets recorded rather than blocking the phase — SEC-06's stated success criteria do not
  include branch protection, only visibility and deploy-trigger survival).

### Wave 0 Gaps

None — no test framework or fixtures need to be built. The verification commands in "Code
Examples" above are the complete validation surface for this phase.

## Security Domain

### Applicable ASVS Categories

This phase is a repository-governance change, not an application-security change — most ASVS
categories (which target the running app's auth/session/input-handling code) do not apply.
Documented for completeness per the security-domain requirement:

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | Phase touches GitHub account auth, not app auth |
| V3 Session Management | No | N/A |
| V4 Access Control | Partial | Repo access itself becomes restricted to invited collaborators once private — this IS the point of SEC-06, but it's GitHub's own access-control model, not app code |
| V5 Input Validation | No | N/A |
| V6 Cryptography | No | N/A |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Source code / secrets exposure via public repo | Information Disclosure | The flip itself (SEC-06's entire purpose) |
| Silent loss of merge-gating (branch protection) creating a false sense of safety | Tampering (via reduced integrity control, not an attacker action) | Pre/post-flip protection diff (see Pitfall 1 and Validation Architecture) — this is the phase's actual security-relevant risk, distinct from the stated goal |
| Stale collaborator/integration access assumptions after visibility change | Elevation of Privilege (indirect — e.g., an App integration losing scope silently) | Post-flip deployments-API check confirms the Vercel App integration still has working access |

## Sources

### Primary (HIGH confidence)
- `gh repo edit --help`, gh CLI v2.89.0, this session — direct tool output on the exact installed
  version, including the required-flag behavior and GitHub's own bundled consequences warning.
- `gh api repos/cj87holler/honey_do2/branches/main/protection`, this session — live current state
  of Phase 11's branch protection.
- `gh api repos/cj87holler/honey_do2/rulesets`, this session — confirms empty (classic protection
  in use, not rulesets).
- `gh api repos/cj87holler/honey_do2`, this session — live repo metadata (`private`, `visibility`,
  `security_and_analysis`, `forks_count`, `stargazers_count`, etc.).
- `vercel list`, this session — live deployment history showing Production=Ready,
  Preview=Error pattern.
- `.planning/phases/11-ci-on-pull-requests/11-02-SUMMARY.md` — this project's own prior branch-
  protection work, CI run timing (43s), and the "read back, don't trust the write" pattern.
- `.planning/STATE.md` — verified baselines (Preview `DATABASE_URL` blocker, `gh`+`vercel`
  authenticated with ADMIN, current protection state as of 2026-07-28).

### Secondary (MEDIUM confidence)
- GitHub community discussions (#174400, #174419, #190190, #198686, #176478, #72725,
  #152247) on branch protection / rulesets availability for private personal-account repos on
  Free — WebSearch, cross-referenced against gh CLI's own bundled help text for internal
  consistency, but not against a single canonical GitHub docs page that explicitly enumerates
  this restriction for personal (non-org) accounts.
- docs.github.com/en/billing and docs.github.com/en/actions/concepts/billing-and-usage —
  GitHub Actions private-repo free minutes (2,000/month Linux, 1x multiplier) — WebSearch,
  content consistent across multiple result summaries.
- GitHub secret-scanning-for-public-repos announcements (github.blog) vs. GitHub Advanced
  Security private-repo pricing — WebSearch; used to flag Pitfall 5 as a possibility, not a
  certainty.
- Dependabot alerts being free on all repos regardless of visibility — WebSearch, consistent
  across results, not independently re-confirmed against official docs in this session.

### Tertiary (LOW confidence)
- None — items that could only be sourced from a single unverified WebSearch result were folded
  into the Assumptions Log instead of stated as findings.

## Metadata

**Confidence breakdown:**
- Repo mechanics (flip command, current protection state, current billing/security settings):
  HIGH — all directly observed via `gh api`/`gh repo view`/`vercel list` in this session.
- Branch-protection-survives-the-flip risk: MEDIUM — well-corroborated by multiple independent
  community sources and gh CLI's own warning text, but not confirmed against this specific
  account's actual plan (blocked by missing `user` OAuth scope this session).
- Vercel integration survival mechanics: MEDIUM — the verification method is HIGH confidence
  (it will produce an unambiguous empirical answer), but whether it will pass is genuinely
  unknown until executed; the *known-broken-Preview-is-unrelated-noise* framing is HIGH
  confidence (directly evidenced by `vercel list` output and STATE.md).
- Actions billing: HIGH — the free-tier numbers are well-documented and the workflow's actual
  runtime is already measured (43s) from this project's own Phase 11 history.

**Research date:** 2026-07-30
**Valid until:** GitHub plan/pricing pages are fast-moving (~30-60 days is a reasonable window
for the Free-plan-restriction claim); the repo-specific facts (current protection JSON, current
security_and_analysis state, forks/stars = 0) are only valid until the next time anyone touches
those settings — re-capture them fresh immediately before executing the flip, don't reuse the
JSON snapshots quoted in this document as the actual pre-flip baseline.
