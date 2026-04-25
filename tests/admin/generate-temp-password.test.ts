// @vitest-environment node
import { describe, it, expect } from "vitest"
import { generateTempPassword } from "@/lib/admin"

describe("generateTempPassword", () => {
  it("matches pattern /^[a-z]+-[a-z]+-\\d{4}$/", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateTempPassword()).toMatch(/^[a-z]+-[a-z]+-\d{4}$/)
    }
  })

  it("is always at least 8 characters", () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateTempPassword().length).toBeGreaterThanOrEqual(8)
    }
  })

  it("is always a string", () => {
    for (let i = 0; i < 50; i++) {
      expect(typeof generateTempPassword()).toBe("string")
    }
  })

  it("contains no visually ambiguous LETTER characters (O, I, B, l)", () => {
    for (let i = 0; i < 500; i++) {
      const pw = generateTempPassword()
      expect(pw).not.toMatch(/[OIBl]/)
    }
  })

  it("letter portion contains only lowercase a-z and hyphens", () => {
    for (let i = 0; i < 500; i++) {
      const pw = generateTempPassword()
      const [adj, noun] = pw.split("-")
      expect(adj).toMatch(/^[a-z]+$/)
      expect(noun).toMatch(/^[a-z]+$/)
    }
  })

  it("produces varied output across 200 calls (randomness sanity)", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) seen.add(generateTempPassword())
    expect(seen.size).toBeGreaterThanOrEqual(20)
  })

  it("suffix digits are in range 1000-9999", () => {
    for (let i = 0; i < 500; i++) {
      const pw = generateTempPassword()
      const suffix = pw.slice(-4)
      const n = parseInt(suffix, 10)
      expect(n).toBeGreaterThanOrEqual(1000)
      expect(n).toBeLessThanOrEqual(9999)
    }
  })
})
