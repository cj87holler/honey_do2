"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hives, hiveMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createHive(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/login")
  }

  const name = (formData.get("name") as string | null) ?? ""

  if (!name.trim()) {
    throw new Error("Give your Hive a name.")
  }
  if (name.trim().length > 100) {
    throw new Error("Hive name must be 100 characters or fewer.")
  }

  const [hive] = await db
    .insert(hives)
    .values({ name: name.trim() })
    .returning()

  await db.insert(hiveMembers).values({
    hiveId: hive.id,
    userId: session.user.id,
    role: "queen",
  })

  redirect(`/hive/${hive.id}`)
}

export async function renameHive(hiveId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    throw new Error("Unauthorized")
  }

  const member = await db.query.hiveMembers.findFirst({
    where: and(
      eq(hiveMembers.userId, session.user.id),
      eq(hiveMembers.hiveId, hiveId)
    ),
  })

  if (!member || member.role !== "queen") {
    throw new Error("Forbidden")
  }

  const name = (formData.get("name") as string | null) ?? ""

  if (!name.trim()) {
    throw new Error("Give your Hive a name.")
  }
  if (name.trim().length > 100) {
    throw new Error("Hive name must be 100 characters or fewer.")
  }

  await db
    .update(hives)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(hives.id, hiveId))

  revalidatePath(`/hive/${hiveId}`)
}

export async function requireQueen(hiveId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    throw new Error("Unauthorized")
  }

  const member = await db.query.hiveMembers.findFirst({
    where: and(
      eq(hiveMembers.userId, session.user.id),
      eq(hiveMembers.hiveId, hiveId)
    ),
  })

  if (!member || member.role !== "queen") {
    throw new Error("Forbidden")
  }

  return { session, member }
}
