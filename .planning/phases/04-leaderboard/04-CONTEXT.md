# Phase 4: Leaderboard - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Hive leaderboard ranked by total honeys earned. Replaces the existing MemberList component with a ranked, sorted view. No separate page — lives on the Hive dashboard. No real-time updates, no celebrations/animations (those belong in Phase 5). This phase delivers LEAD-01.

</domain>

<decisions>
## Implementation Decisions

### Placement & Layout
- **D-01:** Leaderboard is a section on the Hive dashboard — no separate page
- **D-02:** Leaderboard **replaces** the existing MemberList component — it IS the member list, sorted by honeys with rank numbers
- **D-03:** Invite panel moves into the leaderboard section (currently lives in MemberList)

### Ranking Presentation
- **D-04:** Numbered list sorted by honeys descending — 1, 2, 3, etc.
- **D-05:** Ties get the same rank number (e.g., 1, 1, 3 — not 1, 1, 2)
- **D-06:** Top spot gets a 👑 crown emoji
- **D-07:** Honey values shown with 🍯 emoji — user confirmed emojis are fun, keep them
- **D-08:** No Hive total — just individual scores
- **D-09:** Absolute scores only, no "last place" callout (PROJECT.md decision)

### Empty & Edge States
- **D-10:** When everyone has 0 honeys: show all members tied at rank 1 with 0 🍯, plus a nudge message ("No honeys yet — time to get buzzy!" with 🐝)
- **D-11:** Single-member hive: show the one member at rank 1 (no special case)

### Leaderboard Updates
- **D-12:** Standard revalidation — leaderboard reflects latest data on page load. Task completion already calls `revalidatePath` which re-renders the dashboard.
- **D-13:** No optimistic updates, no celebratory animations for v1. Keep it simple.

### Claude's Discretion
- Exact visual styling of rank rows (spacing, colors, typography)
- How role badges integrate with leaderboard rows
- Transition from MemberList to Leaderboard component (rename vs new component)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Key decision: "Absolute scores only, no 'last place' callout, Hive totals shown to reduce zero-sum dynamic" (note: user decided no Hive total for leaderboard display)
- `.planning/REQUIREMENTS.md` — LEAD-01: "Hive shows a leaderboard ranking members by total honeys earned"
- `.planning/ROADMAP.md` — Phase 4 success criteria (3 items)

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-08 (two roles: Queen/Bee), D-13 (role badges next to names)
- `.planning/phases/03-task-system/03-CONTEXT.md` — D-15/D-16 (honey accounting: honeyCount in hiveMembers, atomic with task completion)

### Technology Stack
- `CLAUDE.md` §Technology Stack — Drizzle ORM, Tailwind CSS

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/hive/member-list.tsx` — Current member display component. Will be replaced/evolved into leaderboard. Already receives members with `honeyCount`.
- `src/components/hive/role-badge.tsx` — Role badge component, reuse in leaderboard rows
- `src/components/hive/hive-dashboard.tsx` — Integration point; currently renders `<MemberList>`
- `src/components/invite/invite-panel.tsx` — Invite panel; currently rendered inside MemberList, needs to move into leaderboard section
- `src/lib/queries/hive.ts` — `getHiveWithMembers()` already returns `honeyCount` per member

### Established Patterns
- Server components for data fetching, client components only where interactivity needed
- `revalidatePath` after mutations for fresh data
- Tailwind utility classes for styling with `cn()` helper

### Integration Points
- `src/components/hive/hive-dashboard.tsx` — Replace `<MemberList>` with `<Leaderboard>`
- `src/lib/queries/hive.ts` — May need to add `ORDER BY honey_count DESC` or sort client-side
- No new database tables or migrations needed — `honeyCount` already exists on `hiveMembers`

</code_context>

<specifics>
## Specific Ideas

- User wants emojis: 👑 for #1, 🍯 for honey counts, 🐝 in empty state message
- Empty state message: "No honeys yet — time to get buzzy!"
- Keep the presentation clean and simple — celebratory animations deferred to Phase 5

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-leaderboard*
*Context gathered: 2026-04-03*
