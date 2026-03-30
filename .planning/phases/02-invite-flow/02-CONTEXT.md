# Phase 2: Invite Flow - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Queen generates invite links for their Hive, and invited users can join via that link and create an account in one flow. This phase delivers the invite lifecycle (generate, share, accept, expire) and the join-through-invite UX. Task creation, assignment, and all gamification are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Invite Sharing UX
- **D-01:** Copy-to-clipboard button only — no email sending, no native share sheet. Queen pastes the link wherever they want (text, email, Slack, etc.)
- **D-02:** Invite button lives in the member list section of the Hive dashboard — contextually obvious since you're adding people
- **D-03:** Clicking "Invite" generates the link and reveals it inline with a copy button — no modal, no popup, stays in context

### Invite Landing Page
- **D-04:** Welcome card at top showing "[Queen] invited you to [Hive Name]", signup form below — one page, no extra clicks
- **D-05:** If visitor is already logged in, auto-join the Hive immediately (skip signup)
- **D-06:** If visitor is logged out but has an account, show "Log in to join" link alongside the signup form
- **D-07:** If visitor is already in a different Hive, block with friendly message: "You're already in [Current Hive]. Leave it first to join [New Hive]." (enforces one-Hive-per-user rule from D-04 Phase 1)

### Token Rules
- **D-08:** Tokens expire after 24 hours
- **D-09:** Tokens are single-use (success criteria requirement)
- **D-10:** One active invite link per Hive at a time — generating a new link invalidates the previous one
- **D-11:** Expired or used tokens show friendly error: "This invite has expired. Ask [Queen name] for a new link." plus a link to regular signup

### Joined-User Experience
- **D-12:** New Bee lands directly on the Hive dashboard after signup — no onboarding wizard, no welcome screen
- **D-13:** No join notification — Queen sees the new Bee naturally in the member list on next page load

### Claude's Discretion
- Invite token format and length (nanoid is available in deps)
- Database schema design for invites table
- Exact layout/styling of the invite landing page card
- Error handling for edge cases (network failures, race conditions)
- URL structure for invite routes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions, one-Hive-per-user rule
- `.planning/REQUIREMENTS.md` — HIVE-03 (Queen generates invite link), HIVE-04 (invited user joins via link)
- `.planning/ROADMAP.md` — Phase 2 success criteria (single-use tokens, Hive+Queen name preview, one-flow join)

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04 (one Hive per user), D-08 (two roles: Queen/Bee), D-11 (creator is Queen)

### Technology Stack
- `CLAUDE.md` §Technology Stack — nanoid for tokens, Better Auth for auth, Drizzle ORM for schema

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/button.tsx` — Reusable button component for invite/copy actions
- `src/components/ui/input.tsx` — Reusable input for signup form on invite page
- `src/components/auth/signup-form.tsx` — Existing signup form to adapt for invite-aware signup
- `src/components/hive/member-list.tsx` — Where the invite button will be placed
- `src/components/hive/role-badge.tsx` — Badge component for showing roles
- `nanoid` (v5.1.7) — Already in package.json, unused — ready for token generation

### Established Patterns
- Server actions with FormData validation (src/lib/actions/hive.ts)
- Drizzle relational queries (src/lib/queries/hive.ts)
- `requireQueen()` auth helper for permission checks
- Route groups: `(app)/` for protected, `(auth)/` for public auth pages
- Better Auth session via `auth.api.getSession({ headers: await headers() })`

### Integration Points
- `src/db/schema.ts` — New `invites` table needed alongside existing `hives` and `hiveMembers`
- `src/middleware.ts` — Invite routes need to be accessible without auth (public landing page)
- `src/components/hive/hive-dashboard.tsx` — Already has "Start by inviting your housemates..." copy; invite button goes here
- `src/lib/actions/hive.ts` — New invite actions (generate, accept) follow existing server action patterns
- `src/lib/queries/hive.ts` — New invite queries follow existing query patterns

</code_context>

<specifics>
## Specific Ideas

- The inline link reveal pattern (D-03) matches the existing inline-rename pattern — keep interactions lightweight and in-context
- The invite landing page is the first thing a non-user sees — it should feel welcoming and bee-themed even though full theme polish is Phase 5
- 24-hour expiry is intentionally tight — forces the Queen to actively invite rather than leaving stale links around

</specifics>

<deferred>
## Deferred Ideas

- **In-app notifications** — Notify Queen when a Bee joins, notify Bee when assigned a task. Belongs in a future notifications phase.
- **Email notifications** — Send email when invited, when someone joins, when assigned a task. Requires email service infrastructure (Resend, etc.). Future phase.
- **Multi-use invite links** — A single link that multiple people can use to join. Could simplify large household onboarding. Consider for v2.
- **QR code sharing** — Generate QR code for invite link. Nice for in-person sharing. Low priority.

</deferred>

---

*Phase: 02-invite-flow*
*Context gathered: 2026-03-29*
