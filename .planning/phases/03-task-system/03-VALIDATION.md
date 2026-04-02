---
phase: 3
slug: task-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8 seconds |

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
| 03-01-01 | 01 | 1 | TASK-01 | unit | `npx vitest run tests/task/create-task.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | TASK-02 | unit | `npx vitest run tests/task/create-task.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | TASK-03 | unit | `npx vitest run tests/task/create-task.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | TASK-05 | unit | `npx vitest run tests/task/update-task-status.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | TASK-06 | unit | `npx vitest run tests/task/update-task-status.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | TASK-04 | unit | `npx vitest run tests/task/honeycomb.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | TASK-07 | unit | `npx vitest run tests/task/honeycomb.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/task/create-task.test.ts` — stubs for TASK-01, TASK-02, TASK-03 (create, honey value, assignee)
- [ ] `tests/task/update-task-status.test.ts` — stubs for TASK-05, TASK-06 (status transitions, honey award, transaction)
- [ ] `tests/task/honeycomb.test.tsx` — stubs for TASK-04, TASK-07 (honeycomb rendering, completed section)
- [ ] `tests/task/helpers.ts` — shared mock fixtures (hive, members, tasks)

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline task form on dashboard | TASK-01 | Visual layout verification | Log in as Queen, verify form visible with text input, assignee picker, honey buttons |
| Honey value picker UX | TASK-02 | Visual/interaction verification | Click 5/10/20 buttons, verify selection state; click Custom, enter value |
| Honeycomb filters correctly | TASK-04 | E2E with multiple users | Create tasks assigned to different members, verify each sees only their tasks in "Your Honeycomb" |
| Completed section collapses | TASK-07 | Visual behavior | Complete a task, verify it moves to collapsible "Completed" section |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
