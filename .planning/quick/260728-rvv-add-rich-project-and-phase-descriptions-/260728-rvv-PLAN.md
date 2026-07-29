---
phase: quick
plan: 260728-rvv
type: execute
wave: 1
depends_on: [260728-rl5]
files_modified:
  - scripts/linear-sync.mjs
autonomous: true
must_haves:
  truths:
    - "The Linear project has a rich markdown overview covering what Honey_Do is, its milestones, and its phase index"
    - "Every completed phase issue describes what was actually built, sourced from its plan SUMMARY.md files"
    - "Every not-yet-started phase issue describes what it is going to deliver, sourced from ROADMAP.md"
    - "Every plan sub-issue describes its objective, and its outcome once a SUMMARY.md exists"
    - "Description changes propagate on re-run — previously they did not, because upsertIssue compared only title and state"
    - "Re-running with no .planning/ changes still reports zero updates (no churn from Linear's markdown normalization)"
  artifacts:
    - path: "scripts/linear-sync.mjs"
      provides: "Description generation from SUMMARY.md/PLAN.md plus hash-based change detection"
      min_lines: 400
---

<objective>
Give the Linear mirror real narrative content: a project overview, and per-phase descriptions that
say what was built (for completed phases) or what will be built (for everything else).

Purpose: The user wants Linear to be readable as an overview of the project's whole arc, not just
a status board — including for phases that are already 100% complete.
Output: Enhanced `scripts/linear-sync.mjs` and a re-sync that backfills all 34 existing issues.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@scripts/linear-sync.mjs
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/07-landing-page/07-01-SUMMARY.md
@.planning/phases/09-admin-dashboard/09-02-PLAN.md
</context>

<decisions>
**Source of narrative content** — established by inspecting the real artifacts:

- *What was built* comes from the `provides:` block in each plan's `*-SUMMARY.md` frontmatter.
  Every existing summary has one, and the entries are already written as user-facing capability
  statements ("listAllUsers() — Drizzle read query returning ...").
- *What will be built* comes from the `**Goal**` and `**Success Criteria**` fields of the phase's
  ROADMAP.md detail block.
- *Plan objective* comes from the first paragraph of the `<objective>` block in `*-PLAN.md`.

**Change detection must be hash-based, not text comparison.** Linear normalizes markdown on write
(it rewrote `_italic_` as `*italic*` in the descriptions from the previous task). Comparing the
description we generate against the description Linear returns would therefore report a diff on
every single run and rewrite all 34 issues forever. Instead, store a hash of the *generated source*
in `.planning/linear-map.json` and update only when that hash changes. Issues matched by the title
fallback have no stored hash and are treated as needing an update once, which then converges.

**Project gets both fields.** Linear projects have a short plain-text `description` and a rich
markdown `content` document. The one-line core value goes in `description`; the full overview goes
in `content`.
</decisions>

<tasks>

<task type="auto">
  <name>Task 1: Generate narrative descriptions from SUMMARY.md and PLAN.md</name>
  <files>scripts/linear-sync.mjs</files>
  <action>
Add readers that extract, per plan:
- `provides:` list items from `*-SUMMARY.md` YAML frontmatter (a simple indentation-aware block
  reader — no YAML dependency, matching the script's zero-dependency constraint)
- the `**One-liner:**` line from the summary body
- the first paragraph of the `<objective>` block from `*-PLAN.md`

Rewrite `buildDescription(phase)` to branch on whether the phase has shipped work:
- phases with summaries lead with a `## What was built` section listing the aggregated `provides:`
  entries across that phase's plans, then `## Success criteria` (framed as verified)
- phases without lead with `## What this will deliver`, carrying the goal and success criteria
- both keep a `## Plans` checklist and the "synced, do not edit here" footer

Add `buildPlanDescription(plan)` producing the plan objective and, when a SUMMARY exists, the
one-liner and that plan's `provides:` entries.

Add `buildProjectContent(phases)` producing the project overview document: what Honey_Do is and
its core value (read from `.planning/PROJECT.md`), a milestone table, a phase index grouped by
milestone with derived states, and a note that `.planning/` is the source of truth.
  </action>
  <verify>node --check passes; --dry-run prints per-phase description sizes and shows non-empty "What was built" sections for phases 1-7 and 9</verify>
  <done>Descriptions generate correctly for done, in-flight, and not-started phases</done>
</task>

<task type="auto">
  <name>Task 2: Make description changes actually propagate</name>
  <files>scripts/linear-sync.mjs</files>
  <action>
Fix the bug that `upsertIssue` compares only title and state, so description edits never sync.

Add a `descHash` (SHA-256 of the generated description, via `node:crypto`) recorded per issue in
`.planning/linear-map.json`. Treat an issue as needing update when the stored hash differs from the
freshly generated one, or when no hash is stored. Do NOT compare against the description Linear
returns — see the decision note on markdown normalization.

Apply the same treatment to the project: sync `description` and `content` on every run when their
hash has changed, rather than only at creation time.

Re-run the sync to backfill all 34 existing issues, then run once more to confirm the run settles
to zero changes.
  </action>
  <verify>First re-run reports updates for all 34 issues plus the project; the immediately following run reports 0 changes</verify>
  <done>Descriptions propagate on change and produce no churn when nothing changed</done>
</task>

</tasks>

<deferred>
- Still manual-trigger only; no automation added in this pass
- Quick tasks, todos, and requirements are still not synced as issues
</deferred>
