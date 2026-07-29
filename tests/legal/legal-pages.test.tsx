// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

import { PrivacyPolicy } from "@/components/legal/privacy-policy"
import { TermsOfUse } from "@/components/legal/terms-of-use"
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal"

// These assert the SUBSTANCE of the disclosures, not that the pages render. A test that only
// checked for a heading would pass against boilerplate, which is exactly the failure mode worth
// guarding against here.

describe("PrivacyPolicy (LEGAL-01)", () => {
  it("renders as a Privacy Policy page", () => {
    render(<PrivacyPolicy />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/privacy policy/i)
  })

  it("discloses that IP address and user agent are stored", () => {
    render(<PrivacyPolicy />)
    expect(document.body.textContent).toMatch(/IP address/i)
    expect(document.body.textContent).toMatch(/user agent/i)
  })

  it("discloses that task text is free-form and unfiltered user content", () => {
    render(<PrivacyPolicy />)
    expect(document.body.textContent).toMatch(/free-form/i)
    expect(document.body.textContent).toMatch(/not reviewed or filtered/i)
  })

  it("discloses administrator access to all users and password resets", () => {
    render(<PrivacyPolicy />)
    const text = document.body.textContent ?? ""
    expect(text).toMatch(/administrator/i)
    expect(text).toMatch(/all registered users/i)
    expect(text).toMatch(/reset any user/i)
  })

  it("names Vercel and Neon as the services that process data", () => {
    render(<PrivacyPolicy />)
    expect(document.body.textContent).toMatch(/Vercel/)
    expect(document.body.textContent).toMatch(/Neon/)
  })

  // Guards against Phase 16 drift: Sentry is not integrated yet, so the policy must not imply it
  // is currently receiving data. LEGAL-04 rewrites this section once OBS-03 is configured.
  it("does not claim Sentry is currently in use", () => {
    render(<PrivacyPolicy />)
    expect(document.body.textContent).not.toMatch(/Sentry/i)
  })

  it("states deletion is a manual email request, not a self-serve feature", () => {
    render(<PrivacyPolicy />)
    const text = document.body.textContent ?? ""
    expect(text).toMatch(/no self-serve/i)
    expect(text).toContain(LEGAL_CONTACT_EMAIL)
  })
})

describe("TermsOfUse (LEGAL-02)", () => {
  it("renders as a Terms of Use page", () => {
    render(<TermsOfUse />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/terms of use/i)
  })

  it("states the service is provided as is with no warranty", () => {
    render(<TermsOfUse />)
    const text = document.body.textContent ?? ""
    expect(text).toMatch(/as is/i)
    expect(text).toMatch(/no warranty|without warranty/i)
  })

  it("sets acceptable-use expectations for unmoderated task text", () => {
    render(<TermsOfUse />)
    expect(document.body.textContent).toMatch(/not moderated or filtered/i)
  })

  // Locked decision: no jurisdiction is named, because naming the wrong one is worse than none.
  it("contains no governing-law or jurisdiction clause", () => {
    render(<TermsOfUse />)
    const text = document.body.textContent ?? ""
    expect(text).not.toMatch(/governing law/i)
    expect(text).not.toMatch(/jurisdiction/i)
  })

  it("surfaces the shared contact address", () => {
    render(<TermsOfUse />)
    expect(document.body.textContent).toContain(LEGAL_CONTACT_EMAIL)
  })
})
