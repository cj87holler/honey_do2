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
