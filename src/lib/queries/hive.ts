import { db } from "@/lib/db"
import { hives, hiveMembers, user } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getHiveWithMembers(hiveId: string) {
  const hive = await db.query.hives.findFirst({
    where: eq(hives.id, hiveId),
  })

  if (!hive) {
    return null
  }

  const members = await db
    .select({
      id: hiveMembers.id,
      name: user.name,
      email: user.email,
      role: hiveMembers.role,
      honeyCount: hiveMembers.honeyCount,
      joinedAt: hiveMembers.joinedAt,
      userId: hiveMembers.userId,
    })
    .from(hiveMembers)
    .innerJoin(user, eq(hiveMembers.userId, user.id))
    .where(eq(hiveMembers.hiveId, hiveId))

  return { hive, members }
}

export async function getUserHive(userId: string) {
  const membership = await db.query.hiveMembers.findFirst({
    where: eq(hiveMembers.userId, userId),
  })

  return membership?.hiveId ?? null
}
