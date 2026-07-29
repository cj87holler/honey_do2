---
phase: 12-legal-pages
plan: 01
subsystem: legal
tags: [legal, privacy, terms, public-routes, ui]

# Dependency graph
requires:
  - phase: 07-landing-page
    provides: LandingPage component and its footer, bee-theme styling to match
provides:
  - "Public /privacy page — Privacy Policy grounded in the real database schema, reachable without authentication"
  - "Public /terms page — Terms of Use, reachable without authentication"
  - "Privacy disclosures a boilerplate policy would miss: sessions store IP address and user agent, task text is free-form unfiltered user content, and admin-email holders can list all users/hives and reset any password"
  - "src/lib/legal.ts — single source for the legal contact address and last-updated date"
  - "LegalPageShell + LegalSection components providing consistent chrome for both documents"
  - "Landing page footer links to /privacy and /terms"
  - "Disclosure tests that assert substance, including a guard that the policy does not claim Sentry is in use before Phase 16"
affects: [16-sentry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Legal pages are plain top-level routes, not in the (app) group — the (app) layout applies the authenticated header"
    - "Route file stays a thin wrapper around a presentational component, mirroring page.tsx -> LandingPage, which keeps the content unit-testable"

key-files:
  created:
    - src/lib/legal.ts
    - src/components/legal/legal-page-shell.tsx
    - src/components/legal/privacy-policy.tsx
    - src/components/legal/terms-of-use.tsx
    - src/app/privacy/page.tsx
    - src/app/terms/page.tsx
    - tests/legal/legal-pages.test.tsx
  modified:
    - src/components/landing/landing-page.tsx
    - tests/landing/landing-page.test.tsx

metrics:
  duration: ~20 minutes
  completed: 2026-07-28
---

# Phase 12 Plan 01: Legal Pages

**One-liner:** Public `/privacy` and `/terms` pages, written from the actual database schema rather than a template, linked from the landing page footer.

## Tasks Completed

| Task | Name | Commit |
|------|------|--------|
| 1 | Legal constants and the Privacy Policy page | 82bd108 |
| 2 | The Terms of Use page | 82bd108 |
| 3 | Footer links and tests | 82bd108 |

## Success Criteria — Final Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `/privacy` shows a Privacy Policy while logged out | **Met** — HTTP 200, content verified |
| 2 | `/terms` shows a Terms of Use while logged out | **Met** — HTTP 200, content verified |
| 3 | Landing page links to both | **Met** — both hrefs present in served HTML |

Requirements LEGAL-01, LEGAL-02, LEGAL-03 satisfied. LEGAL-04 remains with Phase 16 by design.

## What Makes This Policy Different From Boilerplate

The content was derived from `src/db/schema.ts`. Three disclosures a generic template would have
omitted, each of which is true of this app:

1. **Sessions store IP address and user agent.** The `session` table has `ipAddress` and
   `userAgent` columns populated on every row.
2. **Task text is free-form user content.** `tasks.text` is a 160-character varchar that users can
   fill with anything, and nothing filters it. The policy says so and advises against putting
   sensitive information there.
3. **Administrators can read everything and reset any password.** `ADMIN_EMAILS` holders can list
   all users and all hives and reset any user's password (`src/lib/admin.ts`). That is a genuine
   access path to other people's data, so it is stated plainly rather than omitted.

The policy also avoids claims that would be false: no "we never share your data" absolute (the
sub-processor list contradicts it), no GDPR/CCPA rights machinery that is not implemented, and no
implication that a self-serve account-deletion feature exists — because it does not. Deletion is
described honestly as a manual email request.

## Decisions Applied

- **Contact address** — `honeydoapp@gmail.com`, held in one exported constant so it changes in one
  place once a custom domain exists. See the open item below.
- **No governing-law clause** in the Terms. Honey_Do is free with no payments; naming the wrong
  jurisdiction is worse than naming none. A test asserts the absence so it is not added by
  accident.
- **Sentry not named.** It is not integrated until Phase 16, so the error-tracking paragraph is
  forward-looking only. A test asserts the string "Sentry" does not appear, which will fail loudly
  in Phase 16 and force LEGAL-04 to be addressed deliberately.

## Verification

- `npx vitest run` — **14 files / 102 tests pass** (up from 13 / 89; 13 new tests).
- `npm run typecheck` — clean. `npx eslint . --max-warnings 0` — clean.
- **Verified against the running app, not just tests.** `curl` with no cookies:
  - `/privacy` → HTTP 200, containing "IP address", "user agent", "free-form",
    "administrator", "all registered users", "Vercel", "Neon", "no self-serve", and the contact
    address. Confirmed "Sentry" absent.
  - `/terms` → HTTP 200, containing "as is", "no warranty", "not moderated or filtered", and the
    contact address. Confirmed "governing law" and "jurisdiction" both absent.
  - `/` → both `href="/privacy"` and `href="/terms"` present.
- Confirmed `src/middleware.ts` guards only `/hive`, so no middleware change was needed — checked
  rather than assumed.

## Deviations from Plan

The plan allowed extracting page bodies into presentational components "if rendering them directly
proves awkward". That extraction was done up front rather than as a fallback, because it matches
the existing `page.tsx` → `LandingPage` pattern and made the disclosure tests straightforward.

## Known Limitations

- **`honeydoapp@gmail.com` may not exist yet.** It is the only route for deletion requests, so it
  must be a real, monitored inbox before these pages are shown to real users. **Open blocker.**
- **No visual verification.** The Claude browser extension was not connected, so the pages were
  verified by HTTP content only. The styling reuses the landing page's palette and container
  widths, but nobody has actually looked at them rendered. Worth a glance before merging.
- **Not legal advice.** These documents are honest and specific but were not reviewed by a lawyer.
- No in-app account deletion exists; the policy is honest about this but the product gap remains.
