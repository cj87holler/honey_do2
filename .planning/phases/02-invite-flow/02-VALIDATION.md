---
phase: 2
slug: invite-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | HIVE-03 | unit | `npx vitest run tests/invite/generate-invite.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | HIVE-03 | unit | `npx vitest run tests/invite/generate-invite.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | HIVE-04 | unit | `npx vitest run tests/invite/accept-invite.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | HIVE-04 | unit | `npx vitest run tests/invite/accept-invite.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | HIVE-04 | unit | `npx vitest run tests/invite/accept-invite.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | HIVE-04 | unit | `npx vitest run tests/invite/invite-page.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | HIVE-04 | unit | `npx vitest run tests/invite/invite-page.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/invite/generate-invite.test.ts` — stubs for HIVE-03 (generate + invalidate prior)
- [ ] `tests/invite/accept-invite.test.ts` — stubs for HIVE-04 (atomic consume, expiry, race condition)
- [ ] `tests/invite/invite-page.test.tsx` — stubs for HIVE-04 UI states (welcome card, expired, already-in-hive)
- [ ] `tests/invite/helpers.ts` — shared mock DB fixtures for invite tests

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Copy-to-clipboard works | HIVE-03 | Clipboard API requires browser context | Click invite button, verify link copies to clipboard |
| Invite landing page shows Hive + Queen name | HIVE-04 | Visual verification | Open invite link in incognito, verify welcome card content |
| Full signup-through-invite flow | HIVE-04 | E2E user journey | Follow invite link, sign up, verify lands on Hive dashboard as Bee |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
