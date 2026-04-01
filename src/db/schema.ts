import { pgTable, text, varchar, timestamp, pgEnum, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// -- Better Auth tables --
// These are managed by Better Auth but defined here so Drizzle knows about them
// and we can reference them in relations. Keep this in sync with Better Auth's
// expected schema (emailVerified is boolean per Better Auth's type definitions).

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// -- App-specific tables --

export const roleEnum = pgEnum("role", ["queen", "bee"])

export const hives = pgTable("hives", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const hiveMembers = pgTable("hive_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hiveId: text("hive_id").notNull().references(() => hives.id),
  userId: text("user_id").notNull().references(() => user.id),
  role: roleEnum("role").notNull().default("bee"),
  honeyCount: integer("honey_count").notNull().default(0),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("hive_user_idx").on(table.hiveId, table.userId),
])

export const invites = pgTable("invites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hiveId: text("hive_id").notNull().references(() => hives.id),
  token: text("token").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => user.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  usedBy: text("used_by").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// -- Relations --

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  hiveMembers: many(hiveMembers),
  createdInvites: many(invites, { relationName: "inviteCreator" }),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const hivesRelations = relations(hives, ({ many }) => ({
  members: many(hiveMembers),
  invites: many(invites),
}))

export const hiveMembersRelations = relations(hiveMembers, ({ one }) => ({
  hive: one(hives, { fields: [hiveMembers.hiveId], references: [hives.id] }),
  user: one(user, { fields: [hiveMembers.userId], references: [user.id] }),
}))

export const invitesRelations = relations(invites, ({ one }) => ({
  hive: one(hives, { fields: [invites.hiveId], references: [hives.id] }),
  creator: one(user, { fields: [invites.createdBy], references: [user.id], relationName: "inviteCreator" }),
}))
