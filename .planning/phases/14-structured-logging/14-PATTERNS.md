# Phase 14: Structured Logging - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 8 (1 new lib module, 2 new test files [+1 optional helper], 4 modified server-action files, 1 modified/wrapped route handler; `src/middleware.ts` explicitly NOT modified)
**Analogs found:** 8 / 8 (all files have at least a role-match analog in this repo; no "no analog" files this phase)

## Path Alias Configuration

Confirmed in `/Users/cj.holler/Desktop/honey_do2/tsconfig.json` (lines 17-19):
```json
"paths": {
  "@/*": ["./src/*"]
}
```
`vitest.config.mts` additionally loads the `vite-tsconfig-paths` plugin, so `@/lib/...` imports resolve identically in both app code and test files. All new files (`src/lib/logger.ts`, `tests/logger/*.ts`) must use `@/lib/...`-style imports, never relative `../../` paths, matching every existing file read below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/lib/logger.ts` (NEW) | config / singleton module | transform (process-level config, no I/O of its own) | `src/lib/db.ts` | role-match (both are env-driven singleton exports with prod/dev branching) |
| `tests/logger/redaction.test.ts` (NEW) | test | request-response (unit, injected stream) | `tests/task/create-task.test.ts` | role-match (vi.mock + `@vitest-environment node` shape) |
| `tests/logger/config.test.ts` (NEW) | test | transform (config-object assertions, some source-text assertions) | `tests/admin/generate-temp-password.test.ts` | role-match (pure-function/property assertions, no mocks needed) |
| `tests/logger/helpers.ts` (NEW, optional per RESEARCH) | test fixture | — | `tests/task/helpers.ts` / `tests/invite/helpers.ts` | exact (this project's established fixture-file convention) |
| `src/lib/actions/task.ts` (MODIFY) | server action | CRUD | itself (existing file, adding logger calls to existing try/throw shape) | exact |
| `src/lib/actions/invite.ts` (MODIFY) | server action | CRUD | itself; secondary analog `src/lib/actions/admin.ts` for its try/catch pattern | exact |
| `src/lib/actions/admin.ts` (MODIFY) | server action | CRUD | itself (already has the only try/catch block among the four — best error-handling analog) | exact |
| `src/lib/actions/hive.ts` (MODIFY, discretionary — houses `requireQueen`) | server action | CRUD | itself | exact |
| `src/app/api/auth/[...all]/route.ts` (MODIFY, approach TBD) | route handler | request-response | itself (2-line `toNextJsHandler` wrapper — no other route handler in repo has custom logic) | role-match (only other route is `src/app/api/health/route.ts`, thinner still) |
| `src/lib/auth.ts` (MODIFY, if "wire Better Auth's `logger` option" approach chosen) | config module | event-driven (Better Auth internal hook) | `src/lib/db.ts` (env-driven config object literal) | role-match |
| `src/middleware.ts` | route/edge | request-response | N/A — DO NOT MODIFY for this phase (criterion 4) | n/a |

## Pattern Assignments

### `src/lib/logger.ts` (config/singleton module)

**Analog:** `/Users/cj.holler/Desktop/honey_do2/src/lib/db.ts` (full file, 14 lines)

**Full pattern to copy — env-driven singleton export with prod/dev branching:**
```typescript
// src/lib/db.ts (lines 1-13) — this IS the entire file
import { drizzle as drizzleNeonServerless } from "drizzle-orm/neon-serverless"
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import { Pool } from "@neondatabase/serverless"
import postgres from "postgres"
import * as schema from "@/db/schema"

// process.env.VERCEL is set to "1" by Vercel in all deployment contexts.
// Use drizzle-orm/neon-serverless (WebSocket-based) in production so that
// db.transaction() works — the neon-http driver throws on any transaction call.
// Node 22+ and the Vercel runtime both expose a global WebSocket, so no ws polyfill needed.
export const db = process.env.VERCEL
  ? drizzleNeonServerless(new Pool({ connectionString: process.env.DATABASE_URL! }), { schema })
  : drizzlePostgres(postgres(process.env.DATABASE_URL!), { schema })
```

**What to copy from this pattern:**
- **Named export, not default export.** Every shared `src/lib/*.ts` module in this repo (`db.ts` → `export const db`, `auth.ts` → `export const auth`, `admin.ts` → `export function requireAdmin`) uses named exports exclusively. `logger.ts` should follow with `export const logger = ...` (and `export function createLogger(...)` per the RESEARCH.md Wave-0 design dependency for test injectability).
- **Env branching via a ternary/ternary-spread at module scope, computed once at import time**, not per-call — mirrors `db.ts`'s `process.env.VERCEL ? A : B` and matches RESEARCH.md's Pattern 1 (`isProd` computed once, `transport` key conditionally spread in).
- **A short top-of-file comment block explaining *why* the branch exists**, not just what it does (see `db.ts` lines 7-10) — the same style should explain why no `transport` key exists in production (ties to criterion 3 / the locked REQUIREMENTS.md decision), not just restate the code.
- **Direct `process.env.X` access with no wrapper/config-loader abstraction** — same as `db.ts` (`process.env.DATABASE_URL!`) and `admin.ts` (`process.env.ADMIN_EMAILS ?? ""`). Don't introduce a new env-config layer for this phase.

**Secondary analog — env var parsed/cached once at module scope:** `/Users/cj.holler/Desktop/honey_do2/src/lib/admin.ts` (lines 4-18):
```typescript
/**
 * Parse ADMIN_EMAILS env var once per module load.
 * next.js server code — process.env is available at runtime.
 * ADMIN_EMAILS is a deployment-time constant; caching here is safe.
 */
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// Cached at module scope — parsed once, reused across requests in same process.
const ADMIN_EMAILS = parseAdminEmails()
```
This is the project's precedent for "compute once at module load, reuse across requests in the same warm serverless instance" — directly applicable to `logger.ts`'s `isProd` / `level` / redact-config construction, and to RESEARCH.md Pattern 2's `scrubDatabaseUrl` reading `process.env.DATABASE_URL` once.

**No third-party client-config analog needed** — `src/lib/auth-client.ts` was not read (not relevant; it's browser-side Better Auth client setup, wrong tier for a Node-only pino module).

---

### `tests/logger/redaction.test.ts` and `tests/logger/config.test.ts` (test files)

**Analog A — mocked-dependency style:** `/Users/cj.holler/Desktop/honey_do2/tests/task/create-task.test.ts` (full file read, 136 lines)

**Full shape to copy (header + hoisted mocks + describe/it):**
```typescript
// tests/task/create-task.test.ts, lines 1-51
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockSession } from "./helpers"

// Use vi.hoisted so mock functions are available inside vi.mock factories
const {
  mockInsert,
  mockInsertValues,
  mockRevalidatePath,
  mockRequireQueen,
} = vi.hoisted(() => {
  const mockInsertValues = vi.fn().mockResolvedValue(undefined)
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }))
  const mockRevalidatePath = vi.fn()
  const mockRequireQueen = vi.fn()

  return {
    mockInsert,
    mockInsertValues,
    mockRevalidatePath,
    mockRequireQueen,
  }
})

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
  },
}))

vi.mock("@/lib/actions/hive", () => ({
  requireQueen: mockRequireQueen,
}))

import { createTask } from "@/lib/actions/task"

describe("createTask", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { session, member } = mockSession()
    mockRequireQueen.mockResolvedValue({ session, member })
    mockInsertValues.mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockInsertValues })
  })
  // ... it() blocks follow, each asserting on mock call args or rejects.toThrow(...)
```

**Key conventions confirmed from this file, applicable to `tests/logger/*.test.ts`:**
- `// @vitest-environment node` pragma at the very top of the file — required, since the project's default `vitest.config.mts` `environment` is `"jsdom"` (see below), and pino/Node streams need the Node environment, not jsdom.
- Import order: `vitest` primitives first, then local `./helpers`, then all `vi.mock(...)` calls (using `vi.hoisted()` for any mock function referenced inside a factory), and only *after* all mocks are declared does the file import the module under test (`import { createTask } from "@/lib/actions/task"` comes last, after the mocks — this ordering matters because `vi.mock` calls are hoisted by Vitest but the SUT import is not).
- `vi.mock("@/lib/db", ...)` is the exact mocking convention requested — this is the project's standard shape for mocking a `@/lib/*` module: `vi.mock("@/lib/db", () => ({ db: { insert: mockInsert } }))`, i.e. mock only the exported surface actually used by the code under test.
- `beforeEach(() => vi.clearAllMocks())` resets state between tests — carry this pattern into `tests/logger/config.test.ts` if any mocks are used there (likely none are needed, since RESEARCH.md's `config.test.ts` tests the exported config/factory shape directly rather than mocking anything).

**Analog B — no-mock, pure-property-assertion style:** `/Users/cj.holler/Desktop/honey_do2/tests/admin/generate-temp-password.test.ts` (full file, 56 lines) — closer fit for `tests/logger/config.test.ts`, since config-shape assertions (no `transport` key in prod, `pino-pretty` target in dev) need no mocking at all, just direct import + property assertions:
```typescript
// tests/admin/generate-temp-password.test.ts, lines 1-16
// @vitest-environment node
import { describe, it, expect } from "vitest"
import { generateTempPassword } from "@/lib/admin"

describe("generateTempPassword", () => {
  it("matches pattern /^[a-z]+-[a-z]+-\\d{4}$/", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateTempPassword()).toMatch(/^[a-z]+-[a-z]+-\d{4}$/)
    }
  })
  // ... more it() blocks, each a standalone property assertion, no beforeEach needed
```

**Shared-fixture-file convention** — confirmed by reading both existing helper files in full:

`/Users/cj.holler/Desktop/honey_do2/tests/task/helpers.ts` (full file, 53 lines) — plain exported factory functions, no `vi` import, returns plain object literals with sensible defaults overridable via a `Partial<{...}>` parameter:
```typescript
export function mockSession(userId = "user-1", userName = "Test Queen") {
  return {
    session: {
      user: { id: userId, name: userName, email: "queen@test.com" },
    },
    member: { id: "member-1", hiveId: "hive-1", userId, role: "queen" as const, honeyCount: 0 },
  }
}
```

`/Users/cj.holler/Desktop/honey_do2/tests/invite/helpers.ts` (full file, 26 lines) — the variant that DOES import `vi` when the fixture needs to build a chainable mock (relevant since RESEARCH.md's `captureLogger` helper needs `vi`-free but stream-based mocking):
```typescript
import { vi } from "vitest"

// Mock session for requireQueen
export function mockSession(userId = "user-1", userName = "Test Queen") {
  return { /* ... */ }
}

// Mock db that tracks calls
export function createMockDb() {
  const updateReturning = vi.fn().mockResolvedValue([])
  const updateWhere = vi.fn(() => ({ returning: updateReturning }))
  // ...
  return { update, insert, updateSet, updateWhere, updateReturning, insertValues, insertReturning }
}
```
**Recommendation for `tests/logger/helpers.ts`:** follow the `tests/invite/helpers.ts` shape (plain exported function, no `vi.mock` side effects at module scope, just factory functions) for a `captureLogger(options)` helper that builds a `Writable` and returns `{ logger, lines }`, exactly as sketched in RESEARCH.md's Validation Architecture section — this is a plain factory function, not a `vi.mock()`, so it composes cleanly with per-file imports the way `mockSession`/`createMockDb` already do.

**Test environment config confirmed:** `/Users/cj.holler/Desktop/honey_do2/vitest.config.mts` (full file):
```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    passWithNoTests: true,
    server: {
      deps: {
        inline: [/@csstools/, /@asamuzakjp/],
      },
    },
  },
})
```
Default environment is `jsdom` (for component tests like `tests/hive/leaderboard.test.tsx`) — this is exactly why every server-side unit test file in this repo (`create-task.test.ts`, `generate-temp-password.test.ts`, and all of `tests/admin/*`) opens with the `// @vitest-environment node` pragma to override it per-file. `tests/logger/*.test.ts` MUST include this pragma too, or pino's stream/Buffer handling may behave unexpectedly under jsdom's polyfills. `globals: true` means `describe`/`it`/`expect`/`vi` do not need explicit `vitest` imports for the globals to work at runtime, but every analog file in this repo imports them explicitly anyway (`import { describe, it, expect, vi, beforeEach } from "vitest"`) — match that explicit-import style for consistency/lint-friendliness.

---

### `src/lib/actions/task.ts`, `src/lib/actions/invite.ts`, `src/lib/actions/hive.ts` (server actions, CRUD — error-handling excerpt)

**Current shape has NO try/catch anywhere** — every function in `task.ts`, `invite.ts`, and `hive.ts` validates inline and either `throw new Error("message")` directly (no catch) or lets a DB call's rejection propagate unhandled. This is the pattern the logger calls must attach to — there is no existing catch block to instrument in these three files; RESEARCH.md's usage example (`logger.error({ err, hiveId, userId }, "task creation failed")` inside a new `try { await db.insert(...) } catch (err) { ... throw err }`) is additive, not a modification of existing control flow. Confirmed by reading `task.ts` in full (99 lines), `invite.ts` in full (73 lines), and `hive.ts` in full (93 lines) — zero `try`/`catch` keywords across all three files.

Representative throw-without-catch shape, `src/lib/actions/task.ts` lines 31-53 (`createTask`):
```typescript
export async function createTask(hiveId: string, formData: FormData) {
  const { session } = await requireQueen(hiveId)

  const text = (formData.get("text") as string | null)?.trim() ?? ""
  const honeyValue = Number(formData.get("honeyValue"))
  const assigneeId = (formData.get("assigneeId") as string | null) ?? ""

  if (!text || text.length > 160) throw new Error("Task text must be 1-160 characters.")
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

**Best available try/catch analog in this repo** — `src/lib/actions/admin.ts` lines 29-50 (`resetUserPassword`), the ONLY server action file with real error-handling structure:
```typescript
try {
  await db.transaction(async (tx) => {
    const updated = await tx.update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(
        and(
          eq(account.userId, parsed),
          eq(account.providerId, "credential")
        )
      )
      .returning()

    if (updated.length === 0) {
      throw new Error("NO_CREDENTIAL_ACCOUNT")
    }

    await tx.delete(session).where(eq(session.userId, parsed))
  })
} catch {
  // Generic message — never embed `tempPassword` or DB error details (T-9-03).
  throw new Error("Password reset failed")
}
```
**Important existing convention to preserve when adding logging here:** this file's `catch {}` deliberately discards the caught error and throws a new, generic, secret-free message ("never embed `tempPassword` or DB error details"). If a `logger.error({ err, ... }, ...)` call is added inside this catch block, it must log the *original* caught error (rename `catch {}` → `catch (err) { logger.error({ err, userId: parsed }, "password reset failed"); throw new Error("Password reset failed") }`) — the logger is allowed to see the real error server-side (stdout, not visible to the client), but the re-thrown client-facing error must keep its existing generic text unchanged. Don't let logging instrumentation loosen this existing secret-hygiene boundary.

**Imports pattern common to all four action files** (from `task.ts` lines 1-9, `invite.ts` lines 1-10, `admin.ts` lines 1-8, `hive.ts` lines 1-9) — all start with `"use server"` on line 1, then a flat import block, `@/lib/*` and `@/db/schema` aliases, `drizzle-orm` operators, then `next/headers`/`next/cache`/`next/navigation` as needed:
```typescript
"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks, hiveMembers } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
```
New `import { logger } from "@/lib/logger"` should be inserted into this same flat block, alongside the other `@/lib/*` imports, matching this exact placement/style (no separate import group, no blank line inserted).

---

### `src/app/api/auth/[...all]/route.ts` (route handler — "auth" instrumentation target)

**Current full file (2 lines of logic):**
```typescript
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```
Confirmed: `src/app/api/` contains exactly two route files — this one and `src/app/api/health/route.ts` (also thin, `NextResponse.json({ status: "ok", ts: Date.now() })`, no custom logic to model a wrapping pattern on). **There is no existing route handler in this repo with custom pre/post logic wrapped around its exports** — RESEARCH.md's Pitfall 1 Option 1 (wrap `GET`/`POST` to log method+pathname on entry, status on exit) has no direct in-repo analog to copy from; the planner will be writing this wrapper pattern from scratch, informed only by RESEARCH.md's own sketch, not an existing file in this codebase.

**Alternative analog for Option 2 (wire Better Auth's `logger` config hook):** `src/lib/auth.ts` (full file, 13 lines) is the only place `betterAuth({...})` is configured — this is the file to edit if the plan chooses to add a `logger: { log: (level, message, ...args) => ... }` option:
```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
})
```
Note this file uses a **relative import** (`from "./db"`), the one inconsistency versus the `@/lib/db` alias style used everywhere else in this repo (e.g. `task.ts`, `invite.ts`, `admin.ts` all import `@/lib/db`). If `logger.ts` is imported into `auth.ts`, match the existing convention already in this specific file (`from "./logger"`) rather than forcing `@/lib/logger` here, OR normalize to `@/lib/logger` — either is defensible, but note the inconsistency exists today so the planner isn't surprised by it.

---

### `src/middleware.ts` — DO NOT MODIFY (criterion 4)

**Full file, read in its entirety (31 lines):**
```typescript
import { NextRequest, NextResponse } from "next/server"

const protectedPaths = ["/hive"]
const authPaths = ["/login", "/signup"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Better Auth uses "__Secure-" prefix on HTTPS (production)
  const sessionToken =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token")

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p))

  if (!sessionToken && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL("/hive", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```
Confirms RESEARCH.md's claim: no `runtime` export overrides the default (Edge runtime applies), no `console.*`/logging of any kind currently, and no import of `@/lib/logger` should be added. The test for criterion 4 (`tests/logger/config.test.ts`, per VALIDATION.md line 47: "source assertion") should read this file's source text (e.g. via `fs.readFileSync` or `import.meta.glob`/direct string read) and assert it does not contain the substring `"@/lib/logger"` or `"lib/logger"` — there is no existing "assert a file's source text does not contain X" test in this repo to copy from; this will be a new test pattern (`fs.readFileSync(path.join(process.cwd(), "src/middleware.ts"), "utf-8")` then `expect(source).not.toContain(...)`), written from scratch per RESEARCH.md's own suggestion, not copied from an in-repo analog.

## Shared Patterns

### Named exports, `@/lib/*` alias imports, no default exports
**Source:** `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/admin.ts`, `src/lib/legal.ts` (all read in full)
**Apply to:** `src/lib/logger.ts` and every action file's new `import { logger } from "@/lib/logger"` line
```typescript
export const db = ...        // db.ts
export const auth = betterAuth({...})   // auth.ts
export function requireAdmin() {...}    // admin.ts
export const LEGAL_CONTACT_EMAIL = "..." // legal.ts
```
No file in `src/lib/` uses `export default`. `logger.ts` must export `logger` (and, per RESEARCH.md's Wave-0 design dependency, a `createLogger` factory) as named exports.

### `"use server"` + flat `@/lib`/`@/db`/`next/*` import block, no barrel files
**Source:** `src/lib/actions/task.ts`, `invite.ts`, `admin.ts`, `hive.ts` (all read in full)
**Apply to:** every action file gaining a logger import
No `index.ts` barrel exists in `src/lib/actions/` — each file is imported directly by path (e.g. `import { requireQueen } from "./hive"` from within `task.ts`, or `@/lib/actions/hive` from `invite.ts` — both relative and aliased forms are used for the SAME target depending on file, so either is acceptable but `@/lib/logger` — an alias import — is the correct form for the new logger since it lives outside `actions/`).

### Error-throwing convention: generic client-facing messages, no secret leakage in thrown `Error`
**Source:** `src/lib/actions/admin.ts` lines 47-50 (comment: "Generic message — never embed `tempPassword` or DB error details (T-9-03)")
**Apply to:** any new `logger.error({ err, ... }, "...")` call added alongside an existing `throw new Error(...)` — the THROWN error's message must stay exactly as generic as it is today; only the logger's structured `err`/context payload (server-side only, redacted per RESEARCH.md Pattern 1/2) may carry the real error detail.

### Test file convention: `// @vitest-environment node` pragma + explicit `vitest` imports + `@/lib/*` mocking via `vi.mock`
**Source:** `tests/task/create-task.test.ts` (lines 1-2, 25-41), `tests/admin/generate-temp-password.test.ts` (lines 1-3)
**Apply to:** `tests/logger/redaction.test.ts`, `tests/logger/config.test.ts`, `tests/logger/helpers.ts`
```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
```
Every server-tier test file in this repo (as opposed to `.test.tsx` component tests, which stay on the default `jsdom` environment) opens with this exact pragma line.

## No Analog Found

None. Every file in scope has at least a role-match analog somewhere in this repo (see table above). The one file with genuinely no structural precedent to copy from is the **route-handler wrapping logic** inside `src/app/api/auth/[...all]/route.ts` if the plan picks RESEARCH.md's Pitfall 1 "Option 1" (wrap `GET`/`POST` exports) — no route handler in this repo has ever wrapped Better Auth's generated handlers before. This is flagged inline above, not listed as a separate "no analog" row, since the *file* itself (and its current 4-line shape) is a real, read analog — only the *specific wrapping technique* has no precedent in-repo.

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/actions/`, `src/app/api/`, `src/middleware.ts`, `tests/task/`, `tests/admin/`, `tests/invite/`, `tsconfig.json`, `vitest.config.mts`, `package.json`
**Files scanned (read in full):** `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/legal.ts`, `src/lib/admin.ts`, `src/lib/actions/task.ts`, `src/lib/actions/invite.ts`, `src/lib/actions/admin.ts`, `src/lib/actions/hive.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/api/health/route.ts`, `src/middleware.ts`, `tests/task/helpers.ts`, `tests/task/create-task.test.ts`, `tests/admin/generate-temp-password.test.ts`, `tests/invite/helpers.ts`, `vitest.config.mts`, `tsconfig.json`, `package.json`
**Pattern extraction date:** 2026-08-11
