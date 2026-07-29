# Project Research Summary

**Project:** Honey_Do — v1.2 Productionization milestone
**Domain:** Production-hardening additions to an already-shipped, single-tenant hobby-scale Next.js 16 / Better Auth / Drizzle / Neon / Vercel app with real users
**Researched:** 2026-07-27
**Confidence:** HIGH for CI mechanics, security-header/CSP mechanics, Sentry integration, and pino/Vercel failure modes (all verified against current official docs, live npm registry, and direct repo inspection). MEDIUM for the exact CSP strictness recommendation (see Key Findings — the four research files disagree with each other here) and for third-party pricing/tier details (UptimeRobot/Better Stack).

## Executive Summary

This milestone bolts standard production-hardening capabilities — CI gating, security headers, legal pages, error tracking, structured logging, and uptime monitoring — onto an app that is already live with real household users and has **no working preview-deployment environment** (Vercel previews can't reach a database). That last fact is the single most important constraint discovered across all four research files: every change in this milestone, especially CSP, ships directly to production with no safety net beyond `next build && next start` run locally and a fast rollback. The research converges on a clear, low-drama build order — CI first (so everything after it is gated), then cheap/independent items (Privacy/Terms pages, repo→private, pino logging), then the one file-contention pair that must be sequenced carefully: **security headers/CSP must land, be verified via Report-Only, and be flipped to enforced *before* the Sentry setup wizard ever touches `next.config.ts`** — reversing that order risks the wizard's codegen silently clobbering hand-written CSP headers.

Three of the four research files (STACK, ARCHITECTURE, FEATURES) independently converge on the same headline recommendations: a static, non-nonce CSP defined in `next.config.ts` `headers()` (trading a small amount of strictness for keeping static rendering on the landing/legal pages), `pino` with no `transport` in the production code path (Vercel/Turbopack's worker-thread transport handling is actively broken per multiple 2026 GitHub issues), Sentry's current `instrumentation-client.ts`/`instrumentation.ts` file layout (not the older `sentry.client.config.ts` pattern most tutorials still show), and UptimeRobot over Better Stack for a single health-check monitor. However, **PITFALLS.md directly contradicts the other three on the CSP strictness question** — it argues that Next.js's own RSC hydration payload is delivered via inline `<script>` tags that a `script-src 'self'`-only policy (no nonce, no `'unsafe-inline'`) will silently block, breaking every interactive element app-wide with zero server-side error signal. This is a real, unresolved technical disagreement between the research files (not a stylistic one) and is called out explicitly below as the highest-priority item to verify empirically — via a local production-mode build, not by picking a side from documentation alone — before the CSP phase ships.

The other major risk theme, repeated across ARCHITECTURE and PITFALLS independently, is **required-status-check name mismatches silently bricking `main`'s merge flow** (GitHub requires the exact reported check name, selected from a post-run dropdown, never typed by hand) and **`next.config.ts` file contention between hand-written CSP headers and Sentry's wizard-generated wrapper**. Both are fully avoidable with correct sequencing, which this summary's Build Order section encodes as hard, non-negotiable ordering rules rather than suggestions.

## Key Findings

### Recommended Stack

No new core framework/database/auth decisions — this milestone adds observability and hardening tooling onto the existing Next.js 16.2.1 / React 19.2.4 / Drizzle / Better Auth 1.5.6 / Neon / Vercel stack. All new packages are additive, no replacements.

**Core additions:**
- `@sentry/nextjs` (10.68.0) — error tracking. Uses the *current* SDK file convention (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, wired through Next's native `instrumentation.ts` hook + `onRequestError`) — older tutorials showing bare `sentry.client.config.ts` are stale and should not be followed.
- `pino` (10.3.1) + `pino-pretty` (13.1.3, dev-only) — structured logging. **Hard constraint, confirmed via multiple active 2026 GitHub issues against this exact Next.js 16 + Turbopack combination:** never use `pino.transport()` (including `pino-pretty`) in the production code path — it fails under Turbopack's Node-function bundling and fails outright in Edge runtime. Production must use plain JSON-to-stdout (no `transport` key at all); Vercel's log pipeline consumes that natively.
- `actions/checkout@v7`, `actions/setup-node@v7` — GitHub Actions, current majors, built-in `cache: 'npm'` needs no separate cache step.
- No new package for security headers/CSP — pure Next.js built-in (`next.config.ts` `headers()`).
- UptimeRobot (free tier) over Better Stack — simplicity matches the actual need (single health-check URL, email alert); Better Stack's on-call/escalation features solve a team-ops problem this solo-dev app doesn't have.

### Expected Features

**Must have (table stakes, matches the milestone's explicit scope):**
- CI on PRs: `typecheck` + `lint` + `test`, required as status checks on `main`
- Security headers in `next.config.ts`: CSP + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + HSTS (no `preload` yet)
- Privacy Policy + Terms of Use — plain-language, covers data collected/purpose/sub-processors/retention/contact, explicitly not a substitute for legal review
- Repo visibility flipped to private
- Sentry: client + server + edge error capture, PII scrubbing kept at defaults (`sendDefaultPii: false`), no Session Replay
- pino: shared logger with `redact` config, wired into auth/task-mutation/invite/admin paths only
- Uptime monitoring on `/api/health`, 5-minute interval, 2-failure alert threshold, email alert

**Should have / worth bundling cheaply:**
- CSP shipped `Report-Only` first, for at least one pass through every route class, before ever enforcing
- Fixing `/api/health` to actually check DB connectivity (see Open Decisions — this is a near-mandatory companion to uptime monitoring, not optional polish)

**Explicitly out of scope (confirmed by both PROJECT.md and this milestone's own scope, reconfirmed by research, not re-litigated):**
- Neon preview branching, custom domain, Vercel spend caps, Playwright E2E, README/ARCHITECTURE.md
- CI `build` step / throwaway Postgres service container in CI — **FEATURES.md recommends this as P1 table stakes; this is superseded by verified ground truth and must NOT be followed.** The milestone scope is explicitly typecheck+lint+test only, all existing tests are fully DB-mocked (confirmed: 89 tests pass with zero live DB connections), and `npm run build` runs `drizzle-kit migrate` first, which would fail or be dangerous in CI without a real throwaway database — a scope expansion the milestone brief does not include.
- Log drain/aggregator (Logflare/Axiom/BetterStack), Sentry Session Replay, Sentry Performance Tracing/Profiling, cookie consent banner, formal GDPR export tooling, nonce-based CSP (pending the resolution below), public status page, on-call escalation

### Architecture Approach

All five capabilities integrate additively into the existing App Router structure with one real point of file contention: **`next.config.ts`**, which both the CSP `headers()` function and Sentry's `withSentryConfig()` wrapper touch. The safe pattern (agreed by ARCHITECTURE and PITFALLS) is to land `headers()` as a plain, fully-verified object first, then wrap it with `withSentryConfig` last, treating the wizard's generated diff as a suggestion to review, not ground truth. `src/middleware.ts` is the second integration point of note: it runs on the **Edge runtime by default** (a legacy-`middleware.ts`-specific default that the newer `proxy.ts` convention doesn't share), which is a hard constraint on where pino can be imported (never here) and where Sentry's edge config actually matters.

**Major components:**
1. `next.config.ts` `headers()` — static, build-time security headers including CSP, source of truth for all normal (non-redirect) responses
2. `src/middleware.ts` — unchanged auth-redirect logic, optionally duplicating the header set on its two `NextResponse.redirect()` paths (defensive, given a historical — not independently reproduced against 16.2.1 — report that `next.config.js` headers don't reliably attach to middleware-issued redirects)
3. `src/lib/logger.ts` — single module-level, stateless `pino()` singleton with `redact` config, safe to share across warm Vercel Fluid Compute invocations because it holds no per-request mutable state; per-request context via `.child()`, never by mutating the shared instance
4. `src/instrumentation.ts` / `instrumentation-client.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` — Sentry's current SDK convention, scaffolded by `npx @sentry/wizard@latest -i nextjs`
5. `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — new public routes, outside all route groups (matching the existing pattern set by the landing page and invite-accept page), verified to fall through the middleware's auth checks with zero changes needed

### Critical Pitfalls

1. **No preview deployments exist for this app** — every change in this milestone, above all CSP, ships straight to production with zero intermediate validation environment. Mitigate by treating `npm run build && npm run start` locally (production mode, real env vars) as the substitute preview, deploying CSP changes at low-traffic times, and never bundling CSP with any other risky change in the same deploy so a bad deploy has an unambiguous single cause to revert.
2. **CSP can silently break the live app with no server-side error signal** — whether via blocked inline hydration scripts (see the open cross-file disagreement below), blocked dynamic inline styles (Tailwind/progress-bar UI), or a forgotten `form-action`/`img-src` entry — because CSP violations are purely client-side/browser-console events. Mitigate with mandatory `Content-Security-Policy-Report-Only` first, across every route class (login, signup, hive dashboard, task creation, leaderboard, invite flow, admin), before ever flipping to enforced.
3. **Required-status-check name mismatch can brick `main`'s merge flow indefinitely** — GitHub requires selecting the *exact* reported check name from a dropdown that's only populated after the workflow has run at least once; typing a name from memory or configuring the rule before the first run produces a permanently-pending, never-passing required check. Mitigate by running the CI workflow once on a real PR *before* touching branch protection settings, then selecting from the populated dropdown.
4. **`npm run build` must never run in CI** — it chains `drizzle-kit migrate`, which fails immediately with no `DATABASE_URL` in CI (or worse, runs real migrations against a real database if one is ever wired up carelessly). Keep CI scoped to exactly `typecheck` + `lint` + `test`.
5. **Sentry's setup wizard can silently clobber hand-written `next.config.ts` CSP headers, or leak `SENTRY_AUTH_TOKEN` if the wizard's `.gitignore` additions aren't verified** — mitigate by sequencing CSP fully before Sentry (see Build Order), diffing `next.config.ts` after the wizard runs, and checking `git status`/`git diff` immediately post-wizard before any commit.

## Implications for Roadmap

### Consolidated Build Order (reconciles STACK.md, ARCHITECTURE.md, and PITFALLS.md)

The three research files propose different framings of "order," but they are compatible, not contradictory, once merged:

- **STACK.md** doesn't give a full ordered list — it gives two local ordering constraints: run the Sentry wizard *after* the security-headers work (so it wraps the final `next.config.ts`), and treats CI as an implicit prerequisite for gating everything else.
- **ARCHITECTURE.md** gives the most complete explicit list: CI → Privacy/Terms → pino → CSP → Sentry, reasoned entirely around the `next.config.ts` file-contention concern (do the two things that touch it, in the right order, with everything else slotted around them for warm-up/independence reasons).
- **PITFALLS.md** doesn't give one ordered list either, but its per-pitfall "Phase to address" mapping constrains order indirectly: CSP's Report-Only step is treated as *the* production safety net (given no preview env) and must be fully verified before Sentry; Sentry's PII-scrubbing configuration should be locked in before the Privacy Policy's wording about error-tracking data is finalized — which puts Privacy Policy's *final* wording pass after Sentry, in tension with ARCHITECTURE's placement of Privacy Policy as an early, independent "warm-up" phase.

**Reconciliation:** ARCHITECTURE's ordering is adopted as the backbone (it's the only file that reasons about the full sequence), with two adjustments: (1) repo-visibility flip is inserted early, since it's trivial, independent, and lowest-risk-first is a defensible tiebreaker when nothing else forces its position; (2) Privacy Policy is treated as a **two-touch item**, not a single phase — draft it early (in ARCHITECTURE's warm-up slot, with deliberately generic language about "an error-tracking service that may receive technical error data") and revisit only the error-tracking-disclosure paragraph after Sentry's PII configuration is locked in. This satisfies PITFALLS' dependency without forcing Privacy Policy to wait for Sentry entirely, and matches FEATURES.md's own explicit recommendation to "write generically now, tighten if scrubbing approach changes."

**The three hard constraints all four files agree on, non-negotiable in the roadmap:**
1. CI lands first, before any other phase.
2. Security headers/CSP must be fully landed and verified on production before Sentry's setup wizard ever touches `next.config.ts`.
3. CSP ships as `Content-Security-Policy-Report-Only` first; enforcement is a separate, later, independently-verified step — never combined into the same deploy as the initial Report-Only rollout.

### Phase 11: CI on Pull Requests
**Rationale:** Zero dependencies on anything else in this milestone; provides the safety net that every subsequent phase's changes get gated by. All three ordering sources agree this comes first.
**Delivers:** `.github/workflows/ci.yml` running `typecheck` + `lint` + `test` (no `build` step, no DB service container — confirmed unnecessary since all 89 existing tests fully mock `@/lib/db`); `npm run typecheck` script added to `package.json`; required status checks configured on `main` *after* the workflow has run once on a real PR (per Pitfall 6's exact sequencing).
**Ground-truth precondition not mentioned in any of the four research files:** `npx tsc --noEmit` currently fails with 4 pre-existing errors, all confined to `tests/task/update-task-status.test.ts`. These must be fixed as an in-scope first task of this phase — otherwise enabling `typecheck` in CI goes red on its very first run, before any of this milestone's actual work has shipped.
**Avoids:** Pitfall 6 (required-check name mismatch bricking `main`), Pitfall 7 (`npm run build`'s `drizzle-kit migrate` failing in CI with no `DATABASE_URL`).
**Implementation note:** `gh` CLI is already authenticated with admin scope on this repo — branch protection changes (adding required status checks) are scriptable, not a manual UI step.

### Phase 12: Privacy Policy + Terms of Use (initial draft)
**Rationale:** Zero technical dependencies, trivially safe, gives CI (just landed in Phase 11) a low-risk PR to prove itself against before riskier phases begin.
**Delivers:** `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` (public, outside all route groups — verified to fall through the existing middleware's auth checks with no code changes needed), footer links added to the landing page.
**Addresses:** FEATURES.md's Privacy/Terms table-stakes content list (data collected, purpose, sub-processors, retention/deletion honesty given no self-service deletion flow exists, cookies, children's-privacy note, contact, effective date).
**Note:** Word the error-tracking/sub-processor disclosure generically in this pass ("we use an error-tracking service that may receive technical error data") — revisit that one paragraph in Phase 16 once Sentry's PII scrubbing configuration is locked in. This is content-only work, not a full second phase.

### Phase 13: Repo Visibility → Private
**Rationale:** Trivial, independent, lowest engineering risk in the milestone — good to clear early. Git-history secret audit already came back clean (only localhost dev creds / placeholders, no real secrets), so there's no pre-flip remediation needed.
**Delivers:** Repo flipped private via `gh` (already authenticated with admin access — scriptable, not manual).
**Avoids:** Pitfall 15 (broken README badges, Actions-minutes-cap awareness — not a real constraint at this repo's CI volume, private-repo free tier is 2,000 min/month vs. this milestone's ~2-4 min/run CI).
**Verification:** Push a trivial commit post-flip and confirm Vercel still auto-deploys — the one integration actually worth re-checking (Vercel's GitHub App access persists across visibility changes as long as it was already installed on this repo, which it is).

### Phase 14: Structured Logging (pino)
**Rationale:** No `next.config.ts` involvement at all, so it doesn't interact with the CSP/Sentry file-contention concern — can be done any time before Sentry lands, and doing it before Sentry means Sentry's server-side error capture has structured log context to correlate against once it's live (soft sequencing benefit, not a hard dependency).
**Delivers:** `src/lib/logger.ts` — single stateless `pino()` singleton, `redact` config for known-sensitive paths (`req.headers.cookie`, `*.password`, `*.sessionToken`, `*.DATABASE_URL`) from the first commit, wired into auth/task-mutation/invite/admin code paths via `.child()` calls, never mutating the shared instance. **Production must never use a `transport` — plain JSON to stdout only**; `pino-pretty` gated strictly behind `NODE_ENV === "development"`.
**Avoids:** Pitfall 13 (pino transport failure on Vercel/Turbopack — active, currently-open GitHub issues against this exact Next.js 16 line), Pitfall 14 (logging secrets via wholesale `req`/`session` object logging).
**Hard constraint:** Never import into `src/middleware.ts` — it runs on Edge runtime by default, where pino's worker-thread machinery fails to even import, not just fail at runtime.
**See Open Decision #1** — this is the one item in the milestone most defensible to descope if time pressure emerges.

### Phase 15: Security Headers / CSP
**Rationale:** The most consequential and highest-risk phase in the milestone, given no preview environment exists to validate against. Must be the last thing to touch `next.config.ts` before Sentry, per the hard constraint all three files agree on — land it, verify it fully in production via Report-Only, flip to enforced, and let it stabilize before Phase 16 wraps the same config object.
**Delivers:** `headers()` in `next.config.ts` with CSP + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + HSTS (`max-age=63072000; includeSubDomains`, no `preload`). Shipped as `Content-Security-Policy-Report-Only` first; enforced only after a manual click-through of every route class shows zero legitimate violations.
**Unresolved cross-file disagreement — resolve empirically, not by documentation alone:** STACK.md, ARCHITECTURE.md, and FEATURES.md all independently recommend a static, non-nonce CSP (`script-src 'self'`, no `'unsafe-inline'`, no nonce/middleware) on the reasoning that this app has no third-party inline scripts today. **PITFALLS.md's Pitfall 1 directly contradicts this**, asserting that Next.js's own App Router RSC hydration payload (`self.__next_f.push(...)`) is delivered as inline `<script>` content, which a `script-src 'self'`-only policy (with no `'unsafe-inline'` and no nonce) would block — silently breaking all client interactivity app-wide with zero server-side error signal, the exact failure mode a production app with no preview environment can least afford. **Recommendation for the roadmap:** do not resolve this by picking a side from the research alone. Build a local production-mode test (`npm run build && npm run start`, `NODE_ENV=production`) into this phase's plan as a mandatory first step — apply the candidate CSP, click through every route class, and open the browser console. If hydration/interactivity breaks under the strict `'self'`-only policy, the fallback is `style-src`-style pragmatism already endorsed by all research files: allow `'unsafe-inline'` scoped only to `script-src` (a real but bounded regression, well short of a fully permissive policy) rather than jumping straight to a nonce-based `proxy.ts` migration, which all four files agree is disproportionate effort for this app's threat model.
**Avoids:** Pitfall 1 (hydration breakage — pending resolution above), Pitfall 2 (Tailwind inline-style breakage — deliberately allow `style-src 'unsafe-inline'`, documented as an accepted, scoped tradeoff since no unescaped user-generated HTML is ever rendered), Pitfall 3 (`unsafe-eval` leaking from dev CSP into prod — branch by `NODE_ENV`, add a `curl | grep -v unsafe-eval` sanity check), Pitfall 5 (`form-action`/`img-src` gaps — grep the codebase for external hosts before drafting the policy; confirmed today there are none).
**Optional, bundle-if-convenient (not required to ship this phase):** the `middleware.ts` → `proxy.ts` codemod (see Open Decision #4) — this is the one place `middleware.ts` gets touched again this milestone (duplicating headers onto its two redirect responses as a defensive measure against a historical, not-reproduced-against-16.2.1 header-loss report).

### Phase 16: Sentry Error Tracking
**Rationale:** Deliberately last to touch `next.config.ts` — wraps the now-stable, fully-verified `headers()` object from Phase 15 via `withSentryConfig(nextConfig, ...)` as the outermost call, so if the wizard's generated diff needs manual reconciliation, there's a known-good version to diff against.
**Delivers:** `src/instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` (scaffolded via `npx @sentry/wizard@latest -i nextjs`, then manually reviewed — not trusted blindly), `src/app/global-error.tsx`, PII configuration locked to `sendDefaultPii: false` with no Session Replay for v1.2, `SENTRY_AUTH_TOKEN` verified server-only (Vercel env var UI, never a committed file, never `NEXT_PUBLIC_`-prefixed).
**Avoids:** Pitfall 8 (wizard clobbering CSP headers — `git diff next.config.ts` reviewed immediately post-wizard), Pitfall 9 (tunnel-route/middleware-matcher collision — recommend skipping `tunnelRoute` entirely for v1.2, per STACK's own cost/benefit call, sidestepping this pitfall completely), Pitfall 10 (auth-token leak), Pitfall 11 (PII capture — lock config before finalizing the Privacy Policy's error-tracking paragraph), Pitfall 12 (quota burn — verify spike protection enabled, configure a quota alert email).
**Verification step, not optional:** trigger one deliberate client-side error and one server-side error, confirm both appear in the Sentry dashboard, and re-`curl` the production CSP header to confirm it's still intact post-deploy.
**Closes out:** Phase 12's deferred paragraph — finalize the Privacy Policy's error-tracking disclosure wording to match whatever PII configuration actually shipped here.

### Phase 17: Uptime Monitoring
**Rationale:** Pure external configuration against `/api/health`, zero engineering dependency, correctly placed last since it needs nothing from any other phase — except one thing worth deciding first (see Open Decision #2).
**Delivers:** UptimeRobot free-tier monitor on `/api/health`, 5-minute interval, alert after 2 consecutive failures (avoids false-positive pages from transient blips), email alert, recovery notification on.
**See Open Decision #2 for whether `/api/health` should be fixed to actually ping the database as part of this phase** — recommended, and cheap, but technically outside the five named capabilities, so flagged rather than silently bundled.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 15 (Security Headers / CSP):** The cross-file CSP-strictness disagreement above is unresolved by documentation alone and must be settled empirically during phase planning/execution, not assumed from any single research file. This is the highest-priority research flag in the milestone.
- **Phase 16 (Sentry):** Mostly well-documented (wizard-driven setup), but the PII-scrubbing/`beforeSend` configuration and the tunnel-route decision are judgment calls specific to this app's data (task text, household context) that the wizard's defaults won't get right unsupervised — worth a focused pass during planning, not blind wizard defaults.

Phases with standard, well-documented patterns (safe to skip `--research-phase`):
- **Phase 11 (CI):** GitHub Actions typecheck/lint/test workflow is a completely standard, extensively-documented pattern; the one non-standard risk (required-check name mismatch) is fully covered by a known, mechanical fix already documented above.
- **Phase 12 (Privacy/Terms):** Content-only work, informational research already covers the expected structure; not a technical integration risk.
- **Phase 13 (Repo → private):** Single GitHub setting change with one verification step.
- **Phase 14 (pino):** The Vercel/Turbopack transport failure mode and its fix (no transport in prod) are well-documented via multiple corroborating current GitHub issues; the pattern to follow is settled, not exploratory.
- **Phase 17 (Uptime monitoring):** Pure external SaaS configuration against an existing endpoint.

## Open Decisions for the User

These are surfaced per the milestone brief's instruction — framed with a recommendation, not decided unilaterally:

1. **Is pino still worth including, given open Next 16 + Turbopack transport bugs and no log drain in scope?** Recommendation: **include it**, but scope it to exactly what has value independent of a log-shipping destination — the `redact` guarantee (a structural safety net against accidentally logging secrets that `console.log` has no equivalent for) and enforced log levels. Do not scope any transport/JSON-querying value, since no log drain exists to leverage it. This is the one item in the milestone most defensible to cut entirely if time pressure emerges (Vercel already captures `console.*` output natively) — but as scoped above, it's cheap (a few hours) and the redaction guardrail has real value on its own.
2. **Should `/api/health` be fixed to actually ping the DB as part of this milestone?** Recommendation: **yes.** Confirmed by direct inspection: the current handler is fully hardcoded (`{ status: "ok", ts: Date.now() }`) and does not touch the database at all — an uptime monitor pointed at it today would stay green through a total DB outage, which defeats the purpose of adding uptime monitoring in the first place. The fix is one line (a `select 1` via the existing `db` client). Also corrects an existing documentation/reality mismatch (`PRODUCTIONIZATION_ROADMAP.md` already incorrectly claims this endpoint pings the DB). Bundle as a small addition to Phase 17, even though it's technically adjacent to rather than one of the five named capabilities.
3. **Should CI use `--max-warnings 0`?** Recommendation: **yes.** Baseline `eslint` already passes clean except for 8 warnings (all unused-var warnings confined to three test files). Fixing them is roughly 15 minutes of work, and starting the CI-enforced era of this repo with a zero-warning baseline is materially cheaper now than after warning debt has had time to accumulate unnoticed. If the user wants to move faster, allowing warnings and revisiting later is a defensible fallback, but not the default recommendation.
4. **Optional `middleware.ts` → `proxy.ts` codemod?** Recommendation: **do it opportunistically during Phase 15**, since that's the one place `middleware.ts` is touched again this milestone anyway (adding header duplication to the two redirect responses). The codemod (`npx @next/codemod@canary middleware-to-proxy .`) is a pure rename, low risk, and removes a deprecation warning while aligning the file with where all current official Next.js docs (including the CSP guide itself) are now written. Not required to ship Phase 15 — skip without harm if the user wants to keep that phase's scope as tight as possible.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Package versions verified live against npm registry and GitHub Releases API on research date; file-convention claims verified against official Next.js/Sentry docs fetched the same day. |
| Features | MEDIUM-HIGH | CI/headers/Sentry mechanics HIGH (official docs); pino and uptime-tool tradeoffs MEDIUM (WebSearch-verified, directionally consistent across sources but not each vendor's pricing page fetched directly); privacy-policy legal content explicitly flagged LOW / informational-only, not legal advice. **One recommendation in this file (CI build step + throwaway Postgres container as P1 table stakes) is superseded by verified ground truth and milestone scope — do not follow it.** |
| Architecture | HIGH for codebase facts (read directly from the repo: middleware behavior, route groups, test mocking, `next.config.ts` state); MEDIUM-HIGH for Next.js/Sentry integration behavior (current official docs); MEDIUM for the middleware-redirect-header-loss risk (single historical, not-independently-reproduced-against-16.2.1 GitHub issue used to justify a cheap defensive measure, not treated as settled fact). |
| Pitfalls | HIGH for GitHub/CI mechanics and Sentry/pino integration issues (official docs plus multiple independently corroborating, currently-open GitHub issues against this exact Next.js 16 line); MEDIUM-HIGH for CSP specifics (official guidance plus community reports, cross-checked against this repo's actual code). |

**Overall confidence:** HIGH on mechanics and sequencing; MEDIUM on one specific, explicitly-flagged technical question (CSP strictness) that the roadmap should resolve empirically during Phase 15 rather than by picking a research file to trust.

### Gaps to Address

- **CSP strictness (nonce vs. `'self'`-only vs. `'self' 'unsafe-inline'` for `script-src`) is unresolved across the four research files** — STACK/ARCHITECTURE/FEATURES vs. PITFALLS disagree on whether a non-nonce, non-`unsafe-inline` policy will break Next.js's own hydration. Resolve via mandatory local production-mode testing built into Phase 15's plan, not by trusting either side's documentation claim alone.
- **FEATURES.md's CI recommendation (build step + throwaway Postgres service container) contradicts the milestone's explicit scope and the verified ground truth that CI needs no database.** Flagged above so the roadmapper does not inadvertently pull that recommendation into Phase 11's scope.
- **Privacy Policy's error-tracking disclosure wording has a soft two-phase dependency** (draft generically in Phase 12, finalize after Phase 16) — not a blocking gap, but the roadmap phase for Phase 12 should note this follow-up explicitly so it isn't dropped.
- **Third-party pricing/tier specifics (UptimeRobot vs. Better Stack free-tier limits) were WebSearch-verified, not fetched directly from each vendor's current pricing page** — low-risk gap given the directional recommendation (UptimeRobot) is stable across multiple independent comparison sources, but worth a 2-minute manual check before final account setup in Phase 17.

## Sources

### Primary (HIGH confidence)
- Next.js official CSP guide — https://nextjs.org/docs/app/guides/content-security-policy (docs v16.2.12, `lastUpdated: 2026-03-20`)
- Next.js official `proxy.js` file convention reference — https://nextjs.org/docs/app/api-reference/file-conventions/proxy (docs v16.2.12, `lastUpdated: 2026-05-13`)
- Next.js "Upgrading to version 16" guide — https://nextjs.org/docs/app/guides/upgrading/version-16
- Sentry official Next.js SDK docs — https://docs.sentry.io/platforms/javascript/guides/nextjs/, and Data Collected / security advisory pages
- npm registry, checked live: `@sentry/nextjs@10.68.0`, `pino@10.3.1`, `pino-pretty@13.1.3`, `next@16.2.12`
- GitHub Releases API, checked live: `actions/checkout@v7.0.1`, `actions/setup-node@v7.0.0`
- GitHub official docs: required status checks troubleshooting, Actions billing
- Direct repository inspection: `package.json`, `next.config.ts`, `src/middleware.ts`, `vitest.config.mts`, `tests/**/*.test.ts`, `drizzle.config.ts`, `src/lib/db.ts`, `src/app/api/health/route.ts`, route-group layouts, `Makefile`, `.planning/PROJECT.md`, `PRODUCTIONIZATION_ROADMAP.md`
- Orchestrator-verified ground truth (this session): `next@16.2.1`/`react@19.2.4` exact versions, baseline `tsc --noEmit` (4 pre-existing failures, all in `tests/task/update-task-status.test.ts`), baseline `vitest run` (89 tests pass, no DB), baseline `eslint` (0 errors, 8 warnings), `gh`/`vercel` CLI auth state, current branch-protection settings, git-history secret audit (clean)

### Secondary (MEDIUM confidence)
- Multiple 2026-dated GitHub issues on pino + Vercel/Turbopack: `vercel/next.js#93849`, `#87342`, `#86099`, `#84766`; `formbricks/formbricks#7509`; `pinojs/pino#1736`
- Community CSP/hydration references: `justappsec.com` nonce+`strict-dynamic` guide, `next-safe-middleware` reference implementation, `vercel/next.js` discussion #81703
- GitHub issue #65702 (`vercel/next.js`) on middleware-redirect header loss — Next 14.2.3, not independently reproduced against 16.2.1
- UptimeRobot vs. Better Stack comparisons — multiple independent 2026-dated comparison articles, directionally consistent, not each vendor's pricing page fetched directly this session

### Tertiary (LOW confidence)
- Privacy Policy / Terms of Use legal content — general common-practice knowledge for small consumer apps, explicitly not legal advice, not verified against a legal source

---
*Research completed: 2026-07-27*
*Ready for roadmap: yes*
