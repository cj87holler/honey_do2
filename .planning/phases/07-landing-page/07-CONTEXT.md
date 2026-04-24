# Phase 7: Landing Page - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

First-time visitors see a marketing-style landing page that explains Honey_Do and drives signups, while logged-in users are routed directly to their dashboard. This phase replaces the current bare redirect (`page.tsx` → `/login`) with a proper public entry point.

</domain>

<decisions>
## Implementation Decisions

### Page Structure
- **D-01:** Minimal 3-section layout: Hero → How It Works → Final CTA. No features section, no testimonials, no social proof.
- **D-02:** "How It Works" uses icons + text — each step gets a simple bee-themed icon (hive, clipboard, honey jar) with a short label and one-line description.
- **D-03:** No navigation bar. The page is short enough that a nav bar adds clutter. The header area shows only the logo and a sign-in link.

### Hero & Visual Tone
- **D-04:** Hero headline is playful bee-pun first. Lead with the bee theme front and center (e.g., "Get Your Hive Buzzing"). Subtitle explains the value prop plainly.
- **D-05:** Subtle honeycomb background pattern (same `honeycomb-bg` used in-app). The bee theme comes through in copy and icons, not heavy visuals.
- **D-06:** Landing page header is different from the in-app amber header bar — clean/minimal with just logo and sign-in link floating over the hero. More marketing site, less app chrome.
- **D-07:** White background with amber/honey accent colors on buttons and icons. Clean, modern, lets the honeycomb pattern show through subtly.

### Signup/Signin Placement
- **D-08:** Signup CTA button in the hero section and repeated in the final CTA section at the bottom.
- **D-09:** "Already buzzin'? Sign in here" link in the final CTA section (per LAND-03 requirement). Sign-in link also in the header area.
- **D-10:** Signup CTA navigates to the existing `/signup` page (not inline signup on the landing page).

### Logged-In Routing
- **D-11:** Logged-in users hitting the root URL are redirected to their dashboard without seeing the landing page (per LAND-04). Implementation approach is Claude's discretion — server-side session check or middleware redirect.

### Claude's Discretion
- Implementation approach for logged-in user redirect (server-side vs middleware vs client-side)
- Exact hero copy and "how it works" step text
- Icon selection/design for the 3 "how it works" steps
- Responsive breakpoint behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — LAND-01 through LAND-04 define the landing page acceptance criteria

### Existing Code
- `src/app/page.tsx` — Current root page (bare redirect to /login) — this file gets replaced
- `src/app/layout.tsx` — Root layout with HoneycombPattern wrapper and metadata
- `src/app/globals.css` — Theme variables (--color-honey, --color-queen, etc.) and honeycomb CSS patterns
- `src/components/ui/honeycomb-pattern.tsx` — Reusable HoneycombPattern component with subtle/medium intensity
- `src/components/ui/button.tsx` — Existing Button component
- `src/components/layout/header.tsx` — In-app header (for reference — landing page uses different header per D-06)
- `src/app/(auth)/login/page.tsx` — Login page (sign-in link target)
- `src/app/(auth)/signup/` — Signup page (CTA target)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HoneycombPattern` component: Wraps content with honeycomb SVG background. Use with `intensity="subtle"` for landing page.
- `Button` component: Existing styled button. Can be used for CTAs.
- `cn()` utility: clsx + tailwind-merge for conditional class composition.
- Theme CSS variables: `--color-honey`, `--color-honey-light`, `--color-queen`, `--color-bee` — use these for consistency.

### Established Patterns
- Route groups: Auth pages use `(auth)` route group with its own layout
- Server components by default, client components marked with `"use client"`
- Tailwind CSS 4 with CSS-first config (no tailwind.config.js)
- Auth client available via `@/lib/auth-client` for session checks

### Integration Points
- `src/app/page.tsx` — Replace the redirect with the landing page component
- Root layout already wraps everything in HoneycombPattern — landing page inherits this
- Auth session check needed to implement LAND-04 (redirect logged-in users)
- Navigation links to `/signup` and `/login` (existing routes)

</code_context>

<specifics>
## Specific Ideas

- Hero copy style: "Get Your Hive Buzzing" with a subtitle like "Assign tasks. Earn honeys. Make chores actually fun."
- The 3 "How It Works" steps map to the core loop: Create a Hive → Assign Tasks → Earn Honeys
- Final CTA section closes with something like "Ready to start buzzing?" + signup button + sign-in link

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-landing-page*
*Context gathered: 2026-04-23*
