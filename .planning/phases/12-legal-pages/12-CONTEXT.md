# Phase 12: Legal Pages — Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Visitors can read Honey_Do's privacy and terms commitments before signing up, from pages linked
off the landing page.

In scope: a public `/privacy` page, a public `/terms` page, and visible links to both from the
landing page footer.

Out of scope: LEGAL-04 (naming Sentry as a sub-processor with an accurate description of what it
receives) — deliberately deferred to Phase 16, see below. Also out: cookie consent banners, an
in-app account-deletion feature, and any GDPR/CCPA-specific rights machinery.
</domain>

<disclaimer>
## This Is Drafted Text, Not Legal Advice

These pages are written to be *honest and specific about what this application actually does*,
grounded in the real database schema rather than boilerplate. They are not reviewed by a lawyer
and should not be treated as legally sufficient for a commercial product. The user has been told
this explicitly and should read both pages before real users rely on them.
</disclaimer>

<decisions>
## Implementation Decisions

### Contact address — a dedicated alias, not the personal Gmail

**Decision: `honeydoapp@gmail.com`**, referenced from a single exported constant so it can be
changed in one place.

The user chose a dedicated alias over publishing their personal address (`cj87holler@gmail.com`)
on a public page. There is no custom domain yet (deferred out of v1.2), so a `@honeydoapp.com`
address is not available; a Gmail alias matching the Linear workspace name is the closest real
option.

**Open item:** this mailbox must actually exist before the pages are shown to real users, because
it is the only route for deletion requests. Flagged in the summary and STATE.md.

### Governing law — omitted

**Decision: no governing-law or dispute-resolution clause in the Terms.**

Honey_Do is a free hobby app with no payments, no commercial relationship, and no revenue.
Naming the wrong jurisdiction is worse than naming none, and the clause is trivial to add later
if the app ever monetizes.

### Account deletion — honest about the absence of a feature

The app has **no delete-account feature**. The Privacy Policy must not imply one exists. It states
that deletion is requested by email and performed manually, which is the truth.

### Sentry — generic language only

Per the ROADMAP note, this phase deliberately does **not** satisfy LEGAL-04. Sentry is not yet
integrated (Phase 16). The sub-processor section names Vercel and Neon accurately and describes
error tracking in forward-looking generic terms. Phase 16 rewrites that paragraph once Sentry's
PII-scrubbing config (OBS-03) is locked in.

### Claude's Discretion

- Page layout and section ordering, matching the existing bee-theme landing page styling
- Whether the two pages share a layout component
- Exact copy and tone (informative and plain, lightly bee-themed but not jokey — legal pages are
  where the playfulness should yield to clarity)
- "Last updated" date handling
</decisions>

<code_context>
## What the App Actually Collects (read from `src/db/schema.ts`)

This is the factual basis for the Privacy Policy. Boilerplate would understate it.

| Table | Personal data |
|---|---|
| `user` | `name`, `email`, `emailVerified`, `image` (unused), created/updated timestamps |
| `session` | session `token`, **`ipAddress`**, **`userAgent`**, expiry |
| `account` | `password` (hashed by Better Auth / scrypt), unused OAuth token columns |
| `verification` | `identifier`, `value`, expiry |
| `hives` | hive name |
| `hiveMembers` | `honeyCount`, `joinedAt` |
| `tasks` | `text` (160 chars, **free-form user content**), `honeyValue`, `status`, creator, assignee, `completedAt` |
| `invites` | `token`, creator, who redeemed it, expiry |

Two things a generic template would miss and that the page must disclose:

1. **IP address and user agent are stored** on every session row.
2. **Task text is free-form** — users can type anything into 160 characters, so the policy cannot
   claim the app only holds structured data.

### Admin capability — must be disclosed

`ADMIN_EMAILS` (see `src/lib/admin.ts`) grants holders the ability to list **all** users and
hives, and to reset **any** user's password. That is a real access path to other people's data and
belongs in the policy.

### Sub-processors (actual, verified)

- **Vercel** — application hosting
- **Neon** — PostgreSQL database hosting
- *Sentry* — not yet integrated; generic language only this phase (see decision above)

## Routing and Layout Facts

- `src/middleware.ts` protects only `/hive`. Its matcher excludes `api`, `_next/*`, and
  `favicon.ico`. **Top-level `/privacy` and `/terms` are public by default** — no middleware
  change is needed. Verify rather than assume.
- Route groups in use: `(admin)`, `(app)` (has Header + auth), `(auth)`, plus public `invite/` and
  the root `page.tsx`. Legal pages belong as plain top-level routes, matching `invite/` — NOT
  inside `(app)`, which would apply the authenticated header.
- The landing page already ends with a minimal footer in
  `src/components/landing/landing-page.tsx`:
  `Honey Do — making chores buzz-worthy since 2026`. That is the natural, already-existing home
  for the two links — no new layout region needed.
</code_context>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` → LEGAL-01, LEGAL-02, LEGAL-03 (LEGAL-04 → Phase 16)
- `.planning/ROADMAP.md` → "Phase 12: Legal Pages", including the explicit LEGAL-04 deferral note
- `src/db/schema.ts` → the factual basis for every data claim in the policy
- `src/components/landing/landing-page.tsx` → existing footer, bee-theme styling to match
- `src/middleware.ts` → confirms public routes need no change
</canonical_refs>

<deferred>
- LEGAL-04 — accurate Sentry sub-processor description (Phase 16)
- In-app account deletion — real product gap; policy is honest that it is manual for now
- Cookie consent banner — the app sets only a session cookie, strictly necessary
- Custom domain and a matching `@honeydoapp.com` address — deferred out of v1.2
</deferred>
