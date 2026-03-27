# Project Research Summary

**Project:** Honey_Do
**Domain:** Gamified household task management (consumer web app, bee theme)
**Researched:** 2026-03-26
**Confidence:** MEDIUM

## Executive Summary

Honey_Do is a gamified household chore coordination app targeting adult cohabitants (couples, roommates) who want to make task management feel playful rather than administrative. Research across the competitive landscape confirms this is a well-understood product category with clear table stakes — shared group space, task assignment, point-based scoring, leaderboard, invite flow — but a notoriously low retention ceiling. Apps in this category succeed on brand personality and fail on novelty collapse: the game wears off within two weeks if there is no progression loop beyond raw points. Honey_Do's bee theme is a genuine differentiator; no direct competitor owns this identity, and the themed experience must go deeper than copy renaming to deliver on its promise.

The recommended technical approach is a Next.js 15 App Router monolith with PostgreSQL, using Drizzle ORM for schema-first data access and Auth.js v5 for email/password authentication. Server Actions replace a traditional REST API layer, keeping mutations colocated with components and eliminating unnecessary boilerplate. This is the right choice for a v1 consumer app: one deploy target, minimal ops, fast iteration. The architecture is straightforward — five core domain entities (users, hives, hive_members, tasks, invite_tokens), a denormalized honey counter for fast leaderboard queries, and role-based guards on every privileged Server Action.

The primary risks are social, not technical. The leaderboard can become a blame board in households with existing fairness tension. The invite flow is the highest drop-off point in any shared-use app — if the second user does not join, the entire product value proposition collapses. Password reset is frequently skipped in MVPs and is always regretted. These risks are well-understood and have clear mitigations that must be designed into the feature work from Phase 1, not addressed as afterthoughts.

---

## Key Findings

### Recommended Stack

The core stack is Next.js 15 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + PostgreSQL 16 + Drizzle ORM. This is the standard high-confidence choice for a Next.js consumer app in 2026. Drizzle is preferred over Prisma for its lighter runtime, better edge compatibility, and SQL-first migration tooling. Auth.js v5 (NextAuth v5) covers email/password authentication with an App Router-native middleware approach. No separate component library is needed — Honey_Do's bee theme requires bespoke visuals, and stock shadcn/Radix defaults would undermine the brand.

For v1, deploy to Vercel + Neon (serverless PostgreSQL). Zero ops, free tier, fast iteration. Switch from the `postgres` driver to `@neondatabase/serverless` at deployment time. No connection pooling library, no WebSocket infrastructure, no Redux — all explicitly out of scope.

**Core technologies:**
- **Next.js 15 (App Router):** Full-stack framework — Server Components for reads, Server Actions for mutations, no separate API layer
- **Drizzle ORM + postgres driver:** Schema-first, TypeScript-native database access — schema types flow end-to-end without separate type definitions
- **Auth.js v5:** Email/password auth, App Router middleware-native, Drizzle adapter for session persistence
- **Tailwind CSS 4:** Utility-first styling with CSS-first config — no `tailwind.config.js` in v4; composes naturally with bee-themed utility classes
- **Zod + react-hook-form:** Runtime validation and client form state for multi-field forms (task creation, invite flow)
- **bcryptjs + nanoid:** Password hashing and URL-safe invite token generation
- **Vercel + Neon:** Zero-ops deployment target for v1

### Expected Features

The feature research confirms that Honey_Do's spec is well-scoped. Every item in the v1 requirement list is a legitimate table stake or low-cost differentiator. The v2 deferrals (Colonies, badges, notifications, OAuth, real-time) are correct calls — each deferred item would add significant complexity without proving the core loop first.

**Must have (table stakes for v1):**
- Email/password auth with password reset — users expect this; without reset, real users get locked out
- Hive creation + invite link — the group context is the entire product premise
- Queen / Bee / QueenBee roles — role clarity is required; assignment without authority structure creates friction
- Task creation (160-char text, honey value selection) — core primitive
- Task assignment to a specific Hive member
- Honeycomb view (personal task queue)
- Mark in-progress / done
- Completed tasks view
- Honeys awarded on task completion
- Leaderboard within Hive
- Mobile-responsive layout — invite links are opened on phones; first impression is mobile
- Full bee theme (copy, UI patterns, puns) — theme is the product differentiator, not a skin

**Should have (differentiators that cost little):**
- Contextual dynamic copy based on task load (8-10+ variants per state, not 2-3)
- Custom honey values (5/10/20/custom) with presets prominent and custom secondary
- QueenBee role framed as the default fun role, not a power-user edge case
- Hive naming by Queen

**Defer to v2:**
- Colonies / Hive-vs-Hive competition
- Badges, levels, unlockable rewards
- Notifications (email / push)
- OAuth / social login
- Recurring tasks, task deadlines, task photo proof
- Real-time updates / WebSockets
- Native mobile app

### Architecture Approach

A monolithic Next.js App Router application with no microservices and no REST API layer. Server Components handle all data reads; Server Actions handle all writes. The data model is five tables: `users`, `hives`, `hive_members` (with a denormalized `honeys` counter), `tasks`, and `invite_tokens`. The honey counter on `hive_members` is updated transactionally at task completion, making leaderboard queries a single indexed SELECT with no aggregation. Role guards (`requireRole()`) run server-side at the top of every privileged Server Action — client-side role checks are UI hints only.

**Major components:**
1. **Auth** — signup, login, logout, session management, password reset, invite token validation
2. **Hive** — create hive, manage membership, enforce role model (Queen/Bee/QueenBee)
3. **Invite** — generate invite link, validate token, assign role on join, land page before sign-up
4. **Task** — create, assign, update status, honey value selection
5. **Honeycomb** — assignee's personal task view (active + completed)
6. **Leaderboard** — rank HiveMembers by accumulated honeys (denormalized counter, single query)
7. **Copy Engine** — select dynamic text based on task load count (pure server-side logic)
8. **UI Shell** — bee-themed navigation, honeycomb visual patterns, mobile-first layout

**Build order (each layer depends on the one before):**
Database schema → Auth → Hive + membership → Invite flow → Task CRUD → Task completion + honey accounting → Honeycomb view → Leaderboard → Copy engine → Theme/UI polish

### Critical Pitfalls

1. **Leaderboard becomes a blame board** — households with existing fairness tension will use the leaderboard as a conflict tool. Mitigation: show absolute scores ("45 honeys this week") as primary display; never show a "last place" callout; keep tone celebratory for all positions. Design the score display before building the leaderboard feature.

2. **Invite flow is the #1 drop-off point** — the invited Bee must see Hive name, Queen name, and at least one sample task before the sign-up form appears. Every extra step kills conversion. Minimal sign-up for invited users (email + password only). Test this flow manually before building any other feature.

3. **Gamification novelty collapses within 2 weeks** — points-only gamification without progression (badges, levels) hits an engagement cliff. Mitigation: copy engine must have 8-10+ variants per task-load state; copy should respond to milestones and Hive-wide totals, not just individual queue counts. Treat copy as a feature, not filler.

4. **Role imbalance breaks fairness perception** — if the Queen does all cognitive labor (assigning) while Bees just execute, Bees disengage. Mitigation: position QueenBee as the default fun role ("play and assign"), not an edge case. Walk the Queen through creating 2-3 tasks during onboarding before they invite Bees, so the Hive has content on arrival.

5. **Honey point values become contested** — unchecked Queen authority over honey values invites household arguments. Mitigation: make 5/10/20 presets visually prominent; custom value is secondary. Frame completion copy around validating the Queen's choice ("20 honeys for a big job!").

**Additional pitfalls to watch:**
- Password reset is always skipped and always regretted — build it in the auth phase, not later
- Mobile-first required — invite links open on phones; hexagonal UI must degrade gracefully at 375px
- Schema must be Hive-scoped from day 1 — honeys stored per-Hive-membership (not globally) to support future Colonies feature without a painful migration

---

## Implications for Roadmap

Based on the architecture build order, feature dependencies, and pitfall mitigations, the natural phase structure is:

### Phase 1: Foundation — Schema, Auth, and Hive Core

**Rationale:** Everything else depends on these three layers. Database schema establishes the data model that all subsequent work builds on. Auth unlocks protected routes. Hive + membership establishes the role model. These must be correct before anything else is built.

**Delivers:** Working database with full schema, email/password sign-up/login/logout, password reset, Hive creation, Queen role assignment.

**Addresses:** Auth (table stake), Hive creation (table stake), role model (table stake).

**Avoids:** Colony-incompatible schema (scope everything to Hive from day 1), missing password reset (build it now, not later).

**Research flag:** Standard patterns — no deeper phase research needed. Next.js Auth.js + Drizzle patterns are well-documented.

---

### Phase 2: Invite Flow

**Rationale:** The invite flow is the highest-risk user journey in the product. If the second user does not join, the entire social premise collapses. This must be built and tested before the task system, so multi-user testing is possible throughout the rest of development.

**Delivers:** Invite link generation (Queen), `/join/[token]` land page (shows Hive name + Queen name before sign-up), sign-up for invited users, role assignment on join (Bee or QueenBee), single-use token validation.

**Addresses:** Invite flow (table stake), QueenBee role.

**Avoids:** Invite drop-off (show Hive context before sign-up gate; minimal sign-up friction).

**Research flag:** Standard patterns — invite token pattern is well-documented. No deeper research needed.

---

### Phase 3: Task System — Creation, Assignment, Completion, and Honey Accounting

**Rationale:** The task system is the core product loop. Must come after Hive + invite so tasks can be tested with real multi-user sessions. Honey accounting (the denormalized counter update on task completion) must be implemented transactionally in this phase — not retrofitted later.

**Delivers:** Task creation (160-char, honey value selection with prominent presets), task assignment to Hive members, task status transitions (open → in_progress → done), honey counter increment on completion (transactional), Honeycomb view (personal task queue, active + completed tabs), Queen visibility into completed tasks.

**Addresses:** Task creation (table stake), task assignment (table stake), mark done (table stake), Honeycomb view (table stake), honeys awarded (table stake), completed tasks view (table stake).

**Avoids:** Honey bikeshedding (presets prominent, custom secondary), done verification tension (Queen sees completed list without an approval step), stale queue rot (timestamps in schema from day 1 support future archival).

**Research flag:** Standard patterns for Server Actions + Drizzle transactions. No deeper research needed.

---

### Phase 4: Leaderboard and Stats

**Rationale:** Leaderboard depends on the denormalized honey counter being in place from Phase 3. This is also the highest social-risk feature — the design must be deliberate before it is built.

**Delivers:** Leaderboard ranked by honeys within Hive, absolute score display ("You earned 45 honeys"), Hive-level total honeys (reduces zero-sum dynamic), bee-themed score presentation.

**Addresses:** Leaderboard (table stake).

**Avoids:** Blame board dynamic (absolute scores primary; no "last place" callout; Hive totals give low-performers a shared win).

**Research flag:** Standard query pattern (single indexed SELECT). Design the score display before building — review pitfall mitigations before writing any leaderboard UI.

---

### Phase 5: Copy Engine and Theme Polish

**Rationale:** The copy engine and bee theme are last because they layer on top of working features — but they are not optional. The theme is the product differentiator and must be treated as a feature, not a skin applied at the end.

**Delivers:** Dynamic contextual copy based on task load count (8-10+ variants per state, milestone-aware, Hive-total-aware), full bee theme applied across all pages (honeycomb UI patterns, amber/yellow color language, bee-pun copy, micro-interactions on task completion), mobile-first responsive layout validated at 375px.

**Addresses:** Contextual dynamic copy (differentiator), bee theme (table stake differentiator), mobile-responsive layout (table stake).

**Avoids:** Novelty collapse (copy variety and milestone awareness), bee-wash (theme in interaction design, not just copy renaming), mobile breakage (375px primary design target).

**Research flag:** This phase is high design effort, low implementation risk. Consider treating copy as a content spec before Phase 5 begins — write all copy variants as a document first, then implement. No technical research needed.

---

### Phase Ordering Rationale

- **Schema before everything:** The data model is load-bearing. Getting it wrong (e.g., storing honeys globally instead of per-Hive-membership) requires a painful migration. Build it correct once.
- **Invite before tasks:** Multi-user testing is blocked without a working invite flow. Building tasks before invites means solo testing only, which misses the core social dynamics.
- **Honey accounting in task phase:** The denormalized counter must be written transactionally from the first implementation. Retrofitting this later risks data integrity bugs.
- **Leaderboard after tasks:** Depends directly on the honey counter being in place and correctly maintained.
- **Theme last, but not optional:** The bee theme is the product's competitive moat. "Theme last" means it gets full attention after the functional skeleton is solid — it does not mean it can be deferred to v2.

### Research Flags

Phases likely needing deeper research during planning:
- None identified. The stack, patterns, and domain are well-documented. The risks in this project are social/design (pitfalls), not technical unknowns.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Next.js + Auth.js + Drizzle is a canonical stack with official documentation.
- **Phase 2 (Invite flow):** Token-based invite pattern is standard and well-understood.
- **Phase 3 (Task system):** Server Actions + Drizzle transactions follow patterns documented in Next.js official docs.
- **Phase 4 (Leaderboard):** Single indexed SELECT on denormalized counter. No novel patterns.
- **Phase 5 (Theme/copy):** Design and content work, not technical research.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 15, React 19, TypeScript 5, Tailwind 4 confirmed via official Next.js docs. Drizzle ORM and Auth.js v5 at MEDIUM — training data Aug 2025, official docs not directly verified in this session. Run `npm info [package] version` before pinning. |
| Features | MEDIUM | Competitive landscape from training data (OurHome, Habitica, ChoreMonster, etc.). Market patterns are consistent and well-documented; specific competitor version details LOW confidence. Project spec (PROJECT.md) is HIGH confidence primary source. |
| Architecture | HIGH | Server Components + Server Actions + denormalized counter + role guards are standard Next.js + PostgreSQL patterns with strong official documentation backing. |
| Pitfalls | MEDIUM | Grounded in Self-Determination Theory, Fogg Behavior Model, and known app failure patterns. Social/gamification pitfalls (Pitfalls 1-5) are HIGH confidence in theory; specific competitor post-mortem data is MEDIUM. Tech pitfalls (Pitfalls 10-13) are HIGH confidence against Next.js/PostgreSQL docs. |

**Overall confidence:** MEDIUM-HIGH. The technical approach is well-defined and high-confidence. The social/gamification risks are well-understood in theory but lack direct real-world verification for this specific product. The biggest unknowns are execution risks (will the invite flow convert? will the copy sustain engagement?), not architectural unknowns.

### Gaps to Address

- **Auth.js v5 version status:** Was in beta as of Aug 2025 training cutoff. Verify current stable version via `npm info next-auth version` before starting Phase 1. If v5 is still beta/unstable, evaluate Lucia Auth as fallback.
- **Invite conversion baseline:** No data on expected invite → join conversion rates for household apps. Validate the invite flow manually with 2-3 real users immediately after Phase 2 — do not proceed to Phase 3 without this signal.
- **Copy variant count:** 8-10 variants per task-load state is a recommendation, not a validated number. Write all copy variants as a content doc before Phase 5, review with target users (housemates) if possible.
- **Neon vs. Railway driver swap:** If deploying to Vercel + Neon, the `postgres` driver must be replaced with `@neondatabase/serverless`. Document this as a deployment step, not an afterthought.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (fetched 2026-03-25): https://nextjs.org/docs/app/getting-started/installation — stack versions, App Router patterns, Server Actions
- `.planning/PROJECT.md` — project requirements, constraints, out of scope decisions

### Secondary (MEDIUM confidence)
- Drizzle ORM docs: https://orm.drizzle.team — schema patterns, migration tooling (training data Aug 2025; not directly fetched)
- Auth.js docs: https://authjs.dev — v5 App Router integration (training data Aug 2025; not directly fetched)
- Competitive landscape: OurHome, Habitica, ChoreMonster, Sweepy, Homey, Tody — training data Aug 2025
- Gamification research: Self-Determination Theory (Deci & Ryan), Fogg Behavior Model — applied to pitfall analysis

### Tertiary (LOW confidence)
- Specific competitor app failure post-mortems — inferred from app store reviews and community discussions in training data; not directly verified in this session

---

*Research completed: 2026-03-26*
*Ready for roadmap: yes*
