// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock("lucide-react", () => ({
  Hexagon: () => <svg data-testid="icon-hexagon" />,
  ClipboardList: () => <svg data-testid="icon-clipboard" />,
  Trophy: () => <svg data-testid="icon-trophy" />,
}))

import { LandingPage } from "@/components/landing/landing-page"

describe("LandingPage", () => {
  it("renders hero heading with bee theme and signup CTA (LAND-01)", () => {
    render(<LandingPage />)
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy()
    const signupLinks = screen.getAllByRole("link", { name: /join|sign up|hive/i })
    expect(signupLinks.length).toBeGreaterThanOrEqual(1)
    expect(signupLinks[0].getAttribute("href")).toBe("/signup")
  })

  it("renders 3 how-it-works steps (LAND-02)", () => {
    render(<LandingPage />)
    expect(screen.getByText("Create a Hive")).toBeTruthy()
    expect(screen.getByText("Assign Tasks")).toBeTruthy()
    expect(screen.getByText("Earn Honeys")).toBeTruthy()
  })

  it("renders 'already buzzin' sign-in link pointing to /login (LAND-03)", () => {
    render(<LandingPage />)
    const signinText = screen.getByText(/already buzzin/i)
    expect(signinText).toBeTruthy()
    // The sign-in link within the final CTA section
    const loginLinks = screen.getAllByRole("link", { name: /sign in/i })
    const finalCtaLogin = loginLinks.find(l => l.getAttribute("href") === "/login")
    expect(finalCtaLogin).toBeTruthy()
  })

  it("renders header sign-in link (D-03, D-06)", () => {
    render(<LandingPage />)
    const headerSignIn = screen.getAllByRole("link", { name: /sign in/i })
    expect(headerSignIn.length).toBeGreaterThanOrEqual(1)
    expect(headerSignIn[0].getAttribute("href")).toBe("/login")
  })

  it("renders signup CTA in both hero and final sections (D-08)", () => {
    render(<LandingPage />)
    const signupLinks = screen.getAllByRole("link").filter(
      l => l.getAttribute("href") === "/signup"
    )
    expect(signupLinks.length).toBeGreaterThanOrEqual(2)
  })
})
