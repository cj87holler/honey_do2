# Phase 2: Invite Flow - Research

**Researched:** 2026-03-29
**Domain:** Invite token lifecycle, shareable-link UX, signup-then-join flow
**Confidence:** HIGH (grounded in existing codebase + verified patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Copy-to-clipboard button only — no email sending, no native share sheet
- **D-02:** Invite button lives in the member list section of the Hive dashboard
- **D-03:** Clicking "Invite" generates the link and reveals it inline with a copy button — no modal, no popup
- **D-04:** Welcome card at top showing "[Queen] invited you to [Hive Name]", signup form below — one page
- **D-05:** If visitor is already logged in with no Hive, auto-join the Hive immediately
- **D-06:** If visitor is logged out but has an account, show "Log in to join" link alongside signup form
- **D-07:** If visitor is already in a different Hive, block with friendly message: "You're already in [Current Hive]. Leave it first to join [New Hive]."
- **D-08:** Tokens expire after 24 hours
- **D-09:** Tokens are single-use
- **D-10:** One active invite link per Hive at a time — generating a new link invalidates the previous one
- **D-11:** Expired or used tokens show friendly error: "This invite has expired. Ask [Queen name] for a new link." plus a link to regular signup
- **D-12:** New Bee lands directly on the Hive dashboard after signup — no onboarding wizard
- **D-13:** No join notification — Queen sees the new Bee naturally in the member list on next page load

### Claude's Discretion

- Invite token format and length (nanoid is available in deps)
- Database schema design for invites table
- Exact layout/styling of the invite landing page card
- Error handling for edge cases (network failures, race conditions)
- URL structure for invite routes

### Deferred Ideas (OUT OF SCOPE)

- In-app notifications when a Bee joins
- Email notifications
- Multi-use invite links
- QR code sharing
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIVE-03 | Queen can generate an invite link to bring Bees into the Hive | Token generation server action, inline link reveal pattern, nanoid usage |
| HIVE-04 | Invited user can join a Hive via invite link and create an account | Invite landing page, signup-then-join flow, atomic token consumption |
</phase_requirements>

---

## Summary

Phase 2 builds the invite lifecycle: Queen generates a signed token URL, shares it, and an invited person creates an account (or logs in) and lands in the Hive in one flow. The phase has three moving parts: (1) a server action to generate/invalidate tokens and store them in a new `invites` table, (2) a public invite landing page that handles three visitor states — logged-in, logged-out, already-in-a-hive — and (3) an accept/join server action that atomically consumes the token and inserts a `hive_members` row.

The most significant architectural hazard is the gap between `authClient.signUp.email` (client-side Better Auth call) and the subsequent server action that joins the Hive. If the user drops off between the two steps, they have a dangling account. This is acceptable because the existing `/hive` route already redirects no-hive users to `/hive/create`, so they are never stuck. Token consumption must happen in the join server action, never on page view.

The second hazard is the single-use race condition (D-09): two simultaneous clicks on the same link. The join action must atomically mark the token used with an update-where-unused pattern and check the affected row count — not a read-then-write pair.

**Primary recommendation:** Place the invite landing page at `/invite/[token]` (top-level, outside both route groups). This keeps it naturally outside the `/hive*` middleware protection path and avoids any middleware carve-out changes.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nanoid` | 5.1.7 | Token generation | Already in `package.json`, unused — exactly the right tool for short URL-safe tokens |
| `drizzle-orm` | 0.45.2 | Invites table schema + queries | Established pattern in codebase — `hives`, `hiveMembers` follow this |
| `better-auth` | 1.5.6 | Session reads on invite page | `auth.api.getSession({ headers: await headers() })` pattern already used everywhere |
| `zod` | 4.3.6 | Server action input validation | Already in use; validate token format on accept |
| `react-hook-form` | 7.72.0 | Invite-aware signup form | Existing `SignupForm` is RHF-based; adapt it rather than rewrite |

No new packages needed. All required dependencies are present.

**Installation:** N/A — no new installs required.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase adds to the existing structure:

```
src/
├── db/
│   └── schema.ts                       # Add: invites table + relations
├── lib/
│   ├── actions/
│   │   └── invite.ts                   # New: generateInvite, acceptInvite actions
│   └── queries/
│       └── invite.ts                   # New: getInviteByToken, getHiveInvitePreview
├── components/
│   └── invite/
│       ├── invite-panel.tsx            # New: inline link reveal + copy button (client)
│       └── invite-signup-form.tsx      # New: signup form variant that chains to join
└── app/
    └── invite/
        └── [token]/
            └── page.tsx                # New: public invite landing page (server)
```

### Pattern 1: Invite Table Schema

**What:** A single `invites` table tracks tokens per Hive. D-10 (one active link per Hive) is enforced by invalidating previous tokens when generating a new one — no `isActive` boolean needed. The validation query is: `WHERE token = $1 AND expires_at > now() AND used_at IS NULL`.

**Recommended schema:**

```typescript
// Source: existing schema.ts patterns
export const invites = pgTable("invites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hiveId: text("hive_id").notNull().references(() => hives.id),
  token: text("token").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => user.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),           // null = still valid
  usedBy: text("used_by").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
```

Add relations to `hives` (one hive → many invites) and `user` (createdBy, usedBy).

**Token generation:** `nanoid(32)` — 32 chars, URL-safe, effectively unguessable.

**Expiry:** `new Date(Date.now() + 24 * 60 * 60 * 1000)` stored at generation time.

### Pattern 2: Generate Invite Server Action

**What:** Queen-only action that invalidates all prior active tokens for the Hive, then inserts a new one.

**When to use:** Called from the invite panel component in the member list.

```typescript
// Source: established patterns in src/lib/actions/hive.ts
"use server"

import { nanoid } from "nanoid"
import { invites } from "@/db/schema"
import { lt, and, eq, isNull } from "drizzle-orm"

export async function generateInvite(hiveId: string) {
  const { session } = await requireQueen(hiveId)

  // Invalidate previous active invite(s) for this Hive (D-10)
  await db
    .update(invites)
    .set({ expiresAt: new Date() })               // expire now = invalidated
    .where(
      and(
        eq(invites.hiveId, hiveId),
        isNull(invites.usedAt)
      )
    )

  const token = nanoid(32)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await db.insert(invites).values({
    hiveId,
    token,
    createdBy: session.user.id,
    expiresAt,
  })

  return token
}
```

### Pattern 3: Invite Landing Page — Three-State Server Component

**What:** Public server component at `/invite/[token]`. Resolves session and invite state, renders appropriate UI.

**When to use:** The only page reachable without auth under the invite flow.

```typescript
// Source: pattern from src/app/(app)/hive/[id]/page.tsx
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  const invite = await getInviteByToken(token)   // null if expired or used

  if (!invite) {
    return <InviteExpiredCard />                  // D-11: friendly expired message
  }

  // State 1: logged in
  if (session) {
    const existingHive = await getUserHive(session.user.id)

    if (existingHive === invite.hiveId) {
      redirect(`/hive/${invite.hiveId}`)          // already a member
    }

    if (existingHive && existingHive !== invite.hiveId) {
      return <AlreadyInHiveCard ... />            // D-07: block with friendly message
    }

    // No existing hive — auto-join (D-05)
    await acceptInvite(token, session.user.id)
    redirect(`/hive/${invite.hiveId}`)
  }

  // State 2 & 3: logged out — show welcome card + form (D-04, D-06)
  return <InviteWelcomePage invite={invite} token={token} />
}
```

**Key constraint:** `getInviteByToken` must JOIN to hives and user (createdBy) to get the Hive name and Queen name for the welcome card (success criterion 2).

### Pattern 4: Atomic Token Consumption (Single-Use Race Condition)

**What:** The `acceptInvite` server action marks the token used atomically. Uses update-where-unused and checks affected rows — not a read-then-write pair.

**Why it matters:** D-09 is single-use. Two simultaneous requests could both read the token as valid. The atomic update prevents double-joins.

```typescript
// Source: Drizzle returning() pattern
export async function acceptInvite(token: string, userId: string) {
  // Atomic: only succeeds if token is still unused
  const [consumed] = await db
    .update(invites)
    .set({ usedAt: new Date(), usedBy: userId })
    .where(
      and(
        eq(invites.token, token),
        isNull(invites.usedAt),
        gt(invites.expiresAt, new Date())
      )
    )
    .returning()

  if (!consumed) {
    throw new Error("This invite has already been used or has expired.")
  }

  // Insert hive membership
  await db.insert(hiveMembers).values({
    hiveId: consumed.hiveId,
    userId,
    role: "bee",
  })

  return consumed.hiveId
}
```

### Pattern 5: Signup-Then-Join Flow (Logged-Out Path)

**What:** The invite signup form calls `authClient.signUp.email`, gets back a session, then calls `acceptInvite` via server action.

**Critical:** The token must be passed through the signup form and into the join action. There is an inherent gap between `signUp.email` completing (client-side) and the join server action firing. If the user closes the browser here, they have a dangling account. This is acceptable — they will be redirected to `/hive/create` on next login, which is the graceful fallback.

**Token must NOT be consumed on page view** — only on successful join.

```typescript
// Invite-aware signup form (client component)
const onSubmit = async (data: SignupValues) => {
  const result = await authClient.signUp.email({ ... })
  if (result.error) { ... }

  // Chain: join the hive after account creation
  await acceptInviteAction(token)            // server action wraps acceptInvite
  router.push(`/hive/${hiveId}`)             // D-12: land on hive dashboard
}
```

### Pattern 6: Inline Invite Panel (Client Component)

**What:** A client component in the member list that calls `generateInvite` and reveals the link with a copy button. No modal, no popup (D-03).

**Integration point:** `MemberList` currently only accepts `members` prop. For Phase 2, it needs to also receive `isQueen` and `hiveId` props so it can conditionally render the invite panel for Queens only. The invite panel should display below the member list when the Queen is viewing.

```typescript
// Invite panel — inline reveal pattern
const [link, setLink] = useState<string | null>(null)
const [copied, setCopied] = useState(false)

const handleGenerate = async () => {
  const token = await generateInviteAction(hiveId)
  setLink(`${window.location.origin}/invite/${token}`)
}

const handleCopy = () => {
  navigator.clipboard.writeText(link!)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```

### Anti-Patterns to Avoid

- **Check-then-update for token consumption:** Never do `findFirst()` + `update()` as two separate queries. Use the atomic `update().where(isNull(usedAt)).returning()` pattern and check row count.
- **Consuming token on page view:** Do not mark the token used when the invite page loads. Only mark it used when the join action runs.
- **Storing invite URL in the database:** Store only the token. Construct the full URL client-side or via the server's `origin` header at display time.
- **Placing invite route under `/hive/`:** The middleware protects `/hive*`. A route at `/hive/invite/[token]` would require middleware carve-outs. Use `/invite/[token]` at top level.
- **Relying on `usedAt` read before deciding to show the form:** The server component should show the welcome card on any valid token, but token consumption only happens in the join action.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-safe random tokens | Custom random generator | `nanoid(32)` | Cryptographically random, URL-safe, no collisions at this scale |
| Atomic single-use check | Read-then-update two queries | Drizzle `update().where(isNull(usedAt)).returning()` | Prevents race condition; two reads can both pass before either write |
| Session reads in server components | Custom cookie parsing | `auth.api.getSession({ headers: await headers() })` | Established pattern, handles Better Auth token format |
| Clipboard write | Custom clipboard API wrapper | `navigator.clipboard.writeText()` | Standard Web API, supported everywhere the app targets |

**Key insight:** The single-use race condition is the only place where the correctness of this phase depends on getting the implementation right at the query level. Everything else is straightforward composition of existing patterns.

---

## Common Pitfalls

### Pitfall 1: Token Consumed on Page View

**What goes wrong:** Marking the invite `usedAt` when the landing page renders. A bot crawl, a browser preload, or a user clicking "back" then refreshing would invalidate the token before the user ever signs up.

**Why it happens:** Conflating "page view = intent to join" with "join action = successful join."

**How to avoid:** Only update `usedAt` inside `acceptInvite()`, which runs after successful signup or login.

**Warning signs:** QA testers reporting "invite link expired immediately."

### Pitfall 2: Race Condition on Single-Use Token

**What goes wrong:** Two people (or one person and a duplicate request) both read the token as `usedAt IS NULL` before either writes, both pass validation, both get memberships.

**Why it happens:** Check-then-update: `findFirst()` → `update()` as two queries.

**How to avoid:** Use the atomic pattern: `update().where(and(eq(token, ...), isNull(usedAt))).returning()`. If zero rows returned, someone beat you to it.

**Warning signs:** Duplicate `hive_members` rows for the same `userId`.

### Pitfall 3: Orphaned Account (Signup Without Join)

**What goes wrong:** User completes signup but closes the browser tab before the join action fires. They have an account but no Hive.

**Why it happens:** `authClient.signUp.email()` and `acceptInvite()` are two separate operations on the client.

**How to avoid:** This is accepted and handled by the existing `/hive` → `/hive/create` fallback. Document this in the invite form's error handling: if the join fails after signup, redirect to `/hive` which will show the create-hive flow.

**Warning signs:** Users reporting "I signed up but ended up on 'create a Hive' screen." Tolerated; not a bug.

### Pitfall 4: Invite Route Under `/hive/`

**What goes wrong:** Placing the page at `/app/(app)/hive/invite/[token]` causes the middleware to redirect unauthenticated users to `/login` before they can see the invite landing page.

**Why it happens:** The middleware matches `protectedPaths = ["/hive"]` with `startsWith`.

**How to avoid:** Place the invite landing page at `/app/invite/[token]` at the top level, outside both `(app)` and `(auth)` route groups. No middleware changes needed.

**Warning signs:** Unauthenticated visitors hitting the invite link get sent to `/login` with no context.

### Pitfall 5: MemberList/HiveDashboard Missing Props

**What goes wrong:** `MemberList` currently only receives `members` — it has no `isQueen` or `hiveId` prop. The invite button cannot be conditionally rendered without these.

**Why it happens:** The component was built for Phase 1 which only needed to display members.

**How to avoid:** Pass `isQueen: boolean` and `hiveId: string` from `HiveDashboard` down through `MemberList` to the new `InvitePanel`. The Hive page already has `currentUserId` but doesn't currently derive `isQueen` — add that derivation.

**Warning signs:** Invite button visible to Bees, or TypeScript errors on missing props.

---

## Code Examples

### Verified Pattern: Server Action with requireQueen

```typescript
// Source: src/lib/actions/hive.ts — established pattern
export async function generateInvite(hiveId: string) {
  const { session } = await requireQueen(hiveId)   // throws if not queen
  // ... action body
}
```

### Verified Pattern: Session Check in Server Component

```typescript
// Source: src/app/(app)/hive/[id]/page.tsx
const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect("/login")
```

### Verified Pattern: Drizzle Relational Query with Join

```typescript
// Source: src/lib/queries/hive.ts
const members = await db
  .select({ ... })
  .from(hiveMembers)
  .innerJoin(user, eq(hiveMembers.userId, user.id))
  .where(eq(hiveMembers.hiveId, hiveId))
```

### Verified Pattern: SignupForm with Post-Submit Redirect

```typescript
// Source: src/components/auth/signup-form.tsx
const result = await authClient.signUp.email({ email, password, name })
if (result.error) { setServerError(...); return }
router.push("/hive/create")   // post-signup destination — adapt for invite flow
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auth.js v5 (beta) | Better Auth 1.5.6 | Phase 1 (Sep 2025 merger) | Session reads use `auth.api.getSession()`, not NextAuth's `getServerSession()` |
| `uuid` for IDs | `crypto.randomUUID()` | Phase 1 | Hive/member IDs use `$defaultFn(() => crypto.randomUUID())` — same pattern for invite IDs |

---

## Open Questions

1. **`navigator.clipboard.writeText` in HTTP dev environment**
   - What we know: The Clipboard API requires HTTPS in some browsers; works on localhost.
   - What's unclear: Whether the dev Docker setup serves over HTTP could cause the copy button to silently fail.
   - Recommendation: Use `navigator.clipboard.writeText()` with a try/catch and fall back to selecting the text in an input. In production (Vercel/HTTPS) this is a non-issue.

2. **Already-in-same-Hive redirect vs. silent redirect**
   - What we know: D-05 says auto-join if no Hive. If user is already in the invite's Hive, they should just land on the dashboard.
   - What's unclear: Should we show a "Welcome back! You're already in this Hive" flash, or silently redirect?
   - Recommendation: Silent redirect (`redirect(\`/hive/${hiveId}\`)`) is simpler and less confusing. Plan accordingly.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `nanoid` | Token generation | Yes | 5.1.7 | — |
| PostgreSQL | Invites table | Yes | Running via Docker | — |
| `drizzle-kit` | Schema migration | Yes | 0.31.10 | — |
| Vitest + testing-library | Test suite | Yes | Vitest 4.1.2, @testing-library/react 16.3.2 | — |

All dependencies present. No new installs required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.mts` (root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIVE-03 | `generateInvite()` returns a token and invalidates prior tokens | unit | `npx vitest run tests/invite/generate-invite.test.ts` | Wave 0 |
| HIVE-03 | `generateInvite()` throws if caller is not Queen | unit | `npx vitest run tests/invite/generate-invite.test.ts` | Wave 0 |
| HIVE-04 | `acceptInvite()` inserts hive_members row and marks token used | unit | `npx vitest run tests/invite/accept-invite.test.ts` | Wave 0 |
| HIVE-04 | `acceptInvite()` rejects already-used token (race condition guard) | unit | `npx vitest run tests/invite/accept-invite.test.ts` | Wave 0 |
| HIVE-04 | `acceptInvite()` rejects expired token | unit | `npx vitest run tests/invite/accept-invite.test.ts` | Wave 0 |
| HIVE-04 | Invite page renders welcome card with Hive + Queen name | unit | `npx vitest run tests/invite/invite-page.test.tsx` | Wave 0 |
| HIVE-04 | Invite page renders expired message for invalid token | unit | `npx vitest run tests/invite/invite-page.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/invite/generate-invite.test.ts` — covers HIVE-03 (generate + invalidate prior)
- [ ] `tests/invite/accept-invite.test.ts` — covers HIVE-04 (atomic consume, expiry, race condition)
- [ ] `tests/invite/invite-page.test.tsx` — covers HIVE-04 UI states (welcome card, expired, already-in-hive)
- [ ] `tests/invite/helpers.ts` — shared mock DB fixtures for invite tests

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/db/schema.ts` — existing table patterns (hives, hiveMembers, Better Auth tables)
- Codebase: `src/lib/actions/hive.ts` — established server action patterns, `requireQueen`
- Codebase: `src/lib/queries/hive.ts` — Drizzle query patterns
- Codebase: `src/components/auth/signup-form.tsx` — Better Auth client-side signup flow
- Codebase: `src/middleware.ts` — confirmed `/hive*` is the protected path prefix
- Codebase: `package.json` — confirmed `nanoid@5.1.7` already installed, no new deps needed

### Secondary (MEDIUM confidence)

- `nanoid` docs: URL-safe token generation, 32-char length sufficient for invite tokens at this scale
- Drizzle `update().returning()` — atomic update pattern for single-use token consumption

### Tertiary (LOW confidence)

- None flagged.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libs verified in `package.json` against codebase
- Architecture: HIGH — patterns are direct derivations of existing working code in Phase 1
- Pitfalls: HIGH — race condition and middleware pitfalls are grounded in reading the actual code

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (stable stack, 30-day window)
