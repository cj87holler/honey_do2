# Pitfalls Research

**Domain:** Adding production hardening (CSP, required CI, Sentry, pino logging, private repo) to a LIVE Next.js 16 / Vercel / Neon app with real users
**Researched:** 2026-07-27
**Confidence:** HIGH for GitHub/CI mechanics and Sentry/pino integration issues (official docs + multiple corroborating sources); MEDIUM-HIGH for CSP specifics (official Next.js guidance + community reports, verified against this repo's actual code); notably this repo runs **Next.js 16.2.1**, not 15.x as CLAUDE.md's stack doc states — this matters because several CSP/pino/Turbopack gotchas below are version-specific to Next 16.

**Repo facts used throughout this research (verified by reading the codebase):**
- `next.config.ts` is currently a bare passthrough (`const nextConfig: NextConfig = {}`) — no headers, no Sentry wrapper yet. Any pitfall involving "config gets clobbered" is about future edits, not existing conflicts.
- `src/middleware.ts` has a narrow matcher: `["/((?!api|_next/static|_next/image|favicon.ico).*)"]`. This matcher **does** currently match a hypothetical Sentry tunnel route like `/monitoring` unless explicitly excluded.
- `package.json` build script: `"build": "drizzle-kit migrate && next build"` — confirmed as the exact mechanism behind Pitfall 3.
- Auth is Better Auth 1.5.6, cookie-based sessions (`__Secure-better-auth.session_token`), not NextAuth — relevant to CSP because Better Auth's client does no meaningful inline scripting itself, so the CSP risk is almost entirely from Next.js's own hydration payload and Tailwind, not from the auth library.
- Branch protection on `main` already exists (PR required, 0 approvals, **admin bypass ON**) per `PRODUCTIONIZATION_ROADMAP.md` — confirmed by the user's own progress log, not assumed.
- No `.github/workflows/*.yml` exists yet in this repo (only found inside `node_modules`, which is noise) — CI is being added from zero, not modified.

---

## Critical Pitfalls

### Pitfall 1: CSP silently breaks hydration/inline scripts because Next.js's own runtime injects inline `<script>` tags

**What goes wrong:**
Next.js's App Router streams RSC payloads into the page via inline `<script>` tags (e.g. `self.__next_f.push([...])`) that hydrate the page client-side. A CSP with `script-src 'self'` and no nonce/`'unsafe-inline'` blocks these, and the page **renders the initial HTML but never becomes interactive** — buttons don't respond, forms don't submit, no console error dialog, just silent inert UI. This is the single most common way a CSP rollout breaks a working Next.js app: it looks fine at first glance (SSR'd HTML shows up) and only breaks on interaction.

**Why it happens:**
Developers write a CSP by copying a generic template (`script-src 'self'`) without accounting for how Next.js's App Router injects hydration data. It works in `next dev` because dev mode has different inline-script patterns and error surfacing (React dev overlay makes CSP violations visible in the console immediately), but production builds behave differently, and CSP violations in production are silent unless you're actively watching the browser console or have violation reporting wired up.

**How to avoid:**
Use a **nonce-based CSP**, generated per-request in middleware, not a static string in `next.config.ts` headers. Next.js (App Router, dynamically-rendered pages) reads the `x-nonce` you set and automatically attaches it to its own injected scripts/styles when you follow the documented pattern:

1. In `middleware.ts`, generate a random nonce per request (`crypto.randomUUID()` or `crypto.randomBytes(16).toString('base64')`), set it in a custom request header (e.g. `x-nonce`), and set the `Content-Security-Policy` response header referencing that nonce plus `'strict-dynamic'`.
2. Because this repo's `middleware.ts` already exists and has a narrow matcher, the nonce-setting logic must live in the *same* middleware function — don't add a second middleware file, App Router only supports one.
3. Read the nonce via `headers()` in the root layout and pass it explicitly if you have any handwritten `<script>` tags (there likely aren't any in this app, but check `layout.tsx` files under `src/app/**`).
4. `strict-dynamic` is important: it lets Next.js's own dynamically-injected chunks (code-splitting, lazy loads) execute without listing every hash, while still blocking arbitrary third-party inline scripts.

Do **not** reach for `'unsafe-inline'` as a shortcut — it defeats the entire purpose of CSP against XSS and is exactly the failure mode CSP exists to prevent.

**Warning signs:**
Page loads and shows correct markup, but clicking a button, submitting a form, or any client interaction does nothing. Browser console (which you must actually open — this won't show up in Vercel logs) shows `Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self'"`.

**Phase to address:**
CSP phase — must include a `report-only` rollout stage (see Pitfall 4) before enforcement.

---

### Pitfall 2: Tailwind CSS v4 emits inline `style` attributes / a `<style>` tag that a strict `style-src` blocks

**What goes wrong:**
This project uses Tailwind CSS v4, which (per its CSS-first architecture) can inject a `<style>` block for CSS custom properties and, in some component patterns, React itself sets inline `style={{ ... }}` for dynamic values (progress bars, honeycomb-fill percentages, leaderboard bar widths — all plausible for this app's UI). A CSP with `style-src 'self'` and no exception for inline styles breaks all such styling **silently** — no error, no crash, just visually broken/unstyled elements. This is easy to miss because most of the page still looks right; only the specific dynamically-styled elements (progress indicators, honeycomb fill states) go unstyled.

**Why it happens:**
CSP guidance defaults focus on `script-src` because script injection is the higher-severity XSS vector; `style-src` gets forgotten. Style injection is lower severity but still real (CSS can exfiltrate data via `background: url()` selectors), so it shouldn't just be `'unsafe-inline'`'d away without thought — but for a v1.2 hardening pass on a small app, `style-src 'unsafe-inline'` combined with a strict `script-src` nonce is a reasonable, pragmatic middle ground, since inline style injection alone is a much weaker attack primitive than inline script injection.

**How to avoid:**
Decide explicitly rather than by accident: either (a) add nonces to `style-src` too (more correct, more setup — Next.js supports nonce'd `<style>` for its own injected CSS-in-JS internals as of App Router, but Tailwind's compiled CSS is a static `<link>` and doesn't need it) or (b) allow `style-src 'self' 'unsafe-inline'` deliberately, documenting *why* this is an acceptable tradeoff (scoring it lower risk than `script-src 'unsafe-inline'`). For this app, given no user-generated HTML is ever rendered unescaped (task text is plain text, no rich text/markdown), option (b) is the pragmatic v1.2 choice — flag it as a known relaxation, not an oversight.

**Warning signs:**
Elements with dynamic inline styles (progress bars, computed widths/colors) render unstyled or with default browser styling; DevTools Elements panel shows the `style` attribute present but crossed-out/ignored; console shows `Refused to apply inline style because it violates the following Content Security Policy directive: "style-src"`.

**Phase to address:**
CSP phase, same rollout as Pitfall 1 — test specifically the leaderboard and Honeycomb views since those are most likely to have dynamic inline styling.

---

### Pitfall 3: `unsafe-eval` needed by Turbopack dev server leaks into (or is wrongly assumed necessary in) production CSP

**What goes wrong:**
Next.js 16's dev server (Turbopack, now default) uses `eval()`-based patterns for fast refresh / HMR in some configurations, which requires `'unsafe-eval'` in `script-src` to avoid dev-mode console spam. Two failure modes result: (a) a developer tests CSP locally in `next dev`, sees it needs `'unsafe-eval'` to stop console errors, and **copies that requirement into the production CSP** — permanently weakening prod CSP for a dev-only need; or (b) the inverse: CSP is only ever tested against `next build && next start` locally (which doesn't need `unsafe-eval`), so the developer never notices dev breaks, and then wires a single shared CSP config that's wrong for one environment or the other.

**Why it happens:**
Because there's no preview environment that builds (see Pitfall 7), the only "close to prod" testing available is local `next build && next start`, which is correct for prod but means the *only* environment showing `unsafe-eval` warnings is `next dev` — creating pressure to "fix the warnings" by loosening the policy that ships to users.

**How to avoid:**
Branch the CSP by environment explicitly in code, not by trial-and-error:
```ts
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = isDev
  ? `'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'`
  : `'self' 'nonce-${nonce}' 'strict-dynamic'`;
```
Never let `next dev` console warnings drive production policy. The authoritative test for prod CSP is always `npm run build && npm run start` (or `next start`) locally with production env vars, since that's the actual code path Vercel runs.

**Warning signs:**
CSP header (inspect via `curl -sI https://<prod-url> | grep -i content-security-policy`) contains `unsafe-eval` in production. This is a code-review catch, not a runtime symptom — the app will *work* with `unsafe-eval` in prod, it's just a needless XSS-hardening regression that defeats part of the point of doing this work.

**Phase to address:**
CSP phase — add an explicit CI or pre-deploy assertion (even a simple `curl` + `grep -v unsafe-eval` check) that the deployed CSP never contains `unsafe-eval`.

---

### Pitfall 4: Shipping enforced CSP directly (no report-only phase) breaks a subset of pages silently in production

**What goes wrong:**
CSP violations are enforced client-side per page/per resource. Because Next.js apps have route-level code splitting and different pages can pull in different chunks (a chart library only on the leaderboard page, a modal library only on the invite page, etc.), a CSP that "works" on the pages you personally clicked through during manual testing can still break pages you didn't test — and because there's no preview deployment to validate against (Pitfall 7), the first real signal is a live user hitting a broken page in production with nothing showing up in server logs, since CSP violations are a browser-side, not server-side, event.

**Why it happens:**
`Content-Security-Policy` (enforcing) has no built-in feedback loop unless you also configure `report-to`/`report-uri`. Developers skip the reporting setup because it feels like extra work for a "just add security headers" task, and manually click through 4-5 pages, declare victory, and ship. For a small app this "feels" like enough coverage but isn't — auth pages, error pages, empty states, and admin-only routes are the ones most likely to get skipped and most likely to have a different script/style profile.

**How to avoid — the safe rollout sequence:**
1. **Ship `Content-Security-Policy-Report-Only` first**, never straight to enforcing. Report-Only mode logs violations to the browser console and (if configured) a reporting endpoint, but does not block anything — zero risk to the live app.
2. Configure a reporting endpoint. Two realistic options for a small app with no existing reporting infra:
   - Simplest: a Next.js Route Handler (`src/app/api/csp-report/route.ts`) that just logs the JSON body (via the pino logger being added in this same milestone) to Vercel's log view. Add `report-to` (modern) and `report-uri` (legacy, still needed for Safari/older browser coverage) both pointing at it.
   - Alternative: a free tier of a third-party CSP report collector (e.g. report-uri.com) if you'd rather not build the endpoint — reasonable for a hobby-scale app, but self-hosting is trivial enough here (single route handler, no new dependency) that it's the better fit given this milestone already adds Sentry + pino for observability.
3. Leave Report-Only live for **at least a few days of real traffic** covering every route a real user would hit — not a fixed universal number, but explicitly: login, signup, hive dashboard, task creation, leaderboard, invite flow, and (if it exists) the admin dashboard. Since this is a small household app, "a few days" may only be a handful of real sessions — the criterion is "every route class has been hit at least once by a real browser," not a calendar duration.
4. Manually review the collected reports. Filter out noise (browser extensions injecting scripts is a very common false-positive source — look for `blocked-uri` values like `chrome-extension://` or `moz-extension://` and ignore those).
5. Only after reports show zero *legitimate* violations across all route classes, flip the header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` (enforcing). Keep Report-Only reporting active even after enforcing — misconfigurations found later degrade gracefully to "logged and blocked" instead of "silently blocked."
6. Because there is no preview DB/build (Pitfall 7), this Report-Only period **must run against production** — see Pitfall 7 for the specific mitigations that make this acceptable.

**Warning signs:**
Any `csp-report` payload with `disposition: "enforce"` after you believe you're still in report-only (indicates a header-name typo — `Content-Security-Policy` vs `-Report-Only` is one character away from a very different behavior). A spike in reports from one specific route immediately after a deploy.

**Phase to address:**
CSP phase, as its own explicit two-step: (1) Report-Only + reporting endpoint, (2) enforce after verification. Do not collapse these into one PR/deploy.

---

### Pitfall 5: CSP blocks Server Actions or breaks `next/image` optimization

**What goes wrong:**
Two narrower but real risks:
- **Server Actions**: Server Actions are POST requests to the same origin under the hood, not resource loads, so a correctly-scoped CSP (`default-src 'self'`, `connect-src 'self'`) does not block them in the common case. The actual breakage mode is `form-action` — if you set `form-action 'self'` (recommended) and any form in the app posts to an external URL (unlikely here) or if a redirect-after-action target isn't same-origin, it silently fails. For this app specifically, verify the invite-link flow, since invite acceptance may involve a redirect chain.
- **`next/image`**: The Next.js Image Optimization API rewrites image URLs to `/_next/image?url=...`, served same-origin, so `img-src 'self'` covers it *only if all source images are also same-origin or covered by `img-src`*. If any avatar/image asset is loaded from an external host (e.g. a future Gravatar-style avatar, or images hosted directly on Neon/S3/an external CDN), `img-src` needs that host explicitly listed, or the optimized image 404s/blocks with a broken-image icon — again, silent, not an error page.

**Why it happens:**
`form-action` and `img-src` are both frequently forgotten because they're not `script-src`/`style-src`, which is where most CSP-writing attention goes. Nobody audits every external asset host before writing the policy.

**How to avoid:**
Before writing the CSP, grep the codebase for every external URL currently loaded as an image or form target:
```bash
grep -rn "src=\"http" src/app src/components 2>/dev/null
grep -rn "next/image" src/app src/components 2>/dev/null
```
Include `form-action 'self'` explicitly (don't rely on `default-src` fallback — some browsers treat `form-action` as not covered by `default-src` inheritance inconsistently across older engines; be explicit). Add every external image host actually in use to `img-src` by name; do not add `img-src *` as a shortcut, since that defeats the point for the one directive most likely to be involved in tracking-pixel style abuse.

**Warning signs:**
Broken-image icons on avatar/profile UI (if present); invite-link acceptance silently not completing the redirect after form submission.

**Phase to address:**
CSP phase — part of the same asset audit as Pitfall 2's inline-style check, do both audits in the same pass before drafting the policy.

---

### Pitfall 6: Required status check name doesn't match the actual GitHub Actions job/check name — `main` becomes permanently unmergeable

**What goes wrong:**
This is the highest-annoyance, easiest-to-hit failure in this entire list. GitHub Branch Protection's "Require status checks to pass" setting requires you to pick a check name from a dropdown/text field. That name must **exactly** match the *check run name* GitHub Actions reports — which is derived from `<workflow-name> / <job-name>` (or just `<job-name>` for simple single-job workflows, depending on how the workflow is structured) at the moment the check actually runs and reports back to GitHub. If you type the required-check name from memory, or configure it *before* the workflow has ever run once (so it never appeared in the dropdown), or rename the job/workflow later, the configured requirement no longer matches any check GitHub Actions ever produces. The result: **every PR shows an indefinitely-pending required check that will never turn green**, because GitHub is waiting for a status report under a name that no CI run will ever emit. `main` is now unmergeable for every PR, including via the UI's normal merge button — even for the exact commit and branch that's otherwise ready.

**Exact failure mode, step by step:**
1. You write `.github/workflows/ci.yml` with, say, a job named `test` inside a workflow named `CI`.
2. The check name GitHub reports is typically `CI / test` (workflow name / job name) — but this can vary based on `name:` fields, matrix strategy (adds a suffix per matrix leg), and whether you use `workflow_call`/reusable workflows (adds more name mangling).
3. In GitHub Settings → Branches → Branch protection rule → "Require status checks to pass before merging," you either (a) type a check name manually without it ever having run, or (b) the workflow ran once under one name, you added it, then later renamed the job or workflow file's `name:` field.
4. New PRs now show a required check called (e.g.) `test` in the required list, but the actual reported check is `CI / test` (or vice versa) — GitHub treats these as two different checks. The required one never appears as passing, and the actual one that runs is irrelevant to the merge gate.
5. **Verification before enforcing (do this, in order):**
   - Push the CI workflow to a branch and open a real PR first, *without* touching branch protection settings yet.
   - Let the workflow actually run to completion on that PR (pass or fail — doesn't matter, you just need it to have reported once).
   - Only then go to Settings → Branches → edit the rule → "Require status checks to pass" → the search box will now show real, exact check names that have actually reported to this repo. Pick from that list — never type a name by hand.
   - After marking it required, immediately open a second dummy PR (or push a trivial commit to the same PR) to confirm the required check shows as a real pending/passing status, not stuck in "expected" limbo.
6. **If it's already broken:** go back into the branch protection rule, remove the stale required check name, and re-add it by selecting from the now-updated dropdown (which will show the real current name). This is confirmed as the standard fix — there's no other recovery path except deleting and re-adding the requirement with the correct name.

**Admin bypass implication:** This repo currently has "admin bypass on" for the PR-required rule (per `PRODUCTIONIZATION_ROADMAP.md` progress log). That bypass is what makes this pitfall **recoverable rather than catastrophic** — as the repo admin (solo dev), you can still merge through a bricked required-check state using admin override while you fix the name mismatch, so `main` isn't *actually* frozen, just the normal PR flow is. This is a good reason to leave admin bypass on for now even after CI is required: it's your escape hatch for exactly this failure mode, and for the "CI is down/misconfigured and I need to ship a hotfix" scenario generally. The tradeoff (documented, not accidental) is that admin bypass also means required checks are advisory-for-the-admin, not a hard gate — acceptable for a solo/small-team repo, worth revisiting if collaborators are added later.

**Warning signs:**
A PR's merge box shows "Required — Waiting for status to be reported" indefinitely, even minutes/hours after the workflow visibly completed (visible under the PR's "Checks" tab with a green check). The mismatch is confirmed by comparing the exact string in the PR's Checks tab against the exact string in Settings → Branches → rule.

**Phase to address:**
CI phase — the verification step (run workflow once on a real PR before marking anything required) must be a hard sequencing rule in the phase plan, not a "remember to" note.

---

### Pitfall 7: CI build step fails because `npm run build` runs `drizzle-kit migrate` first, and CI has no `DATABASE_URL`

**What goes wrong:**
This repo's `build` script is `"build": "drizzle-kit migrate && next build"` — this is intentional for Vercel (run pending migrations, then build), but it means **any CI job that runs `npm run build` or `npm ci && npm run build` as a way to "verify the app builds" will fail immediately** at the `drizzle-kit migrate` step with a connection error (`url: undefined` or similar), because CI runners have no `DATABASE_URL` secret by default and, even if one were added, you do not want CI accidentally running real migrations against a database on every PR push.

**Why people get this wrong:**
The instinctive "does it build" CI check is `npm run build`, copied verbatim from local dev habits — without realizing this repo's `build` script is not just `next build`, it's a compound command that assumes a live, migratable database exists. This is an easy trap specifically because it *works perfectly on Vercel* (which does have `DATABASE_URL` injected) and *works perfectly locally* (developer has `.env.local` with a real Neon connection string) — CI is the only environment where it's silently different, so nobody notices until the first CI run.

**How to avoid:**
The CI workflow's job list from `PROJECT.md` is explicitly `typecheck`, `lint`, `test` — **not build**. Do not add a `build` step to CI at all for this milestone; it's not in the target feature list, and adding it introduces exactly this failure plus the scope of "now CI needs a database" (a much bigger lift than this milestone covers — Neon preview branching is explicitly deferred). Concretely:
- `typecheck`: run `tsc --noEmit` directly (add this as a dedicated script if not already present — check `package.json`, there's currently no `typecheck` script, only `dev`/`build`/`start`/`lint`/`test`). Do **not** run `npm run build` as a proxy for type-checking, even though `next build` does type-check as a side effect — that's exactly the trap.
- `lint`: `npm run lint` — no DB dependency, safe as-is.
- `test`: `npm run test` (Vitest) — verify the existing Vitest suite doesn't itself require a live DB connection (check for any test that imports the Drizzle client directly rather than mocking it); if any test does hit a real DB, either mock it or provide a CI-only ephemeral Postgres service container, but do not point CI tests at the production Neon database under any circumstances.
- If a future milestone wants a real "does the app build" CI check, that requires either (a) a CI-only ephemeral database (e.g. a `services:` Postgres container in the GitHub Actions job) with a throwaway `DATABASE_URL`, or (b) splitting the build script so CI can run `next build` alone without the migrate step. Both are legitimate but explicitly out of scope for v1.2 per `PROJECT.md`'s deferred list (Neon preview branching).

**Warning signs:**
First CI run on the new workflow fails on a step not yet added — if you did add a `build` step and see `error: password authentication failed` or `getaddrinfo ENOTFOUND` or `url: undefined` in the CI log, that's this pitfall exactly, and it confirms the workflow. If you never add a `build` step, this pitfall never surfaces — the correct fix is scope discipline, not a code fix.

**Phase to address:**
CI phase — explicitly scope the workflow to `typecheck` + `lint` + `test` only, and add a one-line comment in the workflow YAML explaining why `build` is intentionally excluded (so a future contributor doesn't "helpfully" add it back).

---

### Pitfall 8: Sentry's `withSentryConfig` wrapper silently overrides or conflicts with the security headers added to `next.config.ts` in the same milestone

**What goes wrong:**
Both CSP headers and Sentry are being added in this same milestone, and both touch `next.config.ts`. `withSentryConfig(nextConfig, sentryOptions)` wraps the exported config object — if headers are added to `nextConfig.headers()` *after* wrapping, or if the Sentry setup wizard (`npx @sentry/wizard@latest -i nextjs`) is run *after* headers already exist and it regenerates/overwrites `next.config.ts` wholesale rather than merging, the CSP work can be silently reverted or duplicated (two different `headers()` functions, only one of which wins, depending on plugin ordering).

**Why it happens:**
The Sentry setup wizard is a code-mod tool — it edits `next.config.ts` programmatically and is generally good about additive changes, but it was not written with awareness of hand-written custom `headers()` functions doing CSP nonce injection via middleware (which is a more advanced pattern than the wizard's defaults assume). Running the wizard is also often done as a "just get Sentry working first" step without realizing order matters relative to the CSP work.

**How to avoid:**
Sequence the work deliberately: do the CSP/security-headers work first (this repo's `next.config.ts` is currently a clean blank slate — confirmed by reading it — so there's nothing to conflict with yet), commit it, *then* run the Sentry wizard and immediately re-read `next.config.ts` afterward to diff what changed. Do not assume the wizard's output is correct — treat it as a suggestion and manually verify `headers()` (or your CSP-setting middleware) is still intact and Sentry's config is additive (wrapping the *existing* export, not replacing it). If both CSP and Sentry are being done in the same phase, do CSP in one PR, Sentry in a separate PR, in that order, so a `git diff` on the Sentry PR makes any accidental header regression obvious in review.

**Warning signs:**
After adding Sentry, `curl -sI` against the deployed app no longer shows the `Content-Security-Policy` header that was present before, or shows a different/incomplete one.

**Phase to address:**
Sequence CSP phase before Sentry phase (or at minimum, CSP PR merged and verified before Sentry PR opened); add a CSP-header-presence check to the "looks done" checklist for the Sentry phase specifically.

---

### Pitfall 9: Sentry's tunnel route collides with the existing `middleware.ts` matcher, silently dropping client-side error reports

**What goes wrong:**
This app's ad-blocker-adjacent risk: Sentry recommends `tunnelRoute` (routes client-side error beacons through your own domain, e.g. `/monitoring`, to dodge ad-blockers that block `ingest.sentry.io`). This repo's `middleware.ts` matcher is `["/((?!api|_next/static|_next/image|favicon.ico).*)"]` — this pattern **matches everything except those four exclusions**, meaning a tunnel route like `/monitoring` *is* matched by the middleware and run through the existing auth-redirect logic. Since `/monitoring` isn't in `protectedPaths` or `authPaths`, the middleware's own logic falls through to `NextResponse.next()` harmlessly *in this specific case* — but this is fragile: any future change to `protectedPaths` using a broad prefix match, or a CSP `connect-src` policy that doesn't include the tunnel path as same-origin (it should, since `'self'` covers it) could break it. The more direct risk: if the tunnel route path is nested under `/api/monitoring` instead of a bare `/monitoring`, it's automatically excluded by the existing `api` exclusion — so tunnel route *placement* choice interacts directly with this repo's specific matcher.

**Why it happens:**
Sentry's own docs and wizard don't know about a given app's existing middleware, so the burden is entirely on the developer to check for interaction. It's an easy miss because the failure mode is "error reports just don't show up in Sentry" — no error, no crash, just an empty Sentry dashboard that looks like "no errors have happened," which is indistinguishable from "the app has no errors" if you're not actively testing it.

**How to avoid:**
Place the tunnel route under `/api/monitoring` (or whatever prefix is already excluded by the middleware matcher) rather than a bare top-level path — this makes the exclusion automatic and consistent with how `/api/*` is already carved out for the auth middleware. Explicitly test after setup: trigger a client-side error deliberately (e.g. a temporary `throw new Error("test")` in a client component) and confirm it appears in the Sentry dashboard within a minute, not just that the network request "looks like" it succeeded in DevTools.

**Warning signs:**
Sentry dashboard shows zero client-side (browser) errors even after deliberately triggering one, while server-side errors (which don't go through the tunnel/middleware) do show up — this asymmetry (server errors present, client errors absent) is the specific signature of this pitfall.

**Phase to address:**
Sentry phase — include "trigger one deliberate client error and confirm it appears in Sentry" as an explicit verification step, not just "Sentry is installed."

---

### Pitfall 10: Sentry auth token leaks into the repo or the client bundle

**What goes wrong:**
Sentry's Next.js SDK needs a `SENTRY_AUTH_TOKEN` (org-level, used for source map upload during build) which is a **secret with write access to your Sentry org** — distinct from the public `NEXT_PUBLIC_SENTRY_DSN`, which is safe to expose client-side by design. Two common mistakes: (a) the wizard writes `SENTRY_AUTH_TOKEN=...` into a `.env.local` or `.sentryclirc` file that then gets committed because it wasn't added to `.gitignore` in time, or (b) a developer prefixes it `NEXT_PUBLIC_SENTRY_AUTH_TOKEN` (copy-paste habit from the DSN variable) which bakes the write-access token directly into the shipped client JavaScript bundle, visible to anyone who views source.

**How to avoid:**
Confirm `SENTRY_AUTH_TOKEN` is only ever referenced server-side / build-time (in `next.config.ts`'s `withSentryConfig` options, sourced from `process.env.SENTRY_AUTH_TOKEN` with no `NEXT_PUBLIC_` prefix), set only in Vercel's Environment Variables UI (Production + Preview, both — needed at build time for source map upload on every deploy, not just prod), never in a committed file. Immediately after running the Sentry wizard, run `git status` and `git diff` before committing anything, specifically checking whether `.env.local`, `.sentryclirc`, or `.env.sentry-build-plugin` were created and whether they're covered by `.gitignore` (Sentry's wizard is generally good about adding these to `.gitignore` automatically, but verify — don't assume). If a token is ever committed, rotate it immediately in Sentry's org settings (Settings → Auth Tokens) — a `git revert` alone does not invalidate a leaked token that's already in git history.

**Warning signs:**
`git log -p -- .sentryclirc .env.sentry-build-plugin` shows the token in history; `grep -r "SENTRY_AUTH_TOKEN" .next/static` (after a build) returns a match, which would indicate the leak-into-client-bundle variant.

**Phase to address:**
Sentry phase, immediately after wizard setup, before first commit.

---

### Pitfall 11: Sentry captures PII (user emails, task text) by default, or via easily-missed defaults

**What goes wrong:**
Even with `sendDefaultPii: false` (the current SDK default, HIGH confidence per current Sentry docs), error events can still carry PII this app cares about specifically: (a) unhandled exceptions in Server Actions or API routes that include the request body in the stack trace / breadcrumb context (e.g. an error thrown while creating a task could have the 160-char task text and the assignee's info in the breadcrumb trail even without explicit PII settings, since breadcrumbs capture function arguments in some configurations); (b) session replay (if enabled — check whether the wizard defaults it on) records DOM content including task text and honey values on-screen, which is a stronger PII/privacy surface than error tracking alone; (c) `Sentry.setUser()` calls, if added for "which user hit this error" debugging (a natural instinct), directly attach email/user-id to every event from that point forward in the session, which is exactly what a Privacy Policy (also being added this milestone) needs to account for.

**Why it happens:**
Sentry's setup wizard defaults are tuned for "maximum debugging usefulness," not "minimum data collection," and session replay in particular is opt-out-feeling but actually opt-in by config — however it's commonly enabled during wizard setup because it's presented as a headline feature. For a consumer household app, task text (chores, potentially sensitive household matters) and email addresses are exactly the kind of data a Privacy Policy needs to disclose truthfully — so what Sentry actually captures needs to match what the Privacy Policy (also shipping this milestone) claims.

**How to avoid:**
Explicitly decide and configure, don't accept wizard defaults blindly:
- Leave `sendDefaultPii` at its default `false` (do not flip it to `true` "to get more debugging context" without a specific reason).
- If session replay is offered during wizard setup, either skip it entirely for v1.2 (simplest, and consistent with "small app, minimal footprint") or enable it with `maskAllText: true` / `blockAllMedia: true` (Sentry's privacy-preserving replay defaults, which mask actual DOM text content) — never enable replay with unmasked text on a form-heavy app with task descriptions.
- If `Sentry.setUser()` is used at all (reasonable for "which household hit this bug"), pass only a non-reversible identifier (internal user ID) — not email — unless there's a specific, deliberate reason to need the email in Sentry directly.
- Write the Privacy Policy (also in this milestone's scope) to accurately reflect whatever Sentry is actually configured to capture — sequence this: finalize Sentry PII config *before* finalizing Privacy Policy wording, not the other way around, since it's easier to write accurate copy about a locked-in configuration than to retrofit configuration to match a policy written first.

**Warning signs:**
An error event in the Sentry dashboard shows a task's actual text content, a user's email in a breadcrumb, or replay recordings show readable on-screen text.

**Phase to address:**
Sentry phase, before the Privacy Policy phase (or same phase, sequenced first) — this is a direct dependency the roadmap should encode explicitly.

---

### Pitfall 12: Sentry free-tier quota gets burned by a noisy error loop, especially from a CSP misconfiguration reporting to itself

**What goes wrong:**
Sentry's free tier has a hard monthly event cap (typically low thousands of errors). Two specific ways this app could burn through it fast: (a) an error that fires on every request to a commonly-hit route (e.g. a bug in the `/api/health` route, or a Server Action error that fires on every page load due to a bad session-check) turns into thousands of identical events in hours, not days; (b) more subtly for this milestone specifically — if the CSP Report-Only reporting endpoint (Pitfall 4) is *also* wrapped in Sentry instrumentation and a CSP misconfiguration causes a violation on every single page load (e.g. the nonce isn't wired correctly and blocks all inline scripts sitewide), you get a multiplicative effect: every real pageview generates both a broken-UI experience *and* a Sentry-logged error *and* a CSP violation report, potentially all counted against different quotas (Sentry error quota + your own logging volume) simultaneously.

**Why it happens:**
Free-tier quotas are easy to forget exist until an alert email arrives (or doesn't — some plans silently drop events past quota rather than erroring, which is worse, since you lose visibility exactly when something is most wrong). This app has no existing rate-limiting or circuit-breaker pattern to prevent an error loop from self-amplifying.

**How to avoid:**
Configure Sentry's rate limiting / spike protection in project settings (most Sentry plans have a "spike protection" auto-throttle that's on by default — verify it's enabled, don't assume). Set up a Sentry quota alert email (available on free tier) so quota exhaustion is a proactive notification, not a discovery made when the dashboard mysteriously stops showing new errors. Deploy CSP changes (Pitfall 4) and Sentry changes in a sequence where each is independently verified working *before* the other is layered on — if CSP Report-Only is misbehaving, you want to see that in server logs (pino) without it also being routed through Sentry's client-error pipeline burning quota on every pageview.

**Warning signs:**
Sentry's event count graph shows a vertical spike; quota-exhaustion email from Sentry; Sentry dashboard shows "some events were dropped due to rate limiting" banner.

**Phase to address:**
Sentry phase, as a config verification step; note the CSP+Sentry interaction explicitly since both ship in the same milestone.

---

### Pitfall 13: pino transport (`pino-pretty` or worker-thread-based transports) fails or is silently absent in Vercel's serverless functions

**What goes wrong:**
`pino`'s transport system (`pino-pretty` for readable dev output, or any custom transport) uses Node's `worker_threads` under the hood. Vercel serverless functions (and especially Edge Runtime, if any route/middleware uses it) either don't support `worker_threads` at all (Edge Runtime) or have cold-start/bundling quirks that break worker-thread-based transports in ways that don't reproduce locally. Confirmed via current GitHub issues against Next.js 16 + Turbopack specifically: `Cannot find module './transport-stream'` and `Worker thread cannot find module 'real-require'` are both open, active issues as of the Next.js 16 line this repo is on — this is not hypothetical, it's a currently-reported class of bug for exactly this repo's Next.js version. The practical result for this app: logs either don't appear in Vercel's log view at all, or the function crashes/500s on the log call itself, or (in dev under Turbopack HMR) intermittent worker crashes with "the worker has exited" that don't affect prod but are confusing during local iteration.

**Why it happens:**
`pino-pretty` is a dev-convenience transport, not meant for production, but it's easy to accidentally ship it because it's often configured as the default transport without an environment branch. Separately, Next.js/Vercel's bundler (Turbopack in this repo, since it's Next 16 default) doesn't always correctly trace and include worker-thread transport files in the serverless function bundle unless explicitly told to via `serverExternalPackages`.

**How to avoid:**
- Never use `pino-pretty` (or any worker-thread transport) in the production log path. Use pino's plain JSON output (`pino()` with no transport option) for anything that runs on Vercel — Vercel's log viewer parses structured JSON fine without needing pretty-printing, and plain JSON output has no worker-thread dependency at all, sidestepping this entire pitfall class.
- If pretty output is wanted for local dev only, branch it: `const logger = process.env.NODE_ENV === "development" ? pino({ transport: { target: "pino-pretty" } }) : pino()`.
- If any transport is used in a path that touches `next.config.ts`, add the relevant packages (`pino`, `thread-stream`, any transport target module) to `serverExternalPackages` in `next.config.ts` to ensure Turbopack/webpack bundles them correctly rather than trying to statically analyze worker-thread `require()` calls (which is the specific mechanism that breaks).
- Confirm pino is never imported into `src/middleware.ts` or any file that could run under Edge Runtime — pino (and any Node-native logging lib) is Node-runtime-only; Edge Runtime has no `worker_threads`, no `fs`, and pino will fail to even import, not just fail at runtime. This repo's `middleware.ts` currently does no logging, so this is a "don't add it" constraint, not a "remove it" fix.

**Warning signs:**
Local `next dev` shows intermittent "the worker has exited" errors (this repo is on Turbopack by Next 16 default, so this is the expected dev-mode symptom per current open issues); Vercel deployment logs show a 500 or missing logs on routes that should be logging; `vercel logs` / Vercel dashboard log view shows nothing for a route known to have executed.

**Phase to address:**
Logging (pino) phase — decide "plain JSON in prod, pretty only in dev" as a hard rule from the start, not a fix-after-it-breaks discovery.

---

### Pitfall 14: pino logs secrets (session tokens, DB connection strings, password hashes) because request/error objects are logged wholesale

**What goes wrong:**
The most common structured-logging mistake: logging an entire `request` object, `error` object, or Better Auth session object for convenience (`logger.info({ req, session })`) captures whatever's on those objects — cookies (including the `__Secure-better-auth.session_token` this app's middleware reads directly), `Authorization` headers, and potentially the full `DATABASE_URL` if a DB connection error's stack trace or config object gets logged wholesale. Since Vercel's log view has its own retention and (depending on plan) is visible to anyone with dashboard access, an accidentally-logged session token is a real session-hijack risk, not just an embarrassing leak.

**How to avoid:**
Use pino's built-in redaction (`redact` option in `pino()` config) for known-sensitive paths from day one:
```ts
const logger = pino({
  redact: ["req.headers.cookie", "req.headers.authorization", "*.password", "*.sessionToken", "*.DATABASE_URL"],
});
```
Never log a raw request or session object — log specific, deliberately-chosen fields (`{ userId, path, method }`, not `{ req }`). Grep for existing patterns before this phase starts: `grep -rn "console.log" src/` to find what's currently being logged informally, since pino is replacing/supplementing whatever ad-hoc logging already exists, and any existing `console.log(session)` or similar pattern is exactly the thing to fix during this migration rather than carry forward unchanged.

**Warning signs:**
Any log line in Vercel's dashboard containing a string starting with `__Secure-` or matching a JWT/session-token shape; `grep` across recent log exports for `postgres://` or `DATABASE_URL`.

**Phase to address:**
Logging (pino) phase, as an explicit redaction config from the first commit, not a follow-up hardening pass.

---

### Pitfall 15: Flipping the repo private breaks something depending on public-repo assumptions

**What goes wrong:**
Several things can be affected, with different severities:
- **GitHub Actions minutes**: public repos get unlimited free Actions minutes; private repos on the Free plan get 2,000 Linux-equivalent minutes/month (Windows/macOS runners cost more against this quota, but this app's CI is Linux-only, so this is unlikely to be a real constraint at this app's scale — flagging it so it's a known tradeoff, not a surprise bill).
- **Vercel integration**: Vercel's GitHub App integration works identically for private repos as long as it was granted access to the specific repo (or "all repos") during initial install — this is a non-issue *if* the GitHub App's installation already covers this repo, which it does since Vercel is already deployed from it. Flipping visibility does not revoke an existing GitHub App installation's access to that specific repo. No action needed here beyond a post-flip sanity check (push a trivial commit, confirm Vercel still deploys).
- **Any embedded badges/links** (README shields.io badges referencing build status, GitHub stars, etc.) that assume public repo API access — GitHub's badge/shield services for private repos either don't work at all or require a token, so any such badge will start rendering broken/"repo not found" after the flip. Check `README.md` for badge markdown before flipping.
- **Forks and stars are not lost** by flipping a repo private in the general case, *except*: any existing forks of the repo remain as independent public repos even after the source goes private (GitHub does not retroactively privatize forks), and if there are zero forks currently (likely for a personal household app), this is moot. Stars are preserved.
- **Open PRs/Issues from external contributors**: if any exist from users without repo access, they lose visibility into the repo after the flip — irrelevant for a solo-dev repo but worth a 5-second check.

**How to avoid:**
Before flipping: (1) check `README.md` for any badges/shields referencing public-repo-only services, remove or note them as expected-to-break; (2) confirm there are no external contributors with open PRs who'd lose access; (3) after flipping, do the one concrete verification that matters — push a trivial commit and confirm the Vercel deployment still triggers (this is the only genuinely load-bearing integration at stake); (4) if CI is also being added in this same milestone, be aware the 2,000 min/month private-repo cap now applies — for a solo-dev repo running `typecheck` + `lint` + `test` on each PR push, this is very unlikely to be hit (each run is probably 1-3 minutes), but note it as a fact rather than assume unlimited minutes continue post-flip.

**Warning signs:**
Vercel deployment doesn't trigger on the next push after flipping (would indicate the GitHub App lost repo access — check Vercel's Git integration settings, specifically re-authorize if needed); README badges show "not found" images.

**Phase to address:**
Repo-visibility phase — treat as a low-risk, quick-verify step; the one thing worth actually testing post-flip is the Vercel deploy trigger, everything else is informational awareness only.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|--------------------|-----------------|------------------|
| `style-src 'unsafe-inline'` while `script-src` uses nonces | Skips auditing every inline-style source in the codebase | Weaker defense against CSS-based data exfiltration (lower severity than script injection, but real) | Acceptable for v1.2 given no unescaped user-generated HTML is rendered anywhere in this app — document as a deliberate, scoped tradeoff, not silence |
| Admin bypass left ON for branch protection after CI is required | Recovery path if required-check name mismatches (Pitfall 6) or CI itself breaks | Required checks become advisory-only for the repo admin, softer gate than intended | Acceptable indefinitely for a solo-dev repo; revisit only if collaborators with less trust are added |
| Skipping a CI "build" step entirely rather than solving the no-DB-in-CI problem | Avoids standing up a CI database this milestone | "Does it actually build" is never verified pre-merge — a broken build could still merge if `tsc --noEmit` + lint + tests all pass but `next build`-specific issues (e.g. a Server Component/Client Component boundary violation only caught at build) slip through | Acceptable for v1.2 per explicit scope; revisit when Neon preview branching (already deferred) is tackled, since that unlocks a real CI/preview build check |
| Self-hosted CSP report-only endpoint as a bare route handler with minimal validation | Fast to build, no new dependency, fits neatly with pino logging already being added | No dedup/aggregation of repeated violations, no alerting — just raw log lines to sift through manually | Acceptable for v1.2's scale (household app, low traffic); revisit if traffic or violation volume grows enough that manual log review becomes impractical |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| CSP + Next.js App Router | Static CSP string in `next.config.ts` `headers()` instead of per-request nonce in middleware | Generate nonce in `middleware.ts`, pass via header, reference in CSP `script-src 'nonce-...' 'strict-dynamic'` |
| CSP + Sentry | Sentry's tunnel route not added to `connect-src`/`script-src` if self-hosted differently than expected | Since tunnel is same-origin under `'self'`, this is usually fine automatically — but verify with a deliberate test error, don't assume |
| Sentry + `next.config.ts` | Running Sentry wizard after hand-written CSP headers already exist, risking silent overwrite | Do CSP work first, commit, then run Sentry wizard, then diff `next.config.ts` before committing the Sentry PR |
| Sentry tunnel route + existing `middleware.ts` matcher | Placing tunnel route at a bare path that gets caught by the broad matcher `["/((?!api|_next/static|_next/image|favicon.ico).*)"]` | Place tunnel route under `/api/monitoring` so it's automatically excluded by the existing `api` carve-out |
| pino + Vercel serverless | Using `pino-pretty` (worker-thread transport) in the production code path | Plain JSON `pino()` in production, transport only branched in for local dev |
| pino + Next.js Edge Runtime | Importing pino into `middleware.ts` or any Edge-runtime file | Keep pino strictly to Node-runtime routes/Server Actions; middleware in this repo currently does no logging — keep it that way |
| GitHub required status checks + Actions | Typing/configuring a required check name before the workflow has run once | Run the workflow on a real PR first, select the check name from GitHub's dropdown of *actually reported* names, never type by hand |
| `npm run build` (compound script) + CI | Reusing the local `build` script as a CI "does it build" check | CI runs `typecheck`/`lint`/`test` only; never invoke the repo's `build` script (which chains `drizzle-kit migrate`) in CI without a dedicated CI database |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| CSP with `unsafe-eval` copied from dev-mode requirements into prod | Meaningfully weakens XSS protection, defeats much of the point of doing CSP work | Branch CSP by `NODE_ENV`; assert prod CSP never contains `unsafe-eval` (grep/curl check) |
| `SENTRY_AUTH_TOKEN` prefixed `NEXT_PUBLIC_` or committed to a file | Org-level Sentry write-access token exposed publicly (client bundle or git history) | Server-only env var, verify via Vercel dashboard + `git status`/`git diff` immediately after wizard run; rotate immediately if leaked |
| pino logging raw `req`/`session` objects | Session tokens, cookies, or DB credentials land in Vercel's log view | Explicit field selection + `redact` config from first commit |
| Sentry `sendDefaultPii: true` or unmasked session replay | Task text, emails, household data sent to a third party, inconsistent with the Privacy Policy being written this same milestone | Keep default `false`; if replay is used, `maskAllText: true`; write Privacy Policy to match actual configured behavior, not assumed behavior |
| CSP `img-src *` or `form-action` omitted (falls back to permissive default) | Weakens the exact directives most relevant to data exfiltration and form-hijack vectors | Explicit allowlist per directive; audit actual external hosts in use before writing the policy |

## "Looks Done But Isn't" Checklist

- [ ] **CSP shipped:** Often "looks done" after clicking through 3-4 pages manually — verify by checking Report-Only violation reports across *every* route class (login, signup, hive dashboard, task creation, leaderboard, invite flow, admin) before ever enforcing, not just the pages you personally use most.
- [ ] **Sentry installed:** Often "looks done" once the dashboard shows the project exists — verify by deliberately triggering one client-side error and one server-side error and confirming both appear, plus confirming the CSP header is still intact after the wizard ran (Pitfall 8).
- [ ] **CI required on main:** Often "looks done" once the branch protection checkbox is checked — verify by opening one real throwaway PR after enabling the requirement and confirming it shows as an actual pending/passing check, not a permanently-stuck "expected" status (Pitfall 6).
- [ ] **pino logging added:** Often "looks done" once log lines appear locally in `next dev` — verify logs actually appear in Vercel's production log view (not just locally), since local dev and Vercel serverless can diverge on transport support (Pitfall 13).
- [ ] **Repo flipped private:** Often "looks done" once the GitHub setting is toggled — verify by pushing a trivial commit afterward and confirming Vercel still auto-deploys, since that's the one integration actually worth re-checking.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| CSP breaks a live page in production (enforced too early) | LOW | Revert the header value to `Content-Security-Policy-Report-Only` immediately (one-line config change, redeploy) — this is exactly why Report-Only is the safety net even after "enforcing," keep the capability to flip back fast |
| Required status check name mismatch bricks `main`'s merge flow | LOW (this repo specifically, due to admin bypass) | Admin-merge through the bypass to unblock immediate work; separately, fix the branch protection rule by removing and re-adding the check name from the now-populated dropdown |
| CI fails on every PR because `build` script was added and hits missing `DATABASE_URL` | LOW | Remove the `build` step from the workflow YAML (it was never in scope); no data or deploy impact, purely a CI config revert |
| Sentry auth token committed to git history | MEDIUM | Rotate the token immediately in Sentry org settings (Settings → Auth Tokens); git history still contains the old value but it's now inert; consider `git filter-repo`/BFG only if the repo's history exposure is a broader concern (likely overkill for a solo private-bound repo) |
| pino accidentally logs a session token to Vercel's log view | MEDIUM | Add redaction config immediately (stops future leaks); rotate/invalidate any exposed session tokens if feasible via Better Auth's session revocation; audit how far back the exposure goes in log retention |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Hydration/inline-script CSP breakage (P1) | CSP phase | Nonce-based `script-src 'strict-dynamic'` in middleware; report-only period shows zero script-src violations across all routes |
| Tailwind inline-style CSP breakage (P2) | CSP phase | Deliberate `style-src` decision documented; leaderboard/progress-bar UI visually verified post-enforcement |
| `unsafe-eval` leaking from dev to prod (P3) | CSP phase | `curl -sI <prod-url> | grep -v unsafe-eval` passes; CSP is branched by `NODE_ENV` in code |
| Enforcing CSP with no report-only period (P4) | CSP phase | Report-Only header + reporting endpoint live first; enforcement is a separate, later config flip after report review |
| Server Actions / `next/image` CSP edge cases (P5) | CSP phase | `form-action 'self'` explicit; external image hosts grepped and allowlisted before drafting policy |
| Required check name mismatch (P6) | CI phase | Workflow run once on a real PR before branch protection rule is configured; check name selected from dropdown, never typed |
| `drizzle-kit migrate` in CI build (P7) | CI phase | Workflow scoped to `typecheck`/`lint`/`test` only; no `build` step; comment in YAML explaining the omission |
| Sentry wizard clobbering CSP config (P8) | Sentry phase (sequenced after CSP) | `git diff` on `next.config.ts` reviewed after wizard run; CSP header presence re-verified via `curl` post-Sentry-deploy |
| Sentry tunnel route + middleware matcher collision (P9) | Sentry phase | Tunnel route placed under `/api/monitoring`; deliberate client error triggered and confirmed visible in Sentry dashboard |
| Sentry auth token leak (P10) | Sentry phase | `git status`/`git diff` checked immediately post-wizard; token confirmed server-only via Vercel env var UI |
| Sentry PII capture (P11) | Sentry phase (before Privacy Policy phase) | `sendDefaultPii` left `false`; replay masked or disabled; Privacy Policy wording matches actual config |
| Sentry quota burn (P12) | Sentry phase | Spike protection confirmed enabled; quota alert email configured |
| pino transport failure on Vercel (P13) | Logging phase | Production uses plain JSON `pino()`, no worker-thread transport; logs confirmed visible in Vercel's dashboard, not just locally |
| pino logging secrets (P14) | Logging phase | `redact` config present from first commit; no raw `req`/`session` object logging anywhere in the codebase |
| Repo-private breakage (P15) | Repo-visibility phase | Trivial post-flip commit confirms Vercel still auto-deploys; README badges checked pre-flip |
| No preview DB means CSP can't be pre-validated (P7 cross-cutting, see below) | CSP phase | Report-Only-in-production sequencing (below) substitutes for a preview environment |

## Cross-Cutting: No Preview Deployments Means CSP Cannot Be Validated Before Hitting Production

**The risk this creates specifically for CSP:**
Every other pitfall in this document can, in principle, be caught by "test it on a preview URL before merging to main." That safety net does not exist here — the known issue (confirmed in `PRODUCTIONIZATION_ROADMAP.md`'s own progress log: "Preview deployments have no database... preview builds fail at `drizzle-kit migrate`") means **every CSP change goes from `git push` to real production traffic with zero intermediate validation environment**. This is the single biggest amplifier of Pitfall 1 and Pitfall 4 above: a nonce-wiring bug or a missed route class isn't caught in a safe sandbox, it's caught by a real household member's browser silently failing to let them mark a chore done.

**Mitigations that do not require fixing preview branching (explicitly out of scope this milestone):**

1. **Local production-mode testing is the substitute preview environment.** `npm run build && npm run start` locally, with `NODE_ENV=production` and a real `.env.local` pointing at a real (ideally NOT the production, if a spare Neon branch/database is cheap to spin up manually for this one-time test — check if a free Neon project branch can be created ad hoc even without the Vercel integration wired) database, is the closest available approximation to prod behavior. This catches the `unsafe-eval`-in-dev-only distinction (Pitfall 3) and lets you click through every route class before ever pushing.
2. **Report-Only is not optional here — it's the primary safety net, not a nice-to-have.** Since there's no preview URL to validate against, the Report-Only period (Pitfall 4) effectively *becomes* the preview environment: it runs in production but is non-blocking. This reframes the rollout sequence's importance — skipping straight to enforcing CSP on this app, given the no-preview constraint, is materially riskier than it would be on an app with working previews, and the roadmap should treat the Report-Only step as non-negotiable rather than a nice-to-have.
3. **Deploy CSP changes at low-traffic times** (for a household app, likely late night/early morning in the household's timezone) so that if Report-Only surfaces a real breakage requiring a fast header rollback, the blast radius (number of real users hitting a broken interaction before the fix ships) is minimized. This is a cheap, zero-engineering mitigation available immediately.
4. **Keep the rollback trivial and rehearsed.** Because there's no preview to catch mistakes, the actual safety property comes from how fast and how confidently a bad CSP can be reverted. Before ever flipping Report-Only to enforcing, confirm (by doing it once, even against a harmless test change) that a `next.config.ts`/middleware header edit → commit → push → Vercel production redeploy round-trip is fast (typically 1-2 minutes on Vercel) and that this exact path has been exercised at least once, so it's not the first time under pressure.
5. **Consider a manual, ad hoc Neon branch for one-time local validation**, independent of fixing the Vercel-Neon preview integration. Creating a single throwaway Neon database branch by hand (via the Neon console, not the Vercel integration) and pointing a local `.env.production.local` at it for one production-mode test run is a low-effort way to validate the full migrate-then-build path without touching the actual preview-branching infrastructure work that's deferred. This is explicitly not "fixing preview branching" — it's a one-off manual step, not a re-architecture of the deploy pipeline.
6. **Do not bundle CSP with any other risky change in the same deploy.** Since there's no preview validation, isolate variables: ship CSP changes alone (not combined with the Sentry `next.config.ts` changes, not combined with a schema migration) so that if something breaks in production, the cause is unambiguous and the revert is a single clean change, not an untangling exercise.

## Sources

- [Next.js CSP Configuration — JustAppSec guide](https://justappsec.com/guides/nextjs-csp-configuration) — MEDIUM confidence, corroborates nonce + `strict-dynamic` pattern for App Router hydration scripts
- [Strict CSP configuration — @next-safe/middleware](https://next-safe-middleware.vercel.app/guides/strict-csp-configuration) — MEDIUM confidence, community reference implementation for nonce middleware pattern
- [Next.js CSP discussion — vercel/next.js#81703](https://github.com/vercel/next.js/discussions/81703) — MEDIUM confidence, confirms production inline-script requirement without nonce/unsafe-inline
- [GitHub Docs: Troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks) — HIGH confidence, official GitHub documentation, directly confirms the name-mismatch failure mode and fix
- [devActivity: Resolving GitHub Actions required status check mismatches](https://devactivity.com/posts/apps-tools/unlocking-cicd-flow-resolving-github-actions-required-status-check-mismatches/) — MEDIUM confidence, corroborates official docs with practical walkthrough
- [Sentry docs: tunnelRoute and middleware conflicts](https://docs.sentry.io/platforms/javascript/guides/nextjs/troubleshooting/) — HIGH confidence, official Sentry troubleshooting docs
- [getsentry/sentry-javascript discussion #9205: Tunnel in NextJS results in error](https://github.com/getsentry/sentry-javascript/discussions/9205) — MEDIUM confidence, corroborating community report of middleware/tunnel interaction
- [Sentry docs: Data Collected (JavaScript/Next.js)](https://docs.sentry.io/platforms/javascript/data-management/data-collected/) — HIGH confidence, official docs, confirms `sendDefaultPii` default `false` behavior and what's excluded
- [GitHub security advisory GHSA-6465-jgvq-jhgp: sensitive headers sent when sendDefaultPii=true](https://github.com/getsentry/sentry-javascript/security/advisories/GHSA-6465-jgvq-jhgp) — HIGH confidence, official Sentry security advisory
- [formbricks/formbricks#7509: pino-pretty worker thread crashes in Edge Runtime, Next.js 15/16 + Turbopack](https://github.com/formbricks/formbricks/issues/7509) — HIGH confidence, directly reproduces the failure mode described, same framework version line as this repo
- [vercel/next.js#86099: Turbopack Next.js 16 — Pino cannot find module './transport-stream'](https://github.com/vercel/next.js/issues/86099) — HIGH confidence, open issue on this repo's exact Next.js major version (16)
- [vercel/next.js#84766: Turbopack Next.js 16 — Pino worker thread cannot find module 'real-require'](https://github.com/vercel/next.js/issues/84766) — HIGH confidence, same as above
- [GitHub Docs: About billing for GitHub Actions](https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions) — HIGH confidence, official docs, confirms 2,000 min/month private-repo free-tier Actions minutes vs unlimited public
- Repo files read directly (`package.json`, `next.config.ts`, `src/middleware.ts`, `.planning/PROJECT.md`, `PRODUCTIONIZATION_ROADMAP.md`) — HIGH confidence, primary source, not inference

---
*Pitfalls research for: Honey_Do v1.2 Productionization milestone*
*Researched: 2026-07-27*
