# Phase 14: Structured Logging - Research

**Researched:** 2026-08-11
**Domain:** Server-side structured logging (pino) in Next.js 16 App Router, deployed on Vercel
**Confidence:** MEDIUM — stack facts are HIGH (verified against real repo + npm registry + official Next.js docs); the single Turbopack/Vercel/pino runtime-resolution risk is LOW (one unconfirmed, auto-closed GitHub issue)

## Summary

This phase has almost no existing `console.*` call to migrate. A full `grep -rn "console\."` across `src/` found exactly **one** hit, and it's in a client component (`src/components/auth/login-form.tsx:44`), which is explicitly out of scope. **The real work of this phase is additive, not migratory**: the four named areas (auth, task-mutation, invite, admin) currently log nothing at all — errors simply `throw` and are swallowed by Next.js's default error handling. The planner should frame tasks as "add structured logging to these call sites" rather than "replace console statements."

The good news: Next.js already ships `pino` and `pino-pretty` on its built-in `serverExternalPackages` auto-opt-out list (confirmed from the official docs page, version 16.3.0, updated 2025-12-05). This means **no `next.config.ts` change is required** for the packages to resolve correctly as native `require`s outside the Server Components bundle — reducing collision risk with Phase 15 (which adds a `headers()` function to the same file) and Phase 16 (which wraps the file with `withSentryConfig`).

The one real risk worth flagging to the planner: a single, unconfirmed, auto-closed (no-repro) GitHub issue (vercel/next.js#93849) reports that Turbopack's externalized-package hashing can produce a runtime-unresolvable module alias specifically under **Vercel + Turbopack + Next 16** — the exact combination this app runs. It was closed by a bot for lacking a reproduction, not investigated by a maintainer, so treat it as LOW confidence, not a confirmed blocker. Because this project's preview deployments cannot build (documented blocker in STATE.md), the only way to catch this class of failure is a local production-mode build/start test before merging, mirroring the empirical-verification approach Phase 15 already plans to use for its CSP rollout.

`src/middleware.ts` currently does not log anything and runs on the Edge runtime by default (no `runtime` export overrides it). It should stay that way — pino's `redact` option depends on `fast-redact`, which uses Node's `vm` module, unavailable in Edge. Nothing in `middleware.ts` needs to change for this phase; the plan should treat "don't touch it" as the deliverable for success criterion 4, not "add a workaround."

**Primary recommendation:** Build one shared `src/lib/logger.ts` exporting a single pino instance (`level` from `process.env.LOG_LEVEL` or a sane default, `transport` conditional on `process.env.NODE_ENV !== "production"`, `redact` covering Better Auth session/account shapes and `DATABASE_URL`), import it directly into the four named server-action/route files, and verify redaction with real unit tests using a writable-stream destination rather than eyeballing console output.

## User Constraints

No CONTEXT.md exists yet for this phase (`.planning/phases/14-structured-logging/` contained no `*-CONTEXT.md` at research time — only this file was created). There are no locked decisions or discretion notes to copy forward. The planner should treat the ROADMAP.md phase entry (reproduced below) as the effective spec, since it is unusually precise and was evidently written with this research already in mind.

**ROADMAP.md Phase 14 success criteria (verbatim):**
1. A shared `pino` logger module exists and is used by auth, task-mutation, invite, and admin server actions/routes
2. Logging a request/session object through the shared logger redacts cookies, passwords, session tokens, and `DATABASE_URL` rather than printing them in the clear
3. In production (`NODE_ENV=production`) the logger emits plain JSON to stdout with no `transport` configured; `pino-pretty` is used only in development
4. `src/middleware.ts` does not import the logger (it runs on the Edge runtime by default, where pino's transport machinery fails to import)

**REQUIREMENTS.md Out of Scope table (already a locked project-level decision, directly relevant to this phase):**
> "pino log drains / transports in production | Open Next 16 + Turbopack bugs break worker-thread transports; plain JSON to stdout avoids the failure mode entirely"

This confirms the project has already decided (before this research) not to use `pino.transport()` / worker-thread transports in production — criterion 3 is not a new idea, it's already locked. Treat it as non-negotiable, not a Claude's-discretion area.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OBS-05 | Server routes and Server Actions emit structured JSON logs with secrets redacted | Standard Stack (pino/pino-pretty versions + install), Code Examples (logger module + redact config), Common Pitfalls (Edge Runtime, Turbopack alias risk, DATABASE_URL leak vector), Validation Architecture (writable-stream test pattern) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Structured log emission | API / Backend (Server Actions + Route Handlers) | — | All four named areas (auth, task-mutation, invite, admin) are Server Actions (`"use server"`) or a Route Handler (`api/auth/[...all]/route.ts`, `api/health/route.ts`) — pure backend tier, runs in the Node.js runtime on Vercel |
| Secret redaction | API / Backend (pino `redact` config) | — | Redaction must happen at the point of log emission, inside the shared logger module; no client or Edge tier involved |
| Log transport (pretty vs JSON) | API / Backend (process-level, `NODE_ENV` branch) | — | Decided once at module load in `src/lib/logger.ts`; not per-request, not per-tier |
| Middleware / Edge requests | Browser-adjacent / Edge Runtime | — | `src/middleware.ts` runs on Edge by default (no `runtime` export). Explicitly OUT of scope for logger import — Edge cannot run pino's `vm`-dependent redaction machinery |
| Log ingestion / storage | CDN / Platform (Vercel Runtime Logs) | — | Vercel automatically captures stdout/stderr from Node.js Functions; no log drain or transport is configured in-app for this phase (locked decision, see User Constraints) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pino` | 10.3.1 | Structured JSON logger | Fastest mainstream Node logger, zero-dependency-on-transports-by-default, `redact` built in via `@pinojs/redact`. Already on Next.js's built-in `serverExternalPackages` auto-opt-out list — no config needed. `[VERIFIED: npm registry — npm view pino version, published 2026-02-09]` |
| `pino-pretty` | 13.1.3 | Human-readable dev output | Standard companion to pino for local dev only; never touches production per locked project decision. Also already on Next.js's auto-externalized list. `[VERIFIED: npm registry — npm view pino-pretty version, published matches 10.3.1 era]` |

**Package name provenance note:** Both `pino` and `pino-pretty` were already named explicitly in ROADMAP.md's Phase 14 section (written before this research ran) and independently confirmed via `npm view <pkg> version` (registry) AND found by name on Next.js's own official `serverExternalPackages` documentation page (an authoritative, non-training source). This satisfies the bar for `[VERIFIED]` rather than `[ASSUMED]`.

### Supporting
None required. No `pino-http` (this app is Server Actions + a handful of Route Handlers, not an Express-style middleware chain — `pino-http`'s request/response auto-logging model doesn't fit). No `next-logger` (that package patches `console.*` globally via `instrumentation.ts`; the success criteria call for explicit logger imports in four named files, not global console-patching — see State of the Art section).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pino | Winston | Winston is more configurable but slower and has a heavier API surface; pino is the de facto standard for Next.js/Vercel because of its low overhead and because Next.js core team has already special-cased it in `serverExternalPackages` |
| Explicit `logger.ts` import per file | `next-logger` (console-patching via `instrumentation.ts`) | Would satisfy "structured JSON logs" more automatically, but directly conflicts with success criterion 1's explicit-usage requirement and criterion 4's "middleware does not import the logger" framing (console-patching via instrumentation.ts is a different, broader mechanism the roadmap doesn't ask for). Also Phase 16 (Sentry) will need `instrumentation.ts` for its own purposes — don't create a collision this phase doesn't need |

**Installation:**
```bash
npm install pino pino-pretty
```

**Version verification performed:**
```bash
npm view pino version          # -> 10.3.1
npm view pino-pretty version   # -> 13.1.3
npm view pino time.10.3.1      # -> 2026-02-09 (recent, actively maintained; first published 2016)
```

## Package Legitimacy Audit

slopcheck 0.6.1 was installed (`pip3 install --user slopcheck`) and run. **Note for planner/executor:** slopcheck's `install` subcommand does not support `--json` and performs a REAL `npm install` as a side effect (not a dry-run check) — during this research session it added `pino`/`pino-pretty` to `package.json`/`package-lock.json`, which was immediately reverted (`git checkout -- package.json package-lock.json`) since research must not modify the working tree. **When the plan actually installs these packages, that real `npm install pino pino-pretty` IS the legitimate install step — the slopcheck side effect only mattered here because this was research, not execution.**

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| pino | npm | 10 years (first published 2016-02-21) | Extremely high (foundational Node.js logging library) | github.com/pinojs/pino | [OK] | Approved |
| pino-pretty | npm | Long-established companion package | High | github.com/pinojs/pino-pretty | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Postinstall script check (`npm view <pkg> scripts.postinstall`): neither package defines a `postinstall` script. No suspicious network/filesystem behavior at install time.

## Architecture Patterns

### System Architecture Diagram

```
Browser (client component)
   |
   |  form submit / authClient.signIn.email() etc.
   v
Next.js Server Action  ----------------------\
(src/lib/actions/*.ts, "use server")           \
   |                                             |
   | auth.api.getSession()                       | logger.info({ ... }, "msg")
   v                                              v
Better Auth (src/lib/auth.ts) ---> Postgres   Shared pino logger (src/lib/logger.ts)
   |                                              |
   | session/account rows                         | redact: cookies, tokens, passwords,
   v                                              | DATABASE_URL
Drizzle ORM (src/lib/db.ts) --> Neon/local PG      |
                                                    v
                                          process.stdout (production: raw JSON)
                                          pino-pretty transport (development only)
                                                    |
                                                    v
                                          Vercel Runtime Logs (auto-captures
                                          stdout/stderr per Function invocation)

Edge Runtime (src/middleware.ts) -- NO import of logger.ts --
   (auth-cookie presence check only, no DB, no logging this phase)
```

Entry points: Server Actions in `src/lib/actions/*.ts` and Route Handlers in `src/app/api/**/route.ts`. Processing: business logic → optional error → `logger.<level>(context, message)` call → pino serializes + redacts → writes to stdout (prod) or pretty-prints (dev). Decision point: `process.env.NODE_ENV === "production"` at module load in `logger.ts`, once, not per-request. External boundary: Vercel's Function runtime captures stdout and surfaces it in the Runtime Logs dashboard.

### Recommended Project Structure
```
src/
├── lib/
│   ├── logger.ts          # NEW — shared pino instance, exported singleton
│   ├── auth.ts             # existing — no changes needed for logging (see Pitfall: Better Auth logger)
│   ├── db.ts                # existing — unchanged
│   └── actions/
│       ├── task.ts          # add logger import + calls (task-mutation)
│       ├── invite.ts        # add logger import + calls (invite)
│       ├── admin.ts         # add logger import + calls (admin)
│       └── hive.ts           # NOT named in success criteria — planner's call whether in scope
├── app/
│   └── api/
│       └── auth/[...all]/route.ts   # "auth" route — thin Better Auth wrapper, see Pitfall below
└── middleware.ts            # DO NOT import logger.ts (Edge runtime)
```

**Open question for the planner:** the roadmap names "auth" as one of the four areas, but there is no `src/lib/actions/auth.ts` in this codebase — auth is handled by Better Auth's client SDK (`authClient.signIn.email()` etc. from client components) hitting the catch-all Route Handler `src/app/api/auth/[...all]/route.ts`, which is a two-line `toNextJsHandler(auth)` wrapper with no custom code to attach a logger call to directly. See Common Pitfalls below for the two realistic ways to satisfy "auth ... uses the shared logger."

### Pattern 1: Environment-conditional logger construction
**What:** Single pino instance, `transport` option only set when `NODE_ENV !== "production"`.
**When to use:** Always, for this project — this is the entire content of success criterion 3.
**Example:**
```typescript
// Source: pino docs (github.com/pinojs/pino/blob/main/docs/api.md) + Next.js serverExternalPackages docs
// src/lib/logger.ts
import pino from "pino"

const isProd = process.env.NODE_ENV === "production"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  redact: {
    paths: [
      "session.token",
      "*.session.token",
      "user.password",
      "*.password",
      "account.password",
      "account.accessToken",
      "account.refreshToken",
      "account.idToken",
      "headers.cookie",
      "headers.authorization",
      "req.headers.cookie",
      "req.headers.authorization",
      "cookies",
      "DATABASE_URL",
      "*.DATABASE_URL",
      "env.DATABASE_URL",
    ],
    censor: "[REDACTED]",
  },
  // no `transport` key at all in production — this IS criterion 3, not an
  // omission. pino-pretty is opt-in via the transport block below, dev only.
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
})
```
**Why this satisfies criterion 3 literally:** the object spread means the `transport` key is **absent from the options object entirely** in production, not merely disabled — matching "no `transport` configured" precisely.

### Pattern 2: Custom `err` serializer for connection-string leakage
**What:** `DATABASE_URL` can leak into a Postgres/Drizzle error's `.message` or `.stack` (e.g. a connection failure that echoes the connection string), not just as a literal object key. `redact` paths only strip values at known object *paths* — they do **not** scan arbitrary string content for a substring match. This is a real gap between what `redact` does and what criterion 2 implies ("redacts ... DATABASE_URL").
**When to use:** Any place a raw `err` object from `postgres`/`drizzle-orm` might be logged.
**Example:**
```typescript
// Source: pino stdSerializers docs (pino is HIGH confidence on this API; the
// scrub-by-substring wrapper below is this research's own recommendation, [ASSUMED])
import pino from "pino"

function scrubDatabaseUrl(err: Error) {
  const serialized = pino.stdSerializers.err(err)
  const url = process.env.DATABASE_URL
  if (url) {
    if (serialized.message?.includes(url)) {
      serialized.message = serialized.message.replaceAll(url, "[REDACTED]")
    }
    if (serialized.stack?.includes(url)) {
      serialized.stack = serialized.stack.replaceAll(url, "[REDACTED]")
    }
  }
  return serialized
}

// pass as serializers: { err: scrubDatabaseUrl } in the pino() options
```

### Anti-Patterns to Avoid
- **Using `pino.transport()` or a `transport` option in production:** Explicitly out of scope per REQUIREMENTS.md — worker-thread transports are the exact failure mode this phase avoids.
- **Importing `logger.ts` in `src/middleware.ts`:** Will fail at runtime in the Edge runtime because `fast-redact` (pino's redaction engine) requires Node's `vm` module, which Edge does not provide.
- **Relying on `redact` to catch secrets embedded in free-text strings** (e.g. a DB error message containing the full connection string): `redact` operates on object key paths, not substring scanning. Use a custom serializer (Pattern 2) for this case.
- **Global `console.*` monkey-patching via `instrumentation.ts`:** Not what the success criteria ask for, and creates unnecessary surface-area collision with Phase 16 (Sentry), which will need `instrumentation.ts` for its own setup.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redacting nested secret fields from logged objects | A custom recursive object-walker that deletes keys by name | pino's built-in `redact` option (`fast-redact`/`@pinojs/redact` under the hood) | Handles wildcard paths, censor values, remove-vs-censor semantics, and is battle-tested against prototype-pollution-style edge cases that a hand-rolled walker would miss |
| JSON log formatting / dev pretty-printing | Custom `console.log(JSON.stringify(...))` wrapper | `pino` (prod) + `pino-pretty` (dev, via `transport`) | pino handles level filtering, timestamps, child loggers, and serializer composition for free; a hand-rolled wrapper reinvents all of this with none of the performance work |

**Key insight:** The temptation in this phase is to reach for `console.log(JSON.stringify({...}))` since it's "simple JSON logging" — resist this. It has no redaction, no level filtering, and no path to the pino ecosystem's testing utilities (`pino.destination`, custom writable-stream sinks) that make criterion 2 actually testable rather than eyeballed.

## Common Pitfalls

### Pitfall 1: "Auth" has no dedicated server-action file to attach a logger to
**What goes wrong:** The planner tries to find `src/lib/actions/auth.ts` (matching the pattern of `hive.ts`, `task.ts`, `invite.ts`, `admin.ts`) and it doesn't exist — auth is handled entirely by Better Auth's generated Route Handler and client SDK.
**Why it happens:** Better Auth owns the sign-up/sign-in/sign-out HTTP surface via `toNextJsHandler(auth)` in `src/app/api/auth/[...all]/route.ts` (2 lines, no custom logic) and `src/lib/auth.ts` (the `betterAuth({...})` config object, also currently minimal).
**How to avoid:** Two realistic options for the plan to choose between (this research does not pick one — treat as an open question for planning):
  1. Wrap `toNextJsHandler(auth)`'s `GET`/`POST` exports in the route file with a thin logging layer (log method + pathname on entry, log status on exit).
  2. Use Better Auth's own `logger` config option in `src/lib/auth.ts` (`logger: { log: (level, message, ...args) => logger[level]({...}, message) }`) to route Better Auth's *internal* logs through the shared pino instance. **Caveat, `[CITED: better-auth.com/docs/reference/options]` MEDIUM confidence:** Better Auth's docs specify `log(level, message, ...args)` with `level` restricted to `"debug" | "info" | "warn" | "error"` (default minimum `"warn"`) — sign-in/sign-up success events are not guaranteed to be logged by Better Auth internally at all; a currently-open Better Auth issue (#3250, "Logger not, well, logging") and a merged PR (#10121, "route account-linking logs through the configured logger") suggest coverage of the `logger` hook inside Better Auth's own internals has historically been incomplete. Don't assume wiring `logger.log` guarantees every auth event is captured — verify empirically (e.g. trigger a real sign-in in dev and confirm a pino line appears) rather than trusting the hook exists everywhere.
**Warning signs:** Attempting `grep -r "console\." src/lib/actions/` or `find src -iname "*auth*action*"` and finding nothing to migrate — that's expected, not a research gap.

### Pitfall 2: `redact` does not scan string content, only object paths
**What goes wrong:** A Postgres/`postgres` driver connection error's `.message` can literally contain the full `DATABASE_URL` connection string (e.g. `getaddrinfo ENOTFOUND` errors from `postgres` sometimes echo the connection details), and `redact: { paths: ["DATABASE_URL"] }` will NOT catch this because `DATABASE_URL` isn't a key in the error object — the secret is embedded inside a string value at an unpredictable key (`message`, `stack`, sometimes a driver-specific `.hostname`/`.query` field).
**Why it happens:** pino's `redact` (via `fast-redact`) works by walking a fixed set of known object paths and censoring/removing the value found there — it has no regex/substring-matching mode.
**How to avoid:** Custom `err` serializer (see Pattern 2 above) that does an explicit `.replaceAll(process.env.DATABASE_URL, "[REDACTED]")` on `message`/`stack` before pino ever sees the string.
**Warning signs:** A unit test that constructs a raw `postgres` connection error with the local dev `DATABASE_URL` embedded and asserts the logged output does NOT contain the connection string substring — see Validation Architecture below. If this test isn't written, criterion 2's "redacts ... DATABASE_URL" is unverified for the realistic failure mode (a connection error), only for the trivial case (logging `process.env` directly).

### Pitfall 3: Turbopack + Vercel externalized-package alias resolution (LOW confidence, single unconfirmed source)
**What goes wrong:** A single GitHub issue (vercel/next.js#93849, "Turbopack + Vercel: hashed pino external alias is not resolvable at runtime") reports that Turbopack's build-time handling of `serverExternalPackages` entries can produce a hashed module alias (e.g. `pino-2e79642258e38174`) that resolves locally (via a `.next/node_modules` symlink) but not in Vercel's deployed runtime artifact, causing a `Cannot find module` error at request time — even without any `transport`/`pino-pretty` usage.
**Why it happens:** Reported mechanism per the issue: Turbopack externalizes `pino` (it's on Next's default `serverExternalPackages` list) by aliasing it to a content-hashed path; the symlink backing that alias exists in the local build output but isn't part of what gets shipped to Vercel's serverless/edge runtime bundle.
**Confidence caveat — this is NOT a confirmed Next.js bug.** The issue was auto-closed by a GitHub Actions bot ("We could not detect a valid reproduction link") one day after filing, with zero maintainer investigation. `[CITED: github.com/vercel/next.js/issues/93849]` at LOW confidence — single source, unconfirmed, no maintainer acknowledgment.
**How to avoid / verify:** Because this project's preview deployments cannot build (documented STATE.md blocker: Neon only injects `DATABASE_URL` into Production), there is no low-risk way to test a Vercel-runtime failure before merging to `main`. Recommend the plan include a local production-mode smoke test — `NODE_ENV=production npm run build && npm run start` (Turbopack is the default bundler for both `next build` and `next dev`/`next start` as of Next.js 16 per official docs) — as a pre-merge verification gate, exactly mirroring the empirical-verification pattern Phase 15 already commits to for its CSP rollout. This will NOT catch a Vercel-runtime-specific alias mismatch (that only reproduces on Vercel's actual serverless environment per the report), but it is the closest available substitute given no working preview environment exists. Flag to the user that the first real production deploy after this phase should have its Vercel Runtime Logs checked for `Cannot find module` errors on any route that imports `logger.ts`.
**Warning signs:** A 500 error in production immediately after this phase deploys, specifically on routes/actions that import `src/lib/logger.ts`, with a "Cannot find module" stack trace referencing a hashed path.

### Pitfall 4: Vercel's log-level dashboard filter doesn't read pino's JSON `level` field
**What goes wrong:** Vercel's Runtime Logs dashboard infers a log's severity bucket from which `console.*` method wrote it (`console.log`/`console.warn`/`console.error`), not from a `level` field inside JSON payload content. Since pino by default writes every level to a single stream (stdout via `process.stdout.write`, which is what `console.log` also targets), all pino output — `info`, `warn`, and `error` alike — will appear under Vercel's "log"/"info" bucket in the dashboard filter regardless of the JSON body's actual `level`.
**Why it happens:** `[CITED: vercel.com/kb/guide/add-structured-application-logs-to-vercel-functions]` MEDIUM confidence — Vercel's own KB guide states the dashboard's level filter is inferred from the console method, and pino's default single-stream behavior doesn't call `console.error`/`console.warn` for higher-severity logs.
**How to avoid:** Out of scope for this phase's success criteria (which only require JSON emission + redaction, not dashboard-filter-correct severity routing) — flagging as an Open Question for the planner to explicitly descope or accept, not a blocker.
**Warning signs:** None for this phase; only relevant if a future phase (e.g. Phase 16/17 alerting) assumes Vercel's dashboard severity filter reflects pino's actual log levels.

## Code Examples

### Full logger module (combining Patterns 1 and 2)
```typescript
// Source: pino docs (github.com/pinojs/pino/blob/main/docs/api.md,
// github.com/pinojs/pino/blob/main/docs/redaction.md) — HIGH confidence for pino API,
// [ASSUMED] for the specific redact paths chosen to match this app's schema
// src/lib/logger.ts
import pino from "pino"

const isProd = process.env.NODE_ENV === "production"

function scrubDatabaseUrl(err: unknown) {
  const serialized = pino.stdSerializers.err(err as Error)
  const url = process.env.DATABASE_URL
  if (url && serialized.message?.includes(url)) {
    serialized.message = serialized.message.replaceAll(url, "[REDACTED]")
  }
  if (url && serialized.stack?.includes(url)) {
    serialized.stack = serialized.stack.replaceAll(url, "[REDACTED]")
  }
  return serialized
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  redact: {
    paths: [
      "session.token",
      "*.session.token",
      "user.password",
      "*.password",
      "account.password",
      "account.accessToken",
      "account.refreshToken",
      "account.idToken",
      "headers.cookie",
      "headers.authorization",
      "req.headers.cookie",
      "req.headers.authorization",
      "cookies",
      "DATABASE_URL",
      "*.DATABASE_URL",
      "env.DATABASE_URL",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    err: scrubDatabaseUrl,
  },
  ...(isProd
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true } } }),
})
```

### Usage in a Server Action (task-mutation example)
```typescript
// src/lib/actions/task.ts — illustrative addition, not the full file
import { logger } from "@/lib/logger"

export async function createTask(hiveId: string, formData: FormData) {
  const { session } = await requireQueen(hiveId)
  // ... existing validation ...
  try {
    await db.insert(tasks).values({ /* ... */ })
  } catch (err) {
    logger.error({ err, hiveId, userId: session.user.id }, "task creation failed")
    throw err
  }
  logger.info({ hiveId, userId: session.user.id }, "task created")
  revalidatePath(`/hive/${hiveId}`)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `pino.transport({ target: 'pino-pretty' })` in production Next.js apps (common in older tutorials) | Environment-conditional: no `transport` key at all in production, raw JSON to stdout; `pino-pretty` transport dev-only | Ongoing since Next.js's App Router + serverless/Edge deployment model made worker-thread transports unreliable in bundled server code | This project has already locked this as a decision (REQUIREMENTS.md Out of Scope) — not a new finding, just confirming the roadmap's framing matches current community practice |
| Manually adding `experimental.serverComponentsExternalPackages: ['pino']` | Not needed — `pino` and `pino-pretty` are on Next.js's stable, built-in `serverExternalPackages` default list as of the current docs (checked against v16.3.0 docs, updated 2025-12-05) | `serverComponentsExternalPackages` → `serverExternalPackages` rename + stabilization landed in Next.js 15.0.0 | Simplifies this phase: `next.config.ts` likely does not need to change at all |

**Deprecated/outdated:**
- `experimental.serverComponentsExternalPackages` — renamed to `serverExternalPackages` and moved out of `experimental` in Next.js 15.0.0. If any tutorial/blog post referenced during planning uses the old key, it's stale.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact `redact` paths listed (`session.token`, `account.password`, etc.) fully cover every place a secret could appear in this app's logged objects | Standard Stack / Code Examples | A secret leaks through an untested code path (e.g. a new field added to a logged object later isn't covered by the wildcard set) — mitigate with the redaction unit test in Validation Architecture, which should be extended whenever a new object shape is logged |
| A2 | Better Auth's `logger.log` hook can be wired to the shared pino instance to satisfy "auth ... uses the shared logger" for criterion 1 | Common Pitfalls (Pitfall 1) | If Better Auth's internal logger hook doesn't fire for the events that matter (per the linked open issue #3250), the plan may need to fall back to wrapping the Route Handler's `GET`/`POST` exports instead — flagged explicitly as an open question, not assumed to work |
| A3 | A local `NODE_ENV=production npm run build && npm run start` smoke test is a meaningful substitute for testing on Vercel's actual Turbopack-externalized-package runtime behavior | Common Pitfalls (Pitfall 3) | The reported failure mode (vercel/next.js#93849) is specifically about Vercel's deployed runtime artifact differing from the local build output — a local test may pass while Vercel still fails. This is called out explicitly; the plan should not treat a passing local smoke test as full proof of correctness on Vercel |

## Open Questions (RESOLVED)

> All three resolved during planning on 2026-08-13. Full rationale lives in
> `14-01-PLAN.md`'s `<resolved_decisions>` block; one-line resolutions are inline below.

1. **Which of the two "auth" logging approaches should the plan choose?**
   - **RESOLVED (D-14-B): wrap the Route Handler exports.** Better Auth's `logger.log` hook was
     explicitly declined — better-auth#3250 means it cannot be relied on to emit anything for
     sign-in/sign-up/sign-out, and a success criterion cannot rest on an unverifiable mechanism.
     Implemented in `14-03-PLAN.md` (`src/lib/auth-log.ts` + `src/app/api/auth/[...all]/route.ts`);
     `src/lib/auth.ts` stays untouched.
   - What we know: No dedicated auth server-action file exists; auth logic lives in Better Auth's `toNextJsHandler` route wrapper and the `betterAuth({...})` config.
   - What's unclear: Whether wrapping the Route Handler exports or wiring Better Auth's `logger.log` hook (or both) best satisfies "auth ... server actions/routes ... uses [the shared logger]" — and whether Better Auth's internal logger hook actually fires for the events worth logging (sign-in, sign-up, sign-out).
   - Recommendation: Plan should pick one approach explicitly and verify empirically (trigger a real sign-in in dev, confirm a structured log line appears) rather than assuming the hook works from documentation alone.

2. **RESOLVED: yes — `hive.ts` is in scope.** `14-02-PLAN.md` instruments it, including the
   `requireQueen` failure path, which gives authorization-failure visibility across task, invite,
   and hive actions from one choke point.

   **Is `src/lib/actions/hive.ts` in scope?**
   - What we know: The roadmap names "task-mutation" as one of the four areas, and `hive.ts` contains `createHive`, `renameHive`, and `requireQueen` (an auth-guard helper used by nearly every other action file).
   - What's unclear: Whether "task-mutation" narrowly means `task.ts` only, or should extend to `hive.ts` since hive creation/rename are also mutations and `requireQueen` is a shared choke point that every other action calls through.
   - Recommendation: Planner's discretion — logging inside `requireQueen`'s failure path (`throw new Error("Forbidden")`) would give free authorization-failure visibility across task, invite, and hive actions with one change. Worth considering even if `hive.ts` isn't literally named.

3. **RESOLVED: no — leave `/api/health` untouched.** No Phase 14 plan modifies
   `src/app/api/health/route.ts`; Phase 17 adds logging there alongside the real DB check.

   **Should `/api/health` (currently a hardcoded 200, Phase 17 territory) get a logger import in this phase?**
   - What we know: It's a Route Handler under `src/app/api/`, technically eligible, but not named in the four roadmap areas and its current implementation (`src/app/api/health/route.ts`) does nothing worth logging yet (Phase 17 adds the real DB check).
   - What's unclear: Nothing — this is almost certainly out of scope.
   - Recommendation: Leave untouched; Phase 17 will add logging naturally when it adds real logic.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pino runtime | Yes | v22.11.0 | — |
| npm registry access | `npm install pino pino-pretty` | Yes (verified via `npm view` during research) | — | — |
| Local Docker Postgres | Recommended production-build smoke test (`npm run build` runs `drizzle-kit migrate` first, which needs `DATABASE_URL`) | Yes, via `make up` / `docker-compose` (Makefile confirms `up`/`db-migrate` targets exist) | — | — |
| Vercel deployment (to observe real Runtime Logs / catch the Pitfall 3 risk) | Full confidence on criterion 3 in the actual deploy target | Not verifiable in this research session (no live deploy triggered) | — | Local `NODE_ENV=production npm run build && npm run start` smoke test (see Pitfall 3) as best-effort substitute |

**Missing dependencies with no fallback:** none — this phase has no hard blocker.
**Missing dependencies with fallback:** Vercel-runtime verification of the Turbopack alias risk (Pitfall 3) has only a partial local fallback; full confidence requires watching the first production deploy's Runtime Logs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 (13 files, 89 tests passing per STATE.md verified baseline) |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run tests/logger` (once created) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBS-05 (criterion 2) | Logging a session/request-shaped object redacts cookies, passwords, session tokens, `DATABASE_URL` | unit | `npx vitest run tests/logger/redaction.test.ts -x` | ❌ Wave 0 |
| OBS-05 (criterion 3) | Production config has no `transport` key; dev config does | unit | `npx vitest run tests/logger/config.test.ts -x` | ❌ Wave 0 |
| OBS-05 (Pitfall 2) | `DATABASE_URL` embedded inside a raw error `.message`/`.stack` is scrubbed, not just object-keyed `DATABASE_URL` | unit | `npx vitest run tests/logger/redaction.test.ts -x` | ❌ Wave 0 |

**Concrete testable seam:** pino's constructor accepts `pino(options, destinationStream)`. For redaction tests, pass a simple Node `Writable` (or `stream.PassThrough`) as the destination, capture the chunks written, `JSON.parse()` each line, and assert on the resulting object — this gives real assertions instead of "logs look right." Example pattern (`[CITED: github.com/pinojs/pino/blob/main/docs/api.md]`, HIGH confidence on the `pino(options, stream)` signature itself; the specific test harness code below is this research's own construction, `[ASSUMED]`):

```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest"
import { Writable } from "node:stream"
import pino from "pino"

function captureLogger(options: pino.LoggerOptions) {
  const lines: string[] = []
  const stream = new Writable({
    write(chunk, _enc, callback) {
      lines.push(chunk.toString())
      callback()
    },
  })
  const logger = pino(options, stream)
  return { logger, lines }
}

describe("logger redaction", () => {
  it("redacts session token", () => {
    const { logger, lines } = captureLogger({
      redact: { paths: ["session.token"], censor: "[REDACTED]" },
    })
    logger.info({ session: { token: "super-secret-token" } }, "session created")
    const parsed = JSON.parse(lines[0])
    expect(parsed.session.token).toBe("[REDACTED]")
  })
})
```

Note: because this app's real logger module (`src/lib/logger.ts`) exports a preconfigured singleton rather than a factory, the test suite should either (a) export a factory function from `logger.ts` that the singleton wraps (`createLogger(options, stream?)`) so tests can inject a capture stream, or (b) test the `redact`/serializer config object directly by importing it and constructing a throwaway `pino(config, captureStream)` in the test file. Option (a) is cleaner and should be the plan's preferred structure — flag this as a design decision for the planner, not something this research should pre-decide.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/logger`
- **Per wave merge:** `npx vitest run` (full 89+ test suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus the local `NODE_ENV=production npm run build && npm run start` smoke test from Pitfall 3 (manual, not automatable in this project's CI per the CI-05 constraint that CI never runs `npm run build`)

### Wave 0 Gaps
- [ ] `tests/logger/redaction.test.ts` — covers OBS-05 criterion 2 and the DATABASE_URL-in-error-message case (Pitfall 2)
- [ ] `tests/logger/config.test.ts` — covers OBS-05 criterion 3 (no `transport` key in prod config, `pino-pretty` in dev config) — likely tests the exported config object shape directly rather than spawning a real prod-mode process, since flipping `NODE_ENV` inside a test process is fragile
- [ ] No new shared fixtures needed beyond the `captureLogger` helper shown above (small enough to inline per test file, or extract to `tests/logger/helpers.ts` following this project's existing `tests/task/helpers.ts` convention)

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (absent = enabled per project convention), so this section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V7 Error Handling and Logging (ASVS 4.0.3 numbering) `[ASSUMED — exact version/number not verified against a fetched ASVS document this session]` | Yes | No sensitive data (passwords, session tokens, full cookies, connection strings) in log output — this is the entire point of OBS-05 |
| V5 Input Validation / Log Injection | Yes | User-controlled strings (task text up to 160 chars, hive names, email addresses) passed as log message arguments could contain newlines or control characters that forge fake log entries when viewed in a plain-text log viewer. pino mitigates this by design — it always emits structured JSON with the message as a single quoted string field (`"msg":"..."`), so embedded `\n` characters are JSON-escaped (`\\n`), not literal newlines that break log-line parsing. No extra work needed as long as user input always flows through pino's structured fields rather than being concatenated into a raw string before logging |
| V6 Cryptography | No | Not applicable — this phase does not touch password hashing (already `bcryptjs`/Better Auth's own hashing) or token generation |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Sensitive data exposure via logs (session tokens, passwords, `DATABASE_URL` readable by anyone with Vercel dashboard/log-drain access) | Information Disclosure | pino `redact` config (Pattern 1) + custom `err` serializer for connection-string leakage (Pattern 2) — this is the core deliverable of the phase |
| Log injection / log forging via user-controlled task text or email containing control characters | Tampering | pino's JSON-only output format inherently escapes embedded newlines/control chars in string fields — no additional library needed, but worth a one-line note in the plan's verification checklist rather than assuming it "just works" untested |

## Sources

### Primary (HIGH confidence)
- Next.js official docs, `serverExternalPackages` reference page (fetched this session, version 16.3.0, last updated 2025-12-05) — confirms `pino`, `pino-pretty`, and `thread-stream` are already on the built-in auto-externalized list
- `npm view pino version` / `npm view pino-pretty version` / `npm view pino time.10.3.1` (registry, this session) — 10.3.1 / 13.1.3, published 2026-02-09
- pino official docs, `docs/redaction.md` (raw.githubusercontent.com/pinojs/pino/main/docs/redaction.md, fetched this session) — path syntax, wildcard behavior, censor/remove options, "path strings must not originate from user input" safety note
- pino official docs, `docs/api.md` (fetched this session) — `pino(options, destination)` constructor signature, `pino.destination()`, `transport` vs `pino.transport()` distinction
- Codebase reads (this session): `src/lib/actions/{task,invite,admin,hive}.ts`, `src/lib/auth.ts`, `src/lib/admin.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/api/health/route.ts`, `src/middleware.ts`, `src/db/schema.ts`, `package.json`, `next.config.ts`, `vitest.config.mts`, `tsconfig.json`, `eslint.config.mjs`, `Makefile`

### Secondary (MEDIUM confidence)
- Better Auth official docs, `docs/content/docs/reference/options.mdx` (fetched this session) — `logger` option shape (`disabled`, `disableColors`, `level`, `log` callback signature)
- Vercel official KB guide, "Add structured application logs to Vercel Functions" (fetched this session) — confirms Vercel Runtime Logs auto-captures stdout/stderr, 256KB/1MB size caps, and that the dashboard's level filter reads the console method used, not JSON body content
- WebSearch (multiple sources cross-referenced): "Turbopack is stable and used by default with next dev and next build" as of Next.js 16 — confirmed via nextjs.org/docs/app/guides/upgrading/version-16 and nextjs.org/blog/next-16 titles in search results

### Tertiary (LOW confidence, flagged explicitly in text)
- GitHub issue vercel/next.js#93849 ("Turbopack + Vercel: hashed pino external alias is not resolvable at runtime") — single report, auto-closed by bot for lacking reproduction, zero maintainer investigation. Checked via `gh api repos/vercel/next.js/issues/93849` this session — confirmed `state: closed`, 1 comment (the auto-close bot message)
- GitHub issue better-auth/better-auth#3250 ("Logger not, well, logging") and PR #10121 — surfaced via WebSearch, not independently verified by reading the full issue thread; used only to caveat the confidence of Pitfall 1's approach 2

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm registry + official Next.js docs naming both packages explicitly
- Architecture: HIGH for the "no console to migrate, this is additive" finding (direct grep of the actual repo) and the "no next.config.ts change needed" finding (official docs); MEDIUM for the recommended logger module shape (synthesized from pino docs, not copy-pasted from an official Next.js+pino integration guide since none exists)
- Pitfalls: HIGH for Edge Runtime incompatibility (multiple independent sources agree, matches pino's documented `vm` dependency) and the redact-paths-not-substrings gap (directly follows from reading pino's own redaction docs); LOW for the Turbopack/Vercel alias risk (single unconfirmed source, explicitly flagged as such throughout)

**Research date:** 2026-08-11
**Valid until:** 2026-09-10 (30 days — pino/Next.js/Turbopack are all still under active development; re-verify package versions and the Turbopack alias issue status before executing if this research goes stale)
