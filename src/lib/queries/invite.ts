import { db } from "@/lib/db"
import { invites, hives, hiveMembers, user } from "@/db/schema"
import { and, eq, isNull, gt } from "drizzle-orm"

export async function getInviteByToken(token: string) {
  const result = await db
    .select({
      id: invites.id,
      hiveId: invites.hiveId,
      hiveName: hives.name,
      queenName: user.name,
      expiresAt: invites.expiresAt,
      token: invites.token,
    })
    .from(invites)
    .innerJoin(hives, eq(invites.hiveId, hives.id))
    .innerJoin(
      hiveMembers,
      and(
        eq(hiveMembers.hiveId, hives.id),
        eq(hiveMembers.role, "queen")
      )
    )
    .innerJoin(user, eq(hiveMembers.userId, user.id))
    .where(
      and(
        eq(invites.token, token),
        isNull(invites.usedAt),
        gt(invites.expiresAt, new Date())
      )
    )
    .limit(1)

  return result[0] ?? null
}

/**
 * Returns Hive name and Queen name for ANY invite token, regardless of
 * expiry or used state. Used on the expired-token landing page to show
 * "Ask [Queen name] of [Hive name] for a new link" per D-11.
 * Returns null only when the token does not exist at all.
 */
export async function getExpiredInvitePreview(token: string) {
  const result = await db
    .select({
      hiveName: hives.name,
      queenName: user.name,
    })
    .from(invites)
    .innerJoin(hives, eq(invites.hiveId, hives.id))
    .innerJoin(
      hiveMembers,
      and(
        eq(hiveMembers.hiveId, hives.id),
        eq(hiveMembers.role, "queen")
      )
    )
    .innerJoin(user, eq(hiveMembers.userId, user.id))
    .where(eq(invites.token, token))
    .limit(1)

  return result[0] ?? null
}
