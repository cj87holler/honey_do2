# Phase 9: Admin Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 09-admin-dashboard
**Areas discussed:** Admin identity model, Password reset mechanism, Access control enforcement

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Admin identity model | How is an admin designated? Boolean column, env-var allowlist, role enum | ✓ |
| Password reset mechanism | How ADMIN-03 works without an email system | ✓ |
| Admin area style & layout | Utility-tool look vs. bee-themed | |
| Access control enforcement | Where the admin gate lives | ✓ |

**User's choice:** Admin identity, Password reset, Access control (3 of 4).
**Notes:** Admin area style fell to Claude's discretion — default to existing bee theme for consistency.

---

## Admin Identity Model

### Q1: How should an admin be designated in the system?

| Option | Description | Selected |
|--------|-------------|----------|
| Env-var email allowlist | ADMIN_EMAILS comma-separated list, no schema change | ✓ |
| isAdmin boolean on user table | Column + migration, supports multiple admins + UI badges | |
| New 'admin' role enum at user level | Separate user-level role, most structured but most complex | |

**User's choice:** Env-var email allowlist.
**Notes:** Recommended option. Fits v1.1 single-owner reality; zero migration.

### Q2: What should happen when ADMIN_EMAILS is unset or empty?

| Option | Description | Selected |
|--------|-------------|----------|
| No admins exist | Empty allowlist = zero admins, redirect to dashboard | ✓ |
| Warn in dev, no admins in prod | Dev-friendly warning, same security posture | |
| Seed a dev admin automatically | Convenient but risks shipping a dev backdoor | |

**User's choice:** No admins exist.
**Notes:** Recommended option. Safe-by-default in all environments.

### Q3: How strict should the email comparison be?

| Option | Description | Selected |
|--------|-------------|----------|
| Case-insensitive, trimmed | Normalize both sides, forgiving of env whitespace | ✓ |
| Exact match | Strict string equality, fragile to case/whitespace | |

**User's choice:** Case-insensitive, trimmed.
**Notes:** Recommended option.

---

## Password Reset Mechanism

### Q1: How should the admin reset a user's password?

| Option | Description | Selected |
|--------|-------------|----------|
| Generate temp password, show once | System generates, admin relays out-of-band, no email needed | ✓ |
| Generate reset link (token-based) | Admin sends URL, user picks their own password; requires token infra | |
| Admin sets an explicit password | Admin types password in form; admin handles plaintext directly | |

**User's choice:** Generate temp password, show once.
**Notes:** Recommended option. No email dependency (Phase 10 not shipped yet), user changes password after login.

### Q2: What format should the generated temporary password take?

| Option | Description | Selected |
|--------|-------------|----------|
| Readable bee-themed | Pattern like 'busy-bee-4721', easy to relay, on-theme | ✓ |
| Random alphanumeric | 12-16 chars, secure but annoying to dictate | |
| Random with symbols | Full entropy including symbols, worst to relay | |

**User's choice:** Readable bee-themed.
**Notes:** Recommended option. Reinforces brand even in utility screens.

### Q3: Should the admin have to confirm before a password reset fires?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, confirm dialog | Modal confirmation with user email shown | ✓ |
| No, single click | Faster but risky — misclick locks user out | |

**User's choice:** Yes, confirm dialog.
**Notes:** Recommended option. Destructive action pattern.

### Q4: What happens to the user's existing sessions after a password reset?

| Option | Description | Selected |
|--------|-------------|----------|
| Invalidate all existing sessions | Delete session rows, logged out everywhere | ✓ |
| Leave existing sessions alone | Temp password only applies to new logins | |

**User's choice:** Invalidate all existing sessions.
**Notes:** Recommended option. Standard security posture.

---

## Access Control Enforcement

### Q1: Where should the admin access check be enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| Layout-level server check | Admin layout.tsx does session + allowlist check, co-located | ✓ |
| Middleware on /admin/* | Centralized, but no middleware exists yet and Better Auth in middleware is awkward | |
| Per-page + per-action check only | Explicit but repetitive, easy to forget on new pages | |

**User's choice:** Layout-level server check.
**Notes:** Recommended option. Mirrors existing server-component auth pattern. Server actions must still re-verify independently (defense in depth — captured as D-10).

### Q2: What should a non-admin see when they try to access /admin?

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to dashboard silently | Invisible to non-admins, reduces surface area | ✓ |
| Show 'Not authorized' page | Transparent but confirms admin area exists | |
| Return 404 | Strongest obscurity, inconsistent with rest of app | |

**User's choice:** Redirect to dashboard silently.
**Notes:** Recommended option.

---

## Claude's Discretion

- Admin area visual style — default to existing bee theme (HoneycombPattern, amber/honey palette) for consistency with the rest of the app.
- Info density on user/hive lists — stick to ADMIN-01/02 minimum fields; add trivial-to-query supplementary columns (e.g., role, hive name) only if genuinely useful.
- Exact route shape (`/admin`, `/admin/users`, `/admin/hives` vs. tabs) and route-group naming.
- Admin-facing copy tone — lighter bee-pun density acceptable on utility screens.

## Deferred Ideas

- Hive detail view, task stats per hive (from UAT todo — out of ADMIN-02 scope).
- Delete/archive hives (from UAT todo — destructive, own phase).
- Disable/delete user accounts (from UAT todo — not in Phase 9 requirements).
- Self-service "forgot password" (Out of Scope per REQUIREMENTS.md).
- Search/filter/sort on admin tables (keep plain for v1.1).
- Email-based reset link (depends on Phase 10).
- Admin audit log table (server logs sufficient for v1.1).
