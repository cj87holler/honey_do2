---
phase: 7
slug: landing-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + React Testing Library 16.3.2 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run tests/landing/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/landing/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | LAND-01 | — | N/A | unit | `npx vitest run tests/landing/landing-page.test.tsx` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | LAND-02 | — | N/A | unit | `npx vitest run tests/landing/landing-page.test.tsx` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | LAND-03 | — | N/A | unit | `npx vitest run tests/landing/landing-page.test.tsx` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | LAND-04 | — | Session read is server-side; redirect target hardcoded | manual | manual — requires live session | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/landing/landing-page.test.tsx` — stubs for LAND-01, LAND-02, LAND-03

*Existing test infrastructure covers framework needs; only the new test file is missing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Logged-in user redirected to /hive | LAND-04 | Server Component `redirect()` cannot be unit-tested with RTL | 1. Log in as any user. 2. Navigate to `/`. 3. Confirm redirect to `/hive`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
