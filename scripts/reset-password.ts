import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user, account } from "@/db/schema"
import { eq, and } from "drizzle-orm"

const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error("Usage: tsx scripts/reset-password.ts <email> <password>")
  process.exit(1)
}

async function main() {
  const ctx = await auth.$context
  const hash = await ctx.password.hash(newPassword)

  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email))
  if (!u) {
    console.error(`No user with email ${email}`)
    process.exit(1)
  }

  const updated = await db
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, u.id), eq(account.providerId, "credential")))
    .returning({ id: account.id })

  console.log(`Updated ${updated.length} credential account(s) for ${email}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
