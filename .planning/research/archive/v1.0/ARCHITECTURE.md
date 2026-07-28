# Architecture Patterns

**Project:** Honey_Do
**Domain:** Gamified household task management (Next.js + PostgreSQL)
**Researched:** 2026-03-26
**Confidence:** HIGH — derived from well-scoped requirements and standard Next.js/PostgreSQL patterns

---

## Recommended Architecture

A server-rendered Next.js monolith with a PostgreSQL database. No microservices. No separate API service. Next.js App Router handles both UI and server-side data access via Server Components and Server Actions. This is the right call for v1: one deploy target, zero inter-service latency, simple mental model.

```
Browser
  └── Next.js (App Router)
        ├── Server Components  ← fetch data server-side, render HTML
        ├── Client Components  ← interactivity (forms, optimistic UI)
        └── Server Actions     ← mutations (create task, complete task, etc.)
              └── Data Layer (Prisma/postgres.js)
                    └── PostgreSQL
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Auth** | Session management, signup/login/logout, invite token validation | Users table, Hive membership |
| **Hive** | Create hive, manage membership, roles (Queen/Bee/QueenBee) | Users, HiveMembers |
| **Invite** | Generate invite link, validate token, assign role on join | Hive, Users, HiveMembers |
| **Task** | Create, assign, update status (open/in-progress/done), honey value | Hive, HiveMembers |
| **Honeycomb** | Assignee's personal task view — active + completed tasks | Task |
| **Leaderboard** | Rank HiveMembers by accumulated honeys within a Hive | Task, HiveMembers |
| **Copy Engine** | Select dynamic text (e.g. "whoa! better get to work!") based on task load | Task |
| **UI Shell** | Navigation, bee-themed layout, honeycomb visual patterns | All page components |

---

## Data Model (PostgreSQL)

### Core Tables

```
users
  id            UUID PK
  email         TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  display_name  TEXT NOT NULL
  created_at    TIMESTAMPTZ DEFAULT now()

hives
  id            UUID PK
  name          TEXT NOT NULL
  created_by    UUID FK → users.id
  created_at    TIMESTAMPTZ DEFAULT now()

hive_members
  id            UUID PK
  hive_id       UUID FK → hives.id
  user_id       UUID FK → users.id
  role          TEXT CHECK (role IN ('queen', 'bee', 'queenbee'))
  honeys        INTEGER DEFAULT 0
  joined_at     TIMESTAMPTZ DEFAULT now()
  UNIQUE (hive_id, user_id)

tasks
  id            UUID PK
  hive_id       UUID FK → hives.id
  created_by    UUID FK → hive_members.id
  assigned_to   UUID FK → hive_members.id
  title         TEXT NOT NULL CHECK (char_length(title) <= 160)
  honey_value   INTEGER NOT NULL CHECK (honey_value > 0)
  status        TEXT CHECK (status IN ('open', 'in_progress', 'done'))
  completed_at  TIMESTAMPTZ
  created_at    TIMESTAMPTZ DEFAULT now()

invite_tokens
  id            UUID PK
  hive_id       UUID FK → hives.id
  token         TEXT UNIQUE NOT NULL
  role          TEXT CHECK (role IN ('bee', 'queenbee'))
  created_by    UUID FK → hive_members.id
  expires_at    TIMESTAMPTZ
  used_at       TIMESTAMPTZ
  used_by       UUID FK → users.id
  created_at    TIMESTAMPTZ DEFAULT now()
```

### Key Design Decisions

- `honeys` is a denormalized counter on `hive_members`. When a task transitions to `done`, increment the assignee's `honeys` in the same transaction. This avoids an expensive SUM query on every leaderboard render.
- `honey_value` is a plain integer — UI constrains the preset options (5, 10, 20) and a free-entry custom path. The DB just stores the number.
- Invite tokens are single-use and can optionally expire. After use, `used_at` and `used_by` are set.
- Tasks belong to a Hive, not a User — this supports the social/competitive layer.

---

## Data Flow

### Task Creation (Queen creates a task for a Bee)

```
Browser (Queen)
  → Server Action: createTask({ hiveId, assignedTo, title, honeyValue })
      → Verify caller is Queen or QueenBee in this Hive
      → INSERT into tasks (status = 'open')
      → Return updated task list
  → Server Component re-renders Honeycomb for assignee on next load
```

### Task Completion (Bee marks task done)

```
Browser (Bee)
  → Server Action: completeTask({ taskId })
      → Verify caller is the assigned Bee in this Hive
      → UPDATE tasks SET status='done', completed_at=now()
      → UPDATE hive_members SET honeys = honeys + task.honey_value
         (same transaction)
      → Return updated task + leaderboard
  → Leaderboard Server Component re-renders on next request
```

### Hive Creation + Invite Flow

```
Browser (new Queen)
  → Server Action: createHive({ name })
      → INSERT hive
      → INSERT hive_members (role='queen', user=caller)
      → Return hiveId

  → Server Action: createInviteLink({ hiveId, role })
      → Verify caller is Queen in this Hive
      → INSERT invite_tokens (random token, optional expiry)
      → Return /join/[token] URL

Browser (new Bee follows link)
  → GET /join/[token]
      → Lookup invite_tokens, verify unused/unexpired
      → If not logged in → redirect to signup with token preserved
      → After auth → INSERT hive_members (role from token)
      → Mark token used
      → Redirect to /hive/[hiveId]
```

### Leaderboard

```
Browser
  → Server Component: LeaderboardPanel
      → SELECT hive_members WHERE hive_id = ? ORDER BY honeys DESC
         (single indexed query, no aggregation needed — honeys is denormalized)
      → Render ranked list with Bee names + honey counts
```

### Copy Engine (Playful Dynamic Text)

```
Server Component: HoneycombPage
  → Count open tasks assigned to the current user
  → Select copy variant:
      0 tasks  → "go play golf!"
      1-3      → "looking good, keep it up!"
      4-6      → "getting busy in here..."
      7+       → "whoa! better get to work!"
  → Render in UI
```

This is pure server-side logic — no client state needed, no API call.

---

## Next.js App Router Structure

```
app/
  (auth)/
    login/page.tsx
    signup/page.tsx
  (app)/
    layout.tsx                ← authenticated shell, nav, bee theme
    hive/
      [hiveId]/
        page.tsx              ← Hive home (task board + leaderboard)
        honeycomb/page.tsx    ← Assignee's personal task view
        members/page.tsx      ← Manage members/roles (Queen only)
        settings/page.tsx     ← Hive name, invite link (Queen only)
  join/
    [token]/page.tsx          ← Invite acceptance flow
  api/
    (none needed for v1)      ← Server Actions replace REST endpoints
actions/
  tasks.ts      ← createTask, updateTaskStatus, completeTask
  hive.ts       ← createHive, updateHiveName
  auth.ts       ← login, signup, logout
  invite.ts     ← createInviteLink, acceptInvite
lib/
  db.ts         ← database client (postgres.js or Prisma)
  auth.ts       ← session helpers (iron-session or next-auth)
  roles.ts      ← role-based guard utilities
```

No separate `/api/` routes. Server Actions handle all mutations. Server Components handle all reads. This keeps the codebase simple and co-located.

---

## Patterns to Follow

### Pattern 1: Server Actions for All Mutations

**What:** Use Next.js Server Actions (`"use server"`) for every write operation. No REST API layer.

**Why:** Eliminates the client → API → server roundtrip. Auth context is naturally available server-side. Less boilerplate than building REST endpoints.

**Example:**
```typescript
// actions/tasks.ts
"use server"

export async function completeTask(taskId: string) {
  const session = await getSession()
  if (!session) redirect("/login")

  await db.transaction(async (tx) => {
    const task = await tx.query.tasks.findFirst({ where: eq(tasks.id, taskId) })
    if (task.assigned_to !== session.hiveMemberId) throw new Error("Forbidden")
    await tx.update(tasks).set({ status: "done", completed_at: new Date() }).where(eq(tasks.id, taskId))
    await tx.update(hiveMembers).set({ honeys: sql`honeys + ${task.honey_value}` }).where(eq(hiveMembers.id, task.assigned_to))
  })

  revalidatePath(`/hive/${task.hive_id}`)
}
```

### Pattern 2: Denormalized Honey Counter

**What:** Keep a running `honeys` total on `hive_members` updated transactionally when tasks complete.

**Why:** Leaderboard queries stay fast (simple ORDER BY, no aggregation). The counter is the source of truth.

**Rule:** Always update `honeys` in the same transaction as task completion. Never update them separately.

### Pattern 3: Role Guards as Server-Side Middleware

**What:** Check role before every Server Action that requires Queen/QueenBee privileges.

```typescript
// lib/roles.ts
export async function requireRole(hiveId: string, roles: Role[]) {
  const session = await getSession()
  const member = await getMember(session.userId, hiveId)
  if (!roles.includes(member.role)) throw new Error("Forbidden")
  return member
}
```

**Why:** Client-side role checks are UI hints only. Authorization must happen server-side.

### Pattern 4: Invite Token as One-Time Stateful URL

**What:** Tokens are stored in DB with `used_at`/`used_by`. The `/join/[token]` route validates before acting.

**Why:** Simple, auditable, no magic. Token survives auth redirect by being in the URL.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Leaderboard via SUM Aggregation on Every Request

**What:** SELECT SUM(honey_value) FROM tasks WHERE assigned_to = ? AND status = 'done' for each member.

**Why bad:** Becomes slow as task history grows. Requires scanning all completed tasks on every leaderboard render.

**Instead:** Denormalized `honeys` counter on `hive_members`, updated transactionally at completion.

### Anti-Pattern 2: Client-Side Role Checks as Security

**What:** Hiding Queen-only UI with `if (user.role === 'queen')` in client components and skipping server-side verification.

**Why bad:** Any user can call a Server Action directly. Client checks are UX only.

**Instead:** `requireRole()` guard at the top of every privileged Server Action.

### Anti-Pattern 3: Separate API Layer

**What:** Building `/api/tasks`, `/api/hive`, etc. as REST endpoints the client calls with fetch.

**Why bad:** Doubles the surface area. Server Actions handle auth context automatically. REST API adds no value for a monolithic Next.js app.

**Instead:** Server Actions for mutations, Server Components for reads.

### Anti-Pattern 4: Real-Time for v1

**What:** WebSockets or polling for live leaderboard/task updates.

**Why bad:** Out of scope, adds significant infrastructure complexity, not needed for household scale.

**Instead:** Standard request/response. Page refreshes and Server Action `revalidatePath()` calls are sufficient.

---

## Build Order (Component Dependencies)

Build in this order — each layer depends on the one before it.

```
1. Database schema + migrations
   └── All other layers depend on this

2. Auth (signup/login/session)
   └── Required before any protected route or Server Action

3. Hive creation + membership
   └── Users, Hives, HiveMembers tables
   └── Role model established here

4. Invite flow
   └── Requires Hive + Auth
   └── Enables multi-user testing

5. Task CRUD (create, assign, update status)
   └── Requires Hive + HiveMembers
   └── Core product loop

6. Task completion + honey accounting
   └── Requires Tasks + HiveMembers.honeys counter
   └── Gamification layer

7. Honeycomb (personal task view)
   └── Requires Tasks with filter by assignee

8. Leaderboard
   └── Requires HiveMembers.honeys (denormalized counter)

9. Copy Engine (dynamic text)
   └── Requires Task counts per user
   └── Pure logic layer, no new data dependencies

10. Bee theme / UI polish
    └── Applied across all pages after core function works
```

---

## Scalability Considerations

| Concern | At 10 households | At 1K households | At 100K households |
|---------|-----------------|-----------------|-------------------|
| Leaderboard queries | Fast, table is tiny | Fast, indexed by hive_id | Still fast with index on (hive_id, honeys DESC) |
| Task history | Negligible | Small | Add pagination to completed task views |
| Auth sessions | Lightweight (iron-session/JWT) | No change | No change |
| Database | Single Postgres instance is fine | Single instance fine | Read replica if needed |
| Invite tokens | Cleanup job nice-to-have | Add cleanup cron | Required |

For v1 serving households (10-50 users per hive, tens of hives), a single Postgres instance and a single Next.js deploy (Vercel or Railway) handles load comfortably. No premature optimization needed.

---

## Sources

- Next.js App Router architecture: https://nextjs.org/docs/app (HIGH confidence)
- Server Actions pattern: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations (HIGH confidence)
- Denormalized counter pattern for leaderboards: standard relational DB design, HIGH confidence
- Invite token pattern: standard web auth pattern, HIGH confidence
- Project requirements: `.planning/PROJECT.md` (HIGH confidence — primary source)
