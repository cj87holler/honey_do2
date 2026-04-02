// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockMember, mockSession, mockTask } from "./helpers"

const {
  mockFindFirstTask,
  mockFindFirstMember,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockDelete,
  mockDeleteWhere,
  mockTransaction,
  mockRevalidatePath,
  mockGetSession,
  mockRequireQueen,
} = vi.hoisted(() => {
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined)
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }))
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }))

  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }))

  const mockFindFirstTask = vi.fn()
  const mockFindFirstMember = vi.fn()

  const mockTransaction = vi.fn()
  const mockRevalidatePath = vi.fn()
  const mockGetSession = vi.fn()
  const mockRequireQueen = vi.fn()

  return {
    mockFindFirstTask,
    mockFindFirstMember,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockDelete,
    mockDeleteWhere,
    mockTransaction,
    mockRevalidatePath,
    mockGetSession,
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
    query: {
      tasks: { findFirst: mockFindFirstTask },
      hiveMembers: { findFirst: mockFindFirstMember },
    },
    update: mockUpdate,
    delete: mockDelete,
    transaction: mockTransaction,
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

vi.mock("@/lib/actions/hive", () => ({
  requireQueen: mockRequireQueen,
}))

import { updateTaskStatus, deleteTask } from "@/lib/actions/task"

describe("updateTaskStatus", () => {
  const assigneeMember = mockMember({ id: "member-2", userId: "user-2", role: "bee" })

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: valid session as the assignee
    mockGetSession.mockResolvedValue({ user: { id: "user-2", name: "Test Bee", email: "bee@test.com" } })
    mockFindFirstTask.mockResolvedValue(mockTask({ status: "open", assigneeId: "member-2" }))
    mockFindFirstMember.mockResolvedValue(assigneeMember)
    mockUpdateWhere.mockResolvedValue(undefined)
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
    mockUpdate.mockReturnValue({ set: mockUpdateSet })
    // Default transaction mock: run fn with a tx that has update
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const txUpdateWhere = vi.fn().mockResolvedValue(undefined)
      const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }))
      const txUpdate = vi.fn(() => ({ set: txUpdateSet }))
      await fn({ update: txUpdate, updateSet: txUpdateSet, updateWhere: txUpdateWhere })
    })
  })

  it("transitions open to in_progress", async () => {
    await updateTaskStatus("task-1", "in_progress")

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const setArg = mockUpdateSet.mock.calls[0][0]
    expect(setArg.status).toBe("in_progress")
  })

  it("transitions in_progress to done with transaction", async () => {
    mockFindFirstTask.mockResolvedValue(mockTask({ status: "in_progress", assigneeId: "member-2" }))

    await updateTaskStatus("task-1", "done")

    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it("throws if caller is not assignee", async () => {
    // Session user is different from assignee's userId
    mockGetSession.mockResolvedValue({ user: { id: "user-3", name: "Other", email: "other@test.com" } })
    // Member lookup returns null (no match for user-3 + member-2)
    mockFindFirstMember.mockResolvedValue(null)

    await expect(updateTaskStatus("task-1", "in_progress")).rejects.toThrow("Forbidden")
  })

  it("throws on invalid transition open -> done", async () => {
    await expect(updateTaskStatus("task-1", "done")).rejects.toThrow("Invalid status transition")
  })

  it("throws on invalid transition done -> anything", async () => {
    mockFindFirstTask.mockResolvedValue(mockTask({ status: "done", assigneeId: "member-2" }))

    await expect(updateTaskStatus("task-1", "in_progress")).rejects.toThrow("Invalid status transition")
  })

  it("sets completedAt when transitioning to done", async () => {
    mockFindFirstTask.mockResolvedValue(mockTask({ status: "in_progress", assigneeId: "member-2" }))

    let capturedTxUpdate: ReturnType<typeof vi.fn> | null = null
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const txUpdateWhere = vi.fn().mockResolvedValue(undefined)
      const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }))
      const txUpdate = vi.fn(() => ({ set: txUpdateSet }))
      capturedTxUpdate = txUpdate
      await fn({ update: txUpdate })
    })

    await updateTaskStatus("task-1", "done")

    expect(capturedTxUpdate).not.toBeNull()
    const firstCallSetArg = (capturedTxUpdate as ReturnType<typeof vi.fn>).mock.calls[0]
    // The tx.update is called with the tasks table
    expect(firstCallSetArg).toBeDefined()
    // Verify completedAt is set (the set() call on the first update has completedAt)
    const setCallArg = (capturedTxUpdate as ReturnType<typeof vi.fn>).mock.results[0].value.set.mock.calls[0][0]
    expect(setCallArg.completedAt).toBeInstanceOf(Date)
    expect(setCallArg.status).toBe("done")
  })
})

describe("deleteTask", () => {
  const queenSession = { user: { id: "user-1", name: "Test Queen", email: "queen@test.com" } }
  const { session, member } = mockSession()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(queenSession)
    mockFindFirstTask.mockResolvedValue(mockTask({ status: "open", assigneeId: "member-2" }))
    mockRequireQueen.mockResolvedValue({ session, member })
    mockDeleteWhere.mockResolvedValue(undefined)
    mockDelete.mockReturnValue({ where: mockDeleteWhere })
  })

  it("deletes open task when caller is queen", async () => {
    await deleteTask("task-1")

    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/hive/hive-1")
  })

  it("throws if task is done", async () => {
    mockFindFirstTask.mockResolvedValue(mockTask({ status: "done" }))

    await expect(deleteTask("task-1")).rejects.toThrow("Completed tasks cannot be deleted")
  })
})
