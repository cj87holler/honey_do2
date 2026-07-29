// Throwaway: deliberate type error to prove the CI gate blocks merges. Delete after verifying.
import { describe, it, expect } from "vitest"

describe("ci gate proof", () => {
  it("fails typecheck on purpose", () => {
    const n: number = "this is not a number"
    expect(n).toBe(1)
  })
})
