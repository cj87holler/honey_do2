# Phase 3: Task System - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Task creation, assignment, status transitions (open → in progress → done), honey accounting (awarding honeys on completion), and the Honeycomb view (personal and Hive-wide task lists). This is the core product loop. Dynamic contextual copy based on task load is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Task Creation UX
- **D-01:** Inline form on the Hive dashboard — always visible to Queens, no modal or dedicated page
- **D-02:** Queens can assign tasks to any Hive member including themselves (supports couples-as-Queens use case)
- **D-03:** 160-character limit with always-visible counter ("42/160"), changes color near limit
- **D-04:** Task text is the only required text field — no title/description split, keep it atomic

### Honeycomb View
- **D-05:** "Your Honeycomb" section on the Hive dashboard showing the current user's assigned tasks
- **D-06:** Queens also see an "All Tasks" section showing every task in the Hive
- **D-07:** Everyone sees all tasks — transparent, builds social accountability
- **D-08:** Completed tasks in a collapsible section below active tasks, collapsed by default with count badge

### Task Lifecycle
- **D-09:** Status transitions: open → in progress → done (three states)
- **D-10:** Only the assignee can change task status (in progress, done) — Queens cannot mark someone else's task
- **D-11:** Done is permanent — no re-opening. Honeys awarded immediately on completion. If something wasn't done, create a new task.
- **D-12:** Queens can delete open or in-progress tasks (no honeys awarded for deleted tasks)

### Honey Value Picker
- **D-13:** Quick-select buttons (5, 10, 20) in a row + a "Custom" button that reveals a number input
- **D-14:** Custom honey values: min 1, max 100. Validated client-side and server-side.

### Honey Accounting
- **D-15:** When a task is marked done, increment the assignee's `honeyCount` in `hiveMembers` — this is the honey ledger for v1
- **D-16:** Honey award is atomic with task completion (same transaction/action)

### Claude's Discretion
- Database schema design for tasks table (columns, indexes, enums)
- Exact layout of the inline task creation form
- Task card/row design in the Honeycomb
- Loading states and empty states
- Delete confirmation UX (if any)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, one-Hive-per-user, two roles only
- `.planning/REQUIREMENTS.md` — TASK-01 through TASK-07 (all seven requirements for this phase)
- `.planning/ROADMAP.md` — Phase 3 success criteria, depends on Phase 2

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-08 (two roles: Queen/Bee), D-09 (Queen can assign to anyone including themselves)
- `.planning/phases/02-invite-flow/02-CONTEXT.md` — Established patterns for server actions, queries, and component structure

### Technology Stack
- `CLAUDE.md` §Technology Stack — Drizzle ORM, react-hook-form + zod for forms, Tailwind CSS

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/button.tsx` — Button with variants (primary, secondary, ghost, outline) for task actions
- `src/components/ui/input.tsx` — Input with label + error display for task text field
- `src/components/hive/role-badge.tsx` — Role badge for showing who's assigned
- `src/components/hive/hive-dashboard.tsx` — Primary integration point; already has placeholder text about assigning tasks
- `src/lib/actions/hive.ts` — `requireQueen()` helper reusable for task creation permission gate

### Established Patterns
- Server actions with `"use server"`, session via `auth.api.getSession({ headers: await headers() })`
- Drizzle queries with joins (e.g., `getHiveWithMembers` pattern)
- react-hook-form + zodResolver for client forms
- `revalidatePath()` for cache busting after mutations
- Inline UI pattern (InlineRename, InvitePanel) — task status buttons can follow this

### Integration Points
- `src/db/schema.ts` — New `tasks` table alongside existing `hives`, `hiveMembers`, `invites`
- `src/components/hive/hive-dashboard.tsx` — Add Honeycomb and task creation sections
- `src/app/(app)/hive/[id]/page.tsx` — Fetch tasks alongside members, pass to dashboard
- `hiveMembers.honeyCount` — Already in schema, increment on task completion

</code_context>

<specifics>
## Specific Ideas

- The task creation form should feel as lightweight as sending a text message — type, pick who, pick how many honeys, send
- "Your Honeycomb" framing makes the personal task list feel like something you own, not something imposed on you
- Quick-select buttons (5/10/20) should cover 90% of use cases — custom is the escape hatch for special tasks
- Done is done, no take-backs — keeps the game fair and simple

</specifics>

<deferred>
## Deferred Ideas

- **Dynamic contextual copy** ("whoa! better get to work!" / "go play golf!") — Phase 5 (THEME-02)
- **Task deadlines / due dates** — v2 (TASK-09)
- **Recurring tasks** — v2 (TASK-08)
- **Task photo proof** — v2 (TASK-10)
- **Activity feed** — v2 (SOCL-01)

</deferred>

---

*Phase: 03-task-system*
*Context gathered: 2026-04-02*
