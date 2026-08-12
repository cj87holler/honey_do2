---
phase: 14
slug: structured-logging
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `14-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.2 (existing — 13 files / 89 tests green per STATE.md baseline) |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run tests/logger` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | quick ~2s · full ~20s |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/logger`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green, plus the manual production-build smoke test below
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (planner fills) | 01 | 0 | OBS-05 | T-14-01 | Test harness can capture pino output via injected `Writable` destination | unit | `npx vitest run tests/logger` | ❌ W0 | ⬜ pending |
| TBD (planner fills) | 01 | 1 | OBS-05 (crit. 2) | T-14-01 | Session/request-shaped object logs with cookies, passwords, session tokens, `DATABASE_URL` censored | unit | `npx vitest run tests/logger/redaction.test.ts` | ❌ W0 | ⬜ pending |
| TBD (planner fills) | 01 | 1 | OBS-05 (crit. 2 / Pitfall 2) | T-14-01 | `DATABASE_URL` embedded as free text inside an error `.message`/`.stack` is scrubbed, not only the object-keyed path | unit | `npx vitest run tests/logger/redaction.test.ts` | ❌ W0 | ⬜ pending |
| TBD (planner fills) | 01 | 1 | OBS-05 (crit. 3) | — | Production logger config has no `transport` key; dev config uses `pino-pretty` | unit | `npx vitest run tests/logger/config.test.ts` | ❌ W0 | ⬜ pending |
| TBD (planner fills) | 02 | 2 | OBS-05 (crit. 1) | — | Auth, task-mutation, invite, and admin server actions/routes emit through the shared logger | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD (planner fills) | 02 | 2 | OBS-05 (crit. 4) | — | `src/middleware.ts` contains no import of the logger module (Edge runtime) | unit (source assertion) | `npx vitest run tests/logger/config.test.ts` | ❌ W0 | ⬜ pending |
| TBD (planner fills) | 02 | 2 | OBS-05 (V5 log injection) | T-14-02 | User-controlled task text containing `\n` is JSON-escaped in the `msg` field, not emitted as a literal newline | unit | `npx vitest run tests/logger/redaction.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Planner note:** replace `TBD` with real task IDs (`14-01-01` …) when plans are written. Every row above must map to at least one task.

---

## Wave 0 Requirements

- [ ] `tests/logger/redaction.test.ts` — OBS-05 criterion 2, the `DATABASE_URL`-in-error-message case (Pitfall 2), and the log-injection escaping assertion
- [ ] `tests/logger/config.test.ts` — OBS-05 criterion 3 (no `transport` key in prod config, `pino-pretty` in dev) and criterion 4 (middleware source assertion)
- [ ] `captureLogger` helper — a `Writable`/`PassThrough` destination injected into `pino(options, stream)` so assertions run against parsed JSON lines. Inline per file, or extract to `tests/logger/helpers.ts` following the existing `tests/task/helpers.ts` convention.
- [ ] **Design dependency:** `src/lib/logger.ts` must export a `createLogger(options, stream?)` factory that the singleton wraps, so tests can inject a capture stream. Research flagged this as a planner decision — if the planner instead chooses to export only the config object and construct a throwaway pino in tests, update this row to match.

*No framework install needed — vitest is already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production bundle resolves `pino` at runtime (Turbopack + Vercel externalized-package alias risk, RESEARCH Pitfall 3 — LOW confidence, single unconfirmed source) | OBS-05 | CI deliberately never runs `npm run build` (build is `drizzle-kit migrate && next build`, which needs a live DB), and preview deployments cannot build on this project | Locally: `NODE_ENV=production npm run build && npm run start`, hit a route that logs, confirm JSON appears on stdout with no module-resolution error |
| Vercel runtime logs show one JSON object per line | OBS-05 | Requires a real production deploy; not reproducible in vitest | After merge to `main`, open the Vercel deployment's Runtime Logs and confirm entries parse as JSON with redacted fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`vitest run`, never bare `vitest`)
- [ ] Feedback latency < 20s
- [ ] No new `npx tsc --noEmit` errors beyond the 4 pre-existing ones in `tests/task/update-task-status.test.ts`
- [ ] No new `npx eslint .` warnings — CI runs `--max-warnings 0`
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
