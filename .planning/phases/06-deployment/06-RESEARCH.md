# Phase 6: Deployment - Research

**Researched:** 2026-04-11
**Domain:** Vercel deployment + Neon PostgreSQL + Better Auth production config
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use Neon (serverless PostgreSQL) as the production database provider. Native Vercel integration, generous free tier.
- **D-02:** Conditional driver setup — use `@neondatabase/serverless` in production, keep `postgres` (npm) for local development. Single `src/lib/db.ts` with environment-based switching (e.g., check for `NEON` or `VERCEL` env var).
- **D-03:** Use Vercel's default `.vercel.app` URL for v1 launch. No custom domain setup needed. `BETTER_AUTH_URL` will be set to the Vercel deployment URL.
- **D-04:** Run `drizzle-kit migrate` as part of the Vercel build step. Migrations execute automatically on every deploy — no manual steps or separate CI pipeline.
- **D-05:** Production starts empty. First user signs up, creates a Hive, and invites others. No demo data, no tutorial mode.

### Claude's Discretion
- Vercel project configuration details (region, framework preset, etc.)
- Whether to add a health check endpoint
- Build output optimization settings in `next.config.ts`
- `.env.production` vs Vercel dashboard for env var management

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | App deployed to Vercel with Neon PostgreSQL, accessible on a public URL with automatic deploys from main | Driver swap pattern (D-02), migration-in-build (D-04), env var setup, Neon pooled/unpooled connection strings |
</phase_requirements>

## Summary

This phase deploys the completed Honey_Do app (all v1 features done) to Vercel with Neon as the PostgreSQL provider. The core work is: install and configure `@neondatabase/serverless`, update `src/lib/db.ts` to conditionally use it in production, update the build script to run `drizzle-kit migrate` before `next build`, provision a Neon database, and configure environment variables in Vercel.

A critical finding from official Neon docs: **migrations require a direct (unpooled) connection string**; PgBouncer (the pooler) does not support migration operations. The Neon-managed Vercel integration automatically provisions both `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). The `drizzle.config.ts` must be updated to use `DATABASE_URL_UNPOOLED` in production, while `src/lib/db.ts` uses the pooled `DATABASE_URL`.

Better Auth requires `BETTER_AUTH_URL` to match the exact production URL (the Vercel `.vercel.app` URL) — if this is wrong, auth callbacks break silently.

**Primary recommendation:** Use the Neon-Managed Vercel integration to auto-provision both connection string env vars. Keep `src/lib/db.ts` as the single file that switches drivers. Run migrations in the build script using the unpooled string. Set three env vars in Vercel: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (provided by Neon integration), and `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@neondatabase/serverless` | 1.0.2 (current) | Neon HTTP/WebSocket driver for Vercel serverless | Required for Neon from serverless — `postgres` (npm) uses raw TCP which doesn't work in Vercel's edge/serverless environment |
| `drizzle-orm/neon-http` | (same drizzle-orm 0.45.2) | Drizzle adapter for Neon HTTP driver | HTTP-based adapter for stateless serverless — no persistent connection overhead |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vercel` CLI | latest | Deploy and env var management from terminal | Optional for pulling env vars locally via `vercel env pull` |

**Installation:**
```bash
npm install @neondatabase/serverless
```

**Version verification:** `@neondatabase/serverless` is currently at 1.0.2 (verified via `npm view @neondatabase/serverless version` on 2026-04-11).

## Architecture Patterns

### Recommended Project Structure Changes
```
src/lib/
└── db.ts           # Add conditional: neon-http in prod, postgres in dev

drizzle.config.ts   # Add DATABASE_URL_UNPOOLED for prod migrations
package.json        # Build script: "drizzle-kit migrate && next build"
.env.example        # Add DATABASE_URL_UNPOOLED
```

### Pattern 1: Conditional Database Driver (D-02)

**What:** `src/lib/db.ts` checks `process.env.VERCEL` (set automatically by Vercel) to switch between the Neon serverless HTTP driver and the local `postgres` npm driver.

**When to use:** The locked decision (D-02) — single file, environment-based switching.

**Example:**
```typescript
// src/lib/db.ts
// Source: https://neon.com/docs/guides/drizzle (Neon official docs)
import * as schema from "@/db/schema"

let db: ReturnType<typeof import("drizzle-orm/neon-http").drizzle> | ReturnType<typeof import("drizzle-orm/postgres-js").drizzle>

if (process.env.VERCEL) {
  // Production: use Neon serverless HTTP driver
  const { drizzle } = await import("drizzle-orm/neon-http")
  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(process.env.DATABASE_URL!)
  db = drizzle(sql, { schema })
} else {
  // Local: use postgres npm driver (raw TCP to Docker)
  const { drizzle } = await import("drizzle-orm/postgres-js")
  const postgres = (await import("postgres")).default
  const client = postgres(process.env.DATABASE_URL!)
  db = drizzle(client, { schema })
}

export { db }
```

**Simpler alternative** (avoids dynamic imports, easier TypeScript):
```typescript
// src/lib/db.ts
import * as schema from "@/db/schema"

if (process.env.VERCEL) {
  const { drizzle } = require("drizzle-orm/neon-http")
  const { neon } = require("@neondatabase/serverless")
  const sql = neon(process.env.DATABASE_URL!)
  exports.db = drizzle(sql, { schema })
} else {
  const { drizzle } = require("drizzle-orm/postgres-js")
  const postgres = require("postgres")
  const client = postgres(process.env.DATABASE_URL!)
  exports.db = drizzle(client, { schema })
}
```

**Recommended clean implementation** (TypeScript-friendly):
```typescript
// src/lib/db.ts
// Conditionally import at module level is not possible in ESM.
// Instead, branch the export explicitly.
import * as schema from "@/db/schema"

const isVercel = !!process.env.VERCEL

// This file is evaluated once per cold start.
// In production (Vercel), VERCEL env var is always set.
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import { neon } from "@neondatabase/serverless"
import postgres from "postgres"

export const db = isVercel
  ? drizzleNeon(neon(process.env.DATABASE_URL!), { schema })
  : drizzlePostgres(postgres(process.env.DATABASE_URL!), { schema })
```

**Note:** Importing both drivers at the top level means both are bundled. For a small app like Honey_Do this is acceptable. If bundle size becomes a concern, dynamic imports with `await import()` at module init time are the alternative, but add complexity. Start with static imports.

### Pattern 2: Migrations Using Unpooled Connection

**What:** `drizzle.config.ts` uses `DATABASE_URL_UNPOOLED` when running in a Vercel build context (where that env var is set by the Neon integration). Falls back to `DATABASE_URL` locally (Docker doesn't use PgBouncer so either works).

**Why critical:** PgBouncer (Neon's connection pooler) does NOT support DDL operations. Running `drizzle-kit migrate` through a pooled connection will fail or produce subtle errors. Official Neon docs explicitly state: "use a direct (non-pooled) connection when performing migrations."

**Example:**
```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit"

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use unpooled for migrations in production, DATABASE_URL for local
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
} satisfies Config
```

### Pattern 3: Build Script with Migration

**What:** Update `package.json` "build" script to run migrations before `next build`.

**Why:** Vercel runs the build command during deployment. Migrations must run during build, not start — the start command runs post-deploy and is too late.

**Example:**
```json
{
  "scripts": {
    "build": "drizzle-kit migrate && next build"
  }
}
```

### Pattern 4: Vercel Environment Variables Setup

The Neon-managed integration (installed from Vercel marketplace) automatically creates:
- `DATABASE_URL` — pooled connection string (used by app runtime)
- `DATABASE_URL_UNPOOLED` — direct connection string (used by migrations)
- Legacy `POSTGRES_URL`, `PGHOST`, etc. — can ignore for Drizzle

You must manually add:
- `BETTER_AUTH_SECRET` — random 32+ character string (e.g., `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — the production `.vercel.app` URL (e.g., `https://honey-do.vercel.app`)

### Anti-Patterns to Avoid

- **Using pooled DATABASE_URL for drizzle-kit migrate:** Will fail silently or with cryptic PgBouncer errors. Always use the unpooled string for migrations.
- **Setting BETTER_AUTH_URL to localhost:** Auth callbacks will redirect to localhost in production — users can't log in.
- **Running migrations in the `start` script:** Vercel's start command runs after deploy is live. A user could hit the new build before migrations complete. Always migrate in `build`.
- **Using `drizzle-orm/postgres-js` in production on Vercel:** The `postgres` npm package uses raw TCP connections that don't work in Vercel's serverless environment. Must use `drizzle-orm/neon-http` with `@neondatabase/serverless`.
- **Committing `.env.local` to git:** Never commit secrets. `.env.local` is already in `.gitignore` per Next.js conventions; verify it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Serverless DB connections | Custom connection pooling | `@neondatabase/serverless` neon-http | Handles HTTP fetch pooling, keeps connections stateless, works within Vercel function timeout limits |
| Migration execution in CI | Custom migration runner script | `drizzle-kit migrate` in build script | drizzle-kit already handles migration tracking, ordering, and idempotency |
| Secret generation | Manual secret | `openssl rand -base64 32` | Cryptographically secure, sufficient entropy for BETTER_AUTH_SECRET |

**Key insight:** Neon's serverless driver exists precisely because raw TCP PostgreSQL connections have a handshake cost that's prohibitive in serverless. The HTTP driver amortizes this — don't try to optimize around it with custom pooling.

## Common Pitfalls

### Pitfall 1: Pooled Connection String Used for Migrations
**What goes wrong:** `drizzle-kit migrate` hangs, times out, or fails with confusing errors like "prepared statement already exists" or transaction errors.
**Why it happens:** PgBouncer (Neon's pooler) proxies connections but doesn't support the full PostgreSQL protocol — DDL/migration sessions require stable direct connections.
**How to avoid:** Set `DATABASE_URL_UNPOOLED` in `drizzle.config.ts` `dbCredentials.url`. The Neon Vercel integration provides this automatically.
**Warning signs:** Migration fails in Vercel build but works locally; error messages about PgBouncer or prepared statements.

### Pitfall 2: BETTER_AUTH_URL Mismatch
**What goes wrong:** Login/signup succeeds but the callback URL redirects nowhere or to localhost. Session cookies have the wrong domain. Users are logged out immediately.
**Why it happens:** Better Auth uses `BETTER_AUTH_URL` as the base for constructing callback URLs. If it doesn't match the actual deployed URL, auth flows break.
**How to avoid:** Set `BETTER_AUTH_URL` in Vercel environment variables to the exact production URL — `https://[your-project].vercel.app`. After adding a custom domain later, update this.
**Warning signs:** Login form submits successfully but user ends up back on login page; 307 redirects loop.

### Pitfall 3: TypeScript Errors from Dual Import
**What goes wrong:** TypeScript complains about incompatible types when `db` is assigned from different `drizzle()` overloads.
**Why it happens:** `drizzle-orm/neon-http` and `drizzle-orm/postgres-js` return slightly different `db` types that don't unify cleanly without explicit typing.
**How to avoid:** Use a type assertion: `export const db = (isVercel ? drizzleNeon(...) : drizzlePostgres(...)) as ReturnType<typeof drizzleNeon>`. In practice, both expose the same query API — a cast is safe here. Alternatively, extract the type from the schema-typed version.
**Warning signs:** `Type 'NeonHttpDatabase<...>' is not assignable to type 'PostgresJsDatabase<...>'` during `next build`.

### Pitfall 4: Build Fails Because DATABASE_URL Not Set
**What goes wrong:** Vercel build fails with `Cannot read properties of undefined` or Drizzle errors during the build (not at runtime).
**Why it happens:** Next.js 15 with Server Components may evaluate some DB code at build time (static generation). If `DATABASE_URL` isn't set as a build-time env var, it's undefined.
**How to avoid:** In Vercel project settings, ensure `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are set for the **Production** environment (not just Runtime). The Neon integration sets them for all environments by default.
**Warning signs:** `next build` fails with database connection errors rather than runtime errors.

### Pitfall 5: `postgres` npm Package Fails on Vercel
**What goes wrong:** If the conditional in `db.ts` doesn't trigger correctly and `postgres` npm is used in production, connections time out or fail with "Error: write ECONNRESET".
**Why it happens:** Vercel serverless functions don't support long-lived TCP connections the way `postgres` expects.
**How to avoid:** Use `process.env.VERCEL` as the branch condition — Vercel always sets this to `"1"` in all deployment contexts.
**Warning signs:** Database errors only in Vercel logs, not locally.

## Code Examples

### Final db.ts (recommended implementation)

```typescript
// src/lib/db.ts
// Source: https://neon.com/docs/guides/drizzle (Neon official docs)
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import { neon } from "@neondatabase/serverless"
import postgres from "postgres"
import * as schema from "@/db/schema"

// process.env.VERCEL is set to "1" by Vercel in all deployment contexts
export const db = process.env.VERCEL
  ? drizzleNeon(neon(process.env.DATABASE_URL!), { schema })
  : drizzlePostgres(postgres(process.env.DATABASE_URL!), { schema })
```

### Updated drizzle.config.ts

```typescript
// drizzle.config.ts
// Source: https://neon.com/docs/guides/drizzle-migrations (Neon official docs)
import type { Config } from "drizzle-kit"

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Neon requires direct (unpooled) connection for migrations
    // DATABASE_URL_UNPOOLED is provisioned by the Neon-Vercel integration
    // Falls back to DATABASE_URL for local dev (Docker doesn't use PgBouncer)
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
} satisfies Config
```

### Updated package.json build script

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "drizzle-kit migrate && next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest"
  }
}
```

### Updated .env.example

```bash
# Local development (Docker)
DATABASE_URL=postgresql://honey_do:honey_do_local@localhost:5433/honey_do
# Production only (Neon-Vercel integration provides both)
# DATABASE_URL_UNPOOLED=<direct connection from Neon console>

BETTER_AUTH_SECRET=generate-a-random-32-char-secret
BETTER_AUTH_URL=http://localhost:3000
```

### Health check endpoint (Claude's discretion — recommended: YES)

A minimal `/api/health` route confirms the app is responsive after deploy:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({ status: "ok", ts: Date.now() })
}
```

This is lightweight (no DB check), gives Vercel deployment checks something to hit, and aids post-deploy smoke testing. Recommended to include.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pg` (node-postgres) with serverless | `@neondatabase/serverless` + `drizzle-orm/neon-http` | 2023 — Neon released serverless driver | Must use Neon's HTTP driver on Vercel; raw TCP via `pg` times out |
| Separate migration CI job | `drizzle-kit migrate` in `package.json` build script | 2024 community pattern | Simpler — no separate CI step, migrations are atomic per deploy |
| `DATABASE_URL` for all operations | `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` (migrations) | 2024 — Neon Vercel integration v2 | Prevents PgBouncer migration failures |
| Manual env var copy-paste | Neon-managed Vercel integration | 2023 | One-click setup provisions both connection strings automatically |

**Deprecated/outdated:**
- `@vercel/postgres` SDK: Vercel deprecated this in favor of directing users to Neon directly. The Neon-managed integration replaces it.
- Auth.js v4 (`next-auth` v4): This project already uses Better Auth 1.5.6 — do not reference v4 patterns.

## Open Questions

1. **TypeScript type unification for dual-driver `db` export**
   - What we know: `drizzle-orm/neon-http` and `drizzle-orm/postgres-js` return different generic types
   - What's unclear: Whether the type assertion approach causes any practical issues with query inference
   - Recommendation: Test with `next build` locally (using `VERCEL=1` env var) before deploying. If types conflict, use `as ReturnType<typeof drizzleNeon<typeof schema>>` cast.

2. **Vercel preview deployments and Neon branching**
   - What we know: The Neon-managed integration can auto-create Neon DB branches for each Vercel preview deploy
   - What's unclear: Whether this is needed for Honey_Do v1 (probably overkill — single production branch is fine)
   - Recommendation: Skip branch-per-preview for v1. Use the standard integration without preview branching.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js build | ✓ | v22.11.0 | — |
| npm | Package install | ✓ | 10.9.0 | — |
| Vercel CLI | Optional env pull | ✗ | — | Set env vars manually in Vercel dashboard |
| `@neondatabase/serverless` | Neon production driver | ✗ (not yet installed) | — | Must install: `npm install @neondatabase/serverless` |
| Neon account | Production database | ✗ (not provisioned) | — | Must create: neon.com free tier |
| Vercel account | Hosting | ✗ (not provisioned) | — | Must create: vercel.com |

**Missing dependencies with no fallback:**
- Neon account — required for production database. Human must provision this.
- Vercel account — required for deployment. Human must provision this.
- `@neondatabase/serverless` npm package — must be installed before build.

**Missing dependencies with fallback:**
- Vercel CLI — not required; env vars can be set in the Vercel dashboard UI.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | App builds without errors | smoke | `npm run build` (in CI) | N/A — verified by successful Vercel deploy |
| DEPLOY-01 | Neon connected, schema migrated | smoke | Manual: visit app URL after deploy | N/A — runtime verification |
| DEPLOY-01 | Auth flow works in production | manual | Visit `/login`, create account, log in | N/A |
| DEPLOY-01 | Auto-deploy from main triggers | manual | Push commit to main, observe Vercel | N/A |

**Note:** DEPLOY-01 is an infrastructure requirement. Its success criteria are verified by the actual deployment succeeding, not by unit tests. Existing unit/integration tests (invite, task, leaderboard) serve as regression guards during the build — if `npm run build` passes with `drizzle-kit migrate && next build`, the structural work is validated. The deployment gate is manual smoke testing after the Vercel deploy completes.

### Sampling Rate
- **Per task commit:** `npx vitest run` (existing test suite as regression guard)
- **Per wave merge:** `npx vitest run` + verify Vercel build logs
- **Phase gate:** Successful Vercel deployment + smoke test of login/task creation flow on the live URL

### Wave 0 Gaps
- No new test files needed for this phase. Deployment infrastructure is validated by successful deploy, not unit tests.
- Existing test suite covers business logic as regression protection during build.

## Sources

### Primary (HIGH confidence)
- [Neon Drizzle Migrations Guide](https://neon.com/docs/guides/drizzle-migrations) — pooled vs unpooled requirement for migrations
- [Neon Choose Connection Guide](https://neon.com/docs/connect/choose-connection) — when to use pooled vs unpooled
- [Neon Drizzle Guide](https://neon.com/docs/guides/drizzle) — neon-http driver setup with Drizzle
- [Neon + Drizzle local/Vercel guide](https://neon.com/guides/drizzle-local-vercel) — conditional driver setup pattern
- npm registry: `@neondatabase/serverless` v1.0.2 verified 2026-04-11

### Secondary (MEDIUM confidence)
- [Vercel Community: Drizzle migrations before Next.js starts](https://community.vercel.com/t/running-drizzle-migrations-for-my-db-before-next-js-starts-on-vercel/18074) — confirmed: migrate in build not start
- [Better Auth Vercel docs](https://better-auth.com/docs/authentication/vercel) — BETTER_AUTH_URL requirement
- [Neon manual Vercel connection](https://neon.com/docs/guides/vercel-manual) — env var setup options
- Neon-managed integration env var names (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) — from search result cross-referencing official Neon integration docs

### Tertiary (LOW confidence)
- Health check endpoint pattern — community consensus, not official Vercel recommendation; added as discretionary item

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@neondatabase/serverless` v1.0.2 verified from registry; Drizzle neon-http adapter from official Neon docs
- Architecture: HIGH — pooled/unpooled requirement from official Neon docs; build script pattern from Vercel community + Neon official guide
- Pitfalls: HIGH — pooled migration failure and BETTER_AUTH_URL mismatch are documented in official sources; TypeScript type issue is inferred from API shape (MEDIUM for that one)

**Research date:** 2026-04-11
**Valid until:** 2026-07-11 (stable ecosystem — Neon + Vercel integration changes slowly)
