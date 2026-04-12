# Phase 6: Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 06-deployment
**Areas discussed:** Database provider, Domain & URL, Migration strategy, Seed data & onboarding

---

## Database Provider

| Option | Description | Selected |
|--------|-------------|----------|
| Neon (Recommended) | Serverless Postgres, native Vercel integration, generous free tier. Requires swapping `postgres` driver to `@neondatabase/serverless` in production. | ✓ |
| Supabase | Managed Postgres with extras (auth, storage). Free tier available. Can use standard `postgres` driver — no code change needed. | |
| Vercel Postgres | Vercel's own managed Postgres (powered by Neon under the hood). Tightest Vercel integration but less control. | |

**User's choice:** Neon (Recommended)
**Notes:** None

### Follow-up: Driver Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Conditional driver (Recommended) | Use `@neondatabase/serverless` in production, keep `postgres` for local dev. Single db.ts with env-based switching. | ✓ |
| Neon everywhere | Replace `postgres` with `@neondatabase/serverless` for both local and production. Simpler code, but local dev connects to Neon too. | |

**User's choice:** Conditional driver (Recommended)
**Notes:** None

---

## Domain & URL

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel default (.vercel.app) | Use the auto-generated *.vercel.app URL. Zero DNS config. Good enough for v1 launch. | ✓ |
| Custom domain | Point a domain you own at Vercel. Requires DNS setup. More polished for sharing invite links. | |
| Start default, add later | Launch on .vercel.app first, add custom domain whenever. No code change needed. | |

**User's choice:** Vercel default (.vercel.app)
**Notes:** None

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel build step (Recommended) | Add `drizzle-kit migrate` to the build command. Migrations run automatically on every deploy. | ✓ |
| Manual CLI | Run `drizzle-kit migrate` manually against Neon before deploying. More control, but easy to forget. | |
| GitHub Action | CI pipeline runs migrations before Vercel builds. Separates migration from build. | |

**User's choice:** Vercel build step (Recommended)
**Notes:** None

---

## Seed Data & Onboarding

| Option | Description | Selected |
|--------|-------------|----------|
| Empty (Recommended) | Production starts clean. First user signs up, creates a Hive, invites others. The real experience from day one. | ✓ |
| Demo Hive | Pre-seed a demo Hive with sample tasks and fake members so new visitors can explore before signing up. | |
| Tutorial mode | First-time user gets guided onboarding prompts. No fake data, just coaching. | |

**User's choice:** Empty (Recommended)
**Notes:** None

---

## Claude's Discretion

- Vercel project configuration details (region, framework preset)
- Whether to add a health check endpoint
- Build output optimization in next.config.ts
- Env var management approach (Vercel dashboard vs .env.production)

## Deferred Ideas

None — discussion stayed within phase scope.
