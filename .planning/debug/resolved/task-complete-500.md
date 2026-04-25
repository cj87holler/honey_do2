---
status: resolved
trigger: "task-complete-500 — clicking complete/done on a task returns 500 Internal Server Error in production"
created: 2026-04-24T00:00:00Z
updated: 2026-04-24T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED — root cause documented. Applying Option A fix.
test: Swap production driver in db.ts from drizzle-orm/neon-http to drizzle-orm/neon-serverless using @neondatabase/serverless Pool. No ws polyfill needed (Node 22 has global WebSocket).
expecting: db.transaction() no longer throws in production; "Done!" button completes successfully.
next_action: Update db.ts, run build, run tests, commit

## Symptoms

expected: Clicking complete/done on a task marks it complete and awards honeys to the assignee
actual: Server Action POST returns 500 Internal Server Error; browser shows "An error occurred in the Server Components render"
errors: |
  POST https://honey-do2.vercel.app/hive/df8731d3-9211-4e50-b086-482048a07415 500 (Internal Server Error)
  Uncaught Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details.
reproduction: |
  1. Sign in on https://honey-do2.vercel.app
  2. Navigate to /hive/{hiveId}
  3. Click the "Done!" button on an in_progress task (or "Start" button on an open task to advance it first)
  4. Observe 500 in network tab
  Note: "Start" (open -> in_progress) does NOT use a transaction and therefore works fine.
  Only "Done!" (in_progress -> done) hits the transaction path and 500s.
started: Unknown — present since the transaction was added to updateTaskStatus

## Eliminated

- hypothesis: auth session shape difference in production
  evidence: Auth check runs before the transaction; if auth failed the error would be "Unauthorized", not a 500
  timestamp: 2026-04-24T00:01:00Z

- hypothesis: missing env var (DATABASE_URL)
  evidence: The page itself loads and auth works in production, so DB connection is valid for reads. Only write-path (transaction) fails.
  timestamp: 2026-04-24T00:01:00Z

- hypothesis: revalidatePath error after successful DB write
  evidence: The throw from neon-http occurs before the DB writes complete — the transaction callback never runs
  timestamp: 2026-04-24T00:01:00Z

- hypothesis: Next.js 15 async params issue
  evidence: The hive page correctly awaits params (`const { id } = await params`). The server action receives taskId as a string argument directly, not via params.
  timestamp: 2026-04-24T00:01:00Z

## Evidence

- timestamp: 2026-04-24T00:01:00Z
  checked: src/lib/db.ts
  found: Production path (process.env.VERCEL === "1") uses `drizzle-orm/neon-http` + `@neondatabase/serverless` neon() client. Local path uses `drizzle-orm/postgres-js` + postgres() client.
  implication: The two drivers have different capabilities. The type cast `as ReturnType<typeof drizzleNeon<typeof schema>>` hides this from TypeScript.

- timestamp: 2026-04-24T00:01:00Z
  checked: node_modules/drizzle-orm/neon-http/session.js lines 151-158
  found: |
    async transaction(_transaction, _config = {}) {
      throw new Error("No transactions support in neon-http driver");
    }
    async transaction(_transaction) {
      throw new Error("No transactions support in neon-http driver");
    }
  implication: Any call to db.transaction() on the production (neon-http) driver throws immediately. This is the exact 500.

- timestamp: 2026-04-24T00:01:00Z
  checked: src/lib/actions/task.ts lines 66-75
  found: updateTaskStatus calls `db.transaction(async (tx) => { ... })` exclusively on the `newStatus === "done"` branch. The `in_progress` branch uses a plain `db.update()` with no transaction.
  implication: "Start" button (open -> in_progress) works fine in production. Only "Done!" button (in_progress -> done) 500s.

- timestamp: 2026-04-24T00:01:00Z
  checked: node_modules/drizzle-orm/neon-serverless/session.js
  found: neon-serverless driver DOES implement transaction() correctly (lines 178-208, no throw).
  implication: Switching db.ts to use drizzle-orm/neon-serverless + the @neondatabase/serverless Pool or neonConfig WebSocket adapter is a valid fix path.

- timestamp: 2026-04-24T00:01:00Z
  checked: @neondatabase/serverless package installed
  found: Package is present in node_modules/@neondatabase/serverless
  implication: No new dependency needed for the neon-serverless fix path.

## Resolution

root_cause: |
  db.ts conditionally uses drizzle-orm/neon-http in production. The neon-http Drizzle adapter explicitly does not support transactions (throws "No transactions support in neon-http driver"). updateTaskStatus calls db.transaction() when marking a task done. This throw becomes the unredacted 500 in production.

  The bug does NOT reproduce locally because the local path uses drizzle-orm/postgres-js which has full transaction support.

fix: |
  Replaced drizzle-orm/neon-http + neon() with drizzle-orm/neon-serverless + Pool() in src/lib/db.ts.
  @neondatabase/serverless was already installed. No new dependencies needed.
  No ws polyfill required — Node 22+ and Vercel runtime both expose global WebSocket.
  The type cast (as ReturnType<...>) was also removed since both drivers now return compatible types.

verification: |
  - npx tsc --noEmit: 0 new errors (4 pre-existing errors in tests/task/update-task-status.test.ts remain — noted in commit ccba5d2)
  - npx vitest run: 192/192 tests pass, 30/30 files pass
  - next build: compiled successfully, all 10 pages generated
  Awaiting production verification from user.

files_changed:
  - src/lib/db.ts
