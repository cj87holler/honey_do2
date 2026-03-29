# Phase 1: Foundation - Research

**Researched:** 2026-03-28
**Domain:** Next.js 16 + PostgreSQL + Auth + Drizzle ORM — greenfield project setup
**Confidence:** MEDIUM-HIGH (stack well-established; auth library choice requires user confirmation — see below)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Post-Signup Flow**
- D-01: Direct signup lands on a "Create a Hive" prompt — not an empty dashboard, not a wizard
- D-02: After Hive creation, user lands on the Hive dashboard (empty but ready)
- D-03: No Hive-less state — signup requires creating a Hive to proceed
- D-04: One Hive per user for v1 — no multi-Hive support or Hive switcher

**Hive Creation UX**
- D-05: Single-field inline experience — just a Hive name input + "Create" button, minimal friction
- D-06: Queen can rename the Hive anytime, no confirmation gate
- D-08: Two roles only for v1: Queen and Bee. QueenBee is dropped.
- D-09: Queen can create tasks, assign tasks (to anyone including themselves), and receive tasks
- D-10: Bee can only receive and complete tasks — cannot create or assign
- D-11: Hive creator is automatically a Queen
- D-12: Any Queen can promote a Bee to Queen or demote a Queen to Bee — role changes are fluid
- D-13: Roles displayed as subtle label/badge next to user name (crown icon for Queen, bee icon for Bee)

**Dev & Deployment Setup**
- D-14: Local dev: Docker Compose for PostgreSQL (user runs OrbStack as Docker runtime)
- D-15: Beekeeper Studio used for visual database inspection — connection to localhost:5432
- D-16: Deploy target: Vercel + Neon. User needs to create accounts before first deploy.

### Claude's Discretion
- D-07: Hive settings placement — inline edit on dashboard or minimal settings page, whatever fits best
- D-17: Makefile command suite design — design whatever `make` targets make sense

### Deferred Ideas (OUT OF SCOPE)
- Multi-Hive support — deferred to v2+
- QueenBee role — dropped for v1 simplicity
- Account creation for Vercel + Neon — pre-deploy checklist item, not Phase 1 code work
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can create account with email and password | Better Auth email/password plugin; bcryptjs or scrypt hashing; Drizzle adapter for user persistence |
| AUTH-02 | User can log in and stay logged in across browser refresh | Better Auth session management with database sessions; middleware.ts for session check |
| AUTH-03 | User can log out from any page | Better Auth `signOut()` client method; server action pattern for logout button in header/nav |
| HIVE-01 | Queen can create a new Hive | Server Action + Drizzle insert; role auto-assignment (D-11) |
| HIVE-02 | Queen can name the Hive | Single-field form (D-05); Drizzle update for rename (D-06) |
| HIVE-05 | Roles are enforced: Queen/Bee | **DISCREPANCY — see note below** |

> **HIVE-05 discrepancy:** REQUIREMENTS.md lists QueenBee as a third role. CONTEXT.md D-08 explicitly drops QueenBee — two roles only: Queen and Bee. **CONTEXT.md wins.** Implement HIVE-05 as a two-role model. The role enforcement pattern: `pgEnum('role', ['queen', 'bee'])` on the `hive_members` table; middleware/server-side checks gate task creation to Queens only.
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Next.js 16 project establishing auth, database schema, and Hive creation with a two-role model. The stack is well-understood: Next.js 16 (App Router), TypeScript 6, Drizzle ORM 0.45 on PostgreSQL 16, Tailwind CSS 4, Vitest for testing.

The single most important finding is that **Auth.js v5 never shipped stable** and has officially been folded into Better Auth (Sep 2025). The CLAUDE.md recommendation to use Auth.js v5 is now outdated. Better Auth 1.5.6 is the stable successor, has a Drizzle adapter, supports email/password out of the box with scrypt hashing (no manual bcryptjs wiring needed), and its authors are the same team. This recommendation needs user confirmation before the planner commits to it, but all evidence points to Better Auth as the correct choice.

Several version pins in CLAUDE.md are stale (as expected — research was done at an earlier date). The planner should use the verified-current versions documented in the Standard Stack table below, not the CLAUDE.md pins.

**Primary recommendation:** Use Better Auth 1.5.6 (not Auth.js v5 beta) for authentication. Confirm with user before planning begins.

---

## Critical Finding: Auth Library Recommendation Change

CLAUDE.md recommends Auth.js v5 (next-auth beta). Research found:

| Finding | Evidence | Source |
|---------|----------|--------|
| Auth.js v5 never shipped stable | Latest tag is still `5.0.0-beta.30`, published Oct 2025 | npm registry (verified 2026-03-28) |
| Lead maintainer quit | Balázs Orbán left in Jan 2025 | GitHub discussion #13252 |
| Auth.js officially joined Better Auth | Announced Sep 2025 | better-auth.com/blog/authjs-joins-better-auth |
| Auth.js migration guide now points to Better Auth | authjs.dev/getting-started/migrate-to-better-auth | Official Auth.js docs |
| Better Auth is at v1.5.6 stable | latest tag = 1.5.6 | npm registry (verified 2026-03-28) |

**Recommendation:** Use Better Auth 1.5.6. It has a Drizzle adapter, built-in email/password with scrypt hashing, session management, and supports Next.js 16. The codebase pattern changes from `NextAuth({...})` in `auth.ts` to `betterAuth({...})` in `lib/auth.ts`, but the conceptual model (session, middleware, server-side checks) is identical.

**If user prefers Auth.js v5 beta anyway:** It is functional and widely used in production despite the beta label. The integration pattern with Drizzle is documented and works. The risk is ongoing maintenance uncertainty. Flag this choice in planning.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | Full-stack React framework | App Router, Server Actions, Turbopack. User-locked decision. |
| React | 19.2.4 | UI rendering | Bundled with Next.js 16. Required for App Router patterns. |
| TypeScript | 6.0.2 | Type safety | create-next-app default. Drizzle types flow end-to-end. |
| PostgreSQL | 16.x (Docker) | Primary data store | User-locked decision. Via Docker Compose locally, Neon for deploy. |
| Drizzle ORM | 0.45.2 | Database access layer | SQL-first, TypeScript-native, schema migrations via drizzle-kit. |
| drizzle-kit | 0.31.10 | Migration CLI | `drizzle-kit generate` + `drizzle-kit migrate`. |
| `postgres` (npm) | 3.4.8 | PostgreSQL driver | Drizzle's recommended driver for Node.js/Next.js. |
| Better Auth | 1.5.6 | Email/password auth, sessions | Successor to Auth.js v5. Stable, Drizzle adapter, scrypt hashing built-in. |
| Tailwind CSS | 4.2.2 | Utility-first styling | CSS-first config (`@import "tailwindcss"`). create-next-app default. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-zod | 0.8.3 | Schema → Zod types | `createInsertSchema()` / `createSelectSchema()` for form validation |
| zod | 4.3.6 | Runtime validation | Form inputs, Server Action payloads. drizzle-zod supports zod 3 and 4. |
| react-hook-form | 7.72.0 | Form state management | Task creation, signup, login — multi-field forms with client validation |
| clsx + tailwind-merge | latest | Conditional class composition | `cn()` utility for conditional Tailwind classes. Use from day 1. |
| nanoid | 5.1.7 | Invite link tokens | Phase 2, but install now to avoid migration later |

> **bcryptjs note:** Better Auth uses scrypt internally for password hashing. You do NOT need to install or wire bcryptjs manually. If you choose Auth.js v5 instead, bcryptjs 3.0.3 is needed to hash passwords in the `authorize` callback.

### Version Deltas from CLAUDE.md

CLAUDE.md was written at an earlier date. The following pins are stale — use the verified versions above:

| Library | CLAUDE.md Pin | Current (verified 2026-03-28) | Impact |
|---------|--------------|-------------------------------|--------|
| Next.js | 15.x | 16.2.1 | Major version bump — docs and patterns reference v16 |
| TypeScript | 5.x | 6.0.2 | Major version bump — check breaking changes |
| Drizzle ORM | 0.39.x | 0.45.2 | Minor — API stable, pin to current |
| Zod | 3.x | 4.3.6 | Major — check for API changes before use |
| bcryptjs | 2.x | 3.0.3 | May be unnecessary with Better Auth |
| Tailwind CSS | 4.x | 4.2.2 | Minor patch |
| Auth.js v5 (next-auth) | 5.0.0-beta | REPLACED by Better Auth 1.5.6 | See Critical Finding above |

> **Zod 4 note:** drizzle-zod 0.8.3 explicitly supports `zod ^3.25.0 || ^4.0.0`. No compatibility issue. Check individual Zod 4 API changes before use (e.g., some `.parse()` error shapes changed).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Auth.js v5 beta | Still functional but perpetually beta; maintenance uncertain post-merger |
| Better Auth | Lucia Auth | More boilerplate; excellent but more code to maintain for the same outcome |
| Drizzle ORM | Prisma | Heavier runtime, binary client; Drizzle is better fit for this stack |
| postgres (npm) | @neondatabase/serverless | Swap at deploy time for Neon; use `postgres` for local dev |

### Installation

```bash
# Scaffold
npx create-next-app@latest honey_do --typescript --tailwind --app --src-dir --import-alias "@/*"

# ORM + PostgreSQL driver
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Auth
npm install better-auth

# Validation + Forms
npm install zod drizzle-zod react-hook-form

# Utilities
npm install clsx tailwind-merge nanoid

# Dev/test
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

---

## Architecture Patterns

### Recommended Project Structure

```
honey_do/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Auth routes (login, signup)
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (app)/            # Protected routes (require session)
│   │   │   ├── hive/
│   │   │   │   ├── create/   # Post-signup Hive creation prompt
│   │   │   │   └── [id]/     # Hive dashboard
│   │   │   └── layout.tsx    # Auth guard for app routes
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...all]/ # Better Auth handler
│   │   ├── layout.tsx
│   │   └── page.tsx          # Root redirect (to login or hive)
│   ├── components/
│   │   ├── ui/               # Shared UI primitives (Button, Input, etc.)
│   │   └── hive/             # Hive-specific components
│   ├── lib/
│   │   ├── auth.ts           # Better Auth server config
│   │   ├── auth-client.ts    # Better Auth client instance
│   │   ├── db.ts             # Drizzle db instance
│   │   └── utils.ts          # cn() utility and shared helpers
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema (all tables)
│   │   └── migrations/       # Generated by drizzle-kit
│   └── middleware.ts         # Session-based route protection
├── docker-compose.yml        # Local PostgreSQL
├── drizzle.config.ts         # Drizzle Kit config
├── .env.local                # LOCAL ONLY — never commit
├── Makefile                  # Dev workflow commands
└── vitest.config.mts         # Vitest config
```

### Pattern 1: Database Schema

The core schema for Phase 1. Key decision from STATE.md: honey counter stored per-hive-membership (not globally) to support future Colonies without migration.

```typescript
// Source: Drizzle ORM official docs + pgEnum pattern
import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const roleEnum = pgEnum("role", ["queen", "bee"])

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 100 }),
  passwordHash: varchar("password_hash", { length: 255 }), // managed by Better Auth
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const hives = pgTable("hives", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const hiveMembers = pgTable("hive_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  hiveId: uuid("hive_id").references(() => hives.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: roleEnum("role").notNull().default("bee"),
  honeyCount: integer("honey_count").notNull().default(0), // per-Hive, not global
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
})
```

> Note: Better Auth generates its own `user`, `session`, `account`, and `verification` tables. The schema above represents app-specific tables. Better Auth's user table and your custom `users` table may be one and the same — use Better Auth's generated schema as the canonical user record and extend it, or map hive_members to Better Auth's user id.

### Pattern 2: Better Auth Setup

```typescript
// src/lib/auth.ts — Source: better-auth.com/docs/integrations/next
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
})

// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
export const { GET, POST } = toNextJsHandler(auth)

// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient()
```

### Pattern 3: Middleware Route Protection

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const protectedPaths = ["/hive"]
const authPaths = ["/login", "/signup"]

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  const pathname = request.nextUrl.pathname

  if (!session && protectedPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (session && authPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/hive", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Pattern 4: Role Enforcement in Server Actions

```typescript
// Example role guard — use in any Server Action that requires Queen role
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hiveMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"

async function requireQueen(hiveId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const member = await db.query.hiveMembers.findFirst({
    where: and(
      eq(hiveMembers.userId, session.user.id),
      eq(hiveMembers.hiveId, hiveId)
    ),
  })
  if (!member || member.role !== "queen") throw new Error("Forbidden")
  return { session, member }
}
```

> Security note: Middleware is not a security boundary. Every Server Action and API Route must verify session + role independently. Middleware is for routing/redirects only.

### Pattern 5: Drizzle Config + Docker Compose

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit"
export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: honey_do
      POSTGRES_PASSWORD: honey_do_local
      POSTGRES_DB: honey_do
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

### Pattern 6: Makefile (D-17 — Claude's Discretion)

Recommended Makefile targets for this stack:

```makefile
.PHONY: dev up down db-generate db-migrate db-studio install clean

# Start Next.js dev server (requires DB running)
dev:
	npm run dev

# Start PostgreSQL via Docker Compose
up:
	docker compose up -d

# Stop PostgreSQL
down:
	docker compose down

# Generate migration files from schema changes
db-generate:
	npx drizzle-kit generate

# Apply pending migrations to database
db-migrate:
	npx drizzle-kit migrate

# Open Drizzle Studio (visual DB browser)
db-studio:
	npx drizzle-kit studio

# Start DB and run dev server together
start: up db-migrate dev

# Install all dependencies
install:
	npm install

# Wipe local database volume (destructive — local dev only)
db-reset:
	docker compose down -v && docker compose up -d

# Run tests
test:
	npm run test

# Run tests once (CI mode)
test-ci:
	npm run test -- --run
```

### Anti-Patterns to Avoid

- **Checking session only in middleware:** Middleware runs at the edge; it is not a security boundary. Every protected Server Action must also call `auth.api.getSession()`.
- **Storing role in JWT client-side only:** Role must be stored in the database (`hive_members.role`). Never trust a client-provided role claim without DB verification.
- **One user → one role globally:** Roles are Hive-scoped, not user-scoped. A user's role lives in `hive_members`, not in the `users` table.
- **Hand-rolling password hashing:** Better Auth handles this internally with scrypt. Do not add bcryptjs unless migrating from another system.
- **Committing .env.local:** The `.env.local` file contains `DATABASE_URL` and `BETTER_AUTH_SECRET`. Keep it in `.gitignore` from day 1.
- **Using `next-auth` v4:** See CLAUDE.md "What NOT to Use" — v4 has Pages Router assumptions that break in App Router.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom crypto | Better Auth (scrypt built-in) | Timing attacks, salt management, algorithm selection are subtle |
| Session management | JWT in localStorage | Better Auth sessions (database-backed) | XSS risk, refresh complexity, expiry edge cases |
| CSRF protection | Custom token logic | Better Auth (built-in) | Easy to get wrong; library handles it |
| Schema migration | Hand-written SQL files | `drizzle-kit generate` + `drizzle-kit migrate` | Tracks schema history, generates diff-based migrations |
| Route protection | Custom auth middleware | Better Auth `getSession()` + Next.js middleware | Edge cases around token expiry, redirect loops |
| Form validation | Manual `if` checks | Zod + drizzle-zod + react-hook-form | Error message formatting, type narrowing, async validation |
| Conditional Tailwind classes | String concatenation | `cn()` = `clsx` + `tailwind-merge` | Class conflicts (e.g., `text-red-500 text-blue-500`) silently break styles |

**Key insight:** Authentication has a deceptively large attack surface. Better Auth provides tested implementations of session tokens, CSRF, rate limiting, and password hashing that would each take significant effort to replicate safely.

---

## Common Pitfalls

### Pitfall 1: Better Auth vs Auth.js Schema Conflict
**What goes wrong:** Better Auth generates its own `user`, `session`, `account`, `verification` tables. If you also define a custom `users` table, you get two user tables and foreign key confusion.
**Why it happens:** Developers scaffold both independently.
**How to avoid:** Run `npx better-auth generate` first to get Better Auth's schema output, then extend it or reference its `user.id` from `hive_members`. Treat Better Auth's `user` table as the canonical user record.
**Warning signs:** Two `users` tables in your schema; `hive_members.user_id` not referencing the same table Better Auth uses.

### Pitfall 2: Middleware Security Theater
**What goes wrong:** Middleware protects routes visually but Server Actions succeed for unauthenticated requests.
**Why it happens:** Developers implement session check only in middleware, not in each Server Action.
**How to avoid:** Every Server Action that mutates data must call `auth.api.getSession()` at the top and throw on null. Middleware is for UX redirects only.
**Warning signs:** A direct `fetch('/api/...')` or Server Action call works without being logged in.

### Pitfall 3: Post-Signup Flow Race Condition
**What goes wrong:** User signs up, Better Auth creates a session, but the redirect to `/hive/create` happens before the session cookie is set, resulting in an auth loop.
**Why it happens:** `signUp()` is async; redirect fires too early.
**How to avoid:** Use Better Auth's `onSuccess` callback or await the sign-up result before redirecting. Better Auth's `signUp.email()` returns a session object — redirect only after confirmation.
**Warning signs:** User signs up successfully but lands on login page.

### Pitfall 4: Docker Volume Persistence Issues
**What goes wrong:** `make down` destroys the local database, losing dev data.
**Why it happens:** `docker compose down` without `-v` preserves volumes; `-v` destroys them.
**How to avoid:** Use `make down` (no `-v`) for normal stop. Use `make db-reset` (explicit destructive) when you want a clean slate. Document this clearly in the Makefile.
**Warning signs:** Database is empty after restarting Docker.

### Pitfall 5: Zod 4 API Changes
**What goes wrong:** Code written against Zod 3 patterns fails silently or throws at runtime after upgrading.
**Why it happens:** Zod 4 changed some error formatting and `.parse()` behavior. `drizzle-zod` supports both but your hand-written schemas may not.
**How to avoid:** Use Zod 4 from the start, not Zod 3. Check Zod 4 migration notes before writing schemas. `drizzle-zod` 0.8.3 supports `zod ^3.25.0 || ^4.0.0`.
**Warning signs:** TypeScript type errors on `.parse()` results, unexpected error message shapes.

### Pitfall 6: Environment Variables in Edge Runtime
**What goes wrong:** `process.env.DATABASE_URL` is undefined in middleware because edge runtime doesn't have access to Node.js env loading.
**Why it happens:** Next.js middleware runs in Edge Runtime, not Node.js runtime.
**How to avoid:** Drizzle/DB queries should not run in middleware. Middleware should only call Better Auth's `getSession()` (which reads cookies, not DB directly in edge-compatible mode). DB queries go in Server Components, Server Actions, and Route Handlers.
**Warning signs:** `DATABASE_URL is not defined` error in middleware logs.

---

## Code Examples

### Hive Creation Server Action
```typescript
// Source: pattern from Drizzle ORM docs + Better Auth session pattern
"use server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hives, hiveMembers } from "@/db/schema"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function createHive(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const name = formData.get("name") as string
  if (!name?.trim()) throw new Error("Hive name is required")

  const [hive] = await db.insert(hives).values({ name }).returning()
  await db.insert(hiveMembers).values({
    hiveId: hive.id,
    userId: session.user.id,
    role: "queen", // D-11: creator is always Queen
  })

  redirect(`/hive/${hive.id}`)
}
```

### cn() Utility
```typescript
// Source: Tailwind docs + clsx pattern
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Tailwind CSS v4 globals.css
```css
/* Source: tailwindcss.com/blog/tailwindcss-v4 */
@import "tailwindcss";

@theme {
  --color-honey: #f59e0b;
  --color-honey-light: #fde68a;
  --color-queen: #92400e;
  --color-bee: #1c1917;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auth.js v5 (next-auth beta) | Better Auth 1.5.6 | Sep 2025 (merger) | Switch auth library; same conceptual model |
| `tailwind.config.js` + @tailwind directives | `@import "tailwindcss"` + `@theme {}` in CSS | Jan 2025 (v4.0) | Simpler setup, no JS config file |
| `serial` / `SERIAL` for primary keys | `uuid().defaultRandom()` or identity columns | PostgreSQL 16 / Drizzle 2025 | Drizzle prefers explicit UUID or identity |
| `getServerSideProps` auth check | Server Component + `auth.api.getSession()` | Next.js 13+ App Router | No more pages/api patterns |

**Deprecated/outdated:**
- `next-auth` v4: Pages Router assumptions, not App Router compatible
- `@tailwind base; @tailwind components; @tailwind utilities;`: Replaced by `@import "tailwindcss"` in v4
- Drizzle `push` command for production: Use `generate` + `migrate` only; `push` is for prototyping

---

## Open Questions

1. **Better Auth vs Auth.js v5 — User Confirmation Required**
   - What we know: Auth.js v5 beta is still functional; Better Auth is the stable successor with Drizzle support
   - What's unclear: Whether the user has a preference or existing familiarity with one library
   - Recommendation: Surface this choice to the user before planning. Default to Better Auth.

2. **Better Auth user table integration with custom schema**
   - What we know: Better Auth generates its own `user` table; we need `hive_members.user_id` to reference it
   - What's unclear: Whether Better Auth's generated schema can be extended with custom columns or if a separate join table is always needed
   - Recommendation: Run `npx better-auth generate` in Wave 0 to see exact table output; then decide whether to extend or join

3. **Zod 4 breaking changes in practice**
   - What we know: drizzle-zod supports both v3 and v4; Zod 4 has some error shape changes
   - What's unclear: Whether specific patterns used in this project (form validation, Server Action payloads) are affected
   - Recommendation: Use Zod 4 from day 1, check Zod 4 migration docs when writing schemas

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | Yes | v22.11.0 | — |
| npm | Package manager | Yes | 10.9.0 | — |
| Docker | Local PostgreSQL (D-14) | Yes (OrbStack) | 28.5.2 | — |
| psql CLI | DB inspection | No | — | Use Beekeeper Studio (D-15) or `make db-studio` |
| PostgreSQL server | Database | No (not running yet) | — | `make up` starts via Docker Compose |

**Missing dependencies with no fallback:** None — Docker satisfies D-14; psql CLI is not required (Beekeeper Studio + Drizzle Studio cover inspection needs).

**Missing dependencies with fallback:** PostgreSQL server not running locally yet — starts on first `make up`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + React Testing Library 16.3.2 |
| Config file | `vitest.config.mts` — Wave 0 gap (does not exist yet) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | createHive server action rejects unauthenticated | unit | `npx vitest run src/__tests__/auth.test.ts` | Wave 0 |
| AUTH-01 | signup form validates email format | unit | `npx vitest run src/__tests__/signup.test.ts` | Wave 0 |
| AUTH-02 | session persists (redirects to hive after refresh) | smoke / manual | Manual browser test | Manual only |
| AUTH-03 | signOut() redirects to login | unit | `npx vitest run src/__tests__/logout.test.ts` | Wave 0 |
| HIVE-01 | createHive inserts hive + queen member row | unit | `npx vitest run src/__tests__/hive.test.ts` | Wave 0 |
| HIVE-02 | hive name validates: non-empty, max 100 chars | unit | `npx vitest run src/__tests__/hive.test.ts` | Wave 0 |
| HIVE-05 | requireQueen() throws for bee role | unit | `npx vitest run src/__tests__/roles.test.ts` | Wave 0 |

> AUTH-02 session persistence is manual-only: automated testing of database session persistence across browser refresh requires E2E infrastructure (Playwright) out of scope for Phase 1.

### Sampling Rate
- **Per task commit:** `npm run test -- --run`
- **Per wave merge:** `npm run test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.mts` — framework config
- [ ] `src/__tests__/auth.test.ts` — covers AUTH-01 (unauthenticated rejection)
- [ ] `src/__tests__/signup.test.ts` — covers AUTH-01 (form validation)
- [ ] `src/__tests__/logout.test.ts` — covers AUTH-03
- [ ] `src/__tests__/hive.test.ts` — covers HIVE-01, HIVE-02
- [ ] `src/__tests__/roles.test.ts` — covers HIVE-05
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`

---

## Sources

### Primary (HIGH confidence)
- npm registry — verified all package versions 2026-03-28
- [Next.js official docs](https://nextjs.org/docs/app/guides/testing/vitest) — Vitest setup (fetched 2026-03-28, v16.2.1 docs)
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first config confirmation
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next) — fetched 2026-03-28

### Secondary (MEDIUM confidence)
- [Auth.js merger announcement](https://better-auth.com/blog/authjs-joins-better-auth) — Sep 2025
- [Auth.js → Better Auth migration guide](https://authjs.dev/getting-started/migrate-to-better-auth) — official Auth.js docs
- [Auth.js discussion #13252](https://github.com/nextauthjs/next-auth/discussions/13252) — community discussion confirming merger
- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle) — fetched 2026-03-28
- [Auth.js v5 credentials pattern](https://authjs.dev/getting-started/authentication/credentials) — fetched for fallback documentation

### Tertiary (LOW confidence)
- Various WebSearch results for Drizzle patterns, Makefile targets, middleware patterns — cross-referenced with official docs where possible

---

## Metadata

**Confidence breakdown:**
- Standard stack (versions): HIGH — verified from npm registry 2026-03-28
- Auth library recommendation: MEDIUM — Better Auth is the clear successor but requires user confirmation before planning
- Architecture patterns: MEDIUM — based on official docs + community patterns, no existing codebase to validate against
- Pitfalls: MEDIUM — based on community sources + official warnings; not all personally validated

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable stack; Better Auth auth decision should be confirmed before this date)
