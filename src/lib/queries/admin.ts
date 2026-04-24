import { db } from "@/lib/db"
import { user, hives, hiveMembers } from "@/db/schema"
import { count, eq } from "drizzle-orm"

/**
 * ADMIN-01: All registered users with email + signup date.
 *
 * Projection is restricted to the minimum needed by the admin UI: id (row key),
 * name (display), email, createdAt. No other user-table columns or any account-table
 * columns are projected — mitigates T-9-07 (Information Disclosure).
 * Ordered ascending by createdAt so oldest users appear first for predictable scanning.
 */
export async function listAllUsers() {
  return db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.createdAt)
}

/**
 * ADMIN-02: All hives with member count + creation date.
 *
 * Uses `leftJoin` (not `innerJoin`) so hives with zero members still appear
 * with `memberCount: 0`. `groupBy` is required alongside the `count` aggregate;
 * grouping on all non-aggregated selected columns keeps PostgreSQL happy.
 * Ordered ascending by `createdAt` for consistency with listAllUsers.
 */
export async function listAllHives() {
  return db
    .select({
      id: hives.id,
      name: hives.name,
      createdAt: hives.createdAt,
      memberCount: count(hiveMembers.id),
    })
    .from(hives)
    .leftJoin(hiveMembers, eq(hives.id, hiveMembers.hiveId))
    .groupBy(hives.id, hives.name, hives.createdAt)
    .orderBy(hives.createdAt)
}
