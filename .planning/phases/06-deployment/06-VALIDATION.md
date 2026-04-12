---
phase: 6
slug: deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DEPLOY-01 | — | N/A | smoke | `npm run build` | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | DEPLOY-01 | — | N/A | regression | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.
- No new test files needed — deployment is validated by successful Vercel deploy + smoke test.
- Existing test suite serves as regression guard during build.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App accessible on public Vercel URL | DEPLOY-01 | Requires live deployment | Visit the `.vercel.app` URL, verify page loads |
| Neon PostgreSQL connected with production schema | DEPLOY-01 | Requires provisioned infra | Sign up on live URL, verify account persists |
| Auth flow works in production | DEPLOY-01 | Requires live deployment | Create account, log in, log out, log back in |
| Auto-deploy from main | DEPLOY-01 | Requires Vercel CI pipeline | Push commit to main, observe Vercel dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
