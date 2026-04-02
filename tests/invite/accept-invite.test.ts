// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockConsumedInvite = {
  id: "inv-1",
  hiveId: "hive-1",
  token: "test-token-32-chars-long-here-xx",
  createdBy: "user-queen",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  usedAt: null,
  usedBy: null,
  createdAt: new Date(),
}

// Use vi.hoisted so mock functions are available inside vi.mock factories
const {
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockReturning,
  mockInsert,
  mockInsertValues,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockReturning = vi.fn()
  const mockUpdateWhere = vi.fn(() => ({ returning: mockReturning }))
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }))
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }))

  const mockInsertValues = vi.fn().mockResolvedValue(undefined)
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }))

  const mockRevalidatePath = vi.fn()

  return {
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockReturning,
    mockInsert,
    mockInsertValues,
    mockRevalidatePath,
  }
})

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/lib/db", () => ({
  db: {
    update: mockUpdate,
    insert: mockInsert,
  },
}))

import { acceptInvite } from "@/lib/actions/invite"

describe("acceptInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply default implementations after clearAllMocks
    mockReturning.mockResolvedValue([mockConsumedInvite])
    mockUpdateWhere.mockReturnValue({ returning: mockReturning })
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
    mockUpdate.mockReturnValue({ set: mockUpdateSet })
    mockInsertValues.mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockInsertValues })
  })

  it("returns hiveId and inserts hive_members row with role bee for a valid token", async () => {
    const hiveId = await acceptInvite("test-token-32-chars-long-here-xx", "user-bee")

    expect(hiveId).toBe("hive-1")
    // Should call db.update to atomically mark the invite used
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockReturning).toHaveBeenCalledTimes(1)
    // Should insert hive_members
    expect(mockInsert).toHaveBeenCalledTimes(1)
    const memberInsertArg = mockInsertValues.mock.calls[0][0]
    expect(memberInsertArg.hiveId).toBe("hive-1")
    expect(memberInsertArg.userId).toBe("user-bee")
    expect(memberInsertArg.role).toBe("bee")
  })

  it("calls revalidatePath on success", async () => {
    await acceptInvite("test-token-32-chars-long-here-xx", "user-bee")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/hive/hive-1")
  })

  it("throws 'already been used or has expired' when token is already used (returning returns empty)", async () => {
    mockReturning.mockResolvedValue([])

    await expect(
      acceptInvite("used-token-already-consumed-here", "user-bee")
    ).rejects.toThrow("already been used or has expired")
  })

  it("throws 'already been used or has expired' when token is expired (returning returns empty)", async () => {
    mockReturning.mockResolvedValue([])

    await expect(
      acceptInvite("expired-token-past-24-hours-here", "user-bee")
    ).rejects.toThrow("already been used or has expired")
  })

  it("does not insert hive_members when token consumption fails", async () => {
    mockReturning.mockResolvedValue([])

    await expect(
      acceptInvite("bad-token", "user-bee")
    ).rejects.toThrow()

    // hive_members insert should NOT be called when token is invalid
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
