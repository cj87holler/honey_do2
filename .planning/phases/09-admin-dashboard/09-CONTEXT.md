# Phase 9: Admin Dashboard - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

An app owner (admin) can audit the platform's users and hives and reset any user's password. Delivers ADMIN-01 (user list with email + signup date), ADMIN-02 (hive list with member count + creation date), and ADMIN-03 (admin-initiated password reset), plus access control that rejects non-admins. Admin is a **user-level** designation distinct from the hive-level Queen/Bee roles.

**Out of scope for this phase** (explicitly deferred):
- Hive detail views, delete/archive hives, disable/delete user accounts (mentioned in `.planning/todos/pending/uat-admin-dashboard.md` but not in roadmap requirements).
- Self-service "forgot password" — deferred per REQUIREMENTS.md (Out of Scope).
- Email-based reset — no email system yet (Phase 10 adds transactional email).

</domain>

<decisions>
## Implementation Decisions

### Admin Identity
- **D-01:** Admins are designated via a `ADMIN_EMAILS` environment variable — comma-separated list of email addresses. No schema change, no migration, no new `admin` column or role enum. Fits v1.1 where there is a single app owner.
- **D-02:** When `ADMIN_EMAILS` is unset or empty, there are zero admins. The `/admin` route group redirects any accessor (admin or not) to the dashboard. Safe-by-default in every environment — no dev backdoors.
- **D-03:** Email comparison is case-insensitive and whitespace-trimmed on both sides (env entries and `session.user.email`). Protects against capitalisation drift at signup and stray whitespace in env config.

### Password Reset
- **D-04:** ADMIN-03 is implemented as an admin-generated **temporary password**: admin clicks "Reset password" on a user row, confirms a modal ("Reset password for {email}? This invalidates their current password immediately."), and the system generates a temp password, stores it hashed via Better Auth, and shows the plaintext **once** on screen with a copy button. The admin relays it to the user out-of-band (text/chat). No reset tokens, no email dependency.
- **D-05:** Temp password format is **readable bee-themed** — pattern like `busy-bee-4721` / `queen-honey-88`. Constraints: meets Better Auth's 8-char minimum, avoids visually ambiguous characters, easy to relay verbally, stays on-theme. Downstream research should confirm a concrete word list and entropy level.
- **D-06:** Resetting a password **invalidates all of the target user's existing sessions** — delete every session row for that `userId` so they're logged out everywhere and must sign in with the new temp password. Standard security posture and matches "reset means reset".
- **D-07:** A confirmation modal is required before the reset fires (never a single-click destructive action).

### Access Control
- **D-08:** Admin gate lives at the **layout level**: a server-side check inside the admin route group's `layout.tsx` verifies session + admin-allowlist membership. Unauthorised accessors are redirected silently (see D-09). This mirrors the existing server-component auth pattern used elsewhere in the app.
- **D-09:** Non-admins who hit any `/admin/*` route are **silently redirected to the dashboard** (`/hive`). No "not authorized" page, no 404, no error flash. `/admin` is effectively invisible to non-admins — reduces the surface area and keeps the admin tool low-key.
- **D-10:** Defense in depth: every admin server action (e.g., `resetUserPassword`) must independently verify admin status — don't rely solely on the layout gate. Belt-and-braces because a server action can be called from any client.

### Claude's Discretion
- **Admin area style & layout** — default to the existing bee theme and component conventions (honeycomb pattern, amber/honey palette, existing `Button`/`Card` primitives). Keep it consistent with the rest of the app unless research surfaces a strong reason to break from it.
- **Info density on lists** — ADMIN-01 requires email + signup date; ADMIN-02 requires member count + creation date. Include exactly the required fields by default; add supplementary columns only if they're trivial to query and genuinely useful for the admin task (e.g., role, hive name). No sorting/filtering UI beyond what Next.js + a plain table offer out of the box.
- **Exact route shape** — `/admin`, `/admin/users`, `/admin/hives` vs. a single page with tabs, etc. Planner can pick based on what reads cleanest.
- **Route group naming** — `(admin)` route group vs. a plain `admin/` directory. Planner decides based on existing conventions in `src/app/`.
- **Copy & micro-interactions** — admin-facing copy doesn't need the same bee-pun density as user-facing pages; a lighter touch is fine for utility screens.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — ADMIN-01, ADMIN-02, ADMIN-03 define acceptance criteria; "Self-service password reset" Out of Scope entry confirms admin-initiated only.
- `.planning/ROADMAP.md` §"Phase 9: Admin Dashboard" — goal, success criteria, requirement mapping.
- `.planning/PROJECT.md` — Current milestone (v1.1 Landing Page & Polish), tech stack constraints.

### Related Todo (reviewed, partially folded)
- `.planning/todos/pending/uat-admin-dashboard.md` — Original UAT intent. Password reset, user list, and hive list match ADMIN-01/02/03. Delete/archive hives, account disable/delete, and self-service forgot-password are **deferred** (out of Phase 9 scope).

### Existing Code — Auth & Session
- `src/lib/auth.ts` — Better Auth config; email+password with 8-char min. No password-reset feature configured yet; planner should check whether Better Auth exposes an admin-reset primitive or if we set the password hash directly via the `account` table.
- `src/lib/auth-client.ts` — Client-side auth helpers.
- `src/db/schema.ts` — Better Auth tables (`user`, `session`, `account`, `verification`) + app tables (`hives`, `hiveMembers`, `invites`, `tasks`). `account.password` stores the hashed password; `session` rows must be deleted on D-06.

### Existing Code — Patterns to Mirror
- `src/app/(app)/layout.tsx` — Layout-level server session check (pattern to reuse for admin gate).
- `src/app/page.tsx` — Phase 7 landing page; session-aware server-side redirect pattern.
- `src/components/ui/honeycomb-pattern.tsx` — Reusable theme wrapper.
- `src/components/ui/button.tsx` — Button primitive.
- `src/lib/queries/` — Query layer structure for new admin queries.
- `src/lib/actions/` — Server-action structure for `resetUserPassword` and anything else write-side.

### Existing Code — Routes / Reference
- `src/app/(auth)/login/` — Login route (users will return here after admin reset).
- `src/app/(app)/hive/` — Dashboard target for non-admin redirect (D-09).

### Removed Script (for context)
- Git commits `7381e40` / `f51f1f0` — A one-off `reset-password` script was added then removed from the repo (public repo concern). Not available to reference; the admin dashboard is the replacement.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Better Auth session helper** — server-side session reading pattern already in use; gate the admin layout with the same helper.
- **HoneycombPattern + Button + `cn()` utility** — cover the visual shell for admin pages without new primitives.
- **Drizzle query layer in `src/lib/queries/`** — add two read queries: `listAllUsers()` (email, signup date, optional hive memberships) and `listAllHives()` (name, createdAt, member count).
- **Server action pattern in `src/lib/actions/`** — add `resetUserPassword(userId)` with admin guard.

### Established Patterns
- Route groups for auth boundary: `(auth)` public, `(app)` logged-in. Admin likely becomes a third group (or a plain `/admin` directory) with its own layout gate.
- Server components by default; `"use client"` only where interactivity is required (reset modal + "show once" temp password UI will likely need client interactivity for the copy button).
- Tailwind CSS 4 with CSS-first config; theme tokens live in `src/app/globals.css`.
- Drizzle relations already wire `hives ↔ hiveMembers ↔ user`, so member-count aggregation for ADMIN-02 is a simple join/count, not a new table.

### Integration Points
- **New route group/directory**: `src/app/admin/` (or `src/app/(admin)/`) with its own `layout.tsx` performing the admin check.
- **Env config**: Add `ADMIN_EMAILS` to `.env.example` and to Vercel production env.
- **Admin helper module**: A single `src/lib/admin.ts` (or similar) exporting `isAdminEmail(email)` and `requireAdmin()` — one source of truth, used by both the layout gate and server actions (D-10).
- **Password write path**: Determine whether to go through a Better Auth admin method or directly write the hashed password to `account.password` + delete sessions — this is a planner/researcher question.

### Concerns / Things to Verify During Research
- Does Better Auth 1.5.6 expose an admin API for setting another user's password? If not, the planner must confirm the correct hashing path (likely Better Auth's hash function, not raw bcrypt) to stay consistent with signup-created passwords.
- Session deletion (D-06) must happen in the same transaction as the password write, or the order must be password-first-then-sessions — avoid a window where the old session is valid against the new password.
- Ensure the temp password is never logged (no `console.log` on the server, no inclusion in error responses).

</code_context>

<specifics>
## Specific Ideas

- Temp password vibe: `busy-bee-4721`, `queen-honey-88`, `swarm-pollen-2031` — readable, on-theme, easy to dictate. Pick a small curated word list (no ambiguous letters, no off-brand words) and append a 3–4 digit suffix for entropy. Researcher to confirm exact list/format.
- Admin-side UX: two simple tables (Users, Hives) on `/admin`, each row with the minimum required columns plus a "Reset password" button on the user table that triggers the confirmation modal.
- Post-reset confirmation: show the temp password in a prominent card with a Copy button and a note like "You'll only see this once. Share it with the user, they can change it after logging in." Reinforce the one-time nature.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Hive detail view / task stats / honey totals per hive** (from `uat-admin-dashboard.md`) — out of scope: ADMIN-02 only requires member count + creation date. Revisit post-v1.1 if admin workflow demands it.
- **Delete/archive hives** (from `uat-admin-dashboard.md`) — out of scope: not in Phase 9 roadmap requirements. Destructive; belongs in a later phase with its own safety design.
- **Disable/delete user accounts** (from `uat-admin-dashboard.md`) — out of scope: not in Phase 9 roadmap requirements. Similar to above — needs its own phase.
- **Self-service "forgot password" flow** (from `uat-admin-dashboard.md`) — explicitly Out of Scope in REQUIREMENTS.md for v1.1. Admin-initiated only.

### Other Deferred
- Search/filter/sort UI on admin tables — keep it plain for v1.1; revisit if the app grows past a couple dozen hives/users.
- Email-based password reset link — dependent on Phase 10 (Email Notifications). Future iteration could swap D-04's on-screen temp password for a reset-link email, but that's post-Phase-9.
- Admin audit log (record of "admin X reset user Y's password at Z") — nice to have, not required by ADMIN-01/02/03. Log to server logs for now; formal audit table is deferred.

</deferred>

---

*Phase: 09-admin-dashboard*
*Context gathered: 2026-04-24*
