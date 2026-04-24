# Phase 7: Landing Page - Research

**Researched:** 2026-04-23
**Domain:** Next.js App Router marketing page, server-side session-based routing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Minimal 3-section layout: Hero → How It Works → Final CTA. No features section, no testimonials, no social proof.
- **D-02:** "How It Works" uses icons + text — each step gets a simple bee-themed icon (hive, clipboard, honey jar) with a short label and one-line description.
- **D-03:** No navigation bar. The header area shows only the logo and a sign-in link.
- **D-04:** Hero headline is playful bee-pun first. Lead with the bee theme front and center. Subtitle explains the value prop plainly.
- **D-05:** Subtle honeycomb background pattern (same `honeycomb-bg` used in-app). The bee theme comes through in copy and icons, not heavy visuals.
- **D-06:** Landing page header is different from the in-app amber header bar — clean/minimal with just logo and sign-in link floating over the hero. More marketing site, less app chrome.
- **D-07:** White background with amber/honey accent colors on buttons and icons.
- **D-08:** Signup CTA button in the hero section and repeated in the final CTA section at the bottom.
- **D-09:** "Already buzzin'? Sign in here" link in the final CTA section (per LAND-03). Sign-in link also in the header area.
- **D-10:** Signup CTA navigates to `/signup` (not inline signup on the landing page).
- **D-11:** Logged-in users hitting the root URL are redirected to their dashboard without seeing the landing page (per LAND-04). Implementation approach is Claude's discretion.

### Claude's Discretion
- Implementation approach for logged-in user redirect (server-side vs middleware vs client-side)
- Exact hero copy and "how it works" step text
- Icon selection/design for the 3 "how it works" steps
- Responsive breakpoint behavior

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAND-01 | First-time visitor sees a marketing-style landing page explaining what Honey_Do is, with a signup CTA | Root `page.tsx` replacement with a full landing component; CTA links to `/signup` |
| LAND-02 | Landing page includes a "how it works" section showing the core loop (create hive, assign tasks, earn honeys) | "How It Works" 3-step section with icons from `lucide-react` |
| LAND-03 | Landing page has an "already buzzin'? sign in here" link for returning users | Sign-in link in header area + final CTA section pointing to `/login` |
| LAND-04 | Logged-in user bypasses the landing page and goes straight to the dashboard | Server-side session check via `auth.api.getSession` in the root Server Component + redirect to `/hive` |
</phase_requirements>

---

## Summary

Phase 7 replaces the current root `page.tsx` (a bare `redirect("/login")`) with a marketing landing page. The work is self-contained: one new Server Component at `src/app/page.tsx` and one new sub-component for the landing page layout. No new routes, no new database queries, no new API endpoints.

The key architectural decision is **how to redirect logged-in users (LAND-04)**. The existing codebase already establishes the correct pattern: `auth.api.getSession({ headers: await headers() })` in a Server Component, which is the same technique used in `/src/app/(app)/hive/page.tsx`. This is preferable to middleware because the root path `/` is not currently in the middleware's `protectedPaths` array — adding it would add complexity, whereas a server-side check keeps the logic co-located with the page.

The visual foundation is already in place: `HoneycombPattern`, `Button`, theme CSS variables (`--color-honey`, `--color-queen`, `--color-bee`), and `lucide-react` (already installed) for the step icons. The entire phase is HTML/CSS/component work using established project patterns.

**Primary recommendation:** Replace `src/app/page.tsx` with a Server Component that checks for a session and redirects to `/hive` if found; otherwise renders a new `LandingPage` client component (or pure Server Component — no client state needed).

---

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | App Router, Server Components, `redirect()` | Already in use [VERIFIED: package.json] |
| React | 19.2.4 | UI rendering | Already in use [VERIFIED: package.json] |
| Tailwind CSS | 4.x | Utility-first styling | Already in use [VERIFIED: package.json] |
| `lucide-react` | 1.7.0 | Step icons (hive, clipboard, honey jar) | Already installed; used throughout the app [VERIFIED: package.json] |
| `clsx` + `tailwind-merge` | latest | Conditional class composition via `cn()` | Already in use [VERIFIED: package.json] |
| `better-auth` | 1.5.6 | Session API for LAND-04 redirect | Already in use; `auth.api.getSession` pattern confirmed [VERIFIED: src/app/(app)/hive/page.tsx] |

**No new packages required.** This phase is purely UI composition.

### Supporting (reuse existing components)
| Component | Path | Purpose |
|-----------|------|---------|
| `HoneycombPattern` | `src/components/ui/honeycomb-pattern.tsx` | Subtle honeycomb background for the whole page |
| `Button` | `src/components/ui/button.tsx` | Signup CTA buttons |
| `cn()` | `src/lib/utils.ts` | Conditional class merging |
| Theme CSS vars | `src/app/globals.css` | `--color-honey`, `--color-queen`, `--color-bee`, `--color-honey-light` |

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Single file replacement + one new component file:

```
src/
├── app/
│   └── page.tsx                        ← REPLACE: session check + render LandingPage
└── components/
    └── landing/
        └── landing-page.tsx            ← NEW: full landing page layout component
```

The `landing/` subfolder follows the same pattern as `components/auth/`, `components/hive/`, etc.

### Pattern 1: Server-Side Session Check → Redirect (LAND-04)

**What:** Root `page.tsx` is a Server Component. It checks the session using Better Auth's server API. If a session exists, it redirects immediately to `/hive`. If not, it renders the landing page.

**When to use:** Any page that should show different content based on auth state, without a client-side flash.

**Example:**
```typescript
// src/app/page.tsx
// Source: pattern established in src/app/(app)/hive/page.tsx [VERIFIED: codebase]
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { LandingPage } from "@/components/landing/landing-page"

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/hive")

  return <LandingPage />
}
```

**Why server-side over middleware:** The existing `middleware.ts` uses cookie presence (`better-auth.session_token`) as a proxy for auth state — this is fast but slightly less accurate than a real session validation. The server component approach calls `auth.api.getSession()` which validates the session properly. For a redirect on the root path, server-side is clean and consistent with how hive/page.tsx works. Middleware would require adding `/` to a new "logged-in-only redirect" array, adding complexity to an already-functional middleware. [ASSUMED — architectural preference; both approaches work]

### Pattern 2: Landing Page as a Pure Server Component (no "use client" needed)

**What:** The `LandingPage` component has no interactive state — all CTAs are `<a>` tags or `<Link>` components pointing to `/signup` and `/login`. No `onClick` handlers that require a client component.

**When to use:** Pages with only links and static content — no form state, no event handlers beyond standard anchor navigation.

```typescript
// src/components/landing/landing-page.tsx
// Source: App Router Server Component default behavior [VERIFIED: Next.js docs via CLAUDE.md]
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HoneycombPattern } from "@/components/ui/honeycomb-pattern"
// lucide-react icons are tree-shaken and work in Server Components
import { Home, ClipboardList, Candy } from "lucide-react"

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Section 1: Hero */}
      {/* Section 2: How It Works */}
      {/* Section 3: Final CTA */}
    </div>
  )
}
```

### Pattern 3: Landing-Specific Header (D-06)

**What:** The landing page does NOT use the in-app `Header` component. It gets its own minimal header: logo text on the left, sign-in link on the right. Floats over the hero section via `absolute` positioning or is a simple flex row above the hero.

**Why:** In-app `Header` has a solid amber `bg-honey` background and a logout button. Landing page wants clean/transparent/white treatment, logo only.

```typescript
// Inline in landing-page.tsx — too small to warrant its own file
<header className="flex items-center justify-between px-6 py-4">
  <span className="text-xl font-bold text-queen">🐝 Honey Do</span>
  <Link href="/login" className="text-sm text-amber-700 hover:underline">
    Sign in
  </Link>
</header>
```

### Pattern 4: "How It Works" Steps (D-02, LAND-02)

3-step row using a grid or flex layout. Each step: icon (lucide-react) + bold label + one-line description.

**Icon selection from `lucide-react` (already installed):**
- Step 1 "Create a Hive" → `Home` or `Hexagon`
- Step 2 "Assign Tasks" → `ClipboardList` or `ListChecks`
- Step 3 "Earn Honeys" → `Star` or `Trophy`

```typescript
// Source: lucide-react icon usage pattern confirmed in existing codebase [VERIFIED: package.json install]
import { Hexagon, ClipboardList, Trophy } from "lucide-react"

const steps = [
  { icon: Hexagon, label: "Create a Hive", desc: "Invite your household — roommates, partner, family." },
  { icon: ClipboardList, label: "Assign Tasks", desc: "Drop chores in the Honeycomb. Someone's gotta do it." },
  { icon: Trophy, label: "Earn Honeys", desc: "Complete tasks, stack honeys, top the leaderboard." },
]
```

### Anti-Patterns to Avoid

- **Don't use the in-app `Header` component on the landing page.** It has the amber app chrome and logout button — wrong tone for a marketing page (D-06).
- **Don't use `"use client"` on `page.tsx`.** The session check requires async/await which only works in Server Components. Moving it to a client component would force a useEffect + loading flash.
- **Don't check session in middleware for this case.** The middleware already handles protecting `/hive` and redirecting logged-in users away from `/login` and `/signup`. Adding root-path logic there mixes concerns. Keep LAND-04 logic in `page.tsx`.
- **Don't add the root path `/` to middleware `authPaths` array.** That array means "if logged in, redirect away." But the landing page isn't an auth page — the redirect destination for logged-in users is `/hive`, which the server component handles.
- **Don't create a new layout for the landing page.** The root `layout.tsx` already wraps everything in `HoneycombPattern` — the landing page inherits this automatically. Wrapping again would double the pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session check | Custom cookie parsing | `auth.api.getSession({ headers: await headers() })` | Already works; validated in existing pages [VERIFIED: codebase] |
| SVG icons | Inline SVG or custom icon components | `lucide-react` (already installed) | Tree-shaken, consistent sizing API, covers all needed icons |
| Link navigation | `<a href>` tags | Next.js `<Link href>` | Enables client-side navigation, prefetching |
| Conditional CSS classes | String concatenation | `cn()` from `@/lib/utils` | Prevents Tailwind class conflicts; established project pattern |

---

## Common Pitfalls

### Pitfall 1: Double HoneycombPattern Wrapping
**What goes wrong:** Adding `<HoneycombPattern>` inside the landing page component creates a double-nested honeycomb pattern — the root layout already wraps everything.
**Why it happens:** Not noticing that `layout.tsx` renders `<HoneycombPattern className="min-h-screen">{children}</HoneycombPattern>` around all pages.
**How to avoid:** Do NOT wrap landing page sections in another root-level `HoneycombPattern`. The background is already applied. The `honeycomb-bg-medium` class can be used on individual sections (like the "How It Works" row) for visual variety without adding a new wrapper component.
**Warning signs:** Honeycomb pattern looks darker/denser than expected.

### Pitfall 2: Session Check Flash (Client-Side Approach)
**What goes wrong:** If LAND-04 is implemented client-side (`useEffect` + `authClient.useSession()`), logged-in users briefly see the landing page before being redirected.
**Why it happens:** Client components render before the useEffect fires.
**How to avoid:** Use the Server Component approach — `auth.api.getSession()` in `page.tsx` runs on the server before any HTML is sent to the browser. Redirect fires server-side, no flash.

### Pitfall 3: Root Path Not in Middleware Session Redirect
**What goes wrong:** The current `middleware.ts` has `authPaths = ["/login", "/signup"]`. If a logged-in user visits `/`, middleware does NOT redirect them (because `/` is not in `authPaths`). The LAND-04 redirect would silently fail if the developer assumed middleware handles it.
**Why it happens:** Middleware only redirects logged-in users away from `authPaths`. `/` is not an auth path.
**How to avoid:** LAND-04 must be implemented in `page.tsx` itself (server-side check), not assumed from middleware. [VERIFIED: src/middleware.ts]

### Pitfall 4: Button Component Expects `<button>` — Use Link for CTAs
**What goes wrong:** Using the `Button` component for signup CTAs that navigate to `/signup` — but `Button` renders a `<button>` element, not an `<a>` tag. Wrapping it in `<Link>` works but is awkward.
**Why it happens:** `Button` component is a `<button>`, not a polymorphic component with an `as` prop.
**How to avoid:** Two options:
1. Wrap `Button` in a `<Link>`: `<Link href="/signup"><Button>Join the Hive</Button></Link>` — valid, accessible.
2. Use Tailwind classes directly on `<Link>` to style it as a button (avoids the wrapper).
Option 1 is simpler and consistent with existing patterns. [VERIFIED: src/components/ui/button.tsx]

---

## Code Examples

### Complete page.tsx Pattern
```typescript
// src/app/page.tsx
// Source: auth pattern from src/app/(app)/hive/page.tsx [VERIFIED: codebase]
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { LandingPage } from "@/components/landing/landing-page"

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/hive")
  return <LandingPage />
}
```

### Theme Colors Available
```css
/* Source: src/app/globals.css [VERIFIED: codebase] */
--color-honey: #f59e0b;        /* amber — primary brand, CTA buttons */
--color-honey-light: #fde68a;  /* light amber — hover states */
--color-queen: #92400e;        /* dark amber/brown — headings, logo */
--color-bee: #1c1917;          /* near-black — body text */
--color-honeycomb-pattern: rgba(245, 158, 11, 0.08);  /* pattern fill */
```

### Link-Wrapped Button CTA
```typescript
// Source: Next.js Link + existing Button component [VERIFIED: codebase]
import Link from "next/link"
import { Button } from "@/components/ui/button"

<Link href="/signup">
  <Button variant="primary" size="md">
    Join the Hive — it's free
  </Button>
</Link>
```

### Sign-In Link (LAND-03)
```typescript
// Source: standard Next.js Link usage [VERIFIED: codebase pattern]
import Link from "next/link"

<p className="text-sm text-stone-500">
  Already buzzin'?{" "}
  <Link href="/login" className="text-honey font-medium hover:underline">
    Sign in here
  </Link>
</p>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getServerSideProps` for session checks | `auth.api.getSession()` in Server Component | Next.js App Router (v13+) | Eliminates pages-router boilerplate; used in this project [VERIFIED: codebase] |
| Middleware cookie check for all auth redirects | Server Component session check for page-level logic | App Router pattern | More accurate validation; co-located with page logic |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Server-side session check in page.tsx is preferable to extending middleware for LAND-04 | Architecture Patterns | If wrong, plan could use middleware instead — functionally equivalent, slightly different implementation. Low risk. |
| A2 | `LandingPage` component requires no client state and can be a pure Server Component | Architecture Patterns | If interactive elements are added (e.g. mobile menu), it would need `"use client"`. Given the locked decisions (no nav bar, only links), this assumption holds. |

---

## Open Questions

1. **Icon exact selection for "How It Works" steps**
   - What we know: `lucide-react` 1.7.0 is installed; the 3 steps are Create Hive / Assign Tasks / Earn Honeys
   - What's unclear: Exact icon names to use (this is aesthetic discretion)
   - Recommendation: Planner picks from `lucide-react` — `Home`/`Hexagon`, `ClipboardList`/`ListChecks`, `Trophy`/`Star`. Any combo works; document choice in PLAN.

2. **Dashboard redirect target for LAND-04**
   - What we know: `redirect("/hive")` routes to `src/app/(app)/hive/page.tsx` which then redirects further to the user's specific hive
   - What's unclear: Whether to redirect to `/hive` (let it cascade) or `/hive/[id]` (requires a DB call in landing page)
   - Recommendation: Redirect to `/hive` and let the existing cascade logic handle it. No DB call needed in `page.tsx`.

---

## Environment Availability

Step 2.6: SKIPPED — this phase has no external dependencies. It is purely UI composition using the existing Next.js app, installed packages, and existing components. No new CLI tools, services, databases, or runtimes required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + React Testing Library 16.3.2 |
| Config file | `vitest.config.mts` (project root) |
| Quick run command | `npx vitest run tests/landing/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAND-01 | Landing page renders hero section with signup CTA | unit (render) | `npx vitest run tests/landing/landing-page.test.tsx` | ❌ Wave 0 |
| LAND-02 | "How It Works" section renders 3 steps with correct labels | unit (render) | `npx vitest run tests/landing/landing-page.test.tsx` | ❌ Wave 0 |
| LAND-03 | "Already buzzin'? Sign in here" link is present and points to `/login` | unit (render) | `npx vitest run tests/landing/landing-page.test.tsx` | ❌ Wave 0 |
| LAND-04 | Logged-in redirect: server-side session check triggers `redirect("/hive")` | manual smoke | manual — requires live session | N/A |

**Note on LAND-04:** Server Component redirects cannot be unit-tested with React Testing Library (RTL doesn't execute `next/navigation` `redirect()`). LAND-04 is verified manually: log in, navigate to `/`, confirm redirect to `/hive`.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/landing/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/landing/landing-page.test.tsx` — covers LAND-01, LAND-02, LAND-03

*(Existing test infrastructure is in place; only the new test file is missing)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Landing page is public; no auth required to view |
| V3 Session Management | yes (partial) | Session read via `auth.api.getSession()` — read-only, no session mutation |
| V4 Access Control | no | No protected resources on the landing page |
| V5 Input Validation | no | No user input on the landing page |
| V6 Cryptography | no | No cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via query param | Tampering | Redirect target is hardcoded (`/hive`) — no user-controlled redirect target |
| Session token exposure | Information disclosure | Session check is server-side; token never exposed to client JS |

**Security posture:** This phase is low-risk. The landing page is a public read-only marketing page. The only auth-adjacent code is the server-side session read for LAND-04, which uses the established `auth.api.getSession()` pattern. No new attack surface introduced.

---

## Sources

### Primary (HIGH confidence)
- `src/app/(app)/hive/page.tsx` — confirms `auth.api.getSession({ headers: await headers() })` pattern [VERIFIED: codebase]
- `src/middleware.ts` — confirms middleware does NOT handle root path `/` redirect for logged-in users [VERIFIED: codebase]
- `src/app/layout.tsx` — confirms `HoneycombPattern` already wraps all pages [VERIFIED: codebase]
- `src/components/ui/honeycomb-pattern.tsx` — confirms component API (intensity prop) [VERIFIED: codebase]
- `src/components/ui/button.tsx` — confirms Button renders `<button>`, needs Link wrapper for navigation [VERIFIED: codebase]
- `package.json` — confirms all dependencies (lucide-react, better-auth, next, react, tailwind, etc.) [VERIFIED: codebase]
- `src/app/globals.css` — confirms theme CSS variables and `honeycomb-bg` classes [VERIFIED: codebase]
- `vitest.config.mts` + `tests/` directory — confirms test infrastructure [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- CLAUDE.md recommended stack section — confirms stack decisions and library choices [VERIFIED: CLAUDE.md]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new dependencies
- Architecture: HIGH — session check pattern directly observed in existing server components
- Pitfalls: HIGH — confirmed from reading actual middleware.ts, layout.tsx, and button.tsx
- Test approach: HIGH — vitest + RTL confirmed installed and in use

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable libraries, no fast-moving dependencies)
