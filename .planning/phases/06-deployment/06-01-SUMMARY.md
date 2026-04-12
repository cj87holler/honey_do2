---
phase: 06-deployment
plan: 01
subsystem: infrastructure
tags: [deployment, database, neon, vercel, health-check]
dependency_graph:
  requires: []
  provides: [vercel-deployable-db-connection, migration-build-step, health-endpoint]
  affects: [src/lib/db.ts, drizzle.config.ts, package.json, .env.example]
tech_stack:
  added: ["@neondatabase/serverless"]
  patterns: [conditional-driver-switching, unpooled-migration-connection]
key_files:
  created:
    - src/app/api/health/route.ts
  modified:
    - src/lib/db.ts
    - drizzle.config.ts
    - package.json
    - .env.example
decisions:
  - "Use process.env.VERCEL as branch condition — set to '1' by Vercel in all deployment contexts, absent locally"
  - "Static imports for both drivers (not dynamic) — avoids TypeScript inference complexity for small app"
  - "Type assertion to ReturnType<typeof drizzleNeon> unifies db export type across both code paths"
  - "Health endpoint returns only {status, ts} — no DB connection test to avoid false negatives on cold start"
metrics:
  duration: 1 min
  completed: 2026-04-12
  tasks_completed: 2
  files_changed: 5
---

# Phase 6 Plan 1: Vercel + Neon Deployment Preparation Summary

Neon serverless driver installed, db.ts switches drivers conditionally on VERCEL env var, migrations use unpooled connection string, build script runs migrations before next build, health check endpoint added.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Neon driver + conditional db connection | 6b59b1a | src/lib/db.ts, package.json, package-lock.json |
| 2 | Drizzle config, build script, env template, health endpoint | 636609f | drizzle.config.ts, package.json, .env.example, src/app/api/health/route.ts |

## What Was Built

### Conditional Database Driver (src/lib/db.ts)

On Vercel (`process.env.VERCEL === "1"`), the app uses `drizzle-orm/neon-http` with the `@neondatabase/serverless` neon() client — required for Vercel's serverless/edge runtime. Locally, the original `drizzle-orm/postgres-js` path is preserved, keeping Docker-based dev setup unchanged. Both drivers are imported statically; a type assertion to `ReturnType<typeof drizzleNeon<typeof schema>>` ensures a unified `db` export type for all call sites.

### Migration Safety (drizzle.config.ts)

`DATABASE_URL_UNPOOLED ?? DATABASE_URL` ensures migrations always use the direct PostgreSQL connection. Neon's PgBouncer connection pooler does not support DDL operations — using the pooled URL for `drizzle-kit migrate` would silently fail. The unpooled URL is injected automatically by the Neon-Vercel integration; falling back to `DATABASE_URL` preserves local dev behavior where Docker has no pooler.

### Build Script (package.json)

`"build": "drizzle-kit migrate && next build"` — migrations run atomically before every Vercel deployment build. Schema is always in sync with the deployed code.

### Environment Template (.env.example)

Documents the local `DATABASE_URL` and production `DATABASE_URL_UNPOOLED` with explanatory comments. `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` retained from prior setup.

### Health Check Endpoint (src/app/api/health/route.ts)

`GET /api/health` returns `{ status: "ok", ts: <epoch_ms> }`. `export const dynamic = "force-dynamic"` prevents Next.js from statically pre-rendering the response. No database connection, no version info — minimal surface per threat model T-03.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- src/lib/db.ts — FOUND, contains `process.env.VERCEL`, `drizzleNeon`, `drizzlePostgres`, `neon`, schema import
- drizzle.config.ts — FOUND, contains `DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!`
- package.json — FOUND, build script is `drizzle-kit migrate && next build`, `@neondatabase/serverless` in dependencies
- .env.example — FOUND, contains `DATABASE_URL_UNPOOLED` commented production var
- src/app/api/health/route.ts — FOUND, exports `GET` and `dynamic`
- Commit 6b59b1a — exists (Task 1)
- Commit 636609f — exists (Task 2)
- All 129 vitest tests pass
