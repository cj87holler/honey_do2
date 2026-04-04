// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/actions/invite", () => ({
  generateInvite: vi.fn(),
}))

import { Leaderboard, assignRanks } from "@/components/hive/leaderboard"

const threeMembers = [
  { id: "m1", name: "Alice", role: "queen" as const, honeyCount: 30 },
  { id: "m2", name: "Bob", role: "bee" as const, honeyCount: 10 },
  { id: "m3", name: "Carol", role: "bee" as const, honeyCount: 20 },
]

const tiedMembers = [
  { id: "m1", name: "Alice", role: "queen" as const, honeyCount: 20 },
  { id: "m2", name: "Bob", role: "bee" as const, honeyCount: 20 },
  { id: "m3", name: "Carol", role: "bee" as const, honeyCount: 5 },
]

const zeroMembers = [
  { id: "m1", name: "Alice", role: "queen" as const, honeyCount: 0 },
  { id: "m2", name: "Bob", role: "bee" as const, honeyCount: 0 },
]

const singleMember = [
  { id: "m1", name: "Alice", role: "queen" as const, honeyCount: 0 },
]

describe("Leaderboard", () => {
  it("Test 1: Members sorted by honeyCount descending — [30, 10, 20] renders as [30, 20, 10]", () => {
    render(<Leaderboard members={threeMembers} isQueen={true} hiveId="hive-1" />)
    const items = screen.getAllByRole("listitem")
    // Alice (30) first, Carol (20) second, Bob (10) third
    expect(items[0].textContent).toContain("Alice")
    expect(items[1].textContent).toContain("Carol")
    expect(items[2].textContent).toContain("Bob")
  })

  it("Test 2: Ties get same rank — two members with 20 honeys both show rank 1, third shows rank 3", () => {
    const ranked = assignRanks(tiedMembers)
    expect(ranked[0].rank).toBe(1)
    expect(ranked[1].rank).toBe(1)
    expect(ranked[2].rank).toBe(3)
  })

  it("Test 3: Rank 1 member row contains crown emoji", () => {
    render(<Leaderboard members={threeMembers} isQueen={false} hiveId="hive-1" />)
    const crownSpan = screen.getByLabelText("Rank 1")
    expect(crownSpan.textContent).toContain("👑")
  })

  it("Test 4: Honey counts display with jar emoji — '45 🍯' format", () => {
    const memberWith45 = [
      { id: "m1", name: "Alice", role: "queen" as const, honeyCount: 45 },
    ]
    render(<Leaderboard members={memberWith45} isQueen={false} hiveId="hive-1" />)
    expect(screen.getByText(/45/)).toBeTruthy()
    expect(screen.getByText("🍯")).toBeTruthy()
  })

  it("Test 5: All-zero state — when every member has 0 honeys, nudge message appears", () => {
    render(<Leaderboard members={zeroMembers} isQueen={false} hiveId="hive-1" />)
    const nudge = screen.getByText(/No honeys yet — time to get buzzy!/)
    expect(nudge).toBeTruthy()
    // The nudge paragraph should contain the bee emoji (aria-hidden span)
    expect(nudge.textContent).toContain("🐝")
  })

  it("Test 6: Single member shows at rank 1 with no special messaging", () => {
    render(<Leaderboard members={singleMember} isQueen={false} hiveId="hive-1" />)
    const crownSpan = screen.getByLabelText("Rank 1")
    expect(crownSpan.textContent).toContain("👑")
    // No "no other members" type message
    expect(screen.queryByText(/No other members/)).toBeNull()
  })

  it("Test 7: Role badges render for each member (RoleBadge component is called)", () => {
    render(<Leaderboard members={threeMembers} isQueen={false} hiveId="hive-1" />)
    // Alice is queen, Bob and Carol are bees
    expect(screen.getByText("Queen")).toBeTruthy()
    const beeBadges = screen.getAllByText("Bee")
    expect(beeBadges.length).toBe(2)
  })
})
