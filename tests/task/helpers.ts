import { vi } from "vitest"

export function mockSession(userId = "user-1", userName = "Test Queen") {
  return {
    session: {
      user: { id: userId, name: userName, email: "queen@test.com" },
    },
    member: { id: "member-1", hiveId: "hive-1", userId, role: "queen" as const, honeyCount: 0 },
  }
}

export function mockMember(overrides: Partial<{
  id: string
  hiveId: string
  userId: string
  role: "queen" | "bee"
  honeyCount: number
}> = {}) {
  return {
    id: "member-1",
    hiveId: "hive-1",
    userId: "user-1",
    role: "queen" as const,
    honeyCount: 0,
    ...overrides,
  }
}

export function mockTask(overrides: Partial<{
  id: string
  hiveId: string
  assigneeId: string
  createdBy: string
  text: string
  honeyValue: number
  status: "open" | "in_progress" | "done"
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}> = {}) {
  return {
    id: "task-1",
    hiveId: "hive-1",
    assigneeId: "member-2",
    createdBy: "user-1",
    text: "Do the dishes",
    honeyValue: 10,
    status: "open" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    ...overrides,
  }
}
