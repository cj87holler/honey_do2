# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## task-complete-500 — neon-http driver throws on db.transaction(), causing 500 on task completion
- **Date:** 2026-04-24
- **Error patterns:** 500 Internal Server Error, transaction, neon-http, done, updateTaskStatus, db.transaction, No transactions support
- **Root cause:** db.ts conditionally uses drizzle-orm/neon-http in production. The neon-http Drizzle adapter explicitly does not support transactions (throws "No transactions support in neon-http driver"). updateTaskStatus calls db.transaction() when marking a task done. This throw becomes an unredacted 500 in production. Does not reproduce locally because the local path uses drizzle-orm/postgres-js which has full transaction support.
- **Fix:** Replaced drizzle-orm/neon-http + neon() with drizzle-orm/neon-serverless + Pool() in src/lib/db.ts. @neondatabase/serverless was already installed. No new dependencies needed. No ws polyfill required — Node 22+ and Vercel runtime both expose global WebSocket.
- **Files changed:** src/lib/db.ts
---
