import { vi } from "vitest"

// Mock session for requireQueen
export function mockSession(userId = "user-1", userName = "Test Queen") {
  return {
    session: {
      user: { id: userId, name: userName, email: "queen@test.com" },
    },
    member: { id: "member-1", hiveId: "hive-1", userId, role: "queen" as const },
  }
}

// Mock db that tracks calls
export function createMockDb() {
  const updateReturning = vi.fn().mockResolvedValue([])
  const updateWhere = vi.fn(() => ({ returning: updateReturning }))
  const updateSet = vi.fn(() => ({ where: updateWhere }))
  const update = vi.fn(() => ({ set: updateSet }))

  const insertReturning = vi.fn().mockResolvedValue([{ id: "inv-1" }])
  const insertValues = vi.fn(() => ({ returning: insertReturning }))
  const insert = vi.fn(() => ({ values: insertValues }))

  return { update, insert, updateSet, updateWhere, updateReturning, insertValues, insertReturning }
}
