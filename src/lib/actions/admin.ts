"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { account, session } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { requireAdmin, generateTempPassword } from "@/lib/admin"

const userIdSchema = z.string().min(1, "Invalid user id")

export async function resetUserPassword(
  userId: string
): Promise<{ tempPassword: string }> {
  // D-10: independent admin guard — every admin action verifies, never relies on layout gate alone
  await requireAdmin()

  const parsed = userIdSchema.parse(userId)

  const tempPassword = generateTempPassword()
  const hashed = await hashPassword(tempPassword)

  // Password update must precede session delete: if the delete ran first and the
  // update rolled back, the user would be locked out instead of receiving a usable
  // new password (D-06, RESEARCH §"Transaction Ordering").
  // WR-01: capture affected row count and abort if zero — otherwise a user without
  // a credential-provider account row gets a temp password that never authenticates
  // AND has all sessions deleted, locking them out silently.
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

  return { tempPassword }
}
