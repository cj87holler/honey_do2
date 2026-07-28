# Architecture Research: v1.2 Productionization Integration

**Domain:** Integrating security headers/CSP, Sentry, pino logging, CI, and legal pages into an existing, already-deployed Next.js 16 / Better Auth / Drizzle / Neon app
**Researched:** 2026-07-27
**Confidence:** HIGH for codebase facts (read directly), MEDIUM-HIGH for Next.js/Sentry integration behavior (official docs, current as of 2026-05/2026-07), MEDIUM for the middleware-redirect-header-loss risk (single historical GitHub issue, not independently reproduced against Next 16.2.1)

> **Important correction to milestone context:** the app is on **Next.js 16.2.1**, not 15 as stated in the milestone brief. This matters concretely: Next 16 has deprecated the `middleware.ts` file convention in favor of `proxy.ts`, and Node.js-runtime-only Proxy. The existing `src/middleware.ts` still works (deprecated, not removed) but is running on the **Edge runtime by default** since it doesn't opt into the Node.js middleware runtime. This directly affects the pino-in-middleware question (section 3) and is worth fixing opportunistically while this file is being touched anyway for CSP (section 1).

---

## What's Actually There (read directly from the repo)

- `src/middleware.ts` — the only middleware file, Edge runtime (default, unopted), does two things:
  - Redirects unauthenticated requests away from `/hive*` → `/login`
  - Redirects authenticated requests away from `/login*`/`/signup*` → `/hive`
  - Everything else falls through to `NextResponse.next()` with **no headers set**
  - Matcher: `["/((?!api|_next/static|_next/image|favicon.ico).*)"]` — this already excludes `/api/*`, meaning `/api/health` and `/api/auth/[...all]` never run through this middleware today
  - Session check is cookie-presence only (`__Secure-better-auth.session_token` / `better-auth.session_token`), no DB or `auth.api.getSession()` call — cheap, Edge-safe
- `next.config.ts` — literally an empty stub (`const nextConfig: NextConfig = {}`). No `headers()`, no wrapping, nothing.
- `package.json` scripts: `dev`, `build` (`drizzle-kit migrate && next build`), `start`, `lint` (`eslint`), `test` (`vitest`, no `run` flag). **No `typecheck` script exists** — PROJECT.md's CI checklist (`typecheck`, `lint`, `test`) requires adding one.
- `Makefile` already has a `test-ci: npx vitest run` target (non-watch mode) — reuse this in CI rather than reinventing it.
- **Tests are fully mocked — no live DB required.** Every test file that touches persistence uses `vi.mock("@/lib/db", () => ({...}))` (confirmed in `tests/admin/*.test.ts`, `tests/invite/*.test.ts`, `tests/task/*.test.ts`). `vitest.config.mts` has no `globalSetup`/`setupFiles` that provision a database, and `environment: "jsdom"` with per-file `// @vitest-environment node` overrides is the only environment config. **CI does not need a Postgres service container to run `vitest`.**
- `src/lib/db.ts` picks the Neon serverless WebSocket driver when `process.env.VERCEL` is set, else the local `postgres` driver — this only matters for `next build`/`drizzle-kit migrate`, not for tests.
- `drizzle.config.ts` requires `DATABASE_URL_UNPOOLED` or `DATABASE_URL` to be set just to construct the config object — **even `drizzle-kit generate` or any `drizzle-kit` invocation without a real target will fail fast if neither var is set.** This is only invoked via `npm run build`, which CI will not run.
- `src/app/api/health/route.ts` — returns a **hardcoded** `{ status: "ok", ts: Date.now() }`. It does **not** ping the database despite `PRODUCTIONIZATION_ROADMAP.md` describing it as pinging the DB. Flagging this because an uptime monitor pointed at `/api/health` today will never detect a DB outage — worth a one-line fix (`await db.execute(sql`select 1`)`) while this milestone is touching observability anyway, though it's not one of the five capabilities asked about here.
- No `.github/workflows/` directory exists yet — CI is fully new.
- No `instrumentation.ts` exists anywhere — Sentry is fully new.
- Route groups: `(admin)` — layout-level session + `isAdminEmail` gate, redirects to `/hive`; `(app)` — plain `Header` wrapper, no own auth check (relies on middleware + page-level checks); `(auth)` — login/signup. `src/app/page.tsx` (landing) and `src/app/invite/[token]/page.tsx` live **outside any route group**, directly under `src/app/`.
- `src/components/landing/landing-page.tsx` has a real `<footer>` element but it's just a copyright line — no legal links today.
- No `next/font`, no external script/font/analytics domains anywhere in the app. The only non-`'self'` asset is a `data:` URI SVG background in `globals.css`. This keeps a static CSP allowlist small.

---

## 1. Security Headers / CSP

### Decision: static CSP via `next.config.ts` `headers()`, not nonce-based, not middleware-generated

**Why not nonces:** Official Next.js guidance (fetched 2026-07-27, docs v16.2.12) is explicit — nonce-based CSP **requires every page that needs the nonce to be dynamically rendered** (`await connection()` or equivalent), which disables static optimization/ISR and is incompatible with Partial Prerendering / Cache Components. Honey_Do's landing page, help page, and most content are good candidates for static rendering later; forcing full dynamic rendering app-wide to support nonces is a real cost for a small consumer app with no compliance driver for strict CSP. The app also doesn't inject any inline `<script>` tags today (no `next/font`, no third-party analytics), so `'unsafe-inline'`-avoidance via nonces isn't buying much yet.

**Recommendation:** Define all static security headers (CSP without nonces, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`) in `next.config.ts`'s `headers()` function with `source: '/(.*)'`. This is a config-level mechanism, **independent of `middleware.ts`'s matcher** — per Next.js's documented request pipeline (`headers` from `next.config.js` → `redirects` from `next.config.js` → Proxy/Middleware → filesystem routes...), `headers()` applies to every matched route including `/api/health` and `/api/auth/[...all]`, which the middleware matcher currently excludes. This decouples header policy from auth routing entirely — the two systems don't need to compose in one file.

**CSP starting point** (no external fonts/scripts/analytics found in the codebase today):
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```
- `style-src 'unsafe-inline'` is a pragmatic default because Next.js/React can inject inline styles in some framework paths without a nonce pipeline in place; tighten later if verified unnecessary.
- `img-src` needs `data:` for the `globals.css` SVG background.
- Ship this as `Content-Security-Policy-Report-Only` first (same header value, report-only variant) for one deploy cycle to catch violations against real production traffic before switching to enforcing `Content-Security-Policy` — there's no CSP reporting infrastructure in this app yet, so "report-only" here really just means "watch DevTools console on your own pass through the app," which is still worth doing given no automated E2E coverage exists (Playwright is explicitly deferred).

### The redirect-header-loss risk (why middleware needs a small, explicit addition)

`headers()` in `next.config.js` is documented to run first in the pipeline, but there is a known (if old — GitHub issue dates to Next 14.2.3, not independently reproduced here against 16.2.1) failure mode where **headers configured in `next.config.js` are not reliably present on responses that middleware returns directly via `NextResponse.redirect()`** — the redirect happens before the header-merge step completes, and the header only shows up after the *next* navigation. This is exactly the shape of Honey_Do's middleware: its only two behaviors are `NextResponse.redirect()` calls (unauth → `/login`, auth-on-authpage → `/hive`). Confidence on this specific defect persisting into 16.2.1: MEDIUM (single historical source, plausibly fixed since, but cheap to defend against regardless).

**Concrete mitigation:** duplicate the header-setting logic into `middleware.ts` itself, applied only to the two `NextResponse.redirect()` return paths (a shared `applySecurityHeaders(response)` helper imported from the same module `next.config.ts` builds its header list from, so the two don't drift). `NextResponse.next()` (the pass-through path, ~everything else) does **not** need this treatment — that path continues into normal route rendering where `next.config.js` `headers()` is well-established, high-confidence, documented behavior.

### Matcher — no interaction change needed

Keep the existing matcher (`["/((?!api|_next/static|_next/image|favicon.ico).*)"]`). It doesn't need to change for CSP purposes because CSP headers are being added via `next.config.ts`, not middleware logic. Optionally adopt the official CSP guide's recommendation to also skip prefetch requests (`missing: [{ type: 'header', key: 'next-router-prefetch' }, ...]`) — this is a minor perf optimization, not a correctness requirement, since this app isn't doing per-request nonce generation.

### Housekeeping opportunity (optional, bundle with this phase since the file is already open)

`middleware.ts` is deprecated in Next 16 in favor of `proxy.ts` (exported function renamed `middleware` → `proxy`). Next provides a codemod: `npx @next/codemod@canary middleware-to-proxy .`. Not required for this milestone, but since the CSP work is the one place `middleware.ts` gets touched, it's a good moment to also run the rename and remove the deprecation warning. This is a rename only — the auth-redirect logic is unaffected. **Flag this as a suggestion, not a requirement**, so it doesn't block CSP shipping if the roadmap wants to keep scope tight.

### Files touched
| File | Change |
|---|---|
| `next.config.ts` | **Modified.** Add `headers()` export with static CSP + security headers. This is also where Sentry's `withSentryConfig` wraps the config (see §2) — ordering matters, see Build Order below. |
| `src/middleware.ts` | **Modified.** Import the same header-list constant used by `next.config.ts`; apply to both `NextResponse.redirect()` calls only. |
| `src/lib/security-headers.ts` (or similar) | **New.** Shared header-list constant/builder consumed by both `next.config.ts` and `middleware.ts` so they can't drift. |

---

## 2. Sentry

### File layout

Because this project uses `src/`, Sentry's file conventions land inside `src/`, sibling to `middleware.ts` and `app/`:

| File | New/Modified | Purpose |
|---|---|---|
| `src/instrumentation.ts` | **New** | Exports `register()` (conditionally imports server/edge config by `NEXT_RUNTIME`) and `onRequestError` (captures server-side errors, including from Route Handlers and Server Components) |
| `src/instrumentation-client.ts` | **New** | Client-side `Sentry.init(...)` — current SDK convention, replaces the older `sentry.client.config.ts` pattern |
| `sentry.server.config.ts` (repo root) | **New** | Server-side `Sentry.init(...)` |
| `sentry.edge.config.ts` (repo root) | **New** | Edge-runtime `Sentry.init(...)` — this is what actually matters for `middleware.ts`, since it runs on Edge by default (see §3) |
| `src/app/global-error.tsx` | **New** | Sentry-recommended root error boundary to capture React render errors that `error.tsx` misses |
| `next.config.ts` | **Modified** | Wrapped with `withSentryConfig(nextConfig, sentryOptions)` |

Run `npx @sentry/wizard@latest -i nextjs` to scaffold these — it auto-detects the `src/` layout and places files correctly, but review its `next.config.ts` diff since this file will already have a `headers()` function from §1.

### `withSentryConfig` vs `headers()` — no conflict, but ordering in the file matters

`withSentryConfig` wraps a `NextConfig` object; per its published behavior (and the `next.config.ts` "execution order" documentation) it primarily adds webpack/Turbopack plugin config for source-map upload, injects `rewrites()` entries if `tunnelRoute` is used, and sets a couple of its own top-level flags (e.g., disabling the `x-powered-by` header via `poweredByHeader`, adjusting `productionBrowserSourceMaps`). It does **not** read or overwrite an existing `headers()` function — unrelated config keys pass through untouched. **Practical recommendation regardless of the theoretical safety:** write CSP's `headers()` first (§1), confirm it in a preview deploy, *then* wrap with `withSentryConfig` as the outermost call — i.e., `export default withSentryConfig(nextConfig, sentryOptions)` where `nextConfig` already has `headers()` defined. This ordering means if Sentry's wrapper ever needs to be debugged or removed, `headers()` stays intact and testable independently. Build order in this document reflects that (CSP before Sentry).

### Tunnel route

If `tunnelRoute` is enabled (routes Sentry envelope requests through `/monitoring` or similar first-party path to dodge ad blockers), two things need updating that are easy to miss:

1. **CSP `connect-src`** needs the tunnel path is same-origin (`'self'` already covers it) — but if tunneling is *not* used, `connect-src` needs Sentry's ingest domain added explicitly (`https://*.ingest.sentry.io` or the region-specific ingest host from the Sentry project's DSN).
2. **Middleware matcher exclusion**: the tunnel route is a rewrite target, not a real page — if `middleware.ts`'s matcher pattern is ever tightened further, make sure the tunnel path isn't accidentally caught by an auth redirect. The current matcher (`/((?!api|_next/static|_next/image|favicon.ico).*)`) would catch a tunnel route like `/monitoring` unless it's placed under `/api/monitoring` (recommended — keeps it inside the existing `api` exclusion, zero matcher changes needed).
3. Known Sentry issue: `tunnelRoute` can pass through the Sentry backend's own `Strict-Transport-Security` response header, which could unintentionally affect HSTS behavior on this domain. Low practical risk for a Vercel-hosted app already served over HTTPS, but worth being aware of if HSTS behaves unexpectedly after enabling tunneling.

For a small app with a handful of household users, ad-blocker interference with error reporting is a minor concern — **recommend skipping `tunnelRoute` initially** to avoid the added rewrite/CSP/matcher surface area, and revisit only if error volume looks suspiciously low.

### Server Actions and `middleware.ts` interaction

- **Server Actions:** Sentry's Next.js SDK automatically captures unhandled exceptions that escape a Server Action (Next.js treats these like other server errors that reach `onRequestError`). Errors that are caught internally (`try/catch` in `createTask`, `resetUserPassword`, etc.) will **not** auto-report — those need explicit `Sentry.captureException(err)` calls at the catch sites if visibility into handled-but-notable failures is wanted. Given this app's Server Actions (`resetUserPassword`, task actions) already throw on validation failure rather than swallowing errors (confirmed in `src/lib/actions/task.ts` via the test file, which asserts `rejects.toThrow(...)`), most of today's failure paths should already surface to Sentry with zero extra code — worth confirming during the Sentry phase.
- **`middleware.ts`:** since it runs on the Edge runtime today, Sentry's `sentry.edge.config.ts` (not the server config) is what actually instruments it. Sentry does support the Edge runtime for basic error capture, but tracing/performance instrumentation is more limited there than on Node.js. Given `middleware.ts`'s logic is two `if` branches and a cookie read, there isn't much surface area for it to throw — low-priority instrumentation target.

---

## 3. pino Logging

### Where it lives, and the hard constraint

**New file:** `src/lib/logger.ts` — a single module-level `pino()` instance, exported as a singleton:

```typescript
import pino from "pino"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
})
```

**Hard constraint confirmed against this codebase:** `pino` (and its `transport`/worker-thread machinery) does not work in the Edge runtime — `pino.transport is not a function` is a known failure mode there. Since `src/middleware.ts` is running on the **Edge runtime by default** (no `export const runtime = "nodejs"` opt-in present, and legacy `middleware.ts` — unlike the new `proxy.ts` convention — still defaults to Edge in Next 16), **pino must not be imported into `src/middleware.ts` as written today.** Given the middleware's logic is trivial (a cookie presence check and two redirects), there's no compelling reason to log there at all; if middleware-level logging is ever needed, use `console.log(JSON.stringify({...}))` directly rather than pulling in pino, or migrate the file to the Node.js middleware runtime first (stable since Next 15.5, opt-in via `export const runtime = "nodejs"` in the middleware's config export) — but that's a separate decision, not a productionization dependency.

**Where pino *is* safe to use directly:**
- Route Handlers (`src/app/api/health/route.ts`, `src/app/api/auth/[...all]/route.ts`, and any future API routes) — these run on the Node.js runtime by default unless a route explicitly opts into `export const runtime = "edge"` (none do today).
- Server Actions (`src/lib/actions/*.ts`) — Server Actions always execute in the Node.js runtime, no exceptions.
- Server Components / layouts that do server-side work (e.g., the `(admin)/layout.tsx` session check) — also Node.js runtime.

Import as `import { logger } from "@/lib/logger"` (using the project's existing `@/*` → `./src/*` path alias) directly in each Server Action / Route Handler that needs it — no wrapper or context-passing layer is needed for v1.2's scope.

### Fluid Compute / instance reuse safety

A single module-level `pino()` instance is safe to share across warm Vercel Fluid Compute invocations *because it is stateless by design* — a pino logger instance holds no per-request mutable state (log level and destination stream are fixed at construction, not mutated per call). The unsafe pattern to avoid is calling `logger.child({ requestId })` and then **reassigning it back onto the shared singleton** (e.g., `logger = logger.child(...)`, mutating the module-level binding) — that would leak request-scoped bindings across concurrent/reused invocations. **Correct pattern:** always create a local child logger per request/action and never write back to the shared instance:

```typescript
import { logger } from "@/lib/logger"

export async function createTask(hiveId: string, formData: FormData) {
  const log = logger.child({ action: "createTask", hiveId })
  // use `log`, not `logger`, for this request's log lines
}
```

This keeps the shared instance itself immutable and safe under reuse, while still getting request-scoped context in log output.

### Files touched
| File | New/Modified |
|---|---|
| `src/lib/logger.ts` | **New** — shared pino singleton |
| `src/app/api/health/route.ts` | **Modified** (optional but recommended) — add a log line, and while touching this file, consider fixing the DB-ping gap noted above |
| `src/lib/actions/task.ts`, `src/lib/actions/hive.ts`, `src/lib/actions/invite.ts`, admin actions | **Modified** (incremental, as needed) — add `logger.child(...)` calls at meaningful decision points (task created, invite accepted, admin password reset) |
| `src/middleware.ts` | **Not touched** for logging — do not import pino here |

---

## 4. CI Workflow

### Does CI need a database? **No — confirmed from test source, not assumed.**

Every test file under `tests/` that imports database-touching code (`tests/admin/list-hives.test.ts`, `tests/admin/list-users.test.ts`, `tests/admin/reset-password.test.ts`, `tests/invite/accept-invite.test.ts`, `tests/invite/generate-invite.test.ts`, `tests/task/create-task.test.ts`, `tests/task/update-task-status.test.ts`) uses `vi.mock("@/lib/db", () => ({ db: {...} }))` to replace the entire `db` export before the module under test is imported. `vitest.config.mts` has no `globalSetup`, no `setupFiles` beyond `[]`, and no environment variable requiring `DATABASE_URL` to construct. **`npm test` (i.e., `vitest`) never opens a real Postgres connection.** No service container needed in the GitHub Actions workflow.

### The `npm run build` trap — confirmed and must be avoided in CI

`package.json`'s `build` script is `drizzle-kit migrate && next build`. `drizzle.config.ts` reads `process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL` **at config-load time** — if neither is set, `drizzle-kit migrate` fails immediately (`url: undefined`) before `next build` even starts. **Recommendation: CI must not run `npm run build` at all.** PROJECT.md's stated CI checklist (`typecheck`, `lint`, `test`) already avoids this — stick to exactly those three steps and do not add a build step "for good measure." If build-verification in CI is wanted later (a reasonable future ask — it would catch TypeScript errors that only surface at Next's build-time type-checking, plus catch route/config errors), the fix is to split the script: add a `"build:next": "next build"` script that CI can call directly, bypassing `drizzle-kit migrate` entirely, while leaving `"build": "drizzle-kit migrate && next build"` as-is for Vercel's actual deploy step (which does have `DATABASE_URL_UNPOOLED` available in Production). This split is not required for the CI capability being requested now — flagging it as a clean follow-up, not a blocker.

### What the workflow needs

- **Node version:** match `package.json`'s implicit requirement — Next 16.2.1 requires Node 20.9+ (LTS). Use `actions/setup-node@v4` with `node-version: 20` (or pin to the exact local dev version if the Makefile/README specifies one — none found in Makefile, so 20.x LTS is the safe default) and `cache: 'npm'` pointed at `package-lock.json` (present).
- **No `DATABASE_URL` needed** — per the above, don't provision one, don't add a `postgres:16` service container. This keeps the workflow simpler and faster.
- **Steps:** `npm ci` → `npm run typecheck` (new script, see below) → `npm run lint` → `npx vitest run` (or `make test-ci`, which already wraps this).
- **Add a `typecheck` script** — `package.json` has none today. Add `"typecheck": "tsc --noEmit"` to `scripts`. (`next lint` was removed in Next 16 — this project's `lint` script already correctly uses the bare `eslint` CLI via `eslint.config.mjs`, no change needed there.)
- **Trigger:** `pull_request` targeting `main` (and optionally `dev`, though PROJECT.md's workflow is PR-into-`main` via `dev`). PROJECT.md explicitly wants these wired as **required status checks on `main`** — that's a GitHub branch-protection setting change (`Settings → Branches → main → Require status checks`), done after the workflow file exists and has run at least once (GitHub only lists checks that have executed).

### Files touched
| File | New/Modified |
|---|---|
| `.github/workflows/ci.yml` | **New** |
| `package.json` | **Modified** — add `"typecheck": "tsc --noEmit"` to `scripts` |
| Makefile | **Modified (optional)** — add a `typecheck:` target mirroring the new npm script, for local parity with CI, consistent with the project's existing Makefile-driven dev philosophy |

Example workflow shape (for the roadmap's reference, not meant as final code):
```yaml
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npx vitest run
```

---

## 5. Privacy / Terms Pages

### Route placement — no route group needed, and no middleware change needed

`src/app/page.tsx` (landing) and `src/app/invite/[token]/page.tsx` already establish the precedent of routes living **directly under `src/app/`, outside any route group**, for content that must be publicly reachable. `src/app/privacy/page.tsx` and `src/app/terms/page.tsx` should follow the same pattern.

**Verified against the actual middleware logic — these routes are automatically ungated:** `protectedPaths = ["/hive"]` and `authPaths = ["/login", "/signup"]` are the only two arrays the middleware checks via `pathname.startsWith(p)`. `/privacy` and `/terms` match neither, so the middleware's `if` blocks both evaluate false and the request falls through to `NextResponse.next()` — no auth gate, no redirect, no middleware change required at all. This is a zero-risk addition from an access-control standpoint; just don't accidentally nest them under `src/app/(app)/` or `src/app/(admin)/`, which would put them behind those route groups' rendering (not full auth-walls in this app's current design, but unnecessary and semantically wrong).

### Linking from landing page and footer

`src/components/landing/landing-page.tsx`'s `<footer>` currently only renders a copyright string. Add `Privacy` / `Terms` links there:
```tsx
<footer className="text-center py-8 text-xs text-stone-400">
  Honey Do — making chores buzz-worthy since 2026
  <div className="mt-2 space-x-4">
    <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
    <Link href="/terms" className="hover:underline">Terms of Use</Link>
  </div>
</footer>
```
There is no shared global footer component today — `(app)`/`(admin)` layouts only render `Header`, no `Footer`. For v1.2, linking from the landing page footer alone satisfies "legal minimums" (PRODUCTIONIZATION_ROADMAP.md's own bar). Adding a persistent footer to the authenticated app shell is a reasonable nice-to-have but is UI-polish scope (already tracked separately per the user's memory note on a deferred UI polish pass) — don't bundle it into this milestone unless asked.

### Files touched
| File | New/Modified |
|---|---|
| `src/app/privacy/page.tsx` | **New** |
| `src/app/terms/page.tsx` | **New** |
| `src/components/landing/landing-page.tsx` | **Modified** — add footer links |
| `src/middleware.ts` | **Not touched** — already permissive by default for unrecognized paths |

---

## Recommended Project Structure (new files across all five capabilities)

```
honey_do2/
├── .github/
│   └── workflows/
│       └── ci.yml                      # NEW — typecheck/lint/test on PR, no DB service
├── src/
│   ├── instrumentation.ts              # NEW — Sentry register() + onRequestError
│   ├── instrumentation-client.ts       # NEW — Sentry client init
│   ├── middleware.ts                   # MODIFIED — adds security headers to its two redirect responses only
│   ├── lib/
│   │   ├── logger.ts                   # NEW — shared pino singleton
│   │   └── security-headers.ts         # NEW — header list shared by next.config.ts and middleware.ts
│   ├── app/
│   │   ├── privacy/
│   │   │   └── page.tsx                # NEW — public, outside route groups
│   │   ├── terms/
│   │   │   └── page.tsx                # NEW — public, outside route groups
│   │   ├── global-error.tsx            # NEW — Sentry root error boundary
│   │   └── api/health/route.ts         # MODIFIED (optional) — logging + real DB ping
│   └── components/landing/landing-page.tsx  # MODIFIED — footer links to /privacy, /terms
├── sentry.server.config.ts             # NEW — repo root (Sentry wizard convention)
├── sentry.edge.config.ts               # NEW — repo root, instruments middleware's Edge runtime
├── next.config.ts                      # MODIFIED — headers() added first, then wrapped in withSentryConfig
└── package.json                        # MODIFIED — add "typecheck" script
```

---

## Build Order

The dependency that actually matters is `next.config.ts` contention between `headers()` (CSP) and `withSentryConfig` (Sentry). Everything else is independent and can be reordered freely, but the order below minimizes rework and lets each phase be verified in isolation on a preview deploy before the next one touches the same file again.

1. **CI workflow** (§4) — zero dependencies on anything else in this list, purely additive (`.github/workflows/ci.yml`, `package.json` typecheck script). Do this first so every subsequent PR in this milestone is already gated by real checks, catching regressions from the phases below as they land.
2. **Privacy/Terms pages** (§5) — zero dependencies, trivially safe, good "warm-up" phase, also gives CI something low-risk to prove itself against.
3. **pino logging** (§3) — no `next.config.ts` involvement at all, so it doesn't interact with the CSP/Sentry ordering concern. Do this before Sentry so Sentry's server-side error capture has structured log context to correlate against once it's live (not a hard dependency, just better sequencing).
4. **Security headers / CSP** (§1) — modifies `next.config.ts` for the first time this milestone (`headers()`) and modifies `middleware.ts`. Land and verify on a preview deploy (check response headers via `curl -I`, confirm `/login` and `/hive` redirects still carry the headers, confirm the app still functions under CSP — no console violations) **before** Sentry wraps the same config file.
5. **Sentry** (§2) — wraps `next.config.ts` with `withSentryConfig(nextConfig, ...)` where `nextConfig` already has `headers()` defined from step 4. This ordering means the CSP work is fully landed, tested, and stable before an external codegen step (the Sentry wizard) touches the same file — if the wizard's automated edit needs manual reconciliation with `headers()`, there's a known-good version to diff against. Also add `sentry.edge.config.ts` here, which is what actually instruments `middleware.ts` given its Edge runtime.

**Why not Sentry before CSP:** reversing this order means the CSP phase would need to hand-edit a `next.config.ts` that a wizard-generated `withSentryConfig(...)` wrapper already owns, risking either breaking Sentry's wrapper structure or CSP silently not applying if `headers()` is added inside the wrong nesting level. Landing the plain-object `headers()` first, then wrapping it, is strictly simpler to get right and to review.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Trusting `next.config.js` `headers()` alone for the auth redirect responses
**What people do:** Add CSP/security headers only via `next.config.ts` `headers()` and assume they apply everywhere, including the `NextResponse.redirect()` calls in `middleware.ts`.
**Why it's wrong:** There's a documented (if old, MEDIUM-confidence-against-16.2.1) failure mode where headers configured in `next.config.js` don't reliably attach to middleware-issued redirects. Since this app's middleware is *entirely* redirect-driven for its two active behaviors, this isn't an edge case here — it's the main path for unauthenticated users hitting `/hive`.
**Do this instead:** Explicitly re-apply the header set on both `NextResponse.redirect()` calls in `middleware.ts`, sourced from the same shared constant `next.config.ts` uses.

### Anti-Pattern 2: Importing pino into `middleware.ts`
**What people do:** Add `import { logger } from "@/lib/logger"` to middleware for visibility into auth-redirect decisions.
**Why it's wrong:** `middleware.ts` runs on the Edge runtime by default in this app (unlike the new `proxy.ts` convention, legacy `middleware.ts` still defaults to Edge in Next 16), and pino's transport machinery throws in Edge (`pino.transport is not a function`).
**Do this instead:** Use `console.log(JSON.stringify({...}))` directly if middleware-level logging is ever needed, or migrate to `export const runtime = "nodejs"` in middleware's config first if pino is a hard requirement there (separate decision, not needed for this milestone's scope).

### Anti-Pattern 3: Running `npm run build` in CI "to be thorough"
**What people do:** Add a `build` step to the GitHub Actions job alongside typecheck/lint/test, reasoning that a green build is the strongest signal.
**Why it's wrong:** `npm run build` is `drizzle-kit migrate && next build` — it fails immediately in CI with no `DATABASE_URL_UNPOOLED`/`DATABASE_URL` set, since `drizzle.config.ts` reads that env var at config-load time before any migration logic runs.
**Do this instead:** Match PROJECT.md's stated scope exactly (`typecheck`, `lint`, `test`). If build-verification becomes wanted later, split the npm script into `build:next` (bare `next build`, safe to run without a DB) and keep `build` (with the migrate step) for Vercel's actual deploy.

### Anti-Pattern 4: Wrapping `next.config.ts` in `withSentryConfig` before `headers()` exists
**What people do:** Run the Sentry setup wizard first (it's the more "exciting" capability), accept its `next.config.ts` diff, then try to bolt CSP `headers()` on afterward.
**Why it's wrong:** Not a hard technical conflict (see §2), but it means every subsequent edit to `next.config.ts` has to be made through/around Sentry's wrapper, and any wizard-regenerated diff risks clobbering hand-written `headers()` additions.
**Do this instead:** Land `headers()` as a plain, fully-tested object first; wrap it with `withSentryConfig` last.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---|---|---|
| Sentry | SDK init in `sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation-client.ts`, config wrapped via `withSentryConfig` in `next.config.ts` | Skip `tunnelRoute` initially — added CSP/matcher surface not worth it for a household-scale app; revisit only if error volume looks suspiciously low (possible ad-blocker interference) |
| Uptime monitor (Better Stack / UptimeRobot, per PRODUCTIONIZATION_ROADMAP.md) | Polls `GET /api/health` | Not one of the five capabilities in scope here, but note: the current handler is hardcoded and doesn't verify DB connectivity — the monitor will show "up" even during a DB outage until that's fixed |
| GitHub Actions | `pull_request` trigger against `main`, required status check via branch protection settings | No DB service container needed — confirmed from test mocks, not assumed |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `next.config.ts` `headers()` ↔ `src/middleware.ts` | Both read from a shared `src/lib/security-headers.ts` constant | Decoupled by design — `headers()` is the source of truth for all normal responses; middleware only needs to duplicate it on its two redirect paths |
| `next.config.ts` `headers()` ↔ `withSentryConfig` | Sequential wrapping, `headers()` written first inside the plain config object, `withSentryConfig(nextConfig, ...)` applied as the outermost export | See Build Order — sequencing avoids the wizard's generated diff colliding with hand-written CSP config |
| `src/lib/logger.ts` ↔ Server Actions / Route Handlers | Direct import + `.child()` per call site, never mutate the shared singleton | Safe under Vercel Fluid Compute instance reuse because the base instance is stateless |
| `src/middleware.ts` (Edge runtime) ↔ `sentry.edge.config.ts` | Sentry's edge SDK instruments the Edge runtime middleware runs under today | Tracing is more limited on Edge than Node.js; low priority given middleware's minimal logic |

---

## Sources

- [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) — official docs, v16.2.12, last updated 2026-03-20. HIGH confidence.
- [Next.js `proxy.js` file convention reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — official docs, v16.2.12, last updated 2026-05-13. HIGH confidence. Confirms execution order (`headers` from next.config.js → `redirects` → Proxy/middleware → filesystem routes...), matcher behavior, and that legacy `middleware.ts` still works but is deprecated.
- [Next.js "Upgrading to version 16" guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — official docs, v16.2.12, last updated 2026-05-13. HIGH confidence. Confirms Edge runtime is not available in the new `proxy.ts` convention, but legacy `middleware.ts` retains Edge as its default/only-configurable-away-from-with-explicit-opt-in runtime.
- [GitHub issue #65702, vercel/next.js — "Custom headers not working when using redirect in middleware"](https://github.com/vercel/next.js/issues/65702) — community-reported, Next 14.2.3, not independently reproduced against 16.2.1 in this research. MEDIUM confidence, used to justify a cheap defensive mitigation rather than as settled fact.
- [Sentry Next.js manual setup docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) — official Sentry docs. MEDIUM-HIGH confidence (fetched via summarization, not verbatim). Confirms `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `withSentryConfig`, `tunnelRoute`, and matcher-exclusion guidance for the tunnel path.
- [Sentry JS SDK GitHub — `withSentryConfig` source, tunnelRoute-related issues (#8931, #12447, #6425, #5571)](https://github.com/getsentry/sentry-javascript) — community/issue-tracker level, used only to confirm the HSTS-passthrough caveat on `tunnelRoute`. MEDIUM confidence.
- Community discussion on pino + Edge runtime incompatibility (`vercel/next.js` discussions #33898, #67213, #46987) — MEDIUM confidence, consistent across multiple independent threads, used to justify keeping pino out of `middleware.ts`.
- Direct repository inspection (`src/middleware.ts`, `next.config.ts`, `package.json`, `vitest.config.mts`, `tests/**/*.test.ts`, `drizzle.config.ts`, `src/lib/db.ts`, `src/app/api/health/route.ts`, `src/app/(admin)/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/layout.tsx`, `src/components/landing/landing-page.tsx`, `Makefile`, `PRODUCTIONIZATION_ROADMAP.md`) — HIGH confidence, ground truth for all codebase-specific claims in this document.

---
*Architecture research for: v1.2 Productionization integration into existing Honey_Do codebase*
*Researched: 2026-07-27*
