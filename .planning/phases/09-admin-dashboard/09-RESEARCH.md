# Phase 9: Admin Dashboard - Research

**Researched:** 2026-04-24
**Domain:** Next.js 15 App Router admin area — Better Auth 1.5.6 password mutation, Drizzle aggregate queries, env-gated access control
**Confidence:** HIGH (all critical claims verified by reading installed source files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Admins are designated via a `ADMIN_EMAILS` environment variable — comma-separated list of email addresses. No schema change, no migration, no new `admin` column or role enum.
- **D-02:** When `ADMIN_EMAILS` is unset or empty, there are zero admins. The `/admin` route group redirects any accessor (admin or not) to `/hive`. Safe-by-default.
- **D-03:** Email comparison is case-insensitive and whitespace-trimmed on both sides.
- **D-04:** ADMIN-03 implemented as admin-generated temporary password. System generates temp password, stores it hashed, shows plaintext once with copy button. Admin relays out-of-band. No reset tokens, no email.
- **D-05:** Temp password format: readable bee-themed — `busy-bee-4721` / `queen-honey-88`. Meets Better Auth 8-char minimum, avoids visually ambiguous characters, easy to relay verbally.
- **D-06:** Resetting a password invalidates all of the target user's existing sessions.
- **D-07:** Confirmation modal required before reset fires.
- **D-08:** Admin gate lives at layout level — server-side check inside the admin route group's `layout.tsx`.
- **D-09:** Non-admins hitting any `/admin/*` route are silently redirected to `/hive`.
- **D-10:** Defense in depth — every admin server action independently verifies admin status.

### Claude's Discretion
- Admin area style — default to existing bee theme, amber/honey palette, existing `Button`/`Card` primitives.
- Info density — ADMIN-01 requires email + signup date; ADMIN-02 requires member count + creation date. No sorting/filtering UI.
- Exact route shape — `/admin`, `/admin/users`, `/admin/hives` vs. tabs. Planner decides.
- Route group naming — `(admin)` vs. plain `admin/`. Planner decides based on conventions.
- Copy — lighter bee-pun density for utility screens.

### Deferred Ideas (OUT OF SCOPE)
- Hive detail views, delete/archive hives, disable/delete user accounts.
- Self-service "forgot password".
- Email-based reset (Phase 10 dependency).
- Search/filter/sort UI on admin tables.
- Admin audit log.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | Admin can view a list of all users with email and signup date | Drizzle query on `user` table; `count()` aggregate available in `drizzle-orm/sql/functions` |
| ADMIN-02 | Admin can view a list of all hives with member count and creation date | Drizzle `count()` + `groupBy` on `hives` + `hiveMembers`; verified function signature |
| ADMIN-03 | Admin can reset a user's password | `hashPassword` from `better-auth/crypto` + Drizzle direct write to `account.password` + `db.delete(session)` via Drizzle; confirmed approach. Better Auth admin plugin's `setUserPassword` is NOT usable without the admin plugin (requires `role` column in DB) |
</phase_requirements>

---

## Summary

Phase 9 adds an admin-only area behind an `ADMIN_EMAILS` env-var gate. The admin can view all users (ADMIN-01), all hives with member counts (ADMIN-02), and reset any user's password (ADMIN-03). All three requirements are straightforward with the existing stack.

The critical technical finding is that **Better Auth's built-in `admin` plugin is incompatible with D-01**. The plugin's `setUserPassword`, `revokeUserSessions`, and all other admin endpoints guard themselves by checking `session.user.role === "admin"` in the database (a `role` column on the `user` table that the plugin adds). Because D-01 explicitly prohibits schema changes, the plugin cannot be used as-is. The correct path is: use `hashPassword` from `better-auth/crypto` (the same scrypt-based hash function Better Auth uses internally) to hash the temp password, write it directly to the `account` table via Drizzle, and delete sessions via Drizzle directly.

Session invalidation has no in-memory cache concern: Better Auth's `deleteSessions` in the internal adapter writes to the `session` DB table only (no secondary storage is configured in this project). Drizzle `DELETE FROM session WHERE user_id = ?` achieves the same result without touching any Better Auth API surface.

**Primary recommendation:** Implement the full reset operation as a single Drizzle transaction: `UPDATE account SET password = ? WHERE user_id = ? AND provider_id = 'credential'`, then `DELETE FROM session WHERE user_id = ?`. Use `hashPassword` from `better-auth/crypto` to produce the hash. Never touch the Better Auth admin plugin.

---

## Standard Stack

### Core (already installed — no new deps needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | 1.5.6 | Auth internals — `hashPassword` helper | Already in use; confirmed `hashPassword` lives at `better-auth/crypto` [VERIFIED: node_modules/better-auth/dist/crypto/password.d.mts] |
| `drizzle-orm` | 0.45.2 | DB queries + direct table writes | Already in use; `count()` aggregate available [VERIFIED: node_modules/drizzle-orm/sql/functions/aggregate.d.ts] |
| `next` | 16.2.1 | App Router layout + server actions | Already in use |
| `react` | 19.2.4 | `useTransition` / `useActionState` for modal state | Already in use |
| `zod` | 4.3.6 | Input validation in server actions | Already in use |

### No New Dependencies Required

All functionality is achievable with the installed stack. Do not add:
- Better Auth admin plugin — incompatible with D-01 (requires role column)
- `bcryptjs` — would produce hashes incompatible with Better Auth's scrypt format
- Any additional npm packages

---

## Architecture Patterns

### Route Group vs. Plain Directory

**Finding:** Inspecting `src/app/` reveals two existing route groups: `(app)` (authenticated app) and `(auth)` (login/signup). The `(app)` layout is a minimal wrapper with no session gate — all session checks happen at the page level. [VERIFIED: src/app/(app)/layout.tsx lines 1-10]

**Recommendation:** Use a `(admin)` route group at `src/app/(admin)/`. Rationale:
1. Consistent with existing `(app)` and `(auth)` group naming convention.
2. The admin layout must run a session + email gate — this logic belongs in a dedicated layout, not mixed into `(app)/layout.tsx`.
3. Route groups keep `/admin` cleanly scoped without a visible URL segment difference.
4. A plain `admin/` directory also works, but the group convention is established.

### Recommended Project Structure

```
src/
├── app/
│   ├── (app)/            # existing — logged-in users
│   ├── (auth)/           # existing — login/signup
│   └── (admin)/          # NEW — admin-gated area
│       ├── layout.tsx    # session check + isAdminEmail guard, redirect /hive if not admin
│       └── admin/
│           └── page.tsx  # admin dashboard (users + hives tables, or tabs)
├── lib/
│   ├── admin.ts          # NEW — isAdminEmail(), requireAdmin()
│   ├── queries/
│   │   └── admin.ts      # NEW — listAllUsers(), listAllHives()
│   └── actions/
│       └── admin.ts      # NEW — resetUserPassword(userId)
```

**Note on route shape:** The CONTEXT.md leaves the exact route shape (single page vs. `/admin/users` + `/admin/hives`) to the planner. A single `/admin` page with users and hives in two sections is the simpler choice given no filtering is needed. The planner should decide.

### Pattern 1: Session + Admin Gate in layout.tsx

```typescript
// Source: pattern derived from src/app/(app)/hive/page.tsx (lines 7-8) + src/app/page.tsx (lines 8-9)
// src/app/(admin)/layout.tsx
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/hive")
  if (!isAdminEmail(session.user.email)) redirect("/hive")
  return <>{children}</>
}
```

**Key:** Redirect to `/hive` (not `/login`) per D-09. If not logged in at all, `/hive` page will redirect to `/login` via its own session check — chain is correct.

### Pattern 2: Admin Helper Module (`src/lib/admin.ts`)

```typescript
// Source: pattern derived from D-01 / D-03 decisions, headers() pattern from src/app/(app)/hive/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Parse ADMIN_EMAILS env var once per module load.
 * Next.js server code: process.env is available at runtime.
 * Parsing at module scope is safe — env vars are stable per process.
 */
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// Cached at module scope — parsed once, reused across requests in same process
const ADMIN_EMAILS = parseAdminEmails()

/** Pure function — test-friendly, no side effects */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

/**
 * Use in server actions (D-10 belt-and-braces check).
 * Returns session if admin, throws Error if not.
 * Does NOT redirect — callers in server actions should throw, not redirect.
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  if (!isAdminEmail(session.user.email)) throw new Error("Forbidden")
  return session
}
```

**Interface signatures:**
- `isAdminEmail(email: string): boolean` — pure, synchronous, testable
- `requireAdmin(): Promise<Session>` — async, throws on unauthorized, returns session object

**Why throw, not redirect:** Server actions cannot call `redirect()` from a `try/catch` context cleanly. Throwing an error that the client handles is idiomatic for server actions in this codebase (see `src/lib/actions/hive.ts` line 44: `throw new Error("Unauthorized")`). [VERIFIED: src/lib/actions/hive.ts lines 43-45]

### Pattern 3: Admin Queries (`src/lib/queries/admin.ts`)

```typescript
// Source: drizzle-orm/sql/functions/aggregate.d.ts — count() verified at line 17
// Pattern mirrors src/lib/queries/hive.ts and src/lib/queries/task.ts
import { db } from "@/lib/db"
import { user, hives, hiveMembers } from "@/db/schema"
import { count, eq } from "drizzle-orm"

/** ADMIN-01: All users, email + signup date */
export async function listAllUsers() {
  return db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.createdAt)
}

/** ADMIN-02: All hives, name + createdAt + memberCount */
export async function listAllHives() {
  return db
    .select({
      id: hives.id,
      name: hives.name,
      createdAt: hives.createdAt,
      memberCount: count(hiveMembers.id),
    })
    .from(hives)
    .leftJoin(hiveMembers, eq(hives.id, hiveMembers.hiveId))
    .groupBy(hives.id, hives.name, hives.createdAt)
    .orderBy(hives.createdAt)
}
```

**Note on `count()` import:** `count` is exported from `drizzle-orm/sql/functions` (verified) and re-exported from `drizzle-orm` top level. Use `import { count } from "drizzle-orm"` — consistent with how `eq`, `and`, `sql` are imported elsewhere in this codebase [VERIFIED: src/lib/actions/task.ts line 6].

### Pattern 4: `resetUserPassword` Server Action (`src/lib/actions/admin.ts`)

```typescript
// Source: hashPassword verified at node_modules/better-auth/dist/crypto/password.d.mts
// updatePassword internals verified at node_modules/better-auth/dist/db/internal-adapter.mjs lines 488-495
// deleteSessions internals verified at node_modules/better-auth/dist/db/internal-adapter.mjs lines 368-383
"use server"

import { db } from "@/lib/db"
import { account, session } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { generateTempPassword } from "@/lib/admin"
import { requireAdmin } from "@/lib/admin"

export async function resetUserPassword(userId: string): Promise<{ tempPassword: string }> {
  // D-10: independent admin check — never rely on layout gate alone
  await requireAdmin()

  const tempPassword = generateTempPassword()
  const hashedPassword = await hashPassword(tempPassword)

  // Atomic sequence: update password first, then invalidate sessions
  await db.transaction(async (tx) => {
    await tx
      .update(account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, "credential")
        )
      )

    await tx
      .delete(session)
      .where(eq(session.userId, userId))
  })

  // Return plaintext ONLY in return value — never log it
  return { tempPassword }
}
```

**Return type:** `{ tempPassword: string }` — plaintext only in the return value, shown once in the UI. Never `console.log` the temp password on the server.

### Pattern 5: "Show Once" Client UI with `useTransition`

```typescript
// Source: React 19 useTransition pattern — [ASSUMED] standard React 19 pattern
"use client"

import { useTransition, useState } from "react"
import { resetUserPassword } from "@/lib/actions/admin"

function ResetPasswordModal({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [isPending, startTransition] = useTransition()
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleReset() {
    startTransition(async () => {
      try {
        const result = await resetUserPassword(userId)
        setTempPassword(result.tempPassword)
      } catch (e) {
        setError("Reset failed. Try again.")
      }
    })
  }

  if (tempPassword) {
    return <SuccessState tempPassword={tempPassword} userEmail={userEmail} />
  }

  return <ConfirmState onConfirm={handleReset} isPending={isPending} error={error} userEmail={userEmail} />
}
```

**Why `useTransition` + `useState`, not `useActionState`:** The server action returns `{ tempPassword }` — a value the client needs to hold and display. `useActionState` is designed for form state management and would awkwardly hold the temp password in action state. `useTransition` + local `useState` is cleaner for this modal-transition pattern. [ASSUMED: preferred pattern — React docs confirm both are valid]

---

## Critical Finding: Better Auth Admin Plugin Is NOT Compatible

**VERIFIED by reading source code.**

The Better Auth `admin` plugin exposes `setUserPassword` (POST `/admin/set-user-password`) and `revokeUserSessions` (POST `/admin/revoke-user-sessions`). Both look attractive. However, both are gated by `adminMiddleware` which calls `hasPermission()`, which checks `session.user.role === "admin"` — a field that the plugin adds to the `user` table schema via its `init()` hook. [VERIFIED: node_modules/better-auth/dist/plugins/admin/has-permission.mjs, node_modules/better-auth/dist/plugins/admin/routes.mjs lines 18-22, 747-752]

Using the admin plugin would require:
1. Adding a `role` column to the `user` table (schema change, migration)
2. Setting `role = 'admin'` on admin users at DB level

Both contradict D-01 ("No schema change, no migration, no new `admin` column or role enum").

**The correct approach:** Call Better Auth's internal hash function directly and write to the DB via Drizzle.

---

## Password Hashing — Critical Details

Better Auth 1.5.6 uses **scrypt** (via `@noble/hashes/scrypt`) with these parameters: [VERIFIED: node_modules/better-auth/dist/crypto/password.mjs]

```
N: 16384, r: 16, p: 1, dkLen: 64
```

Hash format: `{salt_hex}:{derived_key_hex}` — e.g., `a3f9...:{128-char hex string}`

**Import path:** `import { hashPassword } from "better-auth/crypto"` [VERIFIED: node_modules/better-auth/dist/crypto/password.d.mts]

**Why this matters:** Using raw `bcryptjs` or any other hash function would produce a hash that is incompatible with Better Auth's sign-in flow. The `verifyPassword` function in Better Auth expects the scrypt format. You MUST use `hashPassword` from `better-auth/crypto`.

---

## Session Invalidation — Critical Details

**No in-memory cache in this setup.** [VERIFIED: node_modules/better-auth/dist/db/internal-adapter.mjs lines 368-383]

Better Auth's `deleteSessions(userId)` checks for `secondaryStorage` (Redis/KV cache) first. This project has no secondary storage configured — `src/lib/auth.ts` only configures `database` (Drizzle adapter). [VERIFIED: src/lib/auth.ts]

Therefore, a direct Drizzle `DELETE FROM session WHERE user_id = ?` achieves the same result as Better Auth's internal `deleteSessions`. Both write to the same `session` table. No cache invalidation needed.

---

## Temp Password Generator

**Concrete implementation:**

```typescript
// src/lib/admin.ts — add to the admin helper module
// Ambiguous characters excluded: 0, O, 1, l, I, B (looks like 8)
const BEE_ADJECTIVES = [
  "busy", "golden", "royal", "sweet", "wild",
  "happy", "brave", "fuzzy", "swift", "sunny",
  "bold", "tiny", "amber", "bright", "gentle",
  "warm", "calm", "keen", "pure", "lush",
]

const BEE_NOUNS = [
  "bee", "hive", "queen", "drone", "pollen",
  "honey", "comb", "swarm", "nectar", "wax",
  "wing", "sting", "buzz", "flow", "cell",
  "guard", "scout", "bloom", "clover", "meadow",
]

export function generateTempPassword(): string {
  const adj = BEE_ADJECTIVES[Math.floor(Math.random() * BEE_ADJECTIVES.length)]
  const noun = BEE_NOUNS[Math.floor(Math.random() * BEE_NOUNS.length)]
  // 4-digit suffix, pad to ensure 4 digits (23–9999 range → always 2–4 digits, pad to 4)
  const suffix = String(Math.floor(Math.random() * 9000) + 1000)
  return `${adj}-${noun}-${suffix}`
}
```

**Entropy analysis:**
- Adjective pool: 20 words
- Noun pool: 20 words
- Suffix: 9000 possibilities (1000–9999)
- Total combinations: 20 × 20 × 9000 = 3,600,000
- Entropy: ~21.8 bits

This is acceptable for a **one-time temp password** that forces a user to sign in once and is replaced immediately. It is NOT adequate for a permanent password, but D-04 explicitly calls this a "temporary password" that the user replaces. The format is also easy to dictate verbally.

**Shortest possible output:** `calm-bee-1000` = 13 characters. Meets Better Auth's 8-char minimum. [VERIFIED: src/lib/auth.ts line 11 — `minPasswordLength: 8`]

No visually ambiguous characters (0, O, 1, l, I, B) appear in the curated word lists above.

---

## Transaction Ordering

**Correct atomic sequence:**

1. Hash new password (`hashPassword(tempPassword)`)
2. `UPDATE account SET password = ? WHERE user_id = ? AND provider_id = 'credential'`
3. `DELETE FROM session WHERE user_id = ?`

Steps 2 and 3 run inside a single Drizzle transaction.

**Why password before sessions:** If the session delete fails, the user still has a new password and can sign in to get a new session. The inverse (session deleted, password update failed) would lock the user out with no way to sign in.

**If the whole transaction fails:** The temp password was generated but never stored. The plaintext is in server memory only (never returned to client). The client receives an error. Re-trigger from the UI generates a new temp password. No orphan state.

**Drizzle transaction syntax** (already used in this codebase via `src/lib/actions/task.ts`):
```typescript
await db.transaction(async (tx) => {
  await tx.update(account)...
  await tx.delete(session)...
})
```
[VERIFIED: pattern — Drizzle `transaction()` is a standard API, `db.transaction` is available]

---

## ADMIN_EMAILS Env Handling

```typescript
// Safe parsing pattern — parse at module load, cache result
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)   // removes empty strings from trailing commas
}
```

**Parse at module load vs. per-request:** Module-scope parsing is the right choice. `process.env` is read at runtime in Next.js server code. Since `ADMIN_EMAILS` is a deployment-time constant that doesn't change between requests, caching the parsed array at module scope avoids repeated string parsing on every request. Per-request parsing only makes sense if the env var could change at runtime (it can't in Vercel/Node.js without a restart).

**`.env.example` addition required:**
```
# Comma-separated list of admin email addresses (case-insensitive, trimmed)
# Leave empty or unset for zero admins (safe default)
ADMIN_EMAILS=you@example.com,other@example.com
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom scrypt/bcrypt code | `hashPassword` from `better-auth/crypto` | Must match Better Auth's internal format exactly — `{salt}:{key}` scrypt format [VERIFIED] |
| Session invalidation | Custom session tracking | Drizzle `DELETE FROM session WHERE user_id = ?` | No in-memory cache in this setup; direct DB delete is sufficient and correct [VERIFIED] |
| Admin role system | DB `role` column, middleware | `isAdminEmail()` against `ADMIN_EMAILS` env | D-01 prohibits schema changes; env-var gate is the locked decision |
| Aggregate counts | Manual N+1 queries | Drizzle `count()` + `groupBy` | `count()` is in `drizzle-orm/sql/functions` [VERIFIED] |

---

## Common Pitfalls

### Pitfall 1: Using the Better Auth Admin Plugin
**What goes wrong:** Adding `import { admin } from "better-auth/plugins"` to `auth.ts` and calling `auth.api.setUserPassword`. The call will fail at runtime because the calling session's user has no `role` field (column doesn't exist in this schema).
**Why it happens:** The plugin's `hasPermission` check reads `session.user.role` and falls back to `"user"` role, which has zero permissions.
**How to avoid:** Do not add the admin plugin. Use `hashPassword` + Drizzle directly.

### Pitfall 2: Using `bcryptjs` to Hash the Temp Password
**What goes wrong:** Password is stored as bcrypt hash. Sign-in fails because Better Auth's `verifyPassword` expects scrypt format `{salt}:{hex}`.
**Why it happens:** Developer knows bcrypt is "the password hashing library" without checking what Better Auth uses internally.
**How to avoid:** Import `hashPassword` from `better-auth/crypto`. [VERIFIED: node_modules/better-auth/dist/crypto/password.mjs — scrypt with N:16384, r:16, p:1]

### Pitfall 3: Logging the Plaintext Temp Password
**What goes wrong:** `console.log("Reset password for user:", tempPassword)` appears in server action. Temp password appears in Vercel logs, visible to anyone with log access.
**Why it happens:** Debugging habit.
**How to avoid:** Never log `tempPassword`. Return it only in the action return value. Write test assertions against the hashed value, not the plaintext.

### Pitfall 4: Admin Gate Only in Layout, Not in Server Actions
**What goes wrong:** Server action called directly from the browser console or curl. No admin check in the action itself (only the layout had the gate). Arbitrary user can reset any password.
**Why it happens:** Assuming layout gate is sufficient.
**How to avoid:** Every server action in `src/lib/actions/admin.ts` MUST call `await requireAdmin()` as its first line. This is D-10.

### Pitfall 5: `isAdminEmail` Receives Unsanitized Email
**What goes wrong:** DB stores emails with uppercase (Better Auth normalizes at signup but raw `session.user.email` may vary). Comparison fails silently — admin sees `/hive` redirect.
**Why it happens:** Forgetting that D-03 requires both sides normalized.
**How to avoid:** `isAdminEmail` lowercases and trims both the input and the env entries (implementation above does this correctly).

### Pitfall 6: Deleting Sessions Before Updating Password
**What goes wrong:** If the `account.password` UPDATE fails after sessions are deleted, the user is locked out with no valid session and no way to sign in.
**How to avoid:** Update password first, then delete sessions — both in a single transaction. If either fails, the transaction rolls back.

---

## Code Examples

### Verified Hash/Verify Functions
```typescript
// Source: node_modules/better-auth/dist/crypto/password.d.mts
import { hashPassword, verifyPassword } from "better-auth/crypto"

const hash = await hashPassword("busy-bee-4721")
// hash format: "a3f9...:b7d2..." (hex:hex, scrypt)

const valid = await verifyPassword({ hash, password: "busy-bee-4721" })
// valid: true
```

### Drizzle count() + groupBy for ADMIN-02
```typescript
// Source: node_modules/drizzle-orm/sql/functions/aggregate.d.ts line 17
import { count } from "drizzle-orm"

db.select({
  id: hives.id,
  name: hives.name,
  createdAt: hives.createdAt,
  memberCount: count(hiveMembers.id),
})
.from(hives)
.leftJoin(hiveMembers, eq(hives.id, hiveMembers.hiveId))
.groupBy(hives.id, hives.name, hives.createdAt)
```

### Existing Server Action Auth Pattern (for reference)
```typescript
// Source: src/lib/actions/hive.ts lines 75-92 — the requireQueen pattern
export async function requireQueen(hiveId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  // ...permission check...
  return { session, member }
}
// requireAdmin() mirrors this pattern exactly
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.mts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |
| Environment | `jsdom` default; `// @vitest-environment node` override per-file for server code |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | `listAllUsers()` returns rows with `email` and `createdAt` | unit | `npm test -- tests/admin/list-users.test.ts` | ❌ Wave 0 |
| ADMIN-02 | `listAllHives()` returns rows with `name`, `createdAt`, `memberCount` | unit | `npm test -- tests/admin/list-hives.test.ts` | ❌ Wave 0 |
| ADMIN-03 | `resetUserPassword` hashes password with scrypt format | unit | `npm test -- tests/admin/reset-password.test.ts` | ❌ Wave 0 |
| ADMIN-03 | `resetUserPassword` writes to `account` table | unit | `npm test -- tests/admin/reset-password.test.ts` | ❌ Wave 0 |
| ADMIN-03 | `resetUserPassword` deletes all `session` rows for userId | unit | `npm test -- tests/admin/reset-password.test.ts` | ❌ Wave 0 |
| ADMIN-03 | `resetUserPassword` throws if caller is not admin | unit | `npm test -- tests/admin/reset-password.test.ts` | ❌ Wave 0 |
| D-01/D-03 | `isAdminEmail` is case-insensitive and trims whitespace | unit | `npm test -- tests/admin/is-admin-email.test.ts` | ❌ Wave 0 |
| D-02 | `isAdminEmail` returns false when ADMIN_EMAILS is unset | unit | `npm test -- tests/admin/is-admin-email.test.ts` | ❌ Wave 0 |
| D-05 | `generateTempPassword()` produces format matching `/^[a-z]+-[a-z]+-\d{4}$/` | unit | `npm test -- tests/admin/generate-temp-password.test.ts` | ❌ Wave 0 |
| D-05 | `generateTempPassword()` output is always >= 8 chars | unit | `npm test -- tests/admin/generate-temp-password.test.ts` | ❌ Wave 0 |
| D-08/D-09 | Admin layout redirects non-admin to `/hive` | manual/e2e | manual browser test | — |

### Sampling Rate
- **Per task commit:** `npm test -- tests/admin/`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/admin/is-admin-email.test.ts` — covers D-01, D-02, D-03 (env parsing, case-insensitive, whitespace-trimmed)
- [ ] `tests/admin/generate-temp-password.test.ts` — covers D-05 (format regex, length, no ambiguous chars)
- [ ] `tests/admin/reset-password.test.ts` — covers ADMIN-03 (hash write, session delete, admin guard, no plaintext leakage)
- [ ] `tests/admin/list-users.test.ts` — covers ADMIN-01 (query shape)
- [ ] `tests/admin/list-hives.test.ts` — covers ADMIN-02 (query shape, count field present)

**Test pattern to follow:** `tests/task/create-task.test.ts` — mock `@/lib/db`, mock `@/lib/admin` (for requireAdmin), use `vi.hoisted()` for mock factory hoisting. Use `// @vitest-environment node` at top of server-action test files.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `hashPassword` from `better-auth/crypto` (scrypt); Better Auth session management |
| V3 Session Management | yes | Delete all target sessions on password reset (D-06); Drizzle direct delete |
| V4 Access Control | yes | `isAdminEmail()` env-var gate; `requireAdmin()` in every action (D-10) |
| V5 Input Validation | yes | Zod validate `userId` is non-empty string before DB write |
| V6 Cryptography | yes | scrypt (N=16384, r=16, p=1, dkLen=64) — do NOT hand-roll, use `hashPassword` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Admin action called without session | Spoofing | `requireAdmin()` checks session in every server action (D-10) |
| Admin email comparison bypassed via case | Spoofing | Normalize both sides to lowercase + trim (D-03) |
| Plaintext temp password in server logs | Info Disclosure | Never `console.log` `tempPassword`; return only in action result |
| Password/session update race condition | Tampering | Single DB transaction for password update + session delete |
| Unauthenticated access to admin routes | Elevation of Privilege | Layout-level gate redirects to `/hive` (D-08, D-09) |
| Empty `ADMIN_EMAILS` creates open admin | Elevation of Privilege | D-02: empty = zero admins; `parseAdminEmails().filter(Boolean)` removes empty strings |

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is code/config-only; all libraries already installed, no new npm packages required, no new services or CLIs needed)

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is a greenfield feature phase, not a rename/refactor/migration.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useTransition` + `useState` is cleaner than `useActionState` for the show-once modal pattern | Pattern 5 | Low — both work; planner can swap to `useActionState` if preferred. No functional difference. |
| A2 | Single `/admin` page with two sections is simpler than separate `/admin/users` and `/admin/hives` routes | Architecture | Low — CONTEXT.md explicitly leaves route shape to planner's discretion. |
| A3 | `count()` is re-exported from `drizzle-orm` top level (not just `drizzle-orm/sql/functions`) | Drizzle queries | Low — if not, change import to `from "drizzle-orm/sql/functions"`. Functionally identical. |

**All critical claims (hash format, Better Auth admin plugin incompatibility, session table behavior, `count()` signature) were verified by reading installed source files.**

---

## Open Questions

1. **Route shape: single page vs. sub-routes**
   - What we know: CONTEXT.md leaves this to the planner (Claude's Discretion).
   - What's unclear: Whether the admin area will ever grow (hive detail, user detail) to justify sub-routes now.
   - Recommendation: Start with a single `/admin` page with two table sections. Adding sub-routes later is easy.

2. **Admin layout includes Header or not?**
   - What we know: `(app)/layout.tsx` renders `<Header />`. The admin area likely wants a simpler layout.
   - What's unclear: Should admin pages share the app header, or have a minimal header?
   - Recommendation: Reuse `<Header />` from `(app)` for consistency. Admin pages are still within the logged-in experience. If a dedicated header is needed, that's a planner call.

---

## Sources

### Primary (HIGH confidence — verified by reading installed files)
- `node_modules/better-auth/dist/crypto/password.d.mts` — `hashPassword` / `verifyPassword` signatures
- `node_modules/better-auth/dist/crypto/password.mjs` — scrypt implementation details (N, r, p, dkLen, hash format)
- `node_modules/better-auth/dist/plugins/admin/routes.mjs` — `setUserPassword` (lines 730-767), `revokeUserSessions` (lines 639-665)
- `node_modules/better-auth/dist/plugins/admin/has-permission.mjs` — role-based gate confirming plugin incompatibility with D-01
- `node_modules/better-auth/dist/plugins/admin/access/statement.mjs` — `adminAc` role definition
- `node_modules/better-auth/dist/db/internal-adapter.mjs` — `updatePassword` (lines 488-495), `deleteSessions` (lines 368-383)
- `node_modules/drizzle-orm/sql/functions/aggregate.d.ts` — `count()` signature
- `src/lib/auth.ts` — Better Auth config (no secondaryStorage, minPasswordLength: 8)
- `src/db/schema.ts` — all table definitions (`user`, `session`, `account`, etc.)
- `src/lib/actions/hive.ts` — server action pattern (`requireQueen`, throw on Unauthorized)
- `src/app/(app)/hive/page.tsx` + `src/app/page.tsx` — session check + redirect pattern
- `src/lib/queries/hive.ts` + `src/lib/queries/task.ts` — existing query layer structure
- `vitest.config.mts` — test framework config
- `tests/task/create-task.test.ts` + `tests/invite/generate-invite.test.ts` — test patterns (vi.hoisted, mock structure)
- `package.json` — confirmed better-auth 1.5.6, drizzle-orm 0.45.2

### Tertiary (LOW confidence)
- None — all claims in this research are HIGH confidence from verified source files.

---

## Metadata

**Confidence breakdown:**
- Better Auth password hashing path: HIGH — verified from installed source files
- Better Auth admin plugin incompatibility: HIGH — verified from installed source files
- Session invalidation (no cache concern): HIGH — verified from auth.ts + internal-adapter.mjs
- Drizzle count() aggregate: HIGH — verified from drizzle-orm type definitions
- Temp password entropy calculation: HIGH — pure arithmetic
- `useTransition` + `useState` for show-once modal: MEDIUM — standard React 19 pattern, no codebase reference
- Route group `(admin)` recommendation: HIGH — based on existing `(app)` / `(auth)` convention

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable libraries — no fast-moving changes expected)
