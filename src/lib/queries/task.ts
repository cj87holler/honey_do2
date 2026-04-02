import { db } from "@/lib/db"
import { tasks, hiveMembers, user } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getTasksForHive(hiveId: string) {
  return db
    .select({
      id: tasks.id,
      text: tasks.text,
      honeyValue: tasks.honeyValue,
      status: tasks.status,
      assigneeId: tasks.assigneeId,
      assigneeName: user.name,
      createdBy: tasks.createdBy,
      createdAt: tasks.createdAt,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .innerJoin(hiveMembers, eq(tasks.assigneeId, hiveMembers.id))
    .innerJoin(user, eq(hiveMembers.userId, user.id))
    .where(eq(tasks.hiveId, hiveId))
    .orderBy(tasks.createdAt)
}
