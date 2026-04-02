# Phase 3: Task System - Research

**Researched:** 2026-04-01
**Domain:** Task lifecycle, status transitions, honey accounting, Honeycomb view
**Confidence:** HIGH (grounded entirely in existing codebase — no new dependencies)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Inline form on the Hive dashboard — always visible to Queens, no modal or dedicated page
- **D-02:** Queens can assign tasks to any Hive member including themselves (supports couples-as-Queens use case)
- **D-03:** 160-character limit with always-visible counter ("42/160"), changes color near limit
- **D-04:** Task text is the only required text field — no title/description split, keep it atomic
- **D-05:** "Your Honeycomb" section on the Hive dashboard showing the current user's assigned tasks
- **D-06:** Queens also see an "All Tasks" section showing every task in the Hive
- **D-07:** Everyone sees all tasks — transparent, builds social accountability
- **D-08:** Completed tasks in a collapsible section below active tasks, collapsed by default with count badge
- **D-09:** Status transitions: open → in progress → done (three states, sequential)
- **D-10:** Only the assignee can change task status (in progress, done) — Queens cannot mark someone else's task
- **D-11:** Done is permanent — no re-opening. Honeys awarded immediately on completion. If something wasn't done, create a new task.
- **D-12:** Queens can delete open or in-progress tasks (no honeys awarded for deleted tasks)
- **D-13:** Quick-select buttons (5, 10, 20) in a row + a "Custom" button that reveals a number input
- **D-14:** Custom honey values: min 1, max 100. Validated client-side and server-side.
- **D-15:** When a task is marked done, increment the assignee's `honeyCount` in `hiveMembers` — this is the honey ledger for v1
- **D-16:** Honey award is atomic with task completion (same transaction/action)

### Claude's Discretion

- Database schema design for tasks table (columns, indexes, enums)
- Exact layout of the inline task creation form
- Task card/row design in the Honeycomb
- Loading states and empty states
- Delete confirmation UX (if any)

### Deferred Ideas (OUT OF SCOPE)

- Dynamic contextual copy ("whoa! better get to work!" / "go play golf!") — Phase 5 (THEME-02)
- Task deadlines / due dates — v2 (TASK-09)
- Recurring tasks — v2 (TASK-08)
- Task photo proof — v2 (TASK-10)
- Activity feed — v2 (SOCL-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TASK-01 | Queen or QueenBee can create a task with text (160-char limit) | `requireQueen` helper + `createTask` server action, zod validation schema |
| TASK-02 | Task must be assigned a honey value (5, 10, 20, or custom number) | Honey picker component pattern, zod min(1)/max(100) validation |
| TASK-03 | Task must be assigned to a Bee or QueenBee | Assignee dropdown from hive members list — any member is a valid assignee |
| TASK-04 | Assigned tasks appear on the assignee's Honeycomb (personal to-do list) | `getTasksForHive` query filtered by `assigneeId + status != done` |
| TASK-05 | Assignee can mark a task "in progress" | `updateTaskStatus` server action with assignee-only guard, open → in_progress |
| TASK-06 | Assignee can mark a task "done" and earn the honey value | `completeTask` server action with Drizzle `db.transaction()` for atomic honey award |
| TASK-07 | Completed tasks are visible in a separate completed area | Collapsible "Completed" section below active tasks, filtered by `status = done` |
</phase_requirements>

---

## Summary

Phase 3 delivers the core product loop: a Queen creates and assigns a task with a honey value, the assignee works through their Honeycomb, and completing the task atomically awards honeys. The phase is a direct extension of the Phase 1/2 patterns — same server action structure, same Drizzle query patterns, same react-hook-form + zod forms. No new npm packages are required.

The most important correctness concern is the honey accounting transaction (D-16). The `completeTask` action must update `task.status` to `done` AND increment `hiveMembers.honeyCount` in a single Drizzle transaction. If these are two separate queries and one fails, the ledger becomes inconsistent. This is the Phase 3 equivalent of the atomic token consumption pattern from Phase 2.

The second key design decision is the role model. "QueenBee" is NOT a separate database role — the `roleEnum` only has `["queen", "bee"]`. QueenBee is a behavioral concept: a Queen who assigns tasks to themselves. Task creation permission is `role === "queen"` only (reusing `requireQueen`). Task completion permission is `assigneeId === currentUserId` (a new `requireAssignee` helper). This means the existing schema does not change — only the `tasks` table is new.

Status transitions are strictly sequential per D-09: `open` → `in_progress` → `done`. The `updateTaskStatus` server action must enforce this — no skipping from `open` to `done` directly. This is a server-side invariant, not just UI.

**Primary recommendation:** Split into two plans — (1) tasks schema + server actions + queries + unit tests, (2) Honeycomb UI + task creation form + status buttons integration.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.45.2 | `tasks` table schema + queries | Established pattern — `hives`, `hiveMembers`, `invites` all use this |
| `drizzle-kit` | 0.31.10 | Schema migration | `drizzle-kit generate && drizzle-kit migrate` for new `tasks` table and `task_status` enum |
| `zod` | 4.3.6 | Server action + form validation | Already used; validate task text (max 160), honey value (min 1, max 100) |
| `react-hook-form` | 7.72.0 | Task creation form state | Established pattern for multi-field forms (text, assignee, honey value) |
| `@hookform/resolvers` | 5.2.2 | zodResolver for form validation | Already installed, used in signup/login forms |
| `better-auth` | 1.5.6 | Session reads in server actions | `auth.api.getSession({ headers: await headers() })` established everywhere |

**No new packages needed.** All required dependencies are present.

**Verified versions via package.json — no installs required.**

---

## Architecture Patterns

### Recommended Project Structure

New files this phase adds:

```
src/
├── db/
│   └── schema.ts                          # Add: tasks table, taskStatusEnum, relations
├── lib/
│   ├── actions/
│   │   └── task.ts                        # New: createTask, updateTaskStatus, completeTask, deleteTask
│   └── queries/
│       └── task.ts                        # New: getTasksForHive, getTaskById
├── components/
│   └── tasks/
│       ├── task-creation-form.tsx         # New: inline form (client) — text, assignee, honey picker
│       ├── honey-picker.tsx               # New: 5/10/20 quick-select + custom input (client)
│       ├── honeycomb.tsx                  # New: "Your Honeycomb" section (client) — active + completed
│       ├── task-card.tsx                  # New: single task row with status buttons (client)
│       └── all-tasks.tsx                  # New: Queen's full Hive task view (client)
└── app/
    └── (app)/hive/[id]/
        └── page.tsx                       # Modify: fetch tasks alongside members, pass to dashboard
```

Also modify:
- `src/components/hive/hive-dashboard.tsx` — add `TaskCreationForm`, `Honeycomb`, `AllTasks` sections
- `src/db/schema.ts` — new `taskStatusEnum` and `tasks` table

---

### Pattern 1: Tasks Table Schema

**What:** New `tasks` table with a `taskStatusEnum`. Follow the existing table patterns exactly — `text` primary key, `crypto.randomUUID()`, `timestamp` fields.

**Critical design note:** "QueenBee" is NOT a third value in `roleEnum`. The existing enum stays `["queen", "bee"]`. Queens assign to themselves = same schema.

```typescript
// Source: existing schema.ts pattern
export const taskStatusEnum = pgEnum("task_status", ["open", "in_progress", "done"])

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hiveId: text("hive_id").notNull().references(() => hives.id),
  assigneeId: text("assignee_id").notNull().references(() => hiveMembers.id),
  createdBy: text("created_by").notNull().references(() => user.id),
  text: varchar("text", { length: 160 }).notNull(),
  honeyValue: integer("honey_value").notNull(),
  status: taskStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("tasks_hive_idx").on(table.hiveId),
  index("tasks_assignee_status_idx").on(table.assigneeId, table.status),
])
```

**Index rationale:**
- `tasks_hive_idx` — used by Queens' "All Tasks" view (filter by `hiveId`)
- `tasks_assignee_status_idx` — used by "Your Honeycomb" view (filter by `assigneeId` + `status`)

**`assigneeId` references `hiveMembers.id`** (not `user.id`). This is the correct FK because a member's identity within a Hive is their `hiveMembers` row, not just their user ID.

**Relations to add:**

```typescript
export const tasksRelations = relations(tasks, ({ one }) => ({
  hive: one(hives, { fields: [tasks.hiveId], references: [hives.id] }),
  assignee: one(hiveMembers, { fields: [tasks.assigneeId], references: [hiveMembers.id] }),
  creator: one(user, { fields: [tasks.createdBy], references: [user.id] }),
}))
```

Also add `tasks: many(tasks)` to `hivesRelations` and `hiveMembersRelations`.

---

### Pattern 2: Task Server Actions

**File:** `src/lib/actions/task.ts`

**What:** Four server actions covering the full task lifecycle. Follow the established `"use server"` + session pattern from `hive.ts` and `invite.ts`.

**New helper — `requireAssignee`:** There is no existing helper for checking "is the current user the assignee?" Create one alongside the task actions:

```typescript
// Source: follows requireQueen pattern in src/lib/actions/hive.ts
async function requireAssignee(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })
  if (!task) throw new Error("Task not found")

  // Check current user is the assignee via hiveMembers
  const member = await db.query.hiveMembers.findFirst({
    where: and(
      eq(hiveMembers.id, task.assigneeId),
      eq(hiveMembers.userId, session.user.id)
    ),
  })
  if (!member) throw new Error("Forbidden — only the assignee can change task status")

  return { session, task, member }
}
```

**`createTask` — Queen only, validates text + honey value:**

```typescript
export async function createTask(hiveId: string, formData: FormData) {
  const { session } = await requireQueen(hiveId)  // reuse existing helper

  const text = (formData.get("text") as string | null)?.trim() ?? ""
  const honeyValue = Number(formData.get("honeyValue"))
  const assigneeId = (formData.get("assigneeId") as string | null) ?? ""

  if (!text || text.length > 160) throw new Error("Task text must be 1–160 characters.")
  if (!Number.isInteger(honeyValue) || honeyValue < 1 || honeyValue > 100) {
    throw new Error("Honey value must be between 1 and 100.")
  }
  if (!assigneeId) throw new Error("Assign the task to someone.")

  await db.insert(tasks).values({
    hiveId,
    assigneeId,
    createdBy: session.user.id,
    text,
    honeyValue,
  })

  revalidatePath(`/hive/${hiveId}`)
}
```

**`updateTaskStatus` — assignee only, enforces sequential transitions:**

```typescript
export async function updateTaskStatus(taskId: string, newStatus: "in_progress" | "done") {
  const { task, member } = await requireAssignee(taskId)

  // Enforce sequential transitions: open → in_progress → done
  const validTransitions: Record<string, string> = {
    open: "in_progress",
    in_progress: "done",
  }
  if (validTransitions[task.status] !== newStatus) {
    throw new Error("Invalid status transition.")
  }

  if (newStatus === "done") {
    // D-16: atomic honey award
    await db.transaction(async (tx) => {
      await tx.update(tasks)
        .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, taskId))

      await tx.update(hiveMembers)
        .set({ honeyCount: sql`${hiveMembers.honeyCount} + ${task.honeyValue}` })
        .where(eq(hiveMembers.id, task.assigneeId))
    })
  } else {
    await db.update(tasks)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
  }

  revalidatePath(`/hive/${task.hiveId}`)
}
```

**`deleteTask` — Queen only, open or in-progress tasks only:**

```typescript
export async function deleteTask(taskId: string) {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) })
  if (!task) throw new Error("Task not found")

  await requireQueen(task.hiveId)  // throws if not queen

  if (task.status === "done") throw new Error("Completed tasks cannot be deleted.")

  await db.delete(tasks).where(eq(tasks.id, taskId))
  revalidatePath(`/hive/${task.hiveId}`)
}
```

---

### Pattern 3: Task Queries

**File:** `src/lib/queries/task.ts`

**`getTasksForHive`** — returns all tasks with assignee name. Two query patterns:

```typescript
// Source: follows getHiveWithMembers join pattern in src/lib/queries/hive.ts
export async function getTasksForHive(hiveId: string) {
  return db
    .select({
      id: tasks.id,
      text: tasks.text,
      honeyValue: tasks.honeyValue,
      status: tasks.status,
      assigneeId: tasks.assigneeId,
      assigneeName: user.name,
      createdAt: tasks.createdAt,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .innerJoin(hiveMembers, eq(tasks.assigneeId, hiveMembers.id))
    .innerJoin(user, eq(hiveMembers.userId, user.id))
    .where(eq(tasks.hiveId, hiveId))
    .orderBy(tasks.createdAt)
}
```

The Hive page fetches this once and passes data to both `Honeycomb` (filter by current user's `assigneeId`) and `AllTasks` (all tasks unfiltered).

---

### Pattern 4: Drizzle Transaction for Atomic Honey Award

**What:** D-16 requires task completion and honey increment to be atomic. Use `db.transaction()`.

```typescript
// Source: Drizzle ORM transaction pattern
// sql import: import { sql } from "drizzle-orm"

await db.transaction(async (tx) => {
  await tx.update(tasks)
    .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, taskId))

  await tx.update(hiveMembers)
    .set({ honeyCount: sql`${hiveMembers.honeyCount} + ${task.honeyValue}` })
    .where(eq(hiveMembers.id, task.assigneeId))
})
```

**Why `sql` template for increment:** Drizzle's `set({ honeyCount: member.honeyCount + task.honeyValue })` requires reading the value first. The `sql` expression (`honey_count + $value`) is a single atomic SQL operation and avoids a read in the transaction.

---

### Pattern 5: Honey Picker Component

**What:** Client component with quick-select buttons (5/10/20) + "Custom" toggle that reveals a number input. Follows react-hook-form `Controller` pattern.

**D-13 + D-14 constraints:**
- Three quick-select buttons: 5, 10, 20
- "Custom" button reveals `<input type="number" min="1" max="100" />`
- Client-side validation via zod schema; server-side re-validation in `createTask`

```typescript
// Pattern: controlled via react-hook-form Controller
const QUICK_VALUES = [5, 10, 20] as const

function HoneyPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [isCustom, setIsCustom] = useState(false)

  const handleQuick = (v: number) => {
    setIsCustom(false)
    onChange(v)
  }

  const handleCustomToggle = () => {
    setIsCustom(true)
    onChange(1)  // reset to valid custom minimum
  }

  return (
    <div className="flex gap-2">
      {QUICK_VALUES.map((v) => (
        <Button
          key={v}
          type="button"
          variant={value === v && !isCustom ? "primary" : "secondary"}
          size="sm"
          onClick={() => handleQuick(v)}
        >
          {v}
        </Button>
      ))}
      <Button
        type="button"
        variant={isCustom ? "primary" : "secondary"}
        size="sm"
        onClick={handleCustomToggle}
      >
        Custom
      </Button>
      {isCustom && (
        <input
          type="number"
          min={1}
          max={100}
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 h-8 rounded-md border border-stone-300 px-2 text-sm"
        />
      )}
    </div>
  )
}
```

---

### Pattern 6: Task Creation Form (Inline, Client Component)

**What:** Inline form on the Hive dashboard (D-01), always visible to Queens. Uses react-hook-form + zod. Follows `InvitePanel`/`InlineRename` client component pattern.

```typescript
// Zod schema
const createTaskSchema = z.object({
  text: z.string().min(1, "Task text is required.").max(160, "Maximum 160 characters."),
  honeyValue: z.number().int().min(1).max(100),
  assigneeId: z.string().min(1, "Assign this task to someone."),
})
```

Character counter: `watch("text").length` from react-hook-form. Color change near limit: apply `text-red-600` when `>= 140 chars`.

---

### Pattern 7: Honeycomb View (Client Component)

**What:** Active tasks for the current user + collapsible completed section. Receives task data as props (fetched server-side in the Hive page).

**Split logic:** The Hive page fetches all tasks once (`getTasksForHive`). HiveDashboard passes the full array. Client components filter:
- `Honeycomb` component: filters where `assigneeId === currentMemberId` (need `currentMemberId` from the members list)
- `AllTasks` component (Queen-only, D-06): shows all tasks, no filter

**Collapsible completed section (D-08):**

```typescript
const [completedOpen, setCompletedOpen] = useState(false)
const activeTasks = tasks.filter(t => t.status !== "done")
const completedTasks = tasks.filter(t => t.status === "done")

return (
  <section>
    {/* active tasks */}
    {activeTasks.map(task => <TaskCard key={task.id} task={task} ... />)}

    {/* collapsible completed */}
    <button onClick={() => setCompletedOpen(v => !v)}>
      Completed ({completedTasks.length})
    </button>
    {completedOpen && completedTasks.map(task => <TaskCard key={task.id} task={task} ... />)}
  </section>
)
```

---

### Pattern 8: HiveDashboard and Page Integration

**What:** `hive/[id]/page.tsx` currently fetches only `getHiveWithMembers`. It must also fetch tasks and pass them to `HiveDashboard`.

**Updated page.tsx:**

```typescript
// Add alongside getHiveWithMembers:
const tasks = await getTasksForHive(id)

// Pass to HiveDashboard:
<HiveDashboard hive={hive} members={members} tasks={tasks} currentUserId={session.user.id} />
```

**HiveDashboard needs to derive `currentMemberId`** (the `hiveMembers.id`, not `user.id`) for filtering tasks in the Honeycomb view. This is available from `members.find(m => m.userId === currentUserId)?.id`.

---

### Anti-Patterns to Avoid

- **Non-atomic honey award:** Never do `update tasks; update hiveMembers` as two separate awaited statements. Use `db.transaction()`. If the second update fails, the task is marked done but no honeys are awarded — inconsistent ledger.
- **Skipping status transitions:** Never allow `open → done` directly. Validate on the server that the transition is `validTransitions[task.status] === newStatus`.
- **Using `user.id` as assignee FK in tasks:** The tasks table points to `hiveMembers.id`, not `user.id`. A user can be in multiple Hives (future-proofing for Colonies). Always resolve `memberId` from the members list.
- **Incrementing honeyCount with read-modify-write:** Don't read `member.honeyCount`, add to it, then write back. Use `sql\`${hiveMembers.honeyCount} + ${value}\`` to avoid lost-update race conditions.
- **Allowing Queens to complete others' tasks:** D-10 is explicit. Only the assignee can move to `in_progress` or `done`. The server enforces this via `requireAssignee`.
- **Putting task state in client-only state:** Don't manage the full task list in `useState`. Tasks are server-fetched and `revalidatePath()` triggers refetch after mutations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic honey increment | Read + add + write in app code | `sql\`honey_count + ${value}\`` in Drizzle transaction | Prevents lost-update race condition from concurrent requests |
| Sequential state machine | Custom transition validation | Explicit `validTransitions` object + server throw | Ensures invariant is enforced at DB boundary, not just UI |
| Character counter | Custom char-count component | `watch("text").length` from react-hook-form | Already counting for validation; display the same value |
| Task ID generation | `nanoid` or custom | `crypto.randomUUID()` via `$defaultFn` | Established pattern in this codebase (hives, hiveMembers, invites) |
| Permission helpers | Ad-hoc session checks | `requireQueen` (existing) + new `requireAssignee` | Consistent auth guard pattern, readable intent |

**Key insight:** The honey ledger is the financial-grade correctness requirement for this phase. Everything else is CRUD — the transaction is where cutting corners causes lasting data inconsistency.

---

## Common Pitfalls

### Pitfall 1: Non-Atomic Task Completion

**What goes wrong:** Task is marked `done` but `honeyCount` increment is a separate query that times out or errors. The task is complete but the honey was never awarded.

**Why it happens:** Two `await db.update(...)` calls in sequence without wrapping in `db.transaction()`.

**How to avoid:** Always use `db.transaction(async (tx) => { ... })` for the `completeTask` action. Both updates succeed or both roll back.

**Warning signs:** Users report completing tasks but honey count not increasing. Honeycomb shows task as done but leaderboard doesn't change.

---

### Pitfall 2: Skipping Status Transition Enforcement on Server

**What goes wrong:** Client UI correctly shows only valid next actions, but the server action doesn't re-validate. A direct API call or a future UI bug allows `open → done` in one step, bypassing the `in_progress` state.

**Why it happens:** Trusting the client to only send valid status values.

**How to avoid:** Server action validates transition: `if (validTransitions[task.status] !== newStatus) throw new Error(...)`.

**Warning signs:** Tasks appearing in completed state without showing in the "in progress" section.

---

### Pitfall 3: Confusing `hiveMembers.id` with `user.id` for Assignee

**What goes wrong:** Task creation form sends `userId` as the assignee identifier, but the tasks table FK points to `hiveMembers.id`. The insert fails with a FK violation.

**Why it happens:** The member list components expose both `userId` and `id` (member record id) — easy to grab the wrong one.

**How to avoid:** The assignee select must use `hiveMembers.id` as the option value. In `getHiveWithMembers`, this is already returned as `id` in the members array. Pass `member.id` (not `member.userId`) as the form value.

**Warning signs:** FK constraint errors on `tasks.assignee_id` during task creation.

---

### Pitfall 4: QueenBee as a Third Role

**What goes wrong:** Planner or implementor tries to add `"queenbee"` to `roleEnum`, add a migration, and update permission checks throughout.

**Why it happens:** REQUIREMENTS.md and CONTEXT.md use "QueenBee" as a concept. The database has no such enum value.

**How to avoid:** "QueenBee" = a Queen who assigns tasks to themselves (D-02). The `roleEnum` stays `["queen", "bee"]`. `requireQueen` covers task creation for all queens, including self-assignment. No schema change to the role enum.

**Warning signs:** Unnecessary migration adding a third role value; permission checks becoming more complex.

---

### Pitfall 5: Fetching Tasks Multiple Times on the Hive Page

**What goes wrong:** `Honeycomb` and `AllTasks` components each trigger their own data fetch, causing N+1 server requests and stale data between them.

**Why it happens:** Each component independently calls a query function from the server component context.

**How to avoid:** Fetch tasks once in `hive/[id]/page.tsx` and pass the array as props. Both `Honeycomb` and `AllTasks` filter from the same array client-side.

**Warning signs:** Double database queries on every Hive page load; tasks count discrepancy between sections.

---

### Pitfall 6: Missing `currentMemberId` for Honeycomb Filtering

**What goes wrong:** The `Honeycomb` component can't filter tasks for the current user because it only has `currentUserId` (user table ID) but tasks use `assigneeId` (hiveMembers table ID).

**Why it happens:** The page currently passes `currentUserId` to `HiveDashboard`. The tasks table references `hiveMembers.id`.

**How to avoid:** In `HiveDashboard`, derive `currentMemberId` via `members.find(m => m.userId === currentUserId)?.id`. Pass `currentMemberId` to the `Honeycomb` component for filtering.

**Warning signs:** Honeycomb shows 0 tasks even when tasks are assigned; "All Tasks" shows tasks correctly but "Your Honeycomb" is empty.

---

## Code Examples

### Drizzle Transaction (Atomic Honey Award)

```typescript
// Source: Drizzle ORM `db.transaction()` pattern — established library API
import { sql } from "drizzle-orm"

await db.transaction(async (tx) => {
  await tx
    .update(tasks)
    .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, taskId))

  await tx
    .update(hiveMembers)
    .set({ honeyCount: sql`${hiveMembers.honeyCount} + ${task.honeyValue}` })
    .where(eq(hiveMembers.id, task.assigneeId))
})
```

### requireQueen Reuse (Task Creation Gate)

```typescript
// Source: src/lib/actions/hive.ts — reuse as-is
export async function createTask(hiveId: string, formData: FormData) {
  const { session } = await requireQueen(hiveId)  // queen check + session
  // ... create task with session.user.id as createdBy
}
```

### Existing revalidatePath Pattern

```typescript
// Source: src/lib/actions/invite.ts — established pattern
revalidatePath(`/hive/${hiveId}`)
```

### Drizzle Relational Query with Joins (for Tasks)

```typescript
// Source: follows src/lib/queries/hive.ts pattern
.from(tasks)
.innerJoin(hiveMembers, eq(tasks.assigneeId, hiveMembers.id))
.innerJoin(user, eq(hiveMembers.userId, user.id))
.where(eq(tasks.hiveId, hiveId))
```

### Sequential Status Transition Enforcement

```typescript
// Source: application logic — no library needed
const validTransitions: Record<string, string> = {
  open: "in_progress",
  in_progress: "done",
}
if (validTransitions[task.status] !== newStatus) {
  throw new Error("Invalid status transition.")
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auth.js v5 (beta) | Better Auth 1.5.6 | Phase 1 (Sep 2025) | Session reads use `auth.api.getSession()` — not NextAuth's `getServerSession()` |
| `uuid` package | `crypto.randomUUID()` via `$defaultFn` | Phase 1 | All IDs use the built-in — same pattern for task IDs |
| Tailwind `tailwind.config.js` | CSS-first config (Tailwind v4) | Phase 1 | No `tailwind.config.js` file — colors are defined in CSS |

**Button variants (from actual `src/components/ui/button.tsx`):**
- `primary` — honey background, white text
- `secondary` — stone-100 background, bee text
- `ghost` — transparent, bee text, hover stone-100

There is NO `outline` variant despite some context docs mentioning it. Do not reference `variant="outline"` in plans.

---

## Open Questions

1. **Status transition strictness (D-09 interpretation)**
   - What we know: D-09 lists `open → in_progress → done`. The success criteria says "Assignee can mark a task 'in progress' and then 'done'."
   - What's unclear: Does the user MUST go through `in_progress` before `done`, or can they skip? "In progress and then done" implies sequential.
   - Recommendation: Treat it as strictly sequential. The server enforces `open → in_progress` and `in_progress → done` as the only valid transitions. If this proves too strict in QA, it's a one-line change to the `validTransitions` map.

2. **Delete confirmation UX (Claude's discretion)**
   - What we know: D-12 says Queens can delete open/in-progress tasks. No confirmation UX specified.
   - What's unclear: Should delete be a single click or require a confirmation step?
   - Recommendation: Single click with a confirmation button pattern (show "Delete?" prompt inline on the task card, confirm within 5 seconds) — consistent with the "this app is a game, not a corporate tool" tone. Or keep it simple with a single-click delete and rely on "Done is permanent" framing. Planner should choose based on scope.

---

## Environment Availability

Step 2.6: SKIPPED — No external dependencies. All required npm packages verified in `package.json`. PostgreSQL connection already established. No new tools, services, or CLIs required for this phase.

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
| TASK-01 | `createTask()` inserts a task row with correct text (max 160 chars) | unit | `npx vitest run tests/task/create-task.test.ts` | Wave 0 |
| TASK-01 | `createTask()` throws if caller is not Queen | unit | `npx vitest run tests/task/create-task.test.ts` | Wave 0 |
| TASK-01 | `createTask()` throws if text is empty or > 160 chars | unit | `npx vitest run tests/task/create-task.test.ts` | Wave 0 |
| TASK-02 | `createTask()` throws if honey value is out of range (< 1 or > 100) | unit | `npx vitest run tests/task/create-task.test.ts` | Wave 0 |
| TASK-02 | `createTask()` accepts 5, 10, 20, and custom values within range | unit | `npx vitest run tests/task/create-task.test.ts` | Wave 0 |
| TASK-03 | `createTask()` stores the correct assigneeId (hiveMembers.id) | unit | `npx vitest run tests/task/create-task.test.ts` | Wave 0 |
| TASK-04 | Honeycomb component renders only current user's tasks | unit | `npx vitest run tests/task/honeycomb.test.tsx` | Wave 0 |
| TASK-05 | `updateTaskStatus()` transitions `open → in_progress` for assignee | unit | `npx vitest run tests/task/update-task-status.test.ts` | Wave 0 |
| TASK-05 | `updateTaskStatus()` throws for non-assignee calling status change | unit | `npx vitest run tests/task/update-task-status.test.ts` | Wave 0 |
| TASK-05 | `updateTaskStatus()` throws for invalid transition (open → done) | unit | `npx vitest run tests/task/update-task-status.test.ts` | Wave 0 |
| TASK-06 | `updateTaskStatus()` transitions `in_progress → done` and increments honeyCount | unit | `npx vitest run tests/task/update-task-status.test.ts` | Wave 0 |
| TASK-06 | honeyCount increment is transactional (both updates or neither) | unit | `npx vitest run tests/task/update-task-status.test.ts` | Wave 0 |
| TASK-07 | Honeycomb component renders completed tasks in a separate section | unit | `npx vitest run tests/task/honeycomb.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/task/create-task.test.ts` — covers TASK-01, TASK-02, TASK-03
- [ ] `tests/task/update-task-status.test.ts` — covers TASK-05, TASK-06 (including transaction behavior)
- [ ] `tests/task/honeycomb.test.tsx` — covers TASK-04, TASK-07 (component rendering, filter correctness)
- [ ] `tests/task/helpers.ts` — shared mock DB fixtures (hive, members, tasks) following `tests/invite/helpers.ts` pattern

---

## Sources

### Primary (HIGH confidence)

- `src/db/schema.ts` — existing table patterns, enum pattern (`roleEnum`), FK pattern
- `src/lib/actions/hive.ts` — `requireQueen` helper, server action structure
- `src/lib/actions/invite.ts` — atomic update + `returning()` pattern, `revalidatePath` usage
- `src/lib/queries/hive.ts` — Drizzle join query pattern, member+user join
- `src/components/hive/hive-dashboard.tsx` — integration point, existing props interface
- `src/components/hive/inline-rename.tsx` — client component state pattern (useState + async save)
- `src/components/invite/invite-panel.tsx` — client component pattern, Button usage, loading state
- `src/components/ui/button.tsx` — exact variants: `primary | secondary | ghost` (no `outline`)
- `src/components/ui/input.tsx` — Input component API
- `src/app/(app)/hive/[id]/page.tsx` — server component structure, params pattern
- `vitest.config.mts` — test environment: jsdom, globals, passWithNoTests
- `package.json` — verified all required packages present, no new installs needed
- `tests/invite/` — established test pattern for this codebase

### Secondary (MEDIUM confidence)

- Drizzle ORM `db.transaction()` API — standard transaction API confirmed by training data (Aug 2025); behavior consistent with the postgres driver already in use
- `sql` template tag from `drizzle-orm` — used for SQL expressions in updates; standard Drizzle pattern

### Tertiary (LOW confidence)

- None flagged.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified directly in `package.json` and existing codebase
- Architecture: HIGH — all patterns are direct derivations of existing working code
- Pitfalls: HIGH — grounded in reading actual schema, actions, and component code
- Transaction pattern: MEDIUM — Drizzle `db.transaction()` confirmed by training data; not directly fetchable in this session but is a standard, well-documented API

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack, 30-day window)
