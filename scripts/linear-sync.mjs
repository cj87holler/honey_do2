// One-way sync: GSD planning state (.planning/) -> Linear.
//
// .planning/ is the source of truth. Linear is a read-only dashboard over it — this script
// never writes back into .planning/, and anything you edit on a synced Linear issue gets
// overwritten on the next run. Change the roadmap instead.
//
// Usage:
//   make linear-sync            # reconcile for real
//   make linear-sync-dry        # print what would change, touch nothing
//   node scripts/linear-sync.mjs --check    # verify credentials + print resolved IDs
//
// Requires LINEAR_API_KEY (Linear -> Settings -> Security & access -> Personal API keys).

import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createHash } from "node:crypto"

const API_URL = "https://api.linear.app/graphql"
const TEAM_KEY = "HON"
const PROJECT_NAME = "Honey_Do"
const PLANNING_DIR = ".planning"
const PHASES_DIR = join(PLANNING_DIR, "phases")
const MAP_PATH = join(PLANNING_DIR, "linear-map.json")

const FOOTER =
  "\n\n---\n_Synced from `.planning/ROADMAP.md` by `make linear-sync`. " +
  "Edits made here are overwritten on the next sync — change the roadmap instead._"

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const CHECK_ONLY = args.includes("--check")

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
linear-sync — mirror GSD phases and plans into Linear (one-way).

  --dry-run   Print the reconciliation plan without mutating Linear
  --check     Verify the API key and print resolved team/state/project IDs, then exit
  --help      Show this message

Requires LINEAR_API_KEY in the environment (or in .env.local).
`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

// The Makefile loads .env.local for us, but read it here too so the script works
// when invoked directly with plain `node`.
function loadEnvLocal() {
  if (process.env.LINEAR_API_KEY) return
  if (!existsSync(".env.local")) return
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*(?:export\s+)?LINEAR_API_KEY\s*=\s*(.*)$/)
    if (!match) continue
    process.env.LINEAR_API_KEY = match[1].trim().replace(/^["']|["']$/g, "")
    return
  }
}

loadEnvLocal()

const API_KEY = process.env.LINEAR_API_KEY
if (!API_KEY) {
  console.error(
    [
      "LINEAR_API_KEY is not set.",
      "",
      "Generate a personal API key at:",
      "  Linear -> Settings -> Security & access -> Personal API keys",
      "",
      "Then add it to .env.local (gitignored):",
      "  LINEAR_API_KEY=lin_api_...",
    ].join("\n"),
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Linear GraphQL client
// ---------------------------------------------------------------------------

// Personal API keys go in the Authorization header raw; OAuth access tokens need "Bearer".
const authHeader = API_KEY.startsWith("lin_api_") ? API_KEY : `Bearer ${API_KEY}`

async function gql(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Linear API HTTP ${res.status}: ${body.slice(0, 400)}`)
  }
  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(`Linear API error: ${json.errors.map((e) => e.message).join("; ")}`)
  }
  return json.data
}

// ---------------------------------------------------------------------------
// Reading .planning/
// ---------------------------------------------------------------------------

const STATES = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
}

function readRoadmap() {
  const text = readFileSync(join(PLANNING_DIR, "ROADMAP.md"), "utf8")
  const lines = text.split("\n")

  const phases = []
  const details = new Map()

  let section = null // current "## " heading
  let milestone = null // current "### vX.Y" under "## Phases"
  let detailKey = null // phase number whose detail block we're inside
  let detailLines = []

  const flushDetail = () => {
    if (detailKey) details.set(detailKey, detailLines.join("\n"))
    detailKey = null
    detailLines = []
  }

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushDetail()
      section = line.slice(3).trim()
      milestone = null
      continue
    }

    if (line.startsWith("### ")) {
      flushDetail()
      const heading = line.slice(4).trim()
      if (section === "Phases") {
        const m = heading.match(/^(v\d+(?:\.\d+)*)/)
        milestone = m ? m[1] : null
      } else if (section === "Phase Details") {
        const m = heading.match(/^Phase\s+([\d.]+)\s*:/)
        if (m) detailKey = m[1]
      }
      continue
    }

    if (detailKey) {
      detailLines.push(line)
      continue
    }

    // Phase checklist rows live under "## Phases" inside a "### vX.Y" block.
    if (section === "Phases" && milestone) {
      const m = line.match(/^-\s*\[([ xX])\]\s*\*\*Phase\s+([\d.]+)\s*:\s*(.+?)\*\*\s*[-–—]?\s*(.*)$/)
      if (m) {
        phases.push({
          number: m[2],
          title: m[3].trim(),
          // Strip the trailing "(completed YYYY-MM-DD)" note the roadmap appends.
          blurb: m[4].replace(/\s*\(completed\s+[\d-]+\)\s*$/, "").trim(),
          done: m[1].toLowerCase() === "x",
          milestone,
        })
      }
    }
  }
  flushDetail()

  for (const phase of phases) {
    phase.detail = parseDetail(details.get(phase.number) ?? "")
  }
  return phases
}

function parseDetail(block) {
  const out = { goal: "", dependsOn: "", requirements: "", criteria: [], plans: [] }
  const lines = block.split("\n")
  let inCriteria = false

  for (const line of lines) {
    const field = line.match(/^\*\*(Goal|Depends on|Requirements)\*\*\s*:\s*(.*)$/)
    if (field) {
      inCriteria = false
      if (field[1] === "Goal") out.goal = field[2].trim()
      if (field[1] === "Depends on") out.dependsOn = field[2].trim()
      if (field[1] === "Requirements") out.requirements = field[2].trim()
      continue
    }
    if (/^\*\*Success Criteria\*\*/.test(line)) {
      inCriteria = true
      continue
    }
    if (/^\*\*/.test(line) || /^Plans:/.test(line)) inCriteria = false

    if (inCriteria) {
      const c = line.match(/^\s*\d+\.\s*(.+)$/)
      if (c) out.criteria.push(c[1].trim())
    }

    // "- [x] 07-01-PLAN.md — Session-aware root page with marketing landing page"
    const plan = line.match(/^-\s*\[([ xX])\]\s*(\d+-\d+)-PLAN\.md\s*[-–—]\s*(.*)$/)
    if (plan) {
      out.plans.push({ id: plan[2], done: plan[1].toLowerCase() === "x", title: plan[3].trim() })
    }
  }
  return out
}

function readState() {
  const path = join(PLANNING_DIR, "STATE.md")
  if (!existsSync(path)) return { activePhase: null, executing: false }
  const text = readFileSync(path, "utf8")

  const fm = text.match(/^---\n([\s\S]*?)\n---/)
  const status = fm?.[1].match(/^status:\s*(.+)$/m)?.[1].trim().toLowerCase() ?? ""

  const planLine = text.match(/^Plan:\s*(\d+-\d+)/m)
  const activePlan = planLine?.[1] ?? null

  const phaseLine = text.match(/^Phase:\s*([\d.]+)\s+of\s+[\d.]+\s*(.*)$/m)
  const activePhase = phaseLine?.[1] ?? null
  const trailing = (phaseLine?.[2] ?? "").toLowerCase()

  // Two independent signals that the active phase is actually being worked, not just queued.
  const executing =
    /^(executing|in[- ]progress)$/.test(status) || /executing|in progress|in-progress/.test(trailing)

  return { activePhase, activePlan, executing }
}

function findPhaseDir(number) {
  if (!existsSync(PHASES_DIR)) return null
  const padded = /^\d+$/.test(number) ? String(number).padStart(2, "0") : number
  const entries = readdirSync(PHASES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
  const hit = entries.find((name) => name === padded || name.startsWith(`${padded}-`))
  return hit ? join(PHASES_DIR, hit) : null
}

function inspectPhaseDir(dir) {
  if (!dir) return null
  const files = readdirSync(dir)
  const plans = files.filter((f) => /-PLAN\.md$/.test(f)).sort()
  const summaries = new Set(files.filter((f) => /-SUMMARY\.md$/.test(f)))
  return {
    files,
    plans,
    summaries,
    hasContext: files.some((f) => /-(CONTEXT|SPEC)\.md$/.test(f)),
    hasCheckpoint: files.some((f) => /^\.continue-here.*\.md$/.test(f)),
    planned: plans.length,
    summarized: plans.filter((p) => summaries.has(p.replace("-PLAN.md", "-SUMMARY.md"))).length,
  }
}

function handoffPhase() {
  const path = join(PLANNING_DIR, "HANDOFF.json")
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"))
    return parsed.phase != null ? String(parsed.phase) : null
  } catch {
    return null
  }
}

// Precedence-ordered status derivation. See the decision table in the quick-task PLAN.md.
function deriveState(phase, dir, info, state, handoff) {
  if (phase.done) return STATES.DONE
  if (!dir || !info || info.files.length === 0) return STATES.BACKLOG

  const active =
    info.hasCheckpoint ||
    handoff === phase.number ||
    (state.executing && state.activePhase === phase.number)
  if (active) return STATES.IN_PROGRESS

  if (info.planned > 0) {
    if (info.summarized === info.planned) return STATES.IN_REVIEW
    if (info.summarized > 0) return STATES.IN_PROGRESS
    return STATES.TODO
  }

  return info.hasContext ? STATES.TODO : STATES.BACKLOG
}

// --- Narrative sources -----------------------------------------------------
//
// "What was built" comes from each plan SUMMARY.md's `provides:` frontmatter block — those
// entries are already written as user-facing capability statements. "What will be built" comes
// from the roadmap goal and success criteria.

// Minimal indentation-aware reader for a `key:` list block in YAML frontmatter. The script has a
// zero-dependency constraint, and the blocks we need are all simple "- item" lists.
function readYamlListBlock(text, key) {
  const lines = text.split("\n")
  const start = lines.findIndex((l) => l.match(new RegExp(`^${key}:\\s*$`)))
  if (start === -1) return []
  const out = []
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break // dedent to column 0 ends the block
    const item = line.match(/^\s+-\s+(.*)$/)
    if (item) out.push(item[1].trim().replace(/^["']|["']$/g, ""))
    else if (line.trim() && !/^\s{4,}/.test(line)) break
  }
  return out
}

function readPlanArtifacts(dir, planId) {
  if (!dir) return { provides: [], oneLiner: "", objective: "" }
  const summaryPath = join(dir, `${planId}-SUMMARY.md`)
  const planPath = join(dir, `${planId}-PLAN.md`)

  let provides = []
  let oneLiner = ""
  if (existsSync(summaryPath)) {
    const text = readFileSync(summaryPath, "utf8")
    provides = readYamlListBlock(text, "provides")
    oneLiner = text.match(/^\*\*One-liner:\*\*\s*(.+)$/m)?.[1].trim() ?? ""
  }

  let objective = ""
  if (existsSync(planPath)) {
    const block = readFileSync(planPath, "utf8").match(/<objective>\n([\s\S]*?)\n<\/objective>/)
    // First paragraph only — the rest is Purpose/Output boilerplate.
    objective = block?.[1].trim().split(/\n\s*\n/)[0].replace(/\n/g, " ").trim() ?? ""
  }

  return { provides, oneLiner, objective }
}

function phasePlanIds(phase, info) {
  if (phase.detail.plans.length) return phase.detail.plans.map((p) => p.id)
  return (info?.plans ?? []).map((f) => f.replace("-PLAN.md", ""))
}

function buildDescription(phase, dir, info) {
  const d = phase.detail
  const parts = []

  if (d.goal) parts.push(`**Goal:** ${d.goal}`)
  else if (phase.blurb) parts.push(`**Goal:** ${phase.blurb}`)

  const meta = []
  if (d.dependsOn) meta.push(`**Depends on:** ${d.dependsOn}`)
  if (d.requirements) meta.push(`**Requirements:** ${d.requirements}`)
  if (meta.length) parts.push(meta.join(" · "))

  // Aggregate everything the phase's plans actually delivered.
  const built = []
  for (const planId of phasePlanIds(phase, info)) {
    built.push(...readPlanArtifacts(dir, planId).provides)
  }

  if (built.length) {
    parts.push(["## What was built", ...built.map((b) => `- ${b}`)].join("\n"))
    if (d.criteria.length) {
      parts.push(
        ["## Success criteria (verified)", ...d.criteria.map((c) => `- [x] ${c}`)].join("\n"),
      )
    }
  } else if (d.criteria.length) {
    parts.push(
      ["## What this will deliver", ...d.criteria.map((c) => `- [ ] ${c}`)].join("\n"),
    )
  }

  if (d.plans.length) {
    parts.push(
      [
        "## Plans",
        ...d.plans.map((p) => `- [${p.done ? "x" : " "}] \`${p.id}\` — ${p.title}`),
      ].join("\n"),
    )
  }

  return parts.join("\n\n") + FOOTER
}

function buildPlanDescription(phase, dir, plan) {
  const { provides, oneLiner, objective } = readPlanArtifacts(dir, plan.id)
  const parts = [`Plan \`${plan.id}-PLAN.md\` of **Phase ${phase.number}: ${phase.title}**.`]

  if (objective) parts.push(["## Objective", objective].join("\n\n"))
  if (oneLiner) parts.push(["## Outcome", oneLiner].join("\n\n"))
  if (provides.length) {
    parts.push(["## What it delivered", ...provides.map((p) => `- ${p}`)].join("\n"))
  }
  if (!objective && !oneLiner && !provides.length) {
    parts.push("_Not yet planned — no PLAN.md on disk._")
  }

  return parts.join("\n\n") + FOOTER
}

function buildProjectContent(phases, phaseStates) {
  const parts = []

  // Pull the human description straight from PROJECT.md rather than restating it here.
  const projectPath = join(PLANNING_DIR, "PROJECT.md")
  if (existsSync(projectPath)) {
    const text = readFileSync(projectPath, "utf8")
    const what = text.match(/## What This Is\n+([\s\S]*?)\n##/)?.[1].trim()
    const core = text.match(/## Core Value\n+([\s\S]*?)\n##/)?.[1].trim()
    if (what) parts.push(what)
    if (core) parts.push(`> **Core value:** ${core}`)
  }

  const milestones = [...new Set(phases.map((p) => p.milestone))]
  for (const milestone of milestones) {
    const inMilestone = phases.filter((p) => p.milestone === milestone)
    const done = inMilestone.filter((p) => p.done).length
    parts.push(
      [
        `## ${milestone} — ${done}/${inMilestone.length} phases complete`,
        "",
        "| Phase | State | Goal |",
        "|---|---|---|",
        ...inMilestone.map(
          (p) =>
            `| **${p.number}. ${p.title}** | ${phaseStates.get(p.number)} | ` +
            `${(p.detail.goal || p.blurb).replace(/\|/g, "\\|")} |`,
        ),
      ].join("\n"),
    )
  }

  parts.push(
    "---\n\n_This project is a read-only mirror of the GSD plan in `.planning/`. " +
      "Issue states are derived from what is on disk — phase directories, `*-PLAN.md`, and " +
      "`*-SUMMARY.md` files. Refresh with `make linear-sync`. Edits made here are overwritten._",
  )

  return parts.join("\n\n")
}

function hash(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16)
}

// ---------------------------------------------------------------------------
// Idempotency map
// ---------------------------------------------------------------------------

function loadMap() {
  if (!existsSync(MAP_PATH)) return { team: null, project: null, milestones: {}, issues: {} }
  try {
    const parsed = JSON.parse(readFileSync(MAP_PATH, "utf8"))
    return {
      team: parsed.team ?? null,
      project: parsed.project ?? null,
      milestones: parsed.milestones ?? {},
      issues: parsed.issues ?? {},
    }
  } catch {
    console.warn(`WARN  ${MAP_PATH} is unreadable — falling back to title matching.`)
    return { team: null, project: null, milestones: {}, issues: {} }
  }
}

function saveMap(map) {
  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n")
}

// ---------------------------------------------------------------------------
// Linear resolution
// ---------------------------------------------------------------------------

async function resolveTeam() {
  const data = await gql(
    `query Team($key: String!) {
       teams(filter: { key: { eq: $key } }, first: 1) { nodes { id key name } }
     }`,
    { key: TEAM_KEY },
  )
  const team = data.teams.nodes[0]
  if (!team) throw new Error(`No Linear team with key "${TEAM_KEY}" is visible to this API key.`)
  return team
}

async function resolveStates(teamId) {
  const data = await gql(
    `query States($teamId: String!) {
       team(id: $teamId) { states(first: 100) { nodes { id name type position } } }
     }`,
    { teamId },
  )
  const nodes = data.team.states.nodes
  const byName = (name) => nodes.find((s) => s.name.toLowerCase() === name.toLowerCase())
  const byType = (type) =>
    nodes.filter((s) => s.type === type).sort((a, b) => a.position - b.position)

  // Name match first so customized workflows keep working; fall back to Linear's
  // semantic state types when a workspace has renamed the defaults.
  const started = byType("started")
  const resolved = {
    [STATES.BACKLOG]: byName("Backlog") ?? byType("backlog")[0],
    [STATES.TODO]: byName("Todo") ?? byName("To Do") ?? byType("unstarted")[0],
    [STATES.IN_PROGRESS]: byName("In Progress") ?? started[0],
    [STATES.IN_REVIEW]: byName("In Review") ?? (started.length > 1 ? started[started.length - 1] : started[0]),
    [STATES.DONE]: byName("Done") ?? byType("completed")[0],
  }

  const missing = Object.entries(resolved)
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) {
    throw new Error(
      `Team ${TEAM_KEY} has no workflow state matching: ${missing.join(", ")}. ` +
        `Available: ${nodes.map((s) => `${s.name} (${s.type})`).join(", ")}`,
    )
  }
  if (resolved[STATES.IN_REVIEW].id === resolved[STATES.IN_PROGRESS].id) {
    console.warn(
      `WARN  Team ${TEAM_KEY} has no distinct "In Review" state — phases awaiting review will ` +
        `show as "${resolved[STATES.IN_PROGRESS].name}". Add an In Review state in Linear to ` +
        `separate them.`,
    )
  }
  return resolved
}

async function resolveProject(teamId, map) {
  const data = await gql(
    `query Projects($teamId: String!) {
       team(id: $teamId) { projects(first: 100) { nodes { id name url } } }
     }`,
    { teamId },
  )
  const existing = data.team.projects.nodes.find(
    (p) => p.id === map.project?.id || p.name === PROJECT_NAME,
  )
  if (existing) return existing

  // --check must never mutate, so it reports the gap instead of filling it.
  if (DRY_RUN || CHECK_ONLY) {
    console.log(`  + would create project "${PROJECT_NAME}"`)
    return { id: "(dry-run)", name: PROJECT_NAME, url: "" }
  }
  const created = await gql(
    `mutation CreateProject($input: ProjectCreateInput!) {
       projectCreate(input: $input) { success project { id name url } }
     }`,
    {
      input: {
        name: PROJECT_NAME,
        teamIds: [teamId],
        description: "Mirror of the GSD roadmap in .planning/. Synced by `make linear-sync`.",
      },
    },
  )
  console.log(`  + created project "${PROJECT_NAME}"`)
  return created.projectCreate.project
}

async function resolveMilestones(projectId, names, map) {
  if (projectId === "(dry-run)") {
    for (const n of names) console.log(`  + would create milestone "${n}"`)
    return Object.fromEntries(names.map((n) => [n, "(dry-run)"]))
  }
  const data = await gql(
    `query Milestones($projectId: String!) {
       project(id: $projectId) { projectMilestones(first: 100) { nodes { id name } } }
     }`,
    { projectId },
  )
  const existing = data.project.projectMilestones.nodes
  const out = {}

  for (const [index, name] of names.entries()) {
    const hit = existing.find((m) => m.id === map.milestones[name] || m.name === name)
    if (hit) {
      out[name] = hit.id
      continue
    }
    if (DRY_RUN) {
      console.log(`  + would create milestone "${name}"`)
      out[name] = "(dry-run)"
      continue
    }
    const created = await gql(
      `mutation CreateMilestone($input: ProjectMilestoneCreateInput!) {
         projectMilestoneCreate(input: $input) { success projectMilestone { id name } }
       }`,
      { input: { name, projectId, sortOrder: index * 100 } },
    )
    out[name] = created.projectMilestoneCreate.projectMilestone.id
    console.log(`  + created milestone "${name}"`)
  }
  return out
}

async function fetchProjectIssues(projectId) {
  if (projectId === "(dry-run)") return []
  const all = []
  let after = null
  for (;;) {
    const data = await gql(
      `query ProjectIssues($projectId: String!, $after: String) {
         project(id: $projectId) {
           issues(first: 100, after: $after) {
             nodes { id identifier title url state { id name } parent { id } }
             pageInfo { hasNextPage endCursor }
           }
         }
       }`,
      { projectId, after },
    )
    const page = data.project.issues
    all.push(...page.nodes)
    if (!page.pageInfo.hasNextPage) break
    after = page.pageInfo.endCursor
  }
  return all
}

// ---------------------------------------------------------------------------
// Issue upsert
// ---------------------------------------------------------------------------

async function upsertIssue({ key, existing, input, map, label }) {
  // Hash the description we generate, never the one Linear returns: Linear normalizes markdown
  // on write (it rewrites `_italic_` as `*italic*`), so a text comparison would report a diff on
  // every run and rewrite every issue forever.
  const descHash = hash(input.description)

  if (existing) {
    const stored = map.issues[key]
    const changes = []
    if (existing.title !== input.title) changes.push("title")
    if (existing.state?.id !== input.stateId) {
      changes.push(`state ${existing.state?.name} -> ${input.stateName}`)
    }
    // No stored hash means this issue was matched by the title fallback — sync its body once,
    // after which the recorded hash keeps it quiet.
    if (stored?.descHash !== descHash) changes.push("description")

    if (!changes.length) {
      console.log(`  = ${existing.identifier} ${label}`)
      map.issues[key] = { id: existing.id, identifier: existing.identifier, descHash }
      return { issue: existing, action: "unchanged" }
    }
    if (DRY_RUN) {
      console.log(`  ~ ${existing.identifier} ${label} (${changes.join(", ")})`)
      return { issue: existing, action: "updated" }
    }
    const { title, description, stateId, projectMilestoneId } = input
    const data = await gql(
      `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
         issueUpdate(id: $id, input: $input) { success issue { id identifier title url } }
       }`,
      { id: existing.id, input: { title, description, stateId, projectMilestoneId } },
    )
    const issue = data.issueUpdate.issue
    console.log(`  ~ ${issue.identifier} ${label} (${changes.join(", ")})`)
    map.issues[key] = { id: issue.id, identifier: issue.identifier, descHash }
    return { issue, action: "updated" }
  }

  if (DRY_RUN) {
    console.log(`  + would create ${label} [${input.stateName}]`)
    return { issue: null, action: "created" }
  }

  const { stateName, ...createInput } = input
  let data
  try {
    data = await gql(
      `mutation CreateIssue($input: IssueCreateInput!) {
         issueCreate(input: $input) { success issue { id identifier title url } }
       }`,
      { input: createInput },
    )
  } catch (err) {
    // Milestone assignment is the one field most likely to differ across API versions —
    // retry without it rather than failing the whole sync.
    if (!createInput.projectMilestoneId) throw err
    console.warn(`WARN  milestone assignment rejected for ${label} — creating without it.`)
    delete createInput.projectMilestoneId
    data = await gql(
      `mutation CreateIssue($input: IssueCreateInput!) {
         issueCreate(input: $input) { success issue { id identifier title url } }
       }`,
      { input: createInput },
    )
  }
  const issue = data.issueCreate.issue
  console.log(`  + ${issue.identifier} ${label} [${stateName}]`)
  map.issues[key] = { id: issue.id, identifier: issue.identifier, descHash }
  return { issue, action: "created" }
}

// The project carries both a short plain-text `description` and a rich markdown `content` doc.
async function syncProject(project, phases, phaseStates, map) {
  const core =
    readFileSync(join(PLANNING_DIR, "PROJECT.md"), "utf8")
      .match(/## Core Value\n+([\s\S]*?)\n##/)?.[1]
      .trim()
      .replace(/\s+/g, " ") ?? "Gamified household task management."
  // Linear caps the short description; keep well inside it.
  const description = core.length > 250 ? `${core.slice(0, 247)}...` : core
  const content = buildProjectContent(phases, phaseStates)
  const projectHash = hash(description + content)

  if (map.project?.descHash === projectHash) {
    console.log(`  = project overview unchanged`)
    return
  }
  if (DRY_RUN) {
    console.log(`  ~ would update project overview (${content.length} chars)`)
    return
  }
  await gql(
    `mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) {
       projectUpdate(id: $id, input: $input) { success project { id } }
     }`,
    { id: project.id, input: { description, content } },
  )
  console.log(`  ~ updated project overview (${content.length} chars)`)
  map.project = { name: project.name, id: project.id, descHash: projectHash }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!existsSync(join(PLANNING_DIR, "ROADMAP.md"))) {
  console.error(`No ${join(PLANNING_DIR, "ROADMAP.md")} found — run this from the project root.`)
  process.exit(1)
}

const map = loadMap()

console.log(`Resolving Linear team ${TEAM_KEY}...`)
const team = await resolveTeam()
const states = await resolveStates(team.id)
console.log(`  team    ${team.name} (${team.key}) ${team.id}`)
for (const name of Object.values(STATES)) {
  console.log(`  state   ${name.padEnd(12)} -> ${states[name].name} (${states[name].id})`)
}

const project = await resolveProject(team.id, map)
console.log(`  project ${project.name} ${project.id}`)

if (CHECK_ONLY) {
  console.log("\nConnectivity OK.")
  process.exit(0)
}

const phases = readRoadmap()
const state = readState()
const handoff = handoffPhase()

if (!phases.length) {
  console.error("Parsed 0 phases from ROADMAP.md — refusing to sync. Check the roadmap format.")
  process.exit(1)
}

// Resolve every phase's on-disk state up front — the project overview table needs them all
// before the first issue is touched.
const resolved = phases.map((phase) => {
  const dir = findPhaseDir(phase.number)
  const info = inspectPhaseDir(dir)
  return { phase, dir, info, stateName: deriveState(phase, dir, info, state, handoff) }
})
const phaseStates = new Map(resolved.map((r) => [r.phase.number, r.stateName]))

const milestoneNames = [...new Set(phases.map((p) => p.milestone))]
const milestones = await resolveMilestones(project.id, milestoneNames, map)

if (project.id !== "(dry-run)") await syncProject(project, phases, phaseStates, map)

const issues = await fetchProjectIssues(project.id)
const byId = new Map(issues.map((i) => [i.id, i]))
// Title-convention fallback: this is what keeps a lost linear-map.json from producing duplicates.
const phaseByNumber = new Map()
const planByIds = new Map()
for (const issue of issues) {
  const p = issue.title.match(/^Phase\s+([\d.]+)\s*:/)
  if (p) phaseByNumber.set(p[1], issue)
  const pl = issue.title.match(/^(\d+-\d+)\s*:/)
  if (pl) planByIds.set(pl[1], issue)
}

console.log(
  `\n${DRY_RUN ? "Dry run — no changes will be made.\n" : ""}` +
    `Syncing ${phases.length} phases into ${project.name}:`,
)

let created = 0
let updated = 0

for (const { phase, dir, info, stateName } of resolved) {
  const key = `phase-${phase.number}`

  const existing = byId.get(map.issues[key]?.id) ?? phaseByNumber.get(phase.number) ?? null
  const title = `Phase ${phase.number}: ${phase.title}`

  const result = await upsertIssue({
    key,
    existing,
    map,
    label: title,
    input: {
      teamId: team.id,
      projectId: project.id,
      projectMilestoneId: milestones[phase.milestone],
      title,
      description: buildDescription(phase, dir, info),
      stateId: states[stateName].id,
      stateName,
      sortOrder: Number(phase.number) * 100,
    },
  })
  if (result.action === "created") created++
  else if (result.action === "updated") updated++

  // Sub-issues, one per plan. Prefer the roadmap's one-line plan description; fall back to
  // whatever PLAN.md files are actually on disk when the roadmap says "TBD".
  const planEntries = phase.detail.plans.length
    ? phase.detail.plans
    : (info?.plans ?? []).map((f) => ({
        id: f.replace("-PLAN.md", ""),
        title: "",
        done: info.summaries.has(f.replace("-PLAN.md", "-SUMMARY.md")),
      }))

  for (const plan of planEntries) {
    const planKey = `phase-${phase.number}/${plan.id}`
    const hasSummary = info?.summaries.has(`${plan.id}-SUMMARY.md`) ?? false
    let planState = STATES.TODO
    if (phase.done || plan.done || hasSummary) planState = STATES.DONE
    else if (stateName === STATES.IN_PROGRESS) {
      if (!state.activePlan || state.activePlan === plan.id) planState = STATES.IN_PROGRESS
    }

    const planTitle = plan.title ? `${plan.id}: ${plan.title}` : `${plan.id}`
    const planExisting = byId.get(map.issues[planKey]?.id) ?? planByIds.get(plan.id) ?? null
    const planResult = await upsertIssue({
      key: planKey,
      existing: planExisting,
      map,
      label: `  ${planTitle}`,
      input: {
        teamId: team.id,
        projectId: project.id,
        projectMilestoneId: milestones[phase.milestone],
        parentId: result.issue?.id,
        title: planTitle,
        description: buildPlanDescription(phase, dir, plan),
        stateId: states[planState].id,
        stateName: planState,
        sortOrder: Number(phase.number) * 100 + Number(plan.id.split("-")[1] ?? 0),
      },
    })
    if (planResult.action === "created") created++
    else if (planResult.action === "updated") updated++
  }
}

if (!DRY_RUN) {
  map.team = { key: team.key, id: team.id }
  // syncProject already recorded the project entry (including its content hash) — only fill in
  // the shape here if it somehow did not run.
  map.project ??= { name: project.name, id: project.id }
  map.milestones = milestones
  saveMap(map)
  console.log(`\nWrote ${MAP_PATH}`)
}

console.log(
  `\n${DRY_RUN ? "Dry run complete" : "Sync complete"} — ` +
    `${created} created, ${updated} updated.` +
    (project.url ? `\n${project.url}` : ""),
)
