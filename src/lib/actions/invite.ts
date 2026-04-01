"use server"

import { nanoid } from "nanoid"
import { db } from "@/lib/db"
import { invites, hiveMembers } from "@/db/schema"
import { and, eq, isNull, gt } from "drizzle-orm"
import { requireQueen } from "@/lib/actions/hive"
import { revalidatePath } from "next/cache"

export async function generateInvite(hiveId: string): Promise<string> {
  const { session } = await requireQueen(hiveId)

  // Invalidate all prior active invites for this Hive
  await db
    .update(invites)
    .set({ expiresAt: new Date() })
    .where(
      and(
        eq(invites.hiveId, hiveId),
        isNull(invites.usedAt)
      )
    )

  const token = nanoid(32)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await db.insert(invites).values({
    hiveId,
    token,
    createdBy: session.user.id,
    expiresAt,
  })

  return token
}

export async function acceptInvite(token: string, userId: string): Promise<string> {
  // Atomic: update only if token is unused AND unexpired
  const [consumed] = await db
    .update(invites)
    .set({ usedAt: new Date(), usedBy: userId })
    .where(
      and(
        eq(invites.token, token),
        isNull(invites.usedAt),
        gt(invites.expiresAt, new Date())
      )
    )
    .returning()

  if (!consumed) {
    throw new Error("This invite has already been used or has expired.")
  }

  // Insert hive membership as Bee
  await db.insert(hiveMembers).values({
    hiveId: consumed.hiveId,
    userId,
    role: "bee",
  })

  revalidatePath(`/hive/${consumed.hiveId}`)
  return consumed.hiveId
}
