import type { Config } from "drizzle-kit"

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Neon requires direct (unpooled) connection for migrations
    // DATABASE_URL_UNPOOLED is provisioned by the Neon-Vercel integration
    // Falls back to DATABASE_URL for local dev (Docker doesn't use PgBouncer)
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
} satisfies Config
