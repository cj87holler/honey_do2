# Phase 1: Foundation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema, email/password authentication (Auth.js v5), and Hive creation with two-role model (Queen/Bee). Users can sign up, log in, log out, create a named Hive, and have roles enforced. This phase delivers the data model and auth that every subsequent phase depends on.

</domain>

<decisions>
## Implementation Decisions

### Post-Signup Flow
- **D-01:** Direct signup lands on a "Create a Hive" prompt — not an empty dashboard, not a wizard
- **D-02:** After Hive creation, user lands on the Hive dashboard (empty but ready)
- **D-03:** No Hive-less state — signup requires creating a Hive to proceed
- **D-04:** One Hive per user for v1 — no multi-Hive support or Hive switcher

### Hive Creation UX
- **D-05:** Single-field inline experience — just a Hive name input + "Create" button, minimal friction
- **D-06:** Queen can rename the Hive anytime, no confirmation gate
- **D-07:** (Claude's Discretion) Hive settings placement — inline edit on dashboard or minimal settings page, whatever fits best

### Roles — Simplified from PRD
- **D-08:** Two roles only for v1: **Queen** and **Bee**. QueenBee is dropped.
- **D-09:** Queen can create tasks, assign tasks (to anyone including themselves), and receive tasks
- **D-10:** Bee can only receive and complete tasks — cannot create or assign
- **D-11:** Hive creator is automatically a Queen
- **D-12:** Any Queen can promote a Bee to Queen or demote a Queen to Bee — role changes are fluid
- **D-13:** Roles displayed as subtle label/badge next to user name (e.g., crown icon for Queen, bee icon for Bee)

### Dev & Deployment Setup
- **D-14:** Local dev: Docker Compose for PostgreSQL (user runs OrbStack as Docker runtime)
- **D-15:** Beekeeper Studio used for visual database inspection — connection to localhost:5432
- **D-16:** Deploy target: Vercel (Next.js hosting) + Neon (serverless PostgreSQL). User needs to create accounts for both before first deploy.
- **D-17:** (Claude's Discretion) Makefile commands — design whatever `make` targets make sense for the project

### Claude's Discretion
- Hive settings page vs inline edit (D-07)
- Makefile command suite design (D-17)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions, out-of-scope items
- `.planning/REQUIREMENTS.md` — Full v1 requirement list with IDs; Phase 1 covers AUTH-01, AUTH-02, AUTH-03, HIVE-01, HIVE-02, HIVE-05
- `.planning/ROADMAP.md` — Phase goals and success criteria

### Technology Stack
- `CLAUDE.md` §Technology Stack — Full stack decisions, version pins, alternatives considered, and "What NOT to Use" list

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes all foundational patterns (project structure, component conventions, data access patterns)

### Integration Points
- This phase creates the foundation everything else plugs into: auth session, database schema, Hive/role data model

</code_context>

<specifics>
## Specific Ideas

- User is familiar with OrbStack (Docker runtime) and Beekeeper Studio (DB GUI) — dev setup should integrate smoothly with both
- Role simplification was a real-time decision: the three-role model (Queen/Bee/QueenBee) from the original PRD was confusing. Two roles (Queen/Bee) with Queens able to assign to anyone covers all use cases cleanly. The husband/wife scenario works with both as Queens; the parent/kids scenario works as Queen + Bees.
- Vercel + Neon chosen over AWS Amplify after evaluating compatibility — Amplify's CloudFront Function limits conflict with Auth.js v5's middleware-first architecture

</specifics>

<deferred>
## Deferred Ideas

- **Multi-Hive support** — User can belong to multiple Hives (e.g., family + roommates). Deferred to v2+.
- **QueenBee role** — A hybrid role that was in the original PRD. Dropped for v1 simplicity; could return if two roles prove insufficient.
- **Account creation for Vercel + Neon** — Needed before first deploy, not part of Phase 1 code work. Capture as a pre-deploy checklist item.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-26*
