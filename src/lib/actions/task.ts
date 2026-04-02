"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks, hiveMembers } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { requireQueen } from "./hive"

async function requireAssignee(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })
  if (!task) throw new Error("Task not found")

  const member = await db.query.hiveMembers.findFirst({
    where: and(
      eq(hiveMembers.id, task.assigneeId),
      eq(hiveMembers.userId, session.user.id)
    ),
  })
  if (!member) throw new Error("Forbidden - only the assignee can change task status")

  return { session, task, member }
}

export async function createTask(hiveId: string, formData: FormData) {
  const { session } = await requireQueen(hiveId)

  const text = (formData.get("text") as string | null)?.trim() ?? ""
  const honeyValue = Number(formData.get("honeyValue"))
  const assigneeId = (formData.get("assigneeId") as string | null) ?? ""

  if (!text || text.length > 160) throw new Error("Task text must be 1-160 characters.")
  if (!Number.isInteger(honeyValue) || honeyValue < 1 || honeyValue > 100) {
    throw new Error("Honey value must be between 1 and 100.")
  }
  if (!assigneeId) throw new Error("Assign the task to someone.")

  await db.insert(tasks).values({
    hiveId,
    assigneeId,
    createdBy: session.user.id,
    text,
    honeyValue,
  })

  revalidatePath(`/hive/${hiveId}`)
}

export async function updateTaskStatus(taskId: string, newStatus: "in_progress" | "done") {
  const { task } = await requireAssignee(taskId)

  const validTransitions: Record<string, string> = {
    open: "in_progress",
    in_progress: "done",
  }
  if (validTransitions[task.status] !== newStatus) {
    throw new Error("Invalid status transition.")
  }

  if (newStatus === "done") {
    await db.transaction(async (tx) => {
      await tx.update(tasks)
        .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, taskId))

      await tx.update(hiveMembers)
        .set({ honeyCount: sql`${hiveMembers.honeyCount} + ${task.honeyValue}` })
        .where(eq(hiveMembers.id, task.assigneeId))
    })
  } else {
    await db.update(tasks)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
  }

  revalidatePath(`/hive/${task.hiveId}`)
}

export async function deleteTask(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) })
  if (!task) throw new Error("Task not found")

  await requireQueen(task.hiveId)

  if (task.status === "done") throw new Error("Completed tasks cannot be deleted.")

  await db.delete(tasks).where(eq(tasks.id, taskId))
  revalidatePath(`/hive/${task.hiveId}`)
}
