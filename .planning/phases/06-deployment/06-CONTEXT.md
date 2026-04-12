# Phase 6: Deployment - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the completed Honey_Do app to Vercel with Neon PostgreSQL. Configure environment variables for production, swap the database driver for serverless, run migrations as part of the build, and enable automatic deploys from main. No new features — this is infrastructure only.

</domain>

<decisions>
## Implementation Decisions

### Database Provider
- **D-01:** Use Neon (serverless PostgreSQL) as the production database provider. Native Vercel integration, generous free tier.
- **D-02:** Conditional driver setup — use `@neondatabase/serverless` in production, keep `postgres` (npm) for local development. Single `src/lib/db.ts` with environment-based switching (e.g., check for `NEON` or `VERCEL` env var).

### Domain & URL
- **D-03:** Use Vercel's default `.vercel.app` URL for v1 launch. No custom domain setup needed. `BETTER_AUTH_URL` will be set to the Vercel deployment URL.

### Migration Strategy
- **D-04:** Run `drizzle-kit migrate` as part of the Vercel build step. Migrations execute automatically on every deploy — no manual steps or separate CI pipeline.

### Seed Data & Onboarding
- **D-05:** Production starts empty. First user signs up, creates a Hive, and invites others. No demo data, no tutorial mode.

### Claude's Discretion
- Vercel project configuration details (region, framework preset, etc.)
- Whether to add a health check endpoint
- Build output optimization settings in `next.config.ts`
- `.env.production` vs Vercel dashboard for env var management

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Configuration
- `CLAUDE.md` — Technology stack decisions, deployment considerations table (Vercel + Neon recommended)
- `.env.example` — Current env var template (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL)
- `drizzle.config.ts` — Drizzle Kit configuration pointing to `DATABASE_URL`
- `next.config.ts` — Currently empty Next.js config, may need updates

### Database Layer
- `src/lib/db.ts` — Current database connection setup using `postgres` driver + `drizzle-orm/postgres-js`
- `src/db/schema.ts` — Full database schema (needed to verify Neon compatibility)
- `src/db/migrations/` — Existing migration files that must run against Neon

### Auth Configuration
- `src/lib/auth.ts` — Better Auth server config (uses BETTER_AUTH_SECRET, BETTER_AUTH_URL)
- `src/lib/auth-client.ts` — Better Auth client config

### Build & Dev
- `Makefile` — Current dev workflow commands
- `package.json` — Build scripts (`next build`, `next start`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db.ts`: Single connection file — only place that needs driver swap logic
- `drizzle.config.ts`: Already reads `DATABASE_URL` from env — works with Neon connection string as-is
- `Makefile`: Dev workflow is Docker-based — no changes needed, production uses Neon

### Established Patterns
- All env vars read via `process.env.DATABASE_URL!` (non-null assertion) — consistent pattern
- Better Auth uses `BETTER_AUTH_URL` for callback URLs — must match production URL
- Drizzle migrations in `src/db/migrations/` — standard `drizzle-kit migrate` workflow

### Integration Points
- `src/lib/db.ts` — driver swap for Neon serverless
- `package.json` build script — add migration step before `next build`
- `.env.example` — update with production-relevant notes
- Vercel environment variables — mirror of `.env.local` with production values

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for Vercel + Neon deployment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-deployment*
*Context gathered: 2026-04-11*
