// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.hoisted so mocks are available inside vi.mock factories below.
// The select() builder is fluent; each step returns the next step's handle.
// The terminal call (.orderBy) resolves to the test's expected array.
const {
  mockSelect,
  mockFrom,
  mockOrderBy,
  mockEq,
  mockCount,
  selectProjection,
} = vi.hoisted(() => {
  // Capture the projection object passed to db.select({...}) so tests can assert its shape.
  const selectProjection: { current: unknown } = { current: null }

  const mockOrderBy = vi.fn().mockResolvedValue([])
  const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy, leftJoin: vi.fn() }))
  const mockSelect = vi.fn((projection: unknown) => {
    selectProjection.current = projection
    return { from: mockFrom }
  })
  const mockEq = vi.fn((a: unknown, b: unknown) => ({ __eq: true, a, b }))
  const mockCount = vi.fn((col: unknown) => ({ __count: true, col }))

  return { mockSelect, mockFrom, mockOrderBy, mockEq, mockCount, selectProjection }
})

vi.mock("@/lib/db", () => ({ db: { select: mockSelect } }))
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: mockEq, count: mockCount }
})

import { listAllUsers } from "@/lib/queries/admin"
import { user } from "@/db/schema"

describe("listAllUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectProjection.current = null
    mockOrderBy.mockResolvedValue([])
  })

  it("calls db.select exactly once", async () => {
    await listAllUsers()
    expect(mockSelect).toHaveBeenCalledTimes(1)
  })

  it("projects id, email, name, createdAt (and no sensitive columns)", async () => {
    await listAllUsers()
    const projection = selectProjection.current as Record<string, unknown>
    expect(projection).not.toBeNull()
    expect(Object.keys(projection).sort()).toEqual(
      ["createdAt", "email", "id", "name"].sort()
    )
    // Sensitive columns must NOT be projected (T-9-07 mitigation)
    expect(projection).not.toHaveProperty("password")
    expect(projection).not.toHaveProperty("emailVerified")
    expect(projection).not.toHaveProperty("image")
  })

  it("invokes .from(user)", async () => {
    await listAllUsers()
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith(user)
  })

  it("invokes .orderBy(user.createdAt) for ascending order (oldest first)", async () => {
    await listAllUsers()
    expect(mockOrderBy).toHaveBeenCalledTimes(1)
    expect(mockOrderBy).toHaveBeenCalledWith(user.createdAt)
  })

  it("returns whatever the mocked query resolves to (passthrough shape)", async () => {
    const fakeRows = [
      { id: "u1", email: "a@example.com", name: "Alice", createdAt: new Date("2025-01-01") },
      { id: "u2", email: "b@example.com", name: "Bob", createdAt: new Date("2025-02-01") },
    ]
    mockOrderBy.mockResolvedValueOnce(fakeRows)
    const result = await listAllUsers()
    expect(result).toEqual(fakeRows)
  })
})
