# Phase 4: Leaderboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 04-leaderboard
**Areas discussed:** Leaderboard placement & layout, Ranking presentation, Empty & edge states, Leaderboard updates

---

## Leaderboard Placement & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Section on Hive dashboard | Add a 'Leaderboard' section to existing dashboard alongside Members, Honeycomb, and All Tasks. Consistent with single-dashboard pattern. | ✓ |
| Separate /leaderboard page | Dedicated page with more room for visual flair. Linked from dashboard nav. | |
| Both — summary + full page | Quick top-3 preview on dashboard with 'See full leaderboard' link. | |

**User's choice:** Section on Hive dashboard
**Notes:** Consistent with the app's single-dashboard pattern established in prior phases.

### Follow-up: Replace or Alongside MemberList?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace MemberList | Leaderboard IS the member list, sorted by honeys with rank numbers. Invite panel moves in. | ✓ |
| Separate section | Keep MemberList as-is, add Leaderboard as new section. | |

**User's choice:** Replace MemberList
**Notes:** Avoids duplicate honey count displays.

---

## Ranking Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Numbered list, sorted by honeys | Simple 1, 2, 3 numbering. Ties get same rank. Top spot gets crown icon. | ✓ |
| Podium top-3 + list below | Visual podium for top 3 (gold/silver/bronze), list for rest. | |
| Just sorted list, no numbers | Sorted but no explicit rank numbers. Low-pressure. | |

**User's choice:** Numbered list, sorted by honeys
**Notes:** Crown emoji (👑) for #1. Honey emoji (🍯) for scores.

### Follow-up: Hive Total?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show Hive total | Sum of all honeys at the bottom. | |
| No, just individual scores | Keep it simple. | ✓ |

**User's choice:** No Hive total
**Notes:** User also noted: "use the emojis they are fun" — confirmed emoji usage throughout.

---

## Empty & Edge States

| Option | Description | Selected |
|--------|-------------|----------|
| Show all at rank 1 with 0 🍯 | Everyone tied at zero with nudge message. | ✓ |
| Hide leaderboard until first completion | Don't show until someone earns honeys. | |
| Show unsorted with 'Start earning!' | List without ranks, motivational message. | |

**User's choice:** Show all members at rank 1 with 0 🍯
**Notes:** Includes nudge: "No honeys yet — time to get buzzy!" with 🐝

---

## Leaderboard Updates

| Option | Description | Selected |
|--------|-------------|----------|
| Standard revalidation | Fresh data on every page load. revalidatePath already handles this. | ✓ |
| Optimistic update | Immediate UI bump before server confirms. | |

**User's choice:** Standard revalidation
**Notes:** No additional infrastructure needed — existing pattern sufficient.

### Follow-up: Celebration on rank change?

| Option | Description | Selected |
|--------|-------------|----------|
| No celebration — keep it simple | Rank just updates. Animations belong in Phase 5. | ✓ |
| Subtle highlight | Brief glow/pulse on moved row. | |
| Toast/notification | 'You moved to #1!' message. | |

**User's choice:** No celebration — keep it simple
**Notes:** Deferred to Phase 5 (Theme & Copy).

---

## Claude's Discretion

- Exact visual styling of rank rows
- Role badge integration with leaderboard rows
- MemberList → Leaderboard component transition approach

## Deferred Ideas

None — discussion stayed within phase scope
