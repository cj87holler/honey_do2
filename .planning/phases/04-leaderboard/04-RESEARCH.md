# Phase 4: Leaderboard - Research

**Researched:** 2026-04-04
**Domain:** React Server Component UI — ranked list with tie-aware sorting, existing Drizzle data
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Leaderboard is a section on the Hive dashboard — no separate page
- **D-02:** Leaderboard **replaces** the existing MemberList component — it IS the member list, sorted by honeys with rank numbers
- **D-03:** Invite panel moves into the leaderboard section (currently lives in MemberList)
- **D-04:** Numbered list sorted by honeys descending — 1, 2, 3, etc.
- **D-05:** Ties get the same rank number (e.g., 1, 1, 3 — not 1, 1, 2)
- **D-06:** Top spot gets a 👑 crown emoji
- **D-07:** Honey values shown with 🍯 emoji — user confirmed emojis are fun, keep them
- **D-08:** No Hive total — just individual scores
- **D-09:** Absolute scores only, no "last place" callout
- **D-10:** When everyone has 0 honeys: show all members tied at rank 1 with 0 🍯, plus nudge "No honeys yet — time to get buzzy! 🐝"
- **D-11:** Single-member hive: show the one member at rank 1 (no special case)
- **D-12:** Standard revalidation — leaderboard reflects latest data on page load. Task completion already calls `revalidatePath`.
- **D-13:** No optimistic updates, no celebratory animations for v1.

### Claude's Discretion

- Exact visual styling of rank rows (spacing, colors, typography)
- How role badges integrate with leaderboard rows
- Transition from MemberList to Leaderboard component (rename vs new component)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEAD-01 | Hive shows a leaderboard ranking members by total honeys earned | `honeyCount` already stored per-member in `hiveMembers` table. `getHiveWithMembers()` already returns it. Ranking is a client-side sort + rank assignment in the new `<Leaderboard>` component. No schema changes, no new queries needed. |

</phase_requirements>

---

## Summary

Phase 4 is a pure UI transformation phase. All the data needed for the leaderboard — `honeyCount` per `hiveMember` — already exists in the database and is already fetched by `getHiveWithMembers()`. No schema migrations, no new server actions, and no new data-layer queries are required.

The work is: (1) create a new `<Leaderboard>` server component that replaces `<MemberList>` in `hive-dashboard.tsx`, (2) implement tie-aware rank assignment in TypeScript (a small pure function), and (3) absorb the `<InvitePanel>` that currently lives inside `MemberList`. The UI contract is already fully specified in the approved `04-UI-SPEC.md`.

The `revalidatePath` call that fires on task completion (Phase 3) already causes the dashboard page to re-fetch and re-render with fresh scores, satisfying the "updates immediately after done" success criterion without any additional plumbing.

**Primary recommendation:** Create `src/components/hive/leaderboard.tsx` as a server component, wire it into `hive-dashboard.tsx` by swapping the `MemberList` import, and write a unit test against the rank-assignment logic.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version (in use) | Purpose | Why |
|---------|-----------------|---------|-----|
| Next.js | 16.2.1 | Server Components, App Router, `revalidatePath` | Locked project stack |
| React | 19.2.4 | UI rendering | Locked project stack |
| TypeScript | ^5 | Type-safe rank logic | Locked project stack |
| Tailwind CSS | ^4 | Utility styling for leaderboard rows | Locked project stack |
| Drizzle ORM | ^0.45.2 | `hiveMembers.honeyCount` already in schema | Locked project stack |
| lucide-react | ^1.7.0 | `Crown` icon already used in `role-badge.tsx` | Already installed |
| clsx + tailwind-merge | in use | `cn()` for conditional row classes | Already installed |

### No new dependencies required

This phase introduces zero new packages. All building blocks are already in `node_modules`.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. One new file:

```
src/
└── components/
    └── hive/
        ├── leaderboard.tsx       ← NEW (replaces member-list.tsx)
        ├── member-list.tsx       ← DELETE or keep as dead code for safety; swap import in hive-dashboard.tsx
        ├── hive-dashboard.tsx    ← EDIT: swap MemberList → Leaderboard import
        └── role-badge.tsx        ← UNCHANGED (reused in leaderboard rows)
tests/
└── hive/                         ← NEW directory
    └── leaderboard.test.tsx      ← NEW: unit test for rank-assignment logic
```

### Pattern 1: Tie-Aware Rank Assignment (pure TypeScript)

**What:** Sort members by `honeyCount` DESC, then assign rank numbers where ties share the same rank and the next rank skips (dense rank is NOT what we want — we want "standard competition ranking", also called "1224" ranking).

**When to use:** Always, in the leaderboard rendering logic.

**Example:**
```typescript
// Standard competition ranking (1, 1, 3 — not 1, 1, 2)
function assignRanks(members: Member[]): RankedMember[] {
  const sorted = [...members].sort((a, b) => b.honeyCount - a.honeyCount)
  let rank = 1
  return sorted.map((member, i) => {
    if (i > 0 && sorted[i].honeyCount < sorted[i - 1].honeyCount) {
      rank = i + 1  // skip ranks equal to the number of members above
    }
    return { ...member, rank }
  })
}
```

This is pure JavaScript sort + map — no library needed. Confidence: HIGH (well-understood algorithm).

### Pattern 2: Server Component with Prop-Passed Data

**What:** `<Leaderboard>` receives `members` as a prop from `HiveDashboard`, which already has the data from `getHiveWithMembers()`. No additional data fetching inside the component.

**When to use:** Always — keep data fetching at the page/dashboard level.

```typescript
// src/components/hive/leaderboard.tsx
import { InvitePanel } from "@/components/invite/invite-panel"
import { RoleBadge } from "./role-badge"

interface Member {
  id: string
  name: string
  role: "queen" | "bee"
  honeyCount: number
}

interface LeaderboardProps {
  members: Member[]
  isQueen: boolean
  hiveId: string
}

export function Leaderboard({ members, isQueen, hiveId }: LeaderboardProps) {
  const ranked = assignRanks(members)
  const allZero = members.every((m) => m.honeyCount === 0)
  // ... render
}
```

### Pattern 3: hive-dashboard.tsx Swap

**What:** Single import swap + render swap. Props are identical between `MemberList` and `Leaderboard`.

```typescript
// BEFORE
import { MemberList } from "./member-list"
// ...
<MemberList members={members} isQueen={isQueen} hiveId={hive.id} />

// AFTER
import { Leaderboard } from "./leaderboard"
// ...
<Leaderboard members={members} isQueen={isQueen} hiveId={hive.id} />
```

No other changes to `hive-dashboard.tsx`.

### Pattern 4: Revalidation (already wired — no action required)

The Phase 3 task completion action already calls:
```typescript
revalidatePath(`/hive/${hiveId}`)
```
This causes the dashboard Server Component to re-render with fresh `honeyCount` values from the database. No additional cache invalidation is needed.

### Anti-Patterns to Avoid

- **Fetching honeyCount inside `<Leaderboard>`:** Data is already in the prop. Adding a fetch creates a waterfall and duplicates the query.
- **Sorting in the database query:** Sorting client-side (in the component) is fine for household scale (< 20 members) and avoids modifying `getHiveWithMembers()`. Add `ORDER BY` only if the query grows complex or membership becomes large.
- **Dense ranking (1, 1, 2):** The user explicitly chose standard competition ranking (1, 1, 3 — D-05). Dense rank is a different algorithm; do not substitute it.
- **Making `<Leaderboard>` a client component:** No interactivity in the ranked rows. Server component is correct. Only `<InvitePanel>` inside it is a client component, and that already works as a nested client component within a server component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rank assignment | Custom complex state machine | Plain `.sort()` + `.map()` with index | The algorithm is 5 lines; no library adds value here |
| Honey count aggregation | Custom SQL SUM aggregation | Read `honeyCount` from `hiveMembers` directly | Phase 3 already maintains `honeyCount` atomically via `db.transaction()` — it IS the authoritative total |
| Invite panel | Rebuild invite UI in leaderboard | Import existing `<InvitePanel>` unchanged | D-03 says move it, not rebuild it |
| Crown/emoji rendering | Custom SVG icon | Plain emoji strings (👑 🍯 🐝) + `aria-label` | User explicitly chose emojis (D-06, D-07); lucide `Crown` icon already in `role-badge.tsx` but emojis are the display choice here |

**Key insight:** This phase is pure presentation transformation. Every hard problem (data storage, mutation, cache invalidation) was solved in prior phases. The leaderboard is a read-only view of existing data.

---

## Common Pitfalls

### Pitfall 1: Mutating the Props Array During Sort

**What goes wrong:** `array.sort()` sorts in-place. If `members` prop is sorted directly, it mutates the array reference passed from the parent — can cause subtle React rendering bugs.

**Why it happens:** JavaScript's `Array.prototype.sort()` is destructive.

**How to avoid:** Always spread before sorting: `const sorted = [...members].sort(...)`.

**Warning signs:** Members appear in wrong order intermittently, or parent component re-renders with reordered data.

---

### Pitfall 2: All-Zero State Handling

**What goes wrong:** Rendering an empty-state message ONLY when `members.length === 0`, missing the case where members exist but all have `honeyCount === 0`.

**Why it happens:** Conflating "no members" with "no honeys earned".

**How to avoid:** D-10 is explicit — check `members.every(m => m.honeyCount === 0)` as a separate flag. Show all members at rank 1 with the nudge message below the list (not instead of it).

**Warning signs:** Fresh Hives show no members or show members with no empty-state prompt.

---

### Pitfall 3: Rank Number Off-By-One

**What goes wrong:** Using `i + 1` for rank without accounting for ties, yielding 1, 2, 3 even when scores are tied.

**Why it happens:** Natural array index → rank mapping doesn't handle ties.

**How to avoid:** Use the algorithm in Pattern 1 above. Carry forward the rank variable, only incrementing when `honeyCount` changes.

**Warning signs:** Two members with the same score show different rank numbers.

---

### Pitfall 4: Crown Emoji Accessibility

**What goes wrong:** Screen readers announce "👑" as "crown emoji" or "Crown" with no rank context.

**Why it happens:** Emoji has no native ARIA semantics.

**How to avoid:** UI-SPEC requires `aria-label="Rank 1"` on the rank-1 indicator span (or visually-hidden text beside `aria-hidden="true"` emoji).

---

## Code Examples

Verified patterns from existing codebase (HIGH confidence — read directly from source):

### Existing MemberList Props (interface to match in Leaderboard)
```typescript
// src/components/hive/member-list.tsx — current interface
interface Member {
  id: string
  name: string
  role: "queen" | "bee"
  honeyCount: number
}
interface MemberListProps {
  members: Member[]
  isQueen?: boolean
  hiveId?: string
}
```
The `Leaderboard` component should use the same prop shape (make `isQueen` and `hiveId` non-optional since they are always passed from `hive-dashboard.tsx`).

### Row Styling Pattern (from member-list.tsx)
```typescript
// Existing row — adapt for leaderboard
<li className="flex items-center justify-between py-2 px-3 bg-stone-50 rounded border-b border-stone-100">
  <div className="flex items-center gap-2">
    <span className="text-base text-bee">{member.name}</span>
    <RoleBadge role={member.role} />
  </div>
  <span className="text-sm text-stone-500">{member.honeyCount} honeys</span>
</li>
```

### Honey Badge Pattern (from task-card.tsx — amber pill)
```typescript
// UI-SPEC specifies this exact pattern for honey score display
<span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
  {honeyCount} 🍯
</span>
```

### Existing hive-dashboard.tsx Integration Point
```typescript
// Line 65 — current render; swap to <Leaderboard>
<MemberList members={members} isQueen={isQueen} hiveId={hive.id} />
```

### Existing Test Pattern (from tests/task/honeycomb.test.tsx)
```typescript
// @vitest-environment happy-dom   ← required header per Phase 3 decision
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
// ... render component, query by text, assert not null
```
Use happy-dom environment directive on leaderboard tests (same as honeycomb.test.tsx).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router + `getServerSideProps` for data | App Router Server Components — data fetched at render, passed as props | Next.js 13+ | Leaderboard is a Server Component; no `useEffect` + fetch needed |
| Auth.js v5 beta | Better Auth 1.5.6 | Phase 1 (Sep 2025 merger) | No impact on leaderboard — auth is already handled |
| `jsdom` test environment | `happy-dom` for React component tests | Phase 3 decision | Use `// @vitest-environment happy-dom` directive in leaderboard test file |

---

## Open Questions

1. **Delete or keep `member-list.tsx`?**
   - What we know: D-02 says Leaderboard replaces MemberList. CONTEXT.md says "Claude's Discretion" for the transition approach.
   - What's unclear: Whether to delete the file or leave it as dead code.
   - Recommendation: Delete it. There are no other importers. Keeping dead code creates confusion for future phases.

2. **Sort in query or in component?**
   - What we know: `getHiveWithMembers()` does not currently sort by `honeyCount`. The component can sort in memory.
   - What's unclear: Whether to add `ORDER BY honey_count DESC` to the query.
   - Recommendation: Sort in the component (`[...members].sort(...)`) — it's simpler, requires no query change, and is correct at household scale (< 20 members). This avoids touching `hive.ts` queries.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 4 is purely UI/component changes with no external dependencies beyond the running Next.js + PostgreSQL stack already established in Phases 1-3.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.mts` (project root) |
| Quick run command | `npx vitest run tests/hive/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEAD-01 | Members sorted by honeyCount DESC, ties share rank | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | Wave 0 |
| LEAD-01 | Rank 1 renders crown emoji | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | Wave 0 |
| LEAD-01 | Honey counts displayed with 🍯 | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | Wave 0 |
| LEAD-01 | All-zero state shows nudge message | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | Wave 0 |
| LEAD-01 | Single member shown at rank 1 | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/hive/leaderboard.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/hive/leaderboard.test.tsx` — covers all LEAD-01 scenarios above (new directory + file)

*(No existing test infrastructure covers leaderboard — directory `tests/hive/` does not exist yet)*

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `src/components/hive/member-list.tsx`, `hive-dashboard.tsx`, `role-badge.tsx`
- Direct file reads: `src/lib/queries/hive.ts`, `src/db/schema.ts`
- Direct file reads: `tests/task/honeycomb.test.tsx`, `vitest.config.mts`, `package.json`
- Direct file reads: `.planning/phases/04-leaderboard/04-CONTEXT.md`, `04-UI-SPEC.md`
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`

### Secondary (MEDIUM confidence)
- Standard competition ranking algorithm — well-established CS concept, implemented via sort + index tracking
- `Array.prototype.sort()` mutability behavior — documented JavaScript specification

### Tertiary (LOW confidence)
- None — no external sources required for this phase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified present in `package.json`; no new installs required
- Architecture: HIGH — existing component patterns read directly from source; data model confirmed in schema
- Pitfalls: HIGH — pitfalls derived from reading actual code (sort mutability, zero-state edge case, rank algorithm)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable stack; no fast-moving dependencies in this phase)
