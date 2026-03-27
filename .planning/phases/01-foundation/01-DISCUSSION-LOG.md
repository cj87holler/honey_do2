# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 01-foundation
**Areas discussed:** Post-signup flow, Hive creation UX, Role visibility, Dev/deployment setup

---

## Post-Signup Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Create-a-Hive prompt | Land on a "Start your Hive!" page — assumes you're a Queen if you signed up directly | ✓ |
| Empty dashboard | Show main dashboard with a "Create a Hive" CTA | |
| Onboarding wizard | Multi-step flow: name Hive, pick display name, quick tour | |

**User's choice:** Create-a-Hive prompt
**Notes:** None

---

### Post-Hive-creation landing

| Option | Description | Selected |
|--------|-------------|----------|
| Hive dashboard | Main Hive view — empty but ready, shows Hive name and Queen as only member | ✓ |
| Invite page | Go straight to "Invite your Bees!" — but invite flow is Phase 2 | |
| Settings/profile page | Let them configure Hive or profile first | |

**User's choice:** Hive dashboard
**Notes:** None

---

### Hive-less state

| Option | Description | Selected |
|--------|-------------|----------|
| No — force Hive creation | Direct signups must create a Hive to proceed. App has no useful state without one. | ✓ |
| Yes — allow limbo state | User can exist without a Hive, sees a "Create or Join" screen | |

**User's choice:** No — force Hive creation
**Notes:** None

---

### Multi-Hive support

| Option | Description | Selected |
|--------|-------------|----------|
| One Hive only for v1 | Simpler data model, no Hive switcher. Multi-Hive could be v2. | ✓ |
| Multiple Hives from the start | Requires Hive switcher and more complex role management | |

**User's choice:** One Hive only for v1
**Notes:** None

---

## Hive Creation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Single-field inline | Just a Hive name field + "Create" button. Minimal friction. | ✓ |
| Short form page | Dedicated page with Hive name + optional description or emoji picker | |
| Modal/dialog | Pop-up modal over the post-signup screen | |

**User's choice:** Single-field inline
**Notes:** None

---

### Hive rename

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — anytime | Queen can rename from Hive settings area. Simple and expected. | ✓ |
| Yes — with confirmation | Rename requires confirmation step | |
| No — name is permanent | Set once at creation | |

**User's choice:** Yes — anytime
**Notes:** None

---

### Hive settings placement

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal settings page | Simple /hive/settings page with Hive name edit | |
| Inline on dashboard | Editable Hive name directly on dashboard — click-to-edit | |
| You decide | Claude picks whatever fits | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

---

## Role Visibility

### Role display

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle label/badge | Small tag next to user name (e.g., crown for Queen, bee for Bee) | ✓ |
| Prominent role identity | Different colored cards, role-specific greetings, role shown everywhere | |
| Minimal — implied by actions | Don't label roles, just show/hide buttons based on permissions | |

**User's choice:** Subtle label/badge
**Notes:** None

---

### Role model simplification

**User-initiated change:** Original PRD had three roles (Queen, Bee, QueenBee). User found the three-role model confusing during discussion and proposed simplifying to two roles.

**New model decided:**
- Queen: Creates/assigns tasks, can receive tasks, can assign to anyone (Queens + Bees + self)
- Bee: Receives and completes tasks only
- QueenBee: Dropped from v1

**Rationale:** Husband/wife scenario works with both as Queens. Parent/kids works as Queen + Bees.

---

### Role changes

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — Queen can promote/demote | Any Queen can change a Bee to Queen or vice versa | ✓ |
| Only the Hive creator can | Original Queen is the "admin" | |
| No role changes in v1 | Role set when joining | |

**User's choice:** Yes — Queen can promote/demote
**Notes:** None

---

## Dev/Deployment Setup

### Local PostgreSQL

User clarified they use **OrbStack** (Docker runtime) and **Beekeeper Studio** (DB GUI). Docker Compose is the natural fit — OrbStack runs the Postgres container, Beekeeper connects to localhost:5432.

**Decision:** Docker Compose with OrbStack

---

### Deployment target

User initially asked about AWS Amplify. After research revealed Auth.js v5 middleware conflicts with Amplify's CloudFront Function limits (10KB code, 5ms execution), user chose Vercel + Neon instead.

**Decision:** Vercel + Neon (accounts to be created before first deploy)

---

### Makefile commands

| Option | Description | Selected |
|--------|-------------|----------|
| Basics only | make dev, make db-reset, make db-migrate | |
| Full suite | Add make lint, make test, make build, make seed, make db-studio | |
| You decide | Claude picks what makes sense | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

---

## Claude's Discretion

- Hive settings page vs inline edit
- Makefile command suite design

## Deferred Ideas

- Multi-Hive support — v2+
- QueenBee role — dropped from v1, could return
- Vercel + Neon account creation — pre-deploy checklist item
