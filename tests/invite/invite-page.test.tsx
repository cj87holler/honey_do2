// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

// Use vi.hoisted so mock factories are available when vi.mock is hoisted
const {
  mockGetInviteByToken,
  mockGetExpiredInvitePreview,
  mockGetUserHive,
  mockAcceptInvite,
  mockGetSession,
  mockRedirect,
} = vi.hoisted(() => {
  return {
    mockGetInviteByToken: vi.fn(),
    mockGetExpiredInvitePreview: vi.fn(),
    mockGetUserHive: vi.fn(),
    mockAcceptInvite: vi.fn(),
    mockGetSession: vi.fn(),
    mockRedirect: vi.fn(),
  }
})

vi.mock("@/lib/queries/invite", () => ({
  getInviteByToken: mockGetInviteByToken,
  getExpiredInvitePreview: mockGetExpiredInvitePreview,
}))

vi.mock("@/lib/queries/hive", () => ({
  getUserHive: mockGetUserHive,
}))

vi.mock("@/lib/actions/invite", () => ({
  acceptInvite: mockAcceptInvite,
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

vi.mock("@/components/invite/invite-signup-form", () => ({
  InviteSignupForm: ({ token, hiveId, hiveName }: { token: string; hiveId: string; hiveName: string }) => {
    // Return a plain object simulating JSX for node environment
    return { type: "div", props: { "data-testid": "invite-signup-form", "data-token": token, "data-hive-id": hiveId, "data-hive-name": hiveName } }
  },
}))

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => {
    return { type: "a", props: { href }, children }
  },
}))

// Import InvitePage after all mocks are set up
import InvitePage from "@/app/invite/[token]/page"

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

const validInvite = {
  id: "inv-1",
  hiveId: "hive-1",
  hiveName: "Test Hive",
  queenName: "Queen Bee",
  expiresAt: futureDate,
  token: "abc123",
}

describe("InvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: redirect throws to simulate Next.js behavior
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })
  })

  it("shows welcome card for valid token with logged-out visitor", async () => {
    mockGetInviteByToken.mockResolvedValue(validInvite)
    mockGetSession.mockResolvedValue(null)

    const result = await InvitePage({ params: Promise.resolve({ token: "abc123" }) })

    // Inspect the JSX tree as a plain object — server component returns React element
    const resultStr = JSON.stringify(result)
    expect(resultStr).toContain("You have been invited to join")
    expect(resultStr).toContain("Test Hive")
    expect(resultStr).toContain("Queen Bee")
    // InviteSignupForm is mocked — verify its props are passed (token, hiveId)
    expect(resultStr).toContain('"token":"abc123"')
    expect(resultStr).toContain('"hiveId":"hive-1"')
  })

  it("shows expired message with Queen name for expired/used token", async () => {
    mockGetInviteByToken.mockResolvedValue(null)
    mockGetExpiredInvitePreview.mockResolvedValue({ hiveName: "Test Hive", queenName: "Queen Bee" })

    const result = await InvitePage({ params: Promise.resolve({ token: "expired-token" }) })

    const resultStr = JSON.stringify(result)
    expect(resultStr).toContain("This invite has expired")
    expect(resultStr).toContain("Queen Bee")
    expect(resultStr).toContain("Test Hive")
  })

  it("shows generic expired message for completely unknown token", async () => {
    mockGetInviteByToken.mockResolvedValue(null)
    mockGetExpiredInvitePreview.mockResolvedValue(null)

    const result = await InvitePage({ params: Promise.resolve({ token: "unknown-token" }) })

    const resultStr = JSON.stringify(result)
    expect(resultStr).toContain("This invite has expired")
    expect(resultStr).toContain("Ask the Queen for a new invite link")
  })

  it("auto-joins logged-in visitor with no Hive and redirects", async () => {
    mockGetInviteByToken.mockResolvedValue(validInvite)
    mockGetSession.mockResolvedValue({
      user: { id: "user-2", name: "New Bee", email: "bee@test.com" },
    })
    mockGetUserHive.mockResolvedValue(null)
    mockAcceptInvite.mockResolvedValue("hive-1")

    await expect(
      InvitePage({ params: Promise.resolve({ token: "abc123" }) })
    ).rejects.toThrow("NEXT_REDIRECT:/hive/hive-1")

    expect(mockAcceptInvite).toHaveBeenCalledWith("abc123", "user-2")
    expect(mockRedirect).toHaveBeenCalledWith("/hive/hive-1")
  })
})
