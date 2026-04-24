// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS

async function loadIsAdminEmail(envValue: string | undefined) {
  vi.resetModules()
  if (envValue === undefined) {
    delete process.env.ADMIN_EMAILS
  } else {
    process.env.ADMIN_EMAILS = envValue
  }
  const mod = await import("@/lib/admin")
  return mod.isAdminEmail
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  if (ORIGINAL_ADMIN_EMAILS === undefined) {
    delete process.env.ADMIN_EMAILS
  } else {
    process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS
  }
})

describe("isAdminEmail", () => {
  it("returns true for exact match", async () => {
    const isAdminEmail = await loadIsAdminEmail("admin@example.com")
    expect(isAdminEmail("admin@example.com")).toBe(true)
  })

  it("returns true for case-mismatch between input and env entry (D-03)", async () => {
    const isAdminEmail = await loadIsAdminEmail("admin@example.com")
    expect(isAdminEmail("ADMIN@Example.COM")).toBe(true)
  })

  it("returns true when input has surrounding whitespace (D-03)", async () => {
    const isAdminEmail = await loadIsAdminEmail("admin@example.com")
    expect(isAdminEmail("  admin@example.com  ")).toBe(true)
  })

  it("returns true when env entry has surrounding whitespace (D-03)", async () => {
    const isAdminEmail = await loadIsAdminEmail(" admin@example.com , other@example.com ")
    expect(isAdminEmail("admin@example.com")).toBe(true)
    expect(isAdminEmail("other@example.com")).toBe(true)
  })

  it("returns true for second email in a comma-separated list", async () => {
    const isAdminEmail = await loadIsAdminEmail("a@x.com,admin@example.com")
    expect(isAdminEmail("admin@example.com")).toBe(true)
  })

  it("returns false for non-match", async () => {
    const isAdminEmail = await loadIsAdminEmail("admin@example.com")
    expect(isAdminEmail("stranger@example.com")).toBe(false)
  })

  it("returns false when ADMIN_EMAILS is unset (D-02)", async () => {
    const isAdminEmail = await loadIsAdminEmail(undefined)
    expect(isAdminEmail("admin@example.com")).toBe(false)
  })

  it("returns false when ADMIN_EMAILS is empty string (D-02)", async () => {
    const isAdminEmail = await loadIsAdminEmail("")
    expect(isAdminEmail("admin@example.com")).toBe(false)
  })

  it("returns false when ADMIN_EMAILS is only commas/whitespace (D-02)", async () => {
    const isAdminEmail = await loadIsAdminEmail(", , ,")
    expect(isAdminEmail("admin@example.com")).toBe(false)
  })

  it("returns false for empty email input", async () => {
    const isAdminEmail = await loadIsAdminEmail("admin@example.com")
    expect(isAdminEmail("")).toBe(false)
  })

  it("returns false for whitespace-only email input", async () => {
    const isAdminEmail = await loadIsAdminEmail("admin@example.com")
    expect(isAdminEmail("   ")).toBe(false)
  })
})
