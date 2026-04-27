// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const {
  mockRequireAdmin,
  mockGenerateTempPassword,
  mockHashPassword,
  mockUpdate,
  mockSet,
  mockUpdateWhere,
  mockReturning,
  mockDelete,
  mockDeleteWhere,
  mockTransaction,
  mockEq,
  mockAnd,
  callOrder,
} = vi.hoisted(() => {
  const callOrder: string[] = []

  const mockReturning = vi.fn(() => {
    callOrder.push("returning")
    return Promise.resolve([{ id: "account-1" }])
  })
  const mockUpdateWhere = vi.fn(() => {
    callOrder.push("update-where")
    return { returning: mockReturning }
  })
  const mockSet = vi.fn(() => ({ where: mockUpdateWhere }))
  const mockUpdate = vi.fn(() => {
    callOrder.push("update")
    return { set: mockSet }
  })

  const mockDeleteWhere = vi.fn(() => {
    callOrder.push("delete-where")
    return Promise.resolve()
  })
  const mockDelete = vi.fn(() => {
    callOrder.push("delete")
    return { where: mockDeleteWhere }
  })

  const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ update: mockUpdate, delete: mockDelete })
  )

  const mockEq = vi.fn((a: unknown, b: unknown) => ({ __eq: true, a, b }))
  const mockAnd = vi.fn((...conds: unknown[]) => ({ __and: true, conds }))

  return {
    mockRequireAdmin: vi.fn(),
    mockGenerateTempPassword: vi.fn(),
    mockHashPassword: vi.fn(),
    mockUpdate,
    mockSet,
    mockUpdateWhere,
    mockReturning,
    mockDelete,
    mockDeleteWhere,
    mockTransaction,
    mockEq,
    mockAnd,
    callOrder,
  }
})

vi.mock("@/lib/db", () => ({ db: { transaction: mockTransaction } }))
vi.mock("@/lib/admin", () => ({
  requireAdmin: mockRequireAdmin,
  generateTempPassword: mockGenerateTempPassword,
}))
vi.mock("better-auth/crypto", () => ({ hashPassword: mockHashPassword }))
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: mockEq, and: mockAnd }
})
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))

import { resetUserPassword } from "@/lib/actions/admin"
import { account, session } from "@/db/schema"

describe("resetUserPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    callOrder.length = 0
    mockRequireAdmin.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
    })
    mockGenerateTempPassword.mockReturnValue("busy-bee-1234")
    mockHashPassword.mockResolvedValue("scrypt$salt$hash")
    mockReturning.mockImplementation(() => {
      callOrder.push("returning")
      return Promise.resolve([{ id: "account-1" }])
    })
  })

  it("rethrows when requireAdmin throws Forbidden and never mutates", async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error("Forbidden"))

    await expect(resetUserPassword("user-1")).rejects.toThrow("Forbidden")
    expect(mockHashPassword).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("rethrows when requireAdmin throws Unauthorized and never mutates", async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error("Unauthorized"))

    await expect(resetUserPassword("user-1")).rejects.toThrow("Unauthorized")
    expect(mockHashPassword).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("rejects with validation error on empty userId; never touches db or hash", async () => {
    await expect(resetUserPassword("")).rejects.toThrow()
    expect(mockHashPassword).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("rejects on non-string userId", async () => {
    await expect(
      resetUserPassword(undefined as unknown as string)
    ).rejects.toThrow()
    await expect(
      resetUserPassword(123 as unknown as string)
    ).rejects.toThrow()
    expect(mockHashPassword).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("calls hashPassword exactly once with the value from generateTempPassword", async () => {
    await resetUserPassword("user-1")
    expect(mockHashPassword).toHaveBeenCalledTimes(1)
    expect(mockHashPassword).toHaveBeenCalledWith("busy-bee-1234")
  })

  it("calls db.transaction exactly once", async () => {
    await resetUserPassword("user-1")
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it("inside the transaction, tx.update(account) is called with hashed password and credential filter", async () => {
    await resetUserPassword("user-1")

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(account)

    expect(mockSet).toHaveBeenCalledTimes(1)
    const setArg = (mockSet.mock.calls[0] as unknown as [{ password: string; updatedAt: Date }])[0]
    expect(setArg.password).toBe("scrypt$salt$hash")
    expect(setArg.password).not.toBe("busy-bee-1234")
    expect(setArg.updatedAt).toBeInstanceOf(Date)

    expect(mockUpdateWhere).toHaveBeenCalledTimes(1)
    const whereArg = (mockUpdateWhere.mock.calls[0] as unknown as [unknown])[0]
    expect(whereArg).toMatchObject({ __and: true })

    expect(mockAnd).toHaveBeenCalledTimes(1)
    const andConds = mockAnd.mock.calls[0] as unknown as unknown[]
    expect(andConds).toHaveLength(2)

    const eqCalls = mockEq.mock.calls
    expect(eqCalls.length).toBeGreaterThanOrEqual(2)
    const eqValues = eqCalls.map((c) => c[1])
    expect(eqValues).toContain("user-1")
    expect(eqValues).toContain("credential")
  })

  it("inside the transaction, tx.delete(session) is called with eq(session.userId, userId)", async () => {
    await resetUserPassword("user-1")

    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockDelete).toHaveBeenCalledWith(session)

    expect(mockDeleteWhere).toHaveBeenCalledTimes(1)
    const deleteWhereArg = (mockDeleteWhere.mock.calls[0] as unknown as [unknown])[0]
    expect(deleteWhereArg).toMatchObject({ __eq: true, b: "user-1" })
  })

  it("invokes tx.update BEFORE tx.delete (D-06 ordering)", async () => {
    await resetUserPassword("user-1")

    const updateIdx = callOrder.indexOf("update")
    const deleteIdx = callOrder.indexOf("delete")
    expect(updateIdx).toBeGreaterThanOrEqual(0)
    expect(deleteIdx).toBeGreaterThanOrEqual(0)
    expect(updateIdx).toBeLessThan(deleteIdx)
  })

  it("returns { tempPassword } matching the bee-themed format", async () => {
    const result = await resetUserPassword("user-1")
    expect(result).toEqual({ tempPassword: "busy-bee-1234" })
    expect(result.tempPassword).toMatch(/^[a-z]+-[a-z]+-\d{4}$/)
  })

  it("never logs the plaintext temp password via any console method", async () => {
    const spies = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
    }

    try {
      const { tempPassword } = await resetUserPassword("user-1")

      for (const [name, spy] of Object.entries(spies)) {
        for (const call of spy.mock.calls) {
          for (const arg of call) {
            const asString = typeof arg === "string" ? arg : JSON.stringify(arg)
            expect(
              asString.includes(tempPassword),
              `console.${name} was called with plaintext tempPassword`
            ).toBe(false)
          }
        }
      }
    } finally {
      for (const spy of Object.values(spies)) spy.mockRestore()
    }
  })

  it("does not embed the plaintext tempPassword in a thrown error", async () => {
    mockTransaction.mockImplementationOnce(async () => {
      throw new Error("DB exploded with secret busy-bee-1234 still in scope")
    })

    let caught: unknown
    try {
      await resetUserPassword("user-1")
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(Error)
    const msg = (caught as Error).message
    expect(msg).not.toContain("busy-bee-1234")
  })

  it("WR-01: rejects and skips session delete when update affects zero rows", async () => {
    // Simulate a user with no credential-provider account row.
    mockReturning.mockImplementationOnce(() => {
      callOrder.push("returning")
      return Promise.resolve([])
    })

    await expect(resetUserPassword("user-1")).rejects.toThrow("Password reset failed")

    // Update was attempted but session delete must NOT have run.
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockDelete).not.toHaveBeenCalled()
    expect(mockDeleteWhere).not.toHaveBeenCalled()
  })
})
