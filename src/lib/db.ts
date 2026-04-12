import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import { neon } from "@neondatabase/serverless"
import postgres from "postgres"
import * as schema from "@/db/schema"

// process.env.VERCEL is set to "1" by Vercel in all deployment contexts
export const db = (
  process.env.VERCEL
    ? drizzleNeon(neon(process.env.DATABASE_URL!), { schema })
    : drizzlePostgres(postgres(process.env.DATABASE_URL!), { schema })
) as ReturnType<typeof drizzleNeon<typeof schema>>
