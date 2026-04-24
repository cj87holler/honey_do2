// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.hoisted so mocks are available inside vi.mock factories below.
// The select() builder is fluent: select({...}).from().leftJoin().groupBy().orderBy() → rows[].
const {
  mockSelect,
  mockFrom,
  mockLeftJoin,
  mockGroupBy,
  mockOrderBy,
  mockEq,
  mockCount,
  selectProjection,
} = vi.hoisted(() => {
  const selectProjection: { current: unknown } = { current: null }

  const mockOrderBy = vi.fn().mockResolvedValue([])
  const mockGroupBy = vi.fn(() => ({ orderBy: mockOrderBy }))
  const mockLeftJoin = vi.fn(() => ({ groupBy: mockGroupBy }))
  const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin }))
  const mockSelect = vi.fn((projection: unknown) => {
    selectProjection.current = projection
    return { from: mockFrom }
  })
  const mockEq = vi.fn((a: unknown, b: unknown) => ({ __eq: true, a, b }))
  const mockCount = vi.fn((col: unknown) => ({ __count: true, col }))

  return {
    mockSelect,
    mockFrom,
    mockLeftJoin,
    mockGroupBy,
    mockOrderBy,
    mockEq,
    mockCount,
    selectProjection,
  }
})

vi.mock("@/lib/db", () => ({ db: { select: mockSelect } }))
vi.mock("drizzle-orm", () => ({ eq: mockEq, count: mockCount }))

import { listAllHives } from "@/lib/queries/admin"
import { hives, hiveMembers } from "@/db/schema"

describe("listAllHives", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectProjection.current = null
    mockOrderBy.mockResolvedValue([])
  })

  it("projects id, name, createdAt, memberCount", async () => {
    await listAllHives()
    const projection = selectProjection.current as Record<string, unknown>
    expect(projection).not.toBeNull()
    expect(Object.keys(projection).sort()).toEqual(
      ["createdAt", "id", "memberCount", "name"].sort()
    )
  })

  it("invokes .from(hives)", async () => {
    await listAllHives()
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith(hives)
  })

  it("invokes .leftJoin(hiveMembers, eq(hives.id, hiveMembers.hiveId)) — left join so zero-member hives still appear", async () => {
    await listAllHives()
    expect(mockLeftJoin).toHaveBeenCalledTimes(1)
    const [joinTable, joinCondition] = mockLeftJoin.mock.calls[0]
    expect(joinTable).toBe(hiveMembers)
    // eq mock returns { __eq, a, b }
    expect(joinCondition).toMatchObject({
      __eq: true,
      a: hives.id,
      b: hiveMembers.hiveId,
    })
  })

  it("invokes .groupBy(hives.id, hives.name, hives.createdAt)", async () => {
    await listAllHives()
    expect(mockGroupBy).toHaveBeenCalledTimes(1)
    expect(mockGroupBy).toHaveBeenCalledWith(hives.id, hives.name, hives.createdAt)
  })

  it("invokes .orderBy(hives.createdAt)", async () => {
    await listAllHives()
    expect(mockOrderBy).toHaveBeenCalledTimes(1)
    expect(mockOrderBy).toHaveBeenCalledWith(hives.createdAt)
  })

  it("memberCount projection uses count(hiveMembers.id)", async () => {
    await listAllHives()
    expect(mockCount).toHaveBeenCalledTimes(1)
    expect(mockCount).toHaveBeenCalledWith(hiveMembers.id)
    // Confirm the projection.memberCount is the value returned by count()
    const projection = selectProjection.current as Record<string, unknown>
    expect(projection.memberCount).toMatchObject({ __count: true, col: hiveMembers.id })
  })
})
