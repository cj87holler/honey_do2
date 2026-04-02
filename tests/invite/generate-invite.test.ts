// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockSession } from "./helpers"

// Fixed token for deterministic testing
const FIXED_TOKEN = "abcdefghijklmnopqrstuvwxyz123456"

// Use vi.hoisted so these are available inside vi.mock factories (which are hoisted)
const {
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockInsert,
  mockInsertValues,
  mockNanoid,
  mockRequireQueen,
} = vi.hoisted(() => {
  const mockUpdateWhere = vi.fn().mockResolvedValue([])
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }))
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }))

  const mockInsertValues = vi.fn().mockResolvedValue(undefined)
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }))

  const mockNanoid = vi.fn(() => "abcdefghijklmnopqrstuvwxyz123456")
  const mockRequireQueen = vi.fn()

  return {
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockInsert,
    mockInsertValues,
    mockNanoid,
    mockRequireQueen,
  }
})

vi.mock("nanoid", () => ({
  nanoid: mockNanoid,
}))

vi.mock("@/lib/actions/hive", () => ({
  requireQueen: mockRequireQueen,
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    update: mockUpdate,
    insert: mockInsert,
  },
}))

import { generateInvite } from "@/lib/actions/invite"

describe("generateInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply default implementations after clearAllMocks
    mockRequireQueen.mockResolvedValue(mockSession())
    mockUpdateWhere.mockResolvedValue([])
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
    mockUpdate.mockReturnValue({ set: mockUpdateSet })
    mockInsertValues.mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockInsertValues })
    mockNanoid.mockReturnValue(FIXED_TOKEN)
  })

  it("returns a 32-character token", async () => {
    const token = await generateInvite("hive-1")
    expect(typeof token).toBe("string")
    expect(token).toBe(FIXED_TOKEN)
    expect(token).toHaveLength(32)
  })

  it("calls requireQueen with the hiveId for Queen-only gate", async () => {
    await generateInvite("hive-1")
    expect(mockRequireQueen).toHaveBeenCalledWith("hive-1")
  })

  it("calls db.update to invalidate prior active tokens for the same hiveId", async () => {
    await generateInvite("hive-1")
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdateSet).toHaveBeenCalledTimes(1)
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1)
  })

  it("calls db.insert with token, hiveId, createdBy, and expiresAt ~24h from now", async () => {
    const before = Date.now()
    await generateInvite("hive-1")
    const after = Date.now()

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsertValues).toHaveBeenCalledTimes(1)

    const insertArg = mockInsertValues.mock.calls[0][0]
    expect(insertArg.hiveId).toBe("hive-1")
    expect(insertArg.token).toBe(FIXED_TOKEN)
    expect(insertArg.createdBy).toBe("user-1")

    // expiresAt should be approximately 24 hours from now
    const expectedMinExpiry = new Date(before + 24 * 60 * 60 * 1000)
    const expectedMaxExpiry = new Date(after + 24 * 60 * 60 * 1000)
    expect(insertArg.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry.getTime())
    expect(insertArg.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry.getTime())
  })

  it("throws Forbidden when requireQueen rejects", async () => {
    mockRequireQueen.mockRejectedValue(new Error("Forbidden"))
    await expect(generateInvite("hive-1")).rejects.toThrow("Forbidden")
  })
})
