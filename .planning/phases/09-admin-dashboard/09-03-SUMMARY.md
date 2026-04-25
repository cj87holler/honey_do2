---
phase: 09-admin-dashboard
plan: 03
subsystem: admin
tags: [admin, password, utility, tdd, vitest]

# Dependency graph
requires:
  - phase: 09-admin-dashboard
    provides: src/lib/admin.ts module (Plan 01 created isAdminEmail + requireAdmin)
provides:
  - generateTempPassword(): string — pure, synchronous bee-themed temp password generator
  - Curated l-free word lists (20 adjectives x 20 nouns)
affects:
  - 09-04-reset-action  # will consume generateTempPassword in the resetUserPassword server action

# Tech tracking
tech-stack:
  added: []  # no new npm deps — pure TypeScript, uses Math.random
  patterns:
    - "Pure synchronous utility function pattern (no IO, no logging)"
    - "Curated word list with ambiguity-avoidance (l/I/1, O/0, B/8 excluded from letter portion)"
    - "Math.random() accepted for single-use temp credentials per threat model T-9-08"

key-files:
  created:
    - tests/admin/generate-temp-password.test.ts
  modified:
    - src/lib/admin.ts

key-decisions:
  - "Replaced 12 words containing lowercase 'l' from research draft with l-free bee-themed alternatives to satisfy the must_haves ambiguity truth"
  - "Math.random() retained (not crypto.randomInt) — threat model T-9-08 explicitly accepts ~21.8 bits for single-use passwords"
  - "BEE_ADJECTIVES and BEE_NOUNS kept as module-private const (not exported) — implementation detail"

patterns-established:
  - "Randomness sanity test (>=20 distinct outputs across 200 calls) as a cheap statistical check"
  - "Letter-portion isolation via split('-') for targeted regex assertion"

requirements-completed: [ADMIN-03]
# ADMIN-03 (temp password substrate) is delivered by this plan.
# End-to-end ADMIN-03 flow completes in Plan 04 when resetUserPassword consumes this function.

# Metrics
duration: ~2 min 18s
completed: 2026-04-24
---

# Phase 9 Plan 3: generateTempPassword utility

**Bee-themed temp password generator `{adjective}-{noun}-{4digit}` appended to `src/lib/admin.ts`; 7 Vitest cases cover format, length, ambiguous-character exclusion, randomness, and suffix range.**

## Performance

- **Duration:** ~2 min 18s
- **Started:** 2026-04-24T20:58:37Z
- **Completed:** 2026-04-24T21:00:55Z
- **Tasks:** 2 (both `type="auto"` with `tdd="true"`; produced RED + GREEN commits)
- **Files created:** 1
- **Files modified:** 1

## Accomplishments

- `src/lib/admin.ts` now exports `generateTempPassword(): string` alongside the Plan 01 exports (`isAdminEmail`, `requireAdmin`).
- 7 passing unit tests in `tests/admin/generate-temp-password.test.ts` covering format regex, minimum length (1000 iterations), type, ambiguous-character exclusion (500 iterations), letter-portion character class (500 iterations), randomness (≥20 distinct of 200), and suffix range (500 iterations).
- All 11 Plan 01 regression tests still pass — Plan 01 exports untouched.
- Curated word lists (20×20) are module-private; entropy unchanged at ~21.8 bits (3.6M combinations).

## Task Commits

Each task was committed atomically. Task 1 is the RED step, Task 2 is the GREEN step.

1. **Task 1 RED: Failing tests for generateTempPassword** — `1e236b4` (test)
2. **Task 2 GREEN: generateTempPassword implementation** — `6ee60b5` (feat)

## Files Created/Modified

- `tests/admin/generate-temp-password.test.ts` — `// @vitest-environment node`; 7 Vitest cases importing `generateTempPassword` from `@/lib/admin`; 500–1000 iterations per statistical assertion; no env manipulation needed (function is pure).
- `src/lib/admin.ts` — appended `BEE_ADJECTIVES`, `BEE_NOUNS` (module-private consts) and `generateTempPassword()` export. Plan 01's `parseAdminEmails`, `isAdminEmail`, `requireAdmin`, and the module-scope `ADMIN_EMAILS` constant are unmodified.

## Decisions Made

- **Replaced 12 words from the research draft to remove lowercase `l`.** The plan's interfaces section asserted "none of these 40 words contain `0 O 1 l I B`", but the verbatim lists did contain `l` in `golden`, `royal`, `wild`, `bold`, `gentle`, `calm`, `lush`, `pollen`, `flow`, `cell`, `bloom`, and `clover`. Since the must_haves truth is explicit ("no visually ambiguous characters (0, O, 1, l, I, B)") and Test 4 asserts `expect(pw).not.toMatch(/[OIBl]/)`, the contract takes precedence. Replacements: `merry, grand, spry, quick, tender, cozy, ripe` (adjectives) and `nest, dance, crown, garden, stamen` (nouns). All bee-themed and l-free. Entropy preserved (20 × 20 × 9000 = 3.6M).
- **Kept `Math.random()` rather than introducing `crypto.randomInt`.** Per threat model T-9-08 in the plan, ~21.8 bits of entropy is explicitly accepted for single-use temp passwords that the user rotates on first sign-in. Over-engineering avoided.
- **Did not export `BEE_ADJECTIVES` / `BEE_NOUNS`.** They are implementation detail; exposing them would invite downstream callers to depend on specific words.
- **No logging in the generator.** Threat T-9-03 (information disclosure) demands the function itself never logs the plaintext. Caller (Plan 04) is responsible for safe downstream handling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Curated word lists contained lowercase `l`, contradicting the must_haves ambiguity truth**

- **Found during:** Task 2 — the first GREEN test run emitted `swift-flow-5688` and failed the `/[OIBl]/` assertion.
- **Issue:** The plan's word lists (stated verbatim twice in the plan) included 12 words containing lowercase `l`, but the must_haves truth and Test 4 both required the generator to never emit `O`, `I`, `B`, or `l`. The plan was internally contradictory.
- **Fix:** Replaced the 12 offending words with l-free bee-themed alternatives (see "Decisions Made" above). Kept all 20+20 list sizes so entropy, test expectations, and downstream contract are unchanged.
- **Files modified:** `src/lib/admin.ts`
- **Commit:** `6ee60b5` (the GREEN commit incorporates the fix)

## Issues Encountered

**Worktree branch base was incorrect at session start.**

- **Discovered:** Immediately via the `worktree_branch_check` step.
- **Cause:** The worktree was initially based on `f51f1f0` (main) rather than the required post-Plan-01 HEAD `0be8ff9`.
- **Resolution:** Ran `git reset --soft 0be8ff93f265f28ed3f0d3820ce53b9d4e563c1e`, then `git reset HEAD && git checkout HEAD -- .` to restore files from the correct base. Verified `src/lib/admin.ts` contained Plan 01's `isAdminEmail` and `requireAdmin` exports before starting.
- **Impact:** None on code output — a pre-execution branch hygiene step.

## Deferred Issues

None introduced by this plan. The pre-existing TypeScript errors in `tests/task/update-task-status.test.ts` (already logged by Plan 01 to `.planning/phases/09-admin-dashboard/deferred-items.md`) remain — they are outside this plan's scope and were not caused by these changes.

## Known Stubs

None. `generateTempPassword` is a complete, production-ready pure function.

## User Setup Required

None. No external services, no env vars, no configuration. The function is a pure library primitive.

## Next Phase Readiness

**Ready for Plan 04** (reset password action):
- Plan 04 can `import { generateTempPassword, requireAdmin } from "@/lib/admin"` and call both — the module re-exports are complete.
- Format guarantees: matches `/^[a-z]+-[a-z]+-\d{4}$/`, length ≥ 13, contains no ambiguous letter characters. Plan 04 can expose the generated plaintext exactly once to the admin UI per D-05.

## Self-Check: PASSED

**Files verified exist on disk:**
- `src/lib/admin.ts` — FOUND (contains `generateTempPassword`, `isAdminEmail`, `requireAdmin`)
- `tests/admin/generate-temp-password.test.ts` — FOUND (`@vitest-environment node` on line 1)

**Commits verified in git log:**
- `1e236b4` (test RED for generateTempPassword) — FOUND
- `6ee60b5` (feat GREEN for generateTempPassword) — FOUND

**Acceptance-criteria greps all pass:**
- `grep -E "^export function generateTempPassword" src/lib/admin.ts` → 1 match
- `grep -F "const BEE_ADJECTIVES" src/lib/admin.ts` → 1 match
- `grep -E "^export (const|function) BEE_" src/lib/admin.ts` → 0 matches
- `grep -E "^export (function|async function) (isAdminEmail|requireAdmin)" src/lib/admin.ts` → 2 matches
- `grep -n "console\." src/lib/admin.ts` → 0 matches
- Ambiguity audit: `printf %s "$BEE_WORDS" | grep -E "[lIBO]"` → 0 matches on both lists

**Test suite:** `npm test -- tests/admin/generate-temp-password.test.ts tests/admin/is-admin-email.test.ts --run` → 18/18 passing (7 Plan 03 + 11 Plan 01 regression).

**TypeScript:** `npx tsc --noEmit` → zero errors in `src/lib/admin.ts` and `tests/admin/generate-temp-password.test.ts` (the only errors are the pre-existing ones in `tests/task/update-task-status.test.ts` already deferred by Plan 01).

---
*Phase: 09-admin-dashboard*
*Completed: 2026-04-24*
