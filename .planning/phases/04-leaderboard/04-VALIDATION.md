---
phase: 4
slug: leaderboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run tests/hive/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/hive/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | LEAD-01 | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | LEAD-01 | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | LEAD-01 | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | LEAD-01 | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | LEAD-01 | unit | `npx vitest run tests/hive/leaderboard.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/hive/leaderboard.test.tsx` — stubs for LEAD-01 scenarios (rank sorting, ties, crown emoji, honey display, all-zero state, single member)
- [ ] `tests/hive/` directory — new directory for Hive component tests

*Existing infrastructure (Vitest, testing-library, happy-dom) covers all phase requirements — no new packages needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Leaderboard updates after task completion | LEAD-01 | Requires server action + revalidatePath flow | 1. Complete a task 2. Verify dashboard shows updated honey count |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
