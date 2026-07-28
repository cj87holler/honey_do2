# Feature Research: Productionization (v1.2)

**Domain:** Solo-developer, hobby-scale production hardening for an already-shipped Next.js + PostgreSQL household app
**Researched:** 2026-07-27
**Confidence:** HIGH for CI/headers/Sentry mechanics (verified against current official docs); MEDIUM for pino/logging tradeoffs and uptime-tool specifics (WebSearch-verified, training-data-informed); LOW/INFORMATIONAL-ONLY for privacy policy legal content (explicitly not legal advice — see Section 3)

**Framing note:** Every recommendation below is right-sized for a solo developer running a free-tier-friendly app for a handful of household users — not an enterprise SaaS. Where an industry-standard practice is genuine overkill at this scale, it is called out explicitly as an Anti-Feature with the reasoning, not just omitted.

---

## 1. CI on Pull Requests

### Table Stakes

| Item | Why | Complexity | Notes |
|------|-----|------------|-------|
| Typecheck (`tsc --noEmit`) | Catches type errors before merge; cheapest possible bug prevention for a TypeScript codebase | LOW (~1 hr) | Single `npm run typecheck` step |
| Lint (`eslint`) | Catches obvious bugs, unused vars, React hook rule violations; already configured via `create-next-app` | LOW (~30 min) | Reuse existing `next lint` / eslint config |
| Unit tests (`vitest run`) | Existing Vitest suite on business logic must actually gate merges, not just exist locally | LOW (~30 min) | Already has tests per milestone context — just wire to CI |
| Production build (`next build`) | Typecheck/lint/test do not catch everything — `next build` catches broken static generation, invalid route exports, missing `"use client"` boundaries, and Next.js-specific build errors that only surface at build time | MEDIUM (~2-4 hrs) | **Dependency:** existing app runs Drizzle migrations automatically at build. CI's `next build` step will need a real reachable `DATABASE_URL` for that migration step to succeed — see "throwaway DB" below. This is the single trickiest part of this milestone's CI work, not the workflow YAML itself. |
| Required status checks on `main` | Checks that exist but aren't required do nothing — a bad PR can still merge | LOW (~15 min) | GitHub branch protection settings, not a workflow file |

### Differentiators

| Item | Value | Complexity | Notes |
|------|-------|------------|-------|
| Migrations run against a throwaway Postgres service container in CI | Because migrations auto-run at build in production, a broken migration is a production-breaking event, not just a dev annoyance. Running `drizzle-kit migrate` against a fresh `postgres:16` service container in the same job that runs `next build` validates that migrations apply cleanly to an empty schema — something the real Neon DB (never empty) can't tell you. | LOW-MEDIUM (~1-2 hrs) | GitHub Actions `services:` block with `postgres:16` image is a well-documented, ~15-line addition. Given the build step already needs *a* database to succeed, this is close to "required to make table stakes work" rather than purely optional — treat it as bundled with the build check, not a separate nice-to-have. |
| Dependabot / Renovate for dependency updates | Keeps deps from silently rotting; catches security advisories | LOW (~30 min, GitHub-native for Dependabot) | Cheap enough to include, but genuinely optional — not requested in PROJECT.md scope. Mention as a candidate, don't force it into this milestone's requirements unless the user wants it. |

### Anti-Features

| Item | Why It's Commonly Added | Why It's Overkill Here | Alternative |
|------|--------------------------|-------------------------|-------------|
| Matrix builds across multiple Node/OS versions | Standard for published libraries/packages that must work across environments | This app has exactly one deployment target (Vercel, one Node runtime). There is no consumer running a different Node version. | Pin CI's Node version to match Vercel's runtime; test once. |
| Coverage gates/thresholds (e.g. "fail if <80%") | Feels like a quality signal | Creates friction for a UI-heavy consumer app where Vitest only covers business logic by design; chasing a coverage number produces low-value tests written to satisfy the gate, not to catch bugs | Generate a coverage report for visibility if desired, but don't fail the build on it |
| Required PR approvals (human reviewer gate) | Standard team practice | Solo developer — there is no second reviewer. A required-approval rule either blocks every PR (no one else to approve) or gets bypassed via admin override, making it theater | Keep "required status checks" (typecheck/lint/test/build must pass), skip "required approving review" |
| semantic-release / automated versioning + changelog generation | Common in published npm packages and team monorepos | This app doesn't publish a package or need semver. GSD's own MILESTONES.md/PROJECT.md already serves as the changelog | Continue manual milestone-based tracking already in place |
| Changeset bots | Same rationale as semantic-release — built for monorepos with multiple publishable packages | Single deployable app, no packages to independently version | Skip entirely |
| Playwright E2E in CI | Feels like "real" production readiness | Already explicitly deferred in PROJECT.md ("Deferred to a later milestone: ... Playwright E2E") — reconfirming that decision, not re-litigating it | Vitest unit tests + manual smoke test post-deploy is the current bar |

---

## 2. Security Headers

### Table Stakes

| Header | Recommended Value | Why | Complexity |
|--------|--------------------|-----|------------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-sniffing attacks; zero downside, zero config cost | TRIVIAL |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sensible default balancing analytics/debugging usefulness against leaking full URLs (which could contain invite tokens) to third-party origins | TRIVIAL |
| `X-Frame-Options` | `DENY` | Legacy header, but cheap to include alongside CSP's `frame-ancestors 'none'` for older-browser coverage. No functional cost since this app has no legitimate iframe-embedding use case. | TRIVIAL |
| `Permissions-Policy` | Disable unused browser APIs: `camera=(), microphone=(), geolocation=(), payment=(), usb=()` etc. | App never uses any hardware/sensitive browser APIs — closing them off costs nothing and removes attack surface | TRIVIAL |
| `Strict-Transport-Security` (HSTS) | `max-age=63072000; includeSubDomains` (no `preload` initially) | Vercel serves HTTPS-only, but the header should be set explicitly rather than assumed. **Do not add `preload` immediately** — HSTS preload submission to the browser list is a one-way, hard-to-reverse commitment; add it later once confident every subdomain will always be HTTPS. | LOW |
| Content-Security-Policy — realistic starter version, **without nonces** | See below | Protects against XSS/injection with a policy that matches this app's actual needs (no third-party embeds today) | LOW-MEDIUM |

**Realistic starter CSP** (confirmed against current official Next.js docs, `next.config.ts` `headers()` approach — no proxy/middleware needed):

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://*.ingest.sentry.io https://*.sentry.io;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

- `script-src 'self'` (no `'unsafe-inline'`): this app has no Google Analytics/GTM/inline `onclick` handlers, so a strict script-src is achievable without the complexity of nonces.
- `style-src 'self' 'unsafe-inline'`: kept permissive because Next.js's built-in style optimizations and Tailwind's runtime can inject inline `<style>` tags; tightening this further requires the nonce-based proxy approach (see below), which is not worth the tradeoff at this scale.
- `connect-src` must explicitly allow the Sentry ingest domain once Sentry is wired up, or error reports will silently fail to send (a CSP violation, not a visible error).

**Why NOT nonce-based / `strict-dynamic'` CSP (the officially "stricter" option):** Per current Next.js docs, nonce-based CSP requires a `proxy.ts`/middleware that generates a fresh nonce per request, which **forces every page into dynamic rendering** — static generation and ISR are disabled, and the marketing landing page (a good static-generation candidate) would lose that benefit. For a household app with a handful of users, the marginal security gain over a well-scoped `'self'`-based policy does not justify giving up static rendering and adding a proxy/middleware layer. This is the correct call to make explicitly and revisit only if the app starts handling more sensitive data or gets external security scrutiny.

**Report-only as first step — yes, do this.** Deploy the policy first as `Content-Security-Policy-Report-Only` (same directive string) rather than `Content-Security-Policy`. **The actual failure mode of a too-strict CSP is silent and client-side**: nothing shows up in server logs or Vercel's function logs — a blocked script/style/fetch just fails quietly in the browser console, and features break (a button does nothing, a form doesn't submit) with no obvious error trail for the developer. Report-only mode surfaces violations (via browser console, or a `report-to`/`report-uri` endpoint if configured) without breaking anything, giving a safe window to validate the policy against real usage before flipping to enforced. Given the small user base, a pragmatic middle ground is: report-only for a short period + manual click-through of every page, then flip to enforced — a full reporting endpoint/collector is not necessary at this scale.

### Differentiators

| Item | Value | Complexity |
|------|-------|------------|
| `Content-Security-Policy-Report-Only` trial period before enforcing | Catches breakage before it's live, given the silent-failure mode above | LOW (just a header value swap, no new infra) |

### Anti-Features

| Item | Why Commonly Added | Why Overkill Here | Alternative |
|------|---------------------|---------------------|-------------|
| Nonce-based strict CSP with `proxy.ts`/middleware | "Most secure" option per official docs | Forces full dynamic rendering app-wide, kills static optimization for the landing page, adds a proxy layer — real complexity cost for a household app with no current third-party script exposure | `'self'`-based CSP without nonces, tightened over time only if a real need (e.g. adding GTM) arises |
| CSP `report-uri`/`report-to` collector service | Feels complete/professional | Building or paying for a violation-collection endpoint is unnecessary when a manual report-only review pass + browser console checking covers a handful of pages | Skip; if Sentry is already in place, its "Security Header Reports" feature can double as a free collector later if desired |
| Subresource Integrity (SRI) experimental Next.js feature | New/interesting option in current Next.js docs | Explicitly experimental, App-Router-only, and solves a problem (build-time script tampering detection while keeping static rendering) that isn't a live concern for a small self-controlled deploy pipeline | Skip; revisit only if the app starts serving third-party or user-uploaded scripts (it doesn't) |

---

## 3. Privacy Policy + Terms of Use

> **This section is informational content research only, not legal advice.** It describes what small consumer apps commonly and credibly include, based on general practice — it is not a substitute for review by a lawyer, especially if the app ever monetizes, adds EU/California users at scale, or handles more sensitive data categories. Flag this disclaimer in the actual pages too.

### Table Stakes (Privacy Policy content)

Given the app collects: email address, hashed password (never plaintext), task text, hive membership, honey point history, and — once Sentry ships — error/crash data that may include stack traces and a user identifier:

| Item | Why It's Expected | Complexity |
|------|---------------------|------------|
| What data is collected | Users reasonably expect to know: email, password (hashed, never stored plaintext), task text/honey values, hive/household membership | LOW (writing/content only) |
| Why it's collected | Purpose limited to operating the app — account auth, task assignment, leaderboard | LOW |
| Who it's shared with (sub-processors) | Name the actual third parties handling data even at hobby scale: hosting (Vercel), database (Neon), error tracking (Sentry, once live). This is good practice and standard baseline content regardless of formal legal requirement. | LOW |
| Data retention / deletion | State how a user can request account/data deletion. **Gap to flag:** the app currently has no self-service account deletion (per REQUIREMENTS.md, only self-service password reset is deferred, and there's no deletion flow listed at all) — the policy needs an honest statement like "contact the operator by email to request deletion" rather than implying a self-service flow that doesn't exist. | LOW (content), but surfaces a real product gap worth a decision |
| Cookies used | Disclose the session cookie (Better Auth) as an essential/functional cookie; explicitly state no advertising/tracking cookies are used | LOW |
| Children's privacy note | Household app could plausibly have a minor as a "Bee" using a parent-provisioned account. State plainly that the app is not directed at children under 13 and account creation is intended for adults/teens managing a household, without pretending there's active age verification (there isn't) | LOW |
| Contact method for privacy questions | A single email address is sufficient at this scale — no formal DSAR (Data Subject Access Request) workflow needed | TRIVIAL |
| Effective date + "we may update this" clause | Standard, low-cost, expected | TRIVIAL |

### Table Stakes (Terms of Use content)

| Item | Why It's Expected | Complexity |
|------|---------------------|------------|
| Acceptable use (no illegal content, no abuse of invite system) | Baseline expectation for any account-based app | LOW |
| Account responsibility (user is responsible for their credentials and hive activity) | Standard | LOW |
| "As-is" disclaimer / no uptime guarantee | Sets honest expectations for a hobby-run app with no SLA | LOW |
| Limitation of liability | Standard boilerplate protecting the solo operator | LOW |
| Termination rights (operator can suspend/remove accounts, e.g. abuse) | Standard | LOW |
| Governing law/jurisdiction (operator's home state) | Expected, trivial to state | TRIVIAL |
| Contact info | Same email as privacy policy | TRIVIAL |

### Differentiators

| Item | Value | Complexity |
|------|-------|------------|
| Using a policy generator (e.g. Termly, iubenda free tier) as a starting skeleton, then editing tone/specifics to match | Faster than writing from scratch, hits common baseline clauses reliably | LOW — mention as a legitimate option, not mandatory |
| Bee-themed voice in the plain-language summary sections (while keeping the legal boilerplate straightforward) | Matches brand identity (per CLAUDE.md, the bee theme is central, not a veneer) without compromising clarity of the actual legal content | LOW-MEDIUM, purely a writing/content decision |

### Anti-Features

| Item | Why Commonly Added | Why Overkill Here | Alternative |
|------|---------------------|----------------------|-------------|
| Cookie consent banner | Common GDPR-driven pattern | Only used cookie is an essential session cookie for auth — no advertising/tracking/analytics cookies exist to require consent for. A banner would be pure friction with no legal function given the current cookie usage. | Disclose the session cookie in the privacy policy; skip the banner. Revisit only if analytics/ads are ever added. |
| Formal Data Processing Agreement (DPA) template | Standard for B2B SaaS handling other companies' customer data | This app doesn't process data on behalf of other businesses — it's a direct-to-consumer household app | Skip entirely |
| Self-service "Download my data" / GDPR export tooling | Feels complete for compliance-conscious apps | Genuine engineering effort (data export format, endpoint, auth) for a feature a handful of household users are exceedingly unlikely to invoke; email-based manual request handles the realistic volume | Note the same email contact in the policy covers export requests manually |

---

## 4. Error Tracking (Sentry)

### Table Stakes

| Item | Why | Complexity | Dependency |
|------|-----|------------|------------|
| Client-side error capture | Catches uncaught exceptions/rejections in the browser (React render errors, client component crashes) | LOW | `instrumentation-client.ts` per current Sentry Next.js SDK setup |
| Server-side error capture | Catches Server Component, Server Action, and API/Route Handler errors | LOW | `sentry.server.config.ts` |
| Edge runtime error capture | If any code runs on the edge runtime (middleware, edge API routes) | LOW | `sentry.edge.config.ts` — only strictly needed if edge runtime is actually used; verify before adding |
| Wiring via `instrumentation.ts` with `onRequestError` | Current (Next.js 15+, SDK ≥8.28.0) recommended integration point that captures errors from Server Components, middleware, and proxies uniformly | LOW-MEDIUM | Requires Next.js's instrumentation hook, which is stable in Next.js 15 — compatible with this app's stack |
| Release tracking tied to a build/commit identifier | Turns "an error happened" into "an error happened in commit X," making it possible to correlate errors with deploys | LOW | Sentry's Vercel integration or `@sentry/nextjs` build plugin can auto-tag releases; low setup cost given Vercel is already the deploy target |
| Source map upload | Without this, stack traces in Sentry show minified/bundled code — nearly useless for debugging | LOW-MEDIUM | Requires a Sentry auth token as a CI/Vercel build secret; the `withSentryConfig` wrapper in `next.config.ts` automates upload during build |

### Deliberately Configure (not defaults — worth a conscious decision given this app's data)

| Item | Why It Matters Here | Recommendation |
|------|----------------------|------------------|
| PII scrubbing | This app has real user emails and task text (which could reference sensitive household matters — money, health, disputes). Sentry's default `sendDefaultPii` is `false`, and that default should be kept, not overridden. | Explicitly do NOT enable `sendDefaultPii`. Use a `beforeSend` hook to strip request bodies/task text from error context. Attach only a user ID (not email) to error events if user context is needed for debugging — avoid sending emails or task text to a third-party SaaS unnecessarily. |
| Error sample rate | Default is 100% of errors captured | Fine to leave at 100% — error volume at this scale will be low, and Sentry's free tier (~5k events/month) comfortably covers a handful of users | 
| Performance tracing sample rate (`tracesSampleRate`) | Sentry defaults many quickstarts to enabling this | Set to 0 or a very low value (e.g. 0.05) if enabled at all — see "overkill" below |

### Anti-Features (genuinely overkill at this scale)

| Item | Why Commonly Added | Why Overkill Here | Alternative |
|------|---------------------|----------------------|-------------|
| Session Replay | Popular Sentry feature, easy toggle | Captures DOM/user interaction recordings that risk capturing typed task text or other form input even with masking rules — a real privacy exposure for household content, not just an unnecessary feature. Also burns free-tier replay quota fast. | Skip entirely. Error + stack trace + breadcrumbs (non-PII) is enough to debug a small app. |
| Performance tracing / APM | Feels like "doing observability properly" | With a handful of concurrent users, there's no performance problem to find — tracing adds SDK overhead, quota consumption, and noise without insight | Skip, or leave `tracesSampleRate` at a token low value only if genuinely curious, not as a monitoring strategy |
| Profiling | Advanced Sentry feature, paid-tier gated in practice | No performance problem exists to profile at this scale; adds runtime overhead for zero actionable signal | Skip |

---

## 5. Structured Logging (pino)

**This is the one area where the honest answer is genuinely two-sided — argued both ways below.**

### The case FOR pino (worth doing)

- **Redaction as a safety net, not just formatting.** Pino's built-in `redact` option gives a declarative, enforced guarantee that specific fields (e.g. `password`, `token`, `sessionToken`, `authorization`) are stripped from every log line, even if a developer accidentally passes a full object into a log call later. Plain `console.log` has no such guardrail — a careless `console.log(user)` six months from now silently leaks a password hash into logs. This is the strongest concrete argument for pino here.
- **Log levels enforce discipline.** `debug`/`info`/`warn`/`error` as first-class levels (with a configurable minimum level per environment) prevents debug noise from cluttering production output — something `console.log` doesn't naturally provide.
- **Structured (JSON) output is more useful if/when a log destination is ever added later** (Vercel log drain, Logflare, Axiom) — but see the counter-argument below about whether that destination exists yet.
- Low overhead, low complexity to add (a few hours): one shared logger instance, wired into a handful of key server-side paths (auth failures, task mutation errors, invite errors, admin actions).

### The case AGAINST pino (or: don't over-invest in it)

- **Vercel already captures `console.*` output** in its Runtime Logs dashboard — for a solo developer occasionally checking on a hobby app, that's a real, already-working debugging path with zero added dependency.
- **Structured JSON's main payoff — querying/filtering at scale — requires a log drain or aggregator**, and this milestone does not include standing one up (no Logflare/Axiom/BetterStack integration is in scope). On Vercel's Hobby tier, log retention is short and there's no log drain without a paid plan. Without a destination to query, "structured JSON in stdout" delivers only a fraction of pino's real value over well-placed `console.error(message, { context })` calls.
- Adding a logging library is one more dependency and one more thing to configure correctly (pretty-print in dev vs JSON in prod, level thresholds) for a benefit that, without a log sink, is partly aspirational.

### Verdict for this app

Add it, but scope it honestly: **DIFFERENTIATOR, not because of the JSON output itself, but because of the redaction guarantee and level discipline** — both of which have real value independent of whether a log aggregator exists. Do NOT scope this milestone to include a log drain/shipping destination; that's future work if/when it's actually needed. Keep the implementation small: one shared logger config, wired into auth, task mutations, invite handling, and admin actions — not instrumented throughout the entire codebase.

**Log levels worth using:**
- `error` — unhandled exceptions, failed DB writes, failed auth attempts
- `warn` — recoverable issues: invalid/expired invite tokens, rate-limit-style rejections
- `info` — key business events, used sparingly (hive created, task completed) — avoid over-logging routine CRUD
- `debug` — verbose local-dev detail only; disabled by default in production

**Must NEVER be logged:**
- Plaintext passwords or password hashes
- Session tokens / auth cookies
- Full `user` objects (log a user ID, not the whole record — email is lower-risk but still worth avoiding by default given the redaction philosophy above)
- Sentry DSN or other secrets/env vars
- Full request bodies indiscriminately (task text is low-sensitivity but shouldn't be logged wholesale as a default habit)

### Anti-Features

| Item | Why Commonly Added | Why Overkill Here | Alternative |
|------|---------------------|----------------------|-------------|
| Log drain / shipping to Logflare, Axiom, BetterStack, etc. | Feels like "finishing the job" once structured logging exists | No query volume or team to justify it; Vercel's dashboard + Sentry (for actual errors) covers this app's real debugging needs today | Revisit only if the app's user base or debugging needs grow meaningfully |
| Instrumenting every function/route with logging | "More visibility is always better" | Noise without signal at this scale; makes logs harder to scan, not easier | Log at decision points and failure points only: auth, mutations, admin actions, errors |

---

## 6. Uptime Monitoring

### Table Stakes

| Item | Recommendation | Why | Complexity |
|------|------------------|-----|------------|
| Monitor target | The existing `/api/health` endpoint (pings DB, returns 200/500) | This is the right target — it validates "is the whole app actually working" (DB connectivity included), not just "is Vercel's edge serving *something*." A monitor on the homepage alone would miss DB-down scenarios where a 200 with a broken page could still render. | TRIVIAL — endpoint already exists, this is pure external configuration |
| Check interval | 5 minutes | Free-tier default across UptimeRobot and comparable tools; more than adequate detection latency for a household app with a handful of users where a few minutes of downtime has low real-world cost | TRIVIAL |
| Alert threshold | Alert after 2 consecutive failed checks, not 1 | Avoids false-positive pages from a single transient network blip; most free tools support this as a config option | TRIVIAL |
| Alert channel | Email (or the monitoring tool's free mobile push app if available) | Sufficient for a solo developer; no on-call rotation to route to | TRIVIAL |
| Recovery notification | Keep it on (one message when back up) | Low-noise, high-value confirmation that the issue self-resolved or was fixed | TRIVIAL |

### Differentiators

| Item | Value | Complexity |
|------|-------|------------|
| Second monitor on the marketing homepage in addition to `/api/health` | Catches scenarios where DB is fine but the app itself errors for unrelated reasons (bad deploy, DNS/CDN issue) that a DB-only health check wouldn't surface | TRIVIAL — same free account, one more URL |

### Anti-Features

| Item | Why Commonly Added | Why Overkill Here | Alternative |
|------|---------------------|----------------------|-------------|
| 1-minute check intervals (paid tier) | Feels more "production-grade" | A few minutes of detection latency has negligible real-world impact for a household app with a handful of users and no SLA | Free-tier 5-minute interval |
| Multi-region checking | Distinguishes "down everywhere" vs "down in one region" | Irrelevant at this traffic/user scale; adds cost for a distinction that doesn't change what the solo developer would do in response | Single-region check |
| Public status page | Feels professional | Nobody but the operator is checking a status page for a household app used by family/roommates | Skip; if users notice downtime, they'll just ask directly |
| Incident management / on-call escalation policies, SLA tracking | Standard for teams with support obligations | No team, no support contract, no SLA to track against | Email alert is the entire "incident process" needed here |
| Synthetic multi-step browser transaction monitoring (Playwright-based monitors) | Feels thorough | Explicitly the same class of tooling already deferred in PROJECT.md (Playwright E2E) — duplicating that decision under a different name | Simple HTTP health check monitor is sufficient for this milestone |

---

## Feature Dependencies

```
CI: production build check
    └──requires──> throwaway Postgres service container in CI
                       (because migrations auto-run at build — existing app behavior)

Security headers: CSP connect-src allowance
    └──requires──> Sentry ingest domain known
                       (soft dependency — CSP can ship first with a slightly
                        incomplete connect-src, then be widened when Sentry lands)

Privacy Policy content
    └──requires──> Sentry PII-scrubbing decisions finalized
                       (policy should describe what error-tracking data is
                        collected — write generically now, tighten if scrubbing
                        approach changes)

Uptime monitoring
    └──requires──> existing /api/health endpoint (already shipped — zero new app code)

pino structured logging ──independent──> no dependency on other productionization items
```

### Dependency Notes

- **CI build check requires a throwaway DB:** this is the one place where "just add a GitHub Actions workflow" undersells the real work. Because migrations run automatically at build time in the existing app, `next build` in CI needs a reachable `DATABASE_URL`, which means a Postgres service container (or an explicit CI-only bypass of the build-time migration step) must be designed as part of this requirement, not bolted on after.
- **CSP → Sentry:** sequencing these two doesn't block either — ship security headers first with a best-guess `connect-src` for Sentry's ingest domain (or leave it slightly open), then tighten once Sentry's actual DSN/ingest host is known.
- **Privacy Policy → Sentry PII decisions:** write the policy in general terms ("we use an error-tracking service that may receive technical error data") rather than over-specifying before the `beforeSend` scrubbing hook is actually implemented, to avoid the policy overpromising or underpromising relative to actual behavior.
- **Uptime monitoring has no engineering dependency** — it's pure external configuration against an endpoint that already exists and already works.

---

## MVP Definition

### Launch With (v1.2 — matches PROJECT.md's target features)

- [ ] CI on PRs: typecheck + lint + test + build, required as status checks on `main` — table stakes, no scope debate
- [ ] Build step includes a throwaway Postgres service container so build-time migrations validate against a fresh schema — bundled with the build check, not separable in practice
- [ ] Security headers in `next.config.ts`: CSP (report-only first, then enforced), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (no preload yet)
- [ ] Privacy Policy + Terms of Use pages — plain-language, covers data collected/purpose/sub-processors/retention/contact — explicitly not a substitute for legal review
- [ ] Repo visibility flipped to private
- [ ] Sentry: client + server + edge error capture, release tracking, source maps, PII scrubbing (`sendDefaultPii` stays false, `beforeSend` strips task text/emails from context)
- [ ] pino: shared logger with redaction config, wired into auth/task-mutation/invite/admin code paths only — no log drain
- [ ] Uptime monitoring on `/api/health`, 5-minute interval, 2-failure alert threshold, email alert

### Explicitly Deferred (this milestone, per PROJECT.md)

- [ ] Neon preview branching, custom domain, Vercel spend caps, Playwright E2E, README/ARCHITECTURE.md — already listed as deferred in PROJECT.md, reconfirmed by this research as correctly out of scope for a hobby-scale app right now
- [ ] Log drain/aggregator (Logflare/Axiom/BetterStack) — no query volume to justify it yet
- [ ] Sentry Session Replay and Performance Tracing/Profiling — privacy risk (Replay) and no performance problem to solve (tracing/profiling) at this user scale
- [ ] Public uptime status page, multi-region checks, on-call escalation — no audience or team for any of these

### Future Consideration (only if the app's scale or user base genuinely changes)

- [ ] Cookie consent banner — only becomes relevant if non-essential (analytics/ads) cookies are ever added
- [ ] Formal GDPR data-export self-service — only becomes relevant at a user volume where manual email requests stop scaling
- [ ] Nonce-based strict CSP — only worth the dynamic-rendering tradeoff if third-party scripts are added or the app faces real external security scrutiny

---

## Feature Prioritization Matrix

| Feature | User/Operator Value | Implementation Cost | Priority |
|---------|----------------------|----------------------|----------|
| CI typecheck/lint/test as required checks | HIGH | LOW | P1 |
| CI build + throwaway DB migration check | HIGH | MEDIUM | P1 |
| Security headers (non-CSP) | HIGH | LOW | P1 |
| CSP (report-only → enforced) | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Privacy Policy + Terms pages | HIGH (legal/trust baseline) | LOW | P1 |
| Repo → private | HIGH | TRIVIAL | P1 |
| Sentry client/server/edge capture + PII scrubbing | HIGH | MEDIUM | P1 |
| pino logging (redaction + levels, no drain) | MEDIUM | LOW-MEDIUM | P2 |
| Uptime monitoring on `/api/health` | MEDIUM-HIGH | TRIVIAL | P1 |
| Second uptime monitor (homepage) | LOW-MEDIUM | TRIVIAL | P2 |
| Dependabot/Renovate | LOW-MEDIUM | LOW | P3 |

**Priority key:**
- P1: Must have for this milestone (matches PROJECT.md's stated target features)
- P2: Should have, cheap enough to bundle in if time allows
- P3: Nice to have, not blocking, can slip to a later milestone without harm

## Sources

- [Next.js official docs: Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy) — fetched directly, version 16.2.12 docs, HIGH confidence
- [Next.js official docs: headers() config](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers) — HIGH confidence
- [Sentry official Next.js SDK manual setup docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup) — MEDIUM-HIGH confidence, WebSearch-verified against current instrumentation-client.ts/sentry.server.config.ts/sentry.edge.config.ts pattern
- [Sentry + Next.js Complete Error Monitoring Guide (2026)](https://stacknotice.com/blog/sentry-nextjs-complete-guide-2026) — MEDIUM confidence, community source cross-checked against official docs pattern
- [Vercel Knowledge Base: Add structured application logs to Vercel Functions](https://vercel.com/kb/guide/add-structured-application-logs-to-vercel-functions) — MEDIUM confidence, official Vercel source supporting the pino tradeoff analysis
- [Arcjet: Structured logging in JSON for Next.js](https://blog.arcjet.com/structured-logging-in-json-for-next-js/) — MEDIUM confidence, community source
- [UptimeRobot Knowledge Hub: 11 Best Uptime Monitoring Tools 2026](https://uptimerobot.com/knowledge-hub/monitoring/11-best-uptime-monitoring-tools-compared/) — MEDIUM confidence, vendor source but factually consistent with free-tier interval claims across multiple independent comparison sites
- [UptimeRobot Pricing](https://uptimerobot.com/pricing/) — MEDIUM confidence, official pricing page
- GitHub Actions CI patterns for Next.js (typecheck/lint/test/build, service containers) — MEDIUM confidence, multiple community sources converging on the same pattern, consistent with GitHub's own official Actions documentation on service containers (general knowledge, not separately fetched this session)
- Privacy Policy / Terms of Use content — general/common-practice knowledge for small consumer apps, explicitly flagged LOW confidence as legal content and NOT verified against a legal source; presented as informational content research only, not legal advice

---
*Feature research for: Honey_Do v1.2 Productionization*
*Researched: 2026-07-27*
