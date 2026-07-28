# Stack Research: v1.2 Productionization

**Domain:** Production-hardening additions to an already-shipped Next.js 16 + Drizzle + Better Auth app on Vercel/Neon
**Researched:** 2026-07-27
**Confidence:** HIGH for items verified against official docs/npm registry today; MEDIUM/LOW flagged per item below

## Important correction to milestone framing

The milestone brief describes the existing stack as "Next.js 15." **The actual installed version, per `package.json`, is `next: 16.2.1`** (latest on npm today is `16.2.12` — a routine patch bump, not a major). This matters because **Next.js 16.0.0 deprecated the `middleware.ts` file convention and renamed it to `proxy.ts`** (function renamed `middleware` → `proxy`). The repo currently has `src/middleware.ts` exporting `middleware()` for auth redirects — this still works in 16.2.x (deprecated, not removed) but:

- Official CSP-with-nonces documentation for the App Router is now written entirely against `proxy.ts`, not `middleware.ts`.
- A codemod exists: `npx @next/codemod@canary middleware-to-proxy .` — renames the file and the function automatically.
- **Recommendation:** run the codemod as part of the security-headers work item (capability 2), rather than adding CSP logic to a file convention that's already deprecated in the installed major version.

This is a HIGH confidence finding — sourced directly from the official Next.js docs (fetched today, docs version 16.2.12, page `lastUpdated: 2026-05-13`).

---

## 1. CI on pull requests — GitHub Actions

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `actions/checkout` | `v7` (currently `v7.0.1`) | Clone repo into runner | Latest major; v4 is now old. Confirmed via GitHub releases API today. |
| `actions/setup-node` | `v7` (currently `v7.0.0`) | Install Node + cache npm deps | Latest major, supports `cache: 'npm'` built-in (no separate `actions/cache` step needed). |
| Node.js | `22.x` in CI | Runtime version | Matches the Node version already running locally (`node -v` → `v22.11.0`) and is what a Vercel project is most likely pinned to today. Node 22 is in **Maintenance LTS** (EOL April 2027); Node 24 is the current **Active LTS** (until April 2028). Either is fine for CI; pin to whatever the Vercel project's Node setting actually is so CI and prod runtime agree — check Vercel Project Settings → General → Node.js Version. Vercel is deprecating Node 20 on Oct 1, 2026, so avoid pinning to 20. | MEDIUM — version numbers HIGH confidence (verified), the "which LTS to pick" judgment is a recommendation, not a hard requirement |
| `npm ci` | — | Deterministic install in CI | Repo has `package-lock.json` committed — always use `npm ci`, not `npm install`, in CI for reproducibility and speed. |

**Missing script to add:** the repo has `lint` and `test` in `package.json` scripts but **no `typecheck` script**. Add:

```json
"scripts": {
  "typecheck": "tsc --noEmit"
}
```

TypeScript 5.x is already a devDependency; `tsc --noEmit` requires no new package.

**Example workflow shape** (`.github/workflows/ci.yml`):

```yaml
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
```

**Caching strategy:** `actions/setup-node@v7`'s built-in `cache: 'npm'` (keyed off `package-lock.json` automatically) is sufficient — no need for a manual `actions/cache` step. Confidence: HIGH, this has been the recommended pattern since `setup-node@v3`.

**Note on `build`:** the repo's `build` script runs `drizzle-kit migrate && next build`, which means `npm run build` in CI would attempt to run migrations against whatever `DATABASE_URL` is configured — **do not run `npm run build` in the PR-gating CI job** unless a dedicated ephemeral/test database is wired up (out of scope per PROJECT.md — Neon preview branching is explicitly deferred to a later milestone). Keep the required check to `typecheck` + `lint` + `test` only, as PROJECT.md specifies.

---

## 2. Security headers — CSP with nonces in the App Router (Next.js 16)

**Exact package:** none — this is a Next.js built-in capability (`proxy.ts` + optionally `next.config.ts` `headers()`). No new dependency required. HIGH confidence, verified against official docs fetched today (`nextjs.org/docs/app/guides/content-security-policy`, updated 2026-03-20).

### Is `next.config.ts` `headers()` sufficient, or is a proxy/middleware required?

**Both are valid, but they solve different problems:**

- **`next.config.ts` `headers()` alone** is sufficient for X-Frame-Options, HSTS (`Strict-Transport-Security`), Referrer-Policy, and a CSP that does **not** use nonces (i.e., one that allows `'unsafe-inline'` for scripts/styles or relies purely on domain allowlisting). This is a static, build-time header — same value on every response.
- **Nonce-based CSP (`script-src 'nonce-...' 'strict-dynamic'`) requires `proxy.ts`** (the renamed `middleware.ts`), because a nonce must be freshly generated **per request** and injected into a response header before the page renders. `headers()` in `next.config.ts` cannot generate per-request random values.

### Current correct proxy-based nonce implementation (verified against live docs today)

```ts
// src/proxy.ts  (rename from src/middleware.ts via codemod)
import { NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const isDev = process.env.NODE_ENV === "development"

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue)
  return response
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
```

**How the nonce propagates automatically:** Next.js parses the `Content-Security-Policy` response header during server-side rendering, extracts the `nonce-{value}` token, and attaches it automatically to framework scripts, page JS bundles, and inline styles/scripts it generates — you don't manually tag every `<script>`. For your own `<Script>` components or third-party tags, read the nonce server-side via `(await headers()).get('x-nonce')` and pass it as the `nonce` prop.

### The dev-mode `unsafe-eval` requirement

**Confirmed, not folklore:** React uses `eval` in development to reconstruct server-side error stacks in the browser console. `'unsafe-eval'` is required in `script-src` only when `NODE_ENV === 'development'`; neither React nor Next.js use `eval` in production. The `isDev` conditional above is the documented, current pattern — not a workaround.

### Turbopack impact

Turbopack (default bundler since Next 15/16) does not change any of the above — the nonce-injection mechanism is a Next.js server-rendering feature, not a bundler feature. No special Turbopack flags or config are needed for CSP/nonces. (No official doc calls out a Turbopack-specific CSP caveat; this is a direct reading of the current CSP guide, which makes no bundler distinction — MEDIUM confidence by absence of any contrary documentation.)

### The critical, easy-to-miss tradeoff: nonces force dynamic rendering everywhere

This is the part most blog posts and even some AI-generated advice gets wrong or omits. Per the official docs (HIGH confidence):

- **Every page must be dynamically rendered** to receive a nonce — a nonce is generated per-request, and static pages have no request context at build time.
- Static optimization and ISR are **disabled** wherever nonces are used.
- **Partial Prerendering (PPR) is explicitly incompatible** with nonce-based CSP.
- Practically: any currently-static page (e.g., the marketing/landing page from Phase 7, or Privacy/Terms pages from capability 3) would need `await connection()` from `next/server` to force dynamic rendering, losing CDN caching and static-generation speed for those routes.

**Recommendation for a solo-dev, hobby-scale app:** Given Honey_Do has no advertising/analytics scripts and no third-party inline-script requirements today, the pragmatic v1.2 choice is:

- Use the **`next.config.ts` `headers()` approach without nonces** for the CSP, plus X-Frame-Options / HSTS / Referrer-Policy — this covers the real threat model (clickjacking, MIME sniffing, protocol downgrade) without sacrificing static rendering on the landing/legal pages.
- A CSP without nonces still meaningfully restricts `default-src 'self'`, blocks `object-src`, sets `frame-ancestors 'none'`, etc. — it just permits `'unsafe-inline'` for scripts/styles (Next.js itself injects some inline bootstrap data that a strict nonce-free policy can't avoid without SRI or nonces).
- Reserve nonce-based CSP (and the `middleware.ts` → `proxy.ts` migration) for a later milestone if/when a stricter security posture becomes a real requirement (e.g., before handling payment info or PII beyond email+password).

This is a judgment call for the roadmap/requirements phase, not a hard technical constraint — flagging both paths with real tradeoffs rather than picking one silently, per the quality gate.

### Headers table for `next.config.ts`

```ts
// next.config.ts
import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader.replace(/\n/g, "") },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ]
  },
}

export default nextConfig
```

Note: `Strict-Transport-Security` (HSTS) only takes effect on HTTPS responses; Vercel serves everything over HTTPS by default so this is safe to always set. Do not enable `preload` submission to the HSTS preload list unless you're certain the domain will always be HTTPS-only (it's very hard to reverse).

---

## 3. Privacy Policy + Terms pages

No stack impact — static App Router pages (`src/app/privacy/page.tsx`, `src/app/terms/page.tsx`), plain content, no new dependencies. Only interaction with the rest of this research: if the nonce-based CSP path is chosen (see #2), these pages would need to opt into dynamic rendering; if the `next.config.ts` headers-only path is chosen, no change needed and they stay static/cacheable. Noted briefly per instructions.

---

## 4. Sentry — `@sentry/nextjs`

| Item | Value | Confidence |
|------|-------|------------|
| Package name | `@sentry/nextjs` | HIGH |
| Current version on npm (checked today) | `10.68.0` | HIGH — verified via `npm view @sentry/nextjs version` |
| Setup command | `npx @sentry/wizard@latest -i nextjs` | HIGH per official docs |

### Current file layout (this is the part that has changed significantly from older Sentry-for-Next.js tutorials)

Running the wizard today generates:

- **`instrumentation-client.ts`** (project root, alongside `src/` conventions or in `src/` if that's where `app/` lives) — this is the **client-side entry point**, replacing the old `sentry.client.config.ts` pattern. Next.js automatically loads this file for client bundles.
- **`sentry.server.config.ts`** — Node.js server runtime init (imported from `instrumentation.ts`, not auto-loaded on its own).
- **`sentry.edge.config.ts`** — Edge runtime init (relevant since `proxy.ts`/middleware defaults to Node runtime in Next 16, but Sentry's wizard still scaffolds this for edge-deployed route handlers if any exist).
- **`instrumentation.ts`** at the project root — Next.js's own instrumentation hook file (a Next.js-native convention, not Sentry-specific), which the wizard populates to:
  1. Conditionally `import` the server or edge config based on `process.env.NEXT_RUNTIME`.
  2. Export `onRequestError`:
     ```ts
     export const onRequestError = Sentry.captureRequestError
     ```
     This hooks into Next.js's built-in `onRequestError` instrumentation export, which fires for errors thrown in Route Handlers, Server Actions, Server Components, and Proxy/Middleware — giving Sentry server-side error capture without manual try/catch wrapping everywhere.

**Do NOT use the old pattern** of a bare `sentry.client.config.ts` without `instrumentation-client.ts` — that was the pre-Next.js-15-`instrumentation` era and is what most stale tutorials/blog posts still show. If Context7 or a future check shows this differently, re-verify — but as fetched from `docs.sentry.io/platforms/javascript/guides/nextjs/` today, `instrumentation-client.ts` is current.

### `next.config.ts` wrapper

```ts
import { withSentryConfig } from "@sentry/nextjs"

export default withSentryConfig(nextConfig, {
  org: "your-org-slug",
  project: "your-project-slug",
  // silent: true in CI to reduce log noise
  silent: !process.env.CI,
  widenClientFileUpload: true,
})
```

This wraps whatever `nextConfig` object already resulted from the CSP `headers()` work in #2 — **run the Sentry wizard after the security-headers work**, so it wraps the final config rather than the other way around (order matters for `next.config.ts` composition, but `withSentryConfig` is designed to wrap any existing config object regardless of what's inside it).

**Auth token:** the wizard will prompt to create a `SENTRY_AUTH_TOKEN` for source map upload at build time — store as a Vercel env var (build-time secret, not exposed to client) and as a GitHub Actions secret if source maps should also upload from CI (optional for a hobby app; Vercel's own build can do this without CI involvement).

### Integration with existing stack

- Sentry's Next.js SDK auto-instruments fetch/route handlers; no conflict with Better Auth, Drizzle, or the `postgres`/`@neondatabase/serverless` conditional driver switching already in place.
- Sentry will capture errors from the existing `/api/health` route automatically once wired — useful cross-check against capability 6 (uptime monitoring): if uptime monitoring shows downtime, Sentry should show the corresponding server error.

---

## 5. Structured logging — `pino`

| Item | Value | Confidence |
|------|-------|------------|
| Package | `pino` | HIGH |
| Current version on npm (checked today) | `10.3.1` | HIGH |
| `pino-pretty` (dev-only) | `13.1.3` | HIGH |

### The Vercel serverless problem (this is real, not folklore — confirmed via multiple 2026-dated GitHub issues)

**`pino.transport()` (worker-thread-based transports, including `pino-pretty` used as a transport) is broken in two distinct ways on Vercel/Next.js today:**

1. **Edge Runtime:** `pino.transport` is not a function at all in Edge Runtime — `worker_threads` doesn't exist there. If any code path touching the logger runs in Edge (e.g., an Edge-runtime route handler, or historically `middleware.ts` before it defaulted to Node runtime), transport-based pino throws immediately.
2. **Node.js serverless functions bundled by Turbopack:** actively-reported issue as of March–May 2026 (`vercel/next.js#93849`, `#87342`) — Turbopack's bundling of pino's worker-thread transport produces hashed external module aliases (e.g., `pino-2e79642258e38174`) that **cannot be resolved at runtime** in the deployed Vercel function, throwing `Cannot find module` / `Cannot find module './transport-stream'` / `unable to determine transport target for pino`. This reproduces specifically with Turbopack, which is the default bundler in this project (Next 16, no `--webpack` flag in the build script).

### Correct production configuration

**Do not use `transport:` in the pino constructor for anything that runs in a Vercel serverless function.** Instead:

```ts
// src/lib/logger.ts
import pino from "pino"

const isDev = process.env.NODE_ENV === "development"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
  // production: no transport — pino writes plain JSON to stdout,
  // which Vercel's log pipeline already captures and structures.
})
```

This is the documented, working pattern: **JSON-to-stdout in production (no transport object at all), `pino-pretty` only conditionally wired in for local dev.** Vercel's own logging infrastructure ingests stdout/stderr from serverless functions and displays it in the dashboard — plain JSON lines are exactly what it expects; a "pretty" human-formatted string is actively worse for Vercel's log viewer (which can parse and filter structured JSON fields but not pretty-printed text).

### Does it work in Route Handlers and Server Actions?

**Yes, for both — as long as they run in the Node.js runtime** (the default for Route Handlers and Server Actions unless `export const runtime = 'edge'` is explicitly set, which nothing in this app currently does). Import the shared `logger` from `src/lib/logger.ts` into any Route Handler or Server Action and call `logger.info(...)` / `logger.error(...)` directly — this works today with pino 10.x, no transport, no worker threads involved.

**Do not** import the logger into `proxy.ts`/`middleware.ts` if it ever runs in Edge runtime — verify runtime with `export const config = { runtime: 'nodejs' }` (Next 16 defaults Proxy to Node.js runtime already, per the docs fetched above, so this is likely a non-issue for this app specifically, but worth a one-line comment in the file to prevent a future regression if someone adds `runtime: 'edge'`).

### Next.js-specific alternative worth naming

**Arcjet's structured-logging guide** (and Vercel's own "Pino Logging" template) both converge on the exact same no-transport-in-prod pattern above — there isn't a materially different "Next.js-native" logger that solves this better for a small app. Two adjacent options, named for completeness but **not recommended** here:

- **`next-logger`** (community package that patches Next.js's internal console calls to emit pino-formatted JSON) — solves a different problem (making Next.js's own framework logs structured) and is unnecessary for this app's scope, which just needs `logger.info()` calls inside route handlers/actions.
- **Plain `console.log(JSON.stringify(...))`** — technically achieves "structured logging" with zero dependencies, but loses pino's log levels, child loggers (useful for per-request context like `hiveId`/`userId`), and serialization performance. Not recommended over pino given pino is already the named requirement in PROJECT.md.

---

## 6. Uptime monitoring — Better Stack vs UptimeRobot

| Criterion | Better Stack (free tier) | UptimeRobot (free tier) |
|-----------|---------------------------|--------------------------|
| Monitor count | 10 | 50 |
| Check interval | 3 minutes | 5 minutes |
| Status page | 1 included | Included |
| Programmatic monitor creation | REST API available on all tiers, including free | REST API v3 available on all tiers, including free — "Quick Monitor Setup" flow also exists for no-auth setup |
| Incident/on-call features | Full (escalation policies, on-call rotation, SMS/phone alerts) — arguably overkill for a solo-dev hobby app | Minimal — just up/down alerting |
| Best fit here | Overkill unless you want a public status page and on-call escalation | Good fit — this app needs "tell me when `/api/health` goes down," nothing more |

**Recommendation: UptimeRobot free tier.** For a single health-check endpoint on a solo-dev hobby-scale app, UptimeRobot's simplicity (add URL, set interval, get an email/webhook alert) directly matches the need. Better Stack's on-call/escalation features are meaningful for a team running production infra with pager rotations — not relevant here. Both have API access on free tiers, so "programmatic setup during onboarding" isn't a differentiator either way.

**Integration:** point either service at the existing `GET /api/health` — no application code changes needed. If Better Stack were chosen instead, its free tier's 3-minute interval vs UptimeRobot's 5-minute interval is a minor, not decisive, factor.

Confidence: MEDIUM — pricing/tier details sourced from WebSearch summaries of multiple 2026-dated comparison articles (not each vendor's own pricing page directly fetched); the *shape* of the comparison (Better Stack = more feature-rich/incident-focused, UptimeRobot = simpler/generous free monitors) is a consistent, well-established pattern across all sources found, so directional confidence is higher than the exact numbers. **Recommend a quick manual check of each vendor's current `/pricing` page before final setup**, since free-tier limits are exactly the kind of detail vendors change without much notice.

---

## 7. Repo visibility flip to private

No new package/dependency. Implication for GitHub Actions billing (HIGH confidence, verified via GitHub's own billing docs page found in search, cross-referenced by multiple sources):

- **Public repos:** GitHub Actions minutes are unlimited/free regardless of usage.
- **Private repos on the Free plan:** **2,000 Actions minutes/month included** (Linux-equivalent minutes — Windows runners count 2x, macOS 10x against that quota; this project only needs `ubuntu-latest`, so no multiplier concern). Beyond that, billed at $0.006/minute, but a Free-plan account has a **$0 spending limit by default** — jobs simply stop running rather than silently incurring charges, unless a spending limit is explicitly raised.
- **Practical impact for this project:** a PR-gating workflow running `typecheck` + `lint` + `test` on `ubuntu-latest` for a small Next.js app takes on the order of 2–4 minutes per run. Even with frequent PRs (say, 10/day), that's well under 2,000 minutes/month. **No action needed beyond awareness** — flag it in case CI is later expanded (e.g., adding Playwright E2E, which PROJECT.md already notes is deferred).

---

## Installation summary

```bash
# Security headers (capability 2): no install — Next.js built-in

# Sentry (capability 4)
npx @sentry/wizard@latest -i nextjs
# generates instrumentation-client.ts, sentry.server.config.ts,
# sentry.edge.config.ts, and wires instrumentation.ts + next.config.ts

# Structured logging (capability 5)
npm install pino
npm install -D pino-pretty

# CI (capability 1): no install — GitHub Actions workflow YAML + one new npm script
```

```json
// package.json — add
"scripts": {
  "typecheck": "tsc --noEmit"
}
```

---

## What NOT to use / do (over-engineering traps for this milestone)

| Avoid | Why | Use instead |
|-------|-----|--------------|
| `sentry.client.config.ts` (old pre-`instrumentation` pattern) | Superseded by `instrumentation-client.ts`; following stale Sentry tutorials will produce a broken or partially-working setup with today's SDK version. | `instrumentation-client.ts` via the current wizard |
| `pino.transport({ target: 'pino-pretty' })` unconditionally (dev config used in prod) | Breaks on Vercel — worker-thread transport resolution fails under Turbopack bundling in Node functions, and fails outright in Edge runtime. Multiple 2026 GitHub issues confirm this is an active, unresolved class of bug, not a one-off misconfiguration. | JSON-to-stdout (no transport) in production; `pino-pretty` transport gated behind `NODE_ENV === 'development'` only |
| Nonce-based CSP as a default choice without acknowledging the dynamic-rendering cost | Silently converts every page (including the marketing landing page and legal pages) to server-rendered-per-request, killing static generation/CDN caching for a hobby app that doesn't need that level of strictness yet | `next.config.ts` `headers()` CSP without nonces, covering the real threats (clickjacking, MIME sniffing, HSTS) — revisit nonces if/when a stricter policy becomes an actual requirement |
| Adding CSP logic to `src/middleware.ts` as-is | That file convention is deprecated in the installed Next.js 16.x; official CSP docs are written against `proxy.ts` | Run `npx @next/codemod@canary middleware-to-proxy .` first, or write new proxy-based logic directly into a renamed `proxy.ts` |
| Better Stack for a single health-check monitor | Its differentiators (on-call rotation, escalation policies, incident management) solve a team-ops problem this solo-dev app doesn't have | UptimeRobot free tier |
| Running `npm run build` (which includes `drizzle-kit migrate`) inside the PR-gating CI job | Would run migrations against whatever `DATABASE_URL` CI has configured — dangerous without a dedicated ephemeral test DB, which is explicitly out of scope (Neon preview branching deferred) | Keep CI to `typecheck` + `lint` + `test`; leave `build` (with migrate) to Vercel's own deploy pipeline, which already runs it correctly against the real database on merge to `main` |
| `next-logger` package | Solves "make Next.js's own framework console output structured JSON," a problem this app doesn't have — adds a dependency for no benefit when the actual need is `logger.info()` calls inside route handlers/Server Actions | Plain `pino` instance imported where needed |
| Enabling HSTS `preload` directive/submitting to the browser preload list | Extremely hard to reverse once submitted — a domain change or a need to briefly serve HTTP would be effectively impossible for months | Set `Strict-Transport-Security: max-age=...; includeSubDomains` without `preload`, or hold off on `preload` until confident the domain is permanently HTTPS-only |

---

## Version compatibility notes

| Package | Compatible with | Notes |
|---------|------------------|-------|
| `@sentry/nextjs@10.68.0` | `next@16.2.1` | No known incompatibility; Sentry's Next.js SDK tracks Next.js major versions closely and 10.x is the current line supporting App Router + `instrumentation.ts` hooks used by Next 15/16. |
| `pino@10.3.1` | Next.js 16 + Turbopack, Node.js runtime only | Works without transport in Node serverless functions. Do not use in Edge runtime code paths. |
| `actions/checkout@v7`, `actions/setup-node@v7` | GitHub-hosted `ubuntu-latest` runners | Current majors as of today; no known issues with Node 22/24 setup. |
| Nonce-based CSP (`proxy.ts`) | Requires renaming `middleware.ts` → `proxy.ts` first | `middleware.ts` is deprecated (not removed) in Next 16.0.0+; codemod available: `npx @next/codemod@canary middleware-to-proxy .` |

---

## Sources

- Next.js official CSP guide — https://nextjs.org/docs/app/guides/content-security-policy (fetched today; docs version 16.2.12, `lastUpdated: 2026-03-20`) — HIGH
- Next.js official `proxy.js` file convention reference — https://nextjs.org/docs/app/api-reference/file-conventions/proxy (fetched today; docs version 16.2.12, `lastUpdated: 2026-05-13`) — HIGH, includes explicit `middleware` → `proxy` migration section and version history table showing the v16.0.0 deprecation
- npm registry, checked live today via `npm view`: `@sentry/nextjs` → `10.68.0`, `pino` → `10.3.1`, `pino-pretty` → `13.1.3`, `next` → `16.2.12`, `@next/codemod` → `16.2.12` — HIGH
- GitHub Releases API, checked live today: `actions/checkout` → `v7.0.1`, `actions/setup-node` → `v7.0.0` — HIGH
- Sentry official Next.js SDK docs — https://docs.sentry.io/platforms/javascript/guides/nextjs/ (fetched today) — HIGH for file layout and `onRequestError` pattern; exact package version not stated on that page, cross-verified against npm directly
- WebSearch, multiple 2026-dated GitHub issues on pino + Vercel/Turbopack — `vercel/next.js#93849`, `vercel/next.js#87342`, `formbricks/formbricks#7509`, `pinojs/pino#1736` — MEDIUM-HIGH (community-reported issues, consistent across multiple independent repos/maintainers, not a single source)
- WebSearch, GitHub Actions billing — GitHub's own billing docs page (`docs.github.com/billing/...`) surfaced in results — MEDIUM, numbers cross-confirmed by 3+ independent 2026 pricing-explainer sources but not directly fetched via WebFetch in this session
- WebSearch, Node.js LTS schedule — endoflife.date, nodesource.com, Node.js official blog referenced in results — HIGH, consistent across sources
- WebSearch, Vercel Node.js version support — Vercel's own changelog ("Node.js 20 is being deprecated") surfaced in results — MEDIUM, not directly fetched
- WebSearch, Better Stack vs UptimeRobot comparisons — multiple independent 2026-dated comparison articles, directionally consistent — MEDIUM (recommend a final manual pricing-page check before committing, per note in section 6)
- `/Users/cj.holler/Desktop/honey_do2/package.json`, `/Users/cj.holler/Desktop/honey_do2/next.config.ts`, `/Users/cj.holler/Desktop/honey_do2/src/middleware.ts`, `/Users/cj.holler/Desktop/honey_do2/.planning/PROJECT.md` — direct repo inspection, HIGH

---
*Stack research for: Honey_Do v1.2 Productionization milestone*
*Researched: 2026-07-27*
