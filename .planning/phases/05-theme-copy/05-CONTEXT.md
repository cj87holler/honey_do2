# Phase 5: Theme & Copy - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the full bee-themed visual experience across the entire app — honeycomb UI patterns, amber/gold color language, bee-pun copy, and a dynamic contextual copy engine that responds to each user's task load. This phase also ensures the app is fully usable on 375px mobile screens.

</domain>

<decisions>
## Implementation Decisions

### Visual Identity
- **D-01:** Full honeycomb world — every page should feel like you're inside a hive. Bold and playful, not subtle accents.
- **D-02:** CSS hex grid backgrounds as repeating honeycomb patterns on pages/sections. Subtle opacity so content stays readable. No hex-shaped cards — standard card shapes with honeycomb wallpaper textures.
- **D-03:** Color intensity is Claude's discretion — pick the right balance of amber/gold vs stone for readability while maximizing bee-theme presence.
- **D-04:** App header gets a full bee-themed redesign — amber/gold background, bee icon or honeycomb logo, buzzy tagline. The header sets the tone for the whole app.

### Dynamic Copy Engine
- **D-05:** Dynamic copy appears as a dashboard greeting — a prominent personalized message at the top of the dashboard that changes based on task count.
- **D-06:** 4 task-load states: Zero tasks, Light (1-3), Moderate (4-7), Heavy (8+). Each state has 8+ random message variants.
- **D-07:** Tone is playful and encouraging — upbeat, never scolding. Examples: Heavy: "Buzz buzz! You've got a full honeycomb!" Zero: "Go play golf, you earned it!"
- **D-08:** Copy includes the user's name — personalized greeting: "Hey {name}, you've got 5 tasks buzzing!"

### Bee Personality & Puns
- **D-09:** Strategic puns — puns in headers, empty states, success messages, and the copy engine. Regular UI labels stay functional ("Save" not "Bee-Save"). Fun without friction.
- **D-10:** Claude writes all puns — make them fun, bee-themed, and encouraging. No specific puns requested.
- **D-11:** UI labels stay functional — no bee-themed renames for navigation or buttons. "Dashboard" stays "Dashboard", "Log out" stays "Log out". Puns live in copy and messages, not in navigation.

### Claude's Discretion
- Color intensity and exact amber/gold palette balance (D-03)
- All pun content and copy variants (D-10)
- Micro-interaction design (not discussed — user skipped this area, Claude has full flexibility for completion moments, hover effects, transitions)
- Specific honeycomb pattern CSS implementation approach
- Mobile responsive breakpoints and layout adjustments for 375px

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Existing Design Tokens
- `src/app/globals.css` — Current color variables: `--color-honey`, `--color-honey-light`, `--color-queen`, `--color-bee`

### Existing Components (to be themed)
- `src/components/layout/header.tsx` — App header (D-04 redesign target)
- `src/components/hive/hive-dashboard.tsx` — Dashboard (D-05 greeting location)
- `src/components/hive/leaderboard.tsx` — Leaderboard section
- `src/components/tasks/task-card.tsx` — Task cards
- `src/components/tasks/create-task-form.tsx` — Task creation
- `src/components/invite/invite-panel.tsx` — Invite section

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `globals.css` already has `--color-honey`, `--color-honey-light`, `--color-queen`, `--color-bee` — extend this palette
- `cn()` utility (clsx + tailwind-merge) available for conditional styling
- Emoji usage established: 👑 🍯 🐝 already in leaderboard and task cards

### Established Patterns
- Bespoke Tailwind CSS — no shadcn, no component library
- Stone-50/white base with amber accent (60/30/10 from UI-SPEC)
- Server components for data-driven views, client components for interactivity
- `revalidatePath` for data freshness after mutations

### Integration Points
- Dashboard greeting: insert above the existing Honeycomb/Leaderboard sections in `hive-dashboard.tsx`
- Copy engine: needs access to task count for the current user (already available via `getHiveWithMembers` and task queries)
- Theme CSS: extend `globals.css` with honeycomb pattern definitions
- Header redesign: modify `header.tsx` layout and styling

</code_context>

<specifics>
## Specific Ideas

- Success criterion requires 8+ distinct variants per task-load state — build a copy registry (array/map) that the greeting component randomly selects from
- Honeycomb CSS pattern should use pure CSS (pseudo-elements or SVG background) — no image assets
- Mobile responsive at 375px is a hard requirement — all honeycomb patterns must degrade gracefully on small screens

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-theme-copy*
*Context gathered: 2026-04-04*
