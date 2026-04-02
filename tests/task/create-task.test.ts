// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockSession, mockTask } from "./helpers"

// Use vi.hoisted so mock functions are available inside vi.mock factories
const {
  mockInsert,
  mockInsertValues,
  mockRevalidatePath,
  mockRequireQueen,
} = vi.hoisted(() => {
  const mockInsertValues = vi.fn().mockResolvedValue(undefined)
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }))
  const mockRevalidatePath = vi.fn()
  const mockRequireQueen = vi.fn()

  return {
    mockInsert,
    mockInsertValues,
    mockRevalidatePath,
    mockRequireQueen,
  }
})

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
  },
}))

vi.mock("@/lib/actions/hive", () => ({
  requireQueen: mockRequireQueen,
}))

import { createTask } from "@/lib/actions/task"

describe("createTask", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { session, member } = mockSession()
    mockRequireQueen.mockResolvedValue({ session, member })
    mockInsertValues.mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockInsertValues })
  })

  it("creates task with valid input", async () => {
    const formData = new FormData()
    formData.set("text", "Do the dishes")
    formData.set("honeyValue", "10")
    formData.set("assigneeId", "member-2")

    await createTask("hive-1", formData)

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const insertArg = mockInsertValues.mock.calls[0][0]
    expect(insertArg.hiveId).toBe("hive-1")
    expect(insertArg.assigneeId).toBe("member-2")
    expect(insertArg.text).toBe("Do the dishes")
    expect(insertArg.honeyValue).toBe(10)
    expect(insertArg.createdBy).toBe("user-1")
  })

  it("throws if text is empty", async () => {
    const formData = new FormData()
    formData.set("text", "")
    formData.set("honeyValue", "10")
    formData.set("assigneeId", "member-2")

    await expect(createTask("hive-1", formData)).rejects.toThrow("Task text must be 1-160 characters")
  })

  it("throws if text exceeds 160 chars", async () => {
    const formData = new FormData()
    formData.set("text", "a".repeat(161))
    formData.set("honeyValue", "10")
    formData.set("assigneeId", "member-2")

    await expect(createTask("hive-1", formData)).rejects.toThrow("Task text must be 1-160 characters")
  })

  it("throws if honey value below 1", async () => {
    const formData = new FormData()
    formData.set("text", "Do the dishes")
    formData.set("honeyValue", "0")
    formData.set("assigneeId", "member-2")

    await expect(createTask("hive-1", formData)).rejects.toThrow("Honey value must be between 1 and 100")
  })

  it("throws if honey value above 100", async () => {
    const formData = new FormData()
    formData.set("text", "Do the dishes")
    formData.set("honeyValue", "101")
    formData.set("assigneeId", "member-2")

    await expect(createTask("hive-1", formData)).rejects.toThrow("Honey value must be between 1 and 100")
  })

  it("throws if honey value is not integer", async () => {
    const formData = new FormData()
    formData.set("text", "Do the dishes")
    formData.set("honeyValue", "5.5")
    formData.set("assigneeId", "member-2")

    await expect(createTask("hive-1", formData)).rejects.toThrow("Honey value must be between 1 and 100")
  })

  it("throws if assigneeId is empty", async () => {
    const formData = new FormData()
    formData.set("text", "Do the dishes")
    formData.set("honeyValue", "10")
    formData.set("assigneeId", "")

    await expect(createTask("hive-1", formData)).rejects.toThrow("Assign the task to someone")
  })

  it("calls revalidatePath with hive path", async () => {
    const formData = new FormData()
    formData.set("text", "Do the dishes")
    formData.set("honeyValue", "10")
    formData.set("assigneeId", "member-2")

    await createTask("hive-1", formData)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/hive/hive-1")
  })
})
