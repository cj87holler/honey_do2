# Phase 2: Invite Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 02-invite-flow
**Areas discussed:** Invite sharing UX, Invite landing page, Token rules, Joined-user experience

---

## Invite Sharing UX

### How should the Queen share the invite link?

| Option | Description | Selected |
|--------|-------------|----------|
| Copy link button | Simple button, generates link, copies to clipboard. No email infra needed. | ✓ |
| Copy link + email input | Copy button plus optional email field. Requires email service. | |
| Share sheet (native) | Web Share API on mobile, copy fallback on desktop. | |

**User's choice:** Copy link button
**Notes:** Lowest friction, no email infrastructure needed for v1.

### Where should the invite button live?

| Option | Description | Selected |
|--------|-------------|----------|
| In the member list section | Near member list, contextually obvious. Dashboard already says "Start by inviting..." | ✓ |
| Top-level action button | In dashboard header area, more visible but takes prime real estate. | |
| You decide | Claude picks based on layout. | |

**User's choice:** In the member list section

### When the Queen clicks "Invite", what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline link reveal | Generates link, reveals inline with copy button. No modal. | ✓ |
| Small dialog/modal | Centered dialog with link and copy button. | |
| You decide | Claude picks interaction pattern. | |

**User's choice:** Inline link reveal

---

## Invite Landing Page

### What should the invite landing page look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Welcome card + signup below | Top section shows invite info, signup form below. One page. | ✓ |
| Two-step: preview then signup | Preview screen first, then signup on "Join" click. | |
| Full-page splash | Big bee-themed welcome, signup as secondary element. | |

**User's choice:** Welcome card + signup below

### What if someone who already has an account clicks an invite link?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-join if logged in | Skip signup if logged in, show "Log in to join" if logged out. | ✓ |
| Always show signup form | No special handling for existing users. | |
| Detect and redirect | Check if email registered, redirect to login. | |

**User's choice:** Auto-join if logged in

### What about the one-Hive-per-user rule?

| Option | Description | Selected |
|--------|-------------|----------|
| Block with friendly message | "You're already in [Hive]. Leave it first to join [New Hive]." | ✓ |
| Silently switch Hives | Remove from old, add to new. Seamless but risky. | |
| You decide | Claude picks simplest approach. | |

**User's choice:** Block with friendly message

---

## Token Rules

### How long should an invite link stay valid?

| Option | Description | Selected |
|--------|-------------|----------|
| 7 days | Plenty of time, not too long. | |
| 24 hours | Tight window, forces urgency. Queen can regenerate. | ✓ |
| 30 days | Very relaxed. | |
| No expiry, single-use only | Works until used. Simpler but links linger. | |

**User's choice:** 24 hours

### Can the Queen generate multiple invite links at once?

| Option | Description | Selected |
|--------|-------------|----------|
| One active link at a time | New link invalidates the old one. Simple. | ✓ |
| Multiple active links | Independent link per person. More flexible. | |
| You decide | Claude picks for simplicity. | |

**User's choice:** One active link at a time

### What happens when an expired or used invite link is visited?

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly error + signup link | "This invite has expired. Ask [Queen] for a new link." Plus regular signup link. | ✓ |
| Redirect to homepage | Silently bounce. Simpler but less informative. | |
| You decide | Claude picks UX for invalid tokens. | |

**User's choice:** Friendly error + signup link

---

## Joined-User Experience

### Where does a newly joined Bee land?

| Option | Description | Selected |
|--------|-------------|----------|
| Hive dashboard directly | Lands on dashboard, sees member list. No onboarding. They're in. | ✓ |
| Welcome screen first | Brief explainer before dashboard. | |
| You decide | Claude picks based on flow patterns. | |

**User's choice:** Hive dashboard directly

### Should the Queen see a notification when a Bee joins?

**User's choice:** No notification — member list updates naturally on next page load.
**Notes:** User wants in-app notifications and email notifications noted as future features, not for this phase.

---

## Claude's Discretion

- Invite token format and length (nanoid available)
- Database schema design for invites table
- Exact layout/styling of invite landing page
- Error handling for edge cases
- URL structure for invite routes

## Deferred Ideas

- In-app notifications (join alerts, task assignments) — future phase
- Email notifications (invites, joins, assignments) — future phase, requires email service
- Multi-use invite links — consider for v2
- QR code sharing — low priority
