<!-- GSD:project-start source:PROJECT.md -->
## Project

**Honey_Do**

Honey_Do is a fun, gamified task management app for households. Housemates (roommates, couples, families) create and assign small tasks to each other, earn "honeys" (points) for completing them, and compete on a leaderboard. The whole experience is wrapped in a playful bee theme — Hives, Queens, Bees, Honeycombs, and bee puns everywhere.

**Core Value:** People in a household can assign tasks to each other and actually get them done, because the gamified bee-themed experience makes chores feel like play rather than nagging.

### Constraints

- **Tech stack**: Next.js + PostgreSQL — keep it lightweight
- **Dev setup**: Makefile-driven with clear documentation for getting up and running
- **Task text**: 160 character limit
- **Honey values**: 5, 10, 20, or custom entry (any number)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x (latest) | Full-stack React framework | App Router gives server components + API routes in one repo. Turbopack default bundler as of 15/16. User already decided. | HIGH — confirmed from official Next.js docs (last updated 2026-03-25) |
| React | 19.x | UI rendering | Bundled with Next.js 15. React 19 is stable and required for Server Actions and Suspense patterns used by App Router. | HIGH — official Next.js docs confirm React 19 stable |
| TypeScript | 5.x | Type safety | `create-next-app` default. Minimum v5.1.0 required by Next.js 15. Drizzle ORM has first-class TypeScript types — schema types flow end-to-end. | HIGH |
### Database
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16.x | Primary data store | User already decided. Fits a small-to-medium relational app well — Hives, Bees, Tasks, Honey totals are clean relational data. | HIGH — user constraint |
| Drizzle ORM | 0.39.x | Database access layer | SQL-first ORM with TypeScript inference. No magic, no "N+1 gotcha". Schema is plain TypeScript. Drizzle Kit handles migrations. Lightweight — no heavy runtime, no connection pooling surprises. Preferred over Prisma for Next.js + PostgreSQL in 2025 because of bundle size, edge-readiness, and simpler mental model. | MEDIUM — well-established community consensus as of 2025; official version unverified due to tool restrictions |
| `postgres` (npm) | 3.x | PostgreSQL driver | Drizzle's recommended driver for Node.js/Next.js. Simpler than `pg` (no callback API). Used with Drizzle's `drizzle-orm/postgres-js` adapter. | MEDIUM |
### Authentication
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Auth.js (NextAuth v5) | 5.x beta | Email/password auth, sessions | The standard for Next.js auth. v5 is built for App Router — middleware-first, supports Server Components, no `getServerSideProps` shim needed. Email/password via Credentials provider covers the v1 requirement exactly. Drizzle adapter available for session persistence. | MEDIUM — v5 was in beta as of late 2024; likely stabilized or near-stable by March 2026 but version not verified due to tool restrictions |
### Styling
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Utility-first styling | `create-next-app` default. Version 4 (released early 2025) drops `tailwind.config.js` in favor of CSS-first config — simpler setup. Honeycomb/bee theme colors and playful UI patterns map well to utility classes. No need for a component library for v1 — a bee-themed app wants bespoke visuals, not stock shadcn defaults. | HIGH — official Next.js docs confirm Tailwind CSS as default in `create-next-app` |
### Supporting Libraries
| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `drizzle-kit` | 0.30.x | Schema migrations CLI | Run `drizzle-kit generate` and `drizzle-kit migrate` to manage DB schema changes. Use from the start — never hand-write SQL migrations. | MEDIUM |
| `bcryptjs` | 2.x | Password hashing | Hash/verify passwords for the Credentials provider in Auth.js. Use `bcryptjs` (pure JS) over `bcrypt` (native binding) to avoid Node.js native build issues in Docker/CI. | HIGH — well-established pattern, no version concerns |
| `zod` | 3.x | Runtime validation | Validate form inputs (task text, honey value, invites) before hitting the database. Pairs with `react-hook-form` for client forms or can be used standalone in Server Actions. | HIGH |
| `react-hook-form` | 7.x | Form state management | Lightweight, uncontrolled form handling. Use for multi-field forms (task creation, invite flow). Avoid for trivial single-field inputs. | HIGH |
| `nanoid` | 5.x | Invite link tokens | Generates short, URL-safe unique IDs for Hive invite links. Lighter than uuid for this use case. | HIGH |
| `clsx` + `tailwind-merge` | latest | Conditional class composition | Required pattern for any component that conditionally applies Tailwind classes — prevents class conflicts. Use `cn()` utility wrapping both. | HIGH |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle | Prisma | Prisma generates a Prisma Client binary, adds runtime overhead, and has historically had issues with Next.js edge runtime and cold starts. Drizzle is lighter, SQL-first, and has better TypeScript inference without the magic. For a small app like Honey_Do, either works, but Drizzle is the better long-term bet for Next.js. |
| ORM | Drizzle | Kysely | Kysely is excellent but requires more manual SQL construction. Drizzle gives schema-first migration tooling that Kysely lacks. |
| Auth | Auth.js v5 | Lucia Auth | Lucia is excellent for custom auth but requires more boilerplate. Auth.js v5 with Credentials provider handles email/password with less setup. Lucia is worth considering if v5 remains problematic. |
| Auth | Auth.js v5 | Clerk | Clerk is a hosted auth SaaS — adds a third-party dependency and cost for a hobby/consumer app. Overkill for v1 email/password. |
| Styling | Tailwind CSS | shadcn/ui + Tailwind | shadcn/ui components are useful but design to stock Radix/shadcn defaults. Honey_Do's bee theme needs bespoke visuals. Add shadcn selectively for complex components (dialogs, dropdowns) only if needed. |
| Styling | Tailwind CSS | CSS Modules | CSS Modules work fine but don't compose as naturally as Tailwind utilities for a theme-heavy app. Tailwind is the `create-next-app` default and team familiarity is higher. |
| Driver | `postgres` | `pg` (node-postgres) | `pg` uses callbacks and has a more complex API surface. `postgres` is the modern, Promise-native driver Drizzle recommends for non-serverless Node.js. |
| Forms | react-hook-form | Server Actions only | Server Actions without client form state work for simple forms, but task creation (honey value picker, assignee select, 160-char limit with counter) benefits from client-side validation feedback via react-hook-form + zod. |
## What NOT to Use
| Library | Why to Avoid |
|---------|-------------|
| `next-auth` v4 | Legacy package. Use `next-auth` v5 (same package name, major version) or `@auth/nextjs`. v4 has Pages Router assumptions that break in App Router. |
| Prisma | See "Alternatives Considered" — not wrong, but Drizzle is the better choice for this stack. |
| Redux / Zustand | This app has minimal shared client state. Server Components + `useReducer` / React Context is sufficient for v1. Add Zustand only if leaderboard needs optimistic updates. |
| Styled-components / Emotion | CSS-in-JS runtime libs add bundle weight and don't compose with Tailwind. Avoid. |
| tRPC | Adds a type-safe RPC layer that's genuinely useful in monorepos with separate client/server. In Next.js App Router, Server Actions already give end-to-end type safety. tRPC is over-engineering for Honey_Do. |
| Socket.io / Pusher | Real-time is explicitly out of scope for v1. Don't add WebSocket infrastructure. Standard fetch + revalidation is sufficient. |
## Installation
# Scaffold (Tailwind + TypeScript + App Router defaults)
# ORM + PostgreSQL driver
# Auth
# Validation + Forms
# Utilities
## Key Architecture Notes for Stack Decisions
## Deployment Considerations
| Option | Fit | Notes |
|--------|-----|-------|
| Vercel + Neon (PostgreSQL) | Best for rapid launch | Neon is serverless Postgres, free tier available, native Vercel integration. Swap `postgres` driver for `@neondatabase/serverless`. |
| Fly.io + managed Postgres | Good for container control | More control, slightly more ops work. Use `postgres` driver as-is. |
| Railway | Simple all-in-one | Railway runs both Next.js app and Postgres in one platform. Good DX, reasonable pricing. |
## Sources
- Next.js official docs installation page: https://nextjs.org/docs/app/getting-started/installation (fetched 2026-03-25, version 16.2.1 docs)
- Drizzle ORM docs: https://orm.drizzle.team — not directly fetchable in this session; confidence MEDIUM based on training data through August 2025
- Auth.js docs: https://authjs.dev — not directly fetchable in this session; confidence MEDIUM based on training data through August 2025
- React 19 stable: https://react.dev/blog — confirmed by Next.js docs referencing React 19 stable
- Tailwind CSS v4: Referenced as default in `create-next-app` prompts (official Next.js docs, 2026-03-25)
- Next.js 15/16, React 19, TypeScript 5, Tailwind CSS 4: HIGH (official docs confirmed)
- Drizzle ORM, Auth.js v5, postgres driver, supporting libs: MEDIUM (training data Aug 2025; official docs not reachable in this session — verify versions via `npm info [package] version` before pinning)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
