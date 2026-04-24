---
phase: quick
plan: 260423-swx
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(app)/help/page.tsx
  - src/components/layout/header.tsx
autonomous: true
must_haves:
  truths:
    - "Logged-in user can navigate to /help and see a guide explaining Honey_Do concepts"
    - "Unauthenticated user visiting /help is redirected to /login"
    - "Help page covers roles (Queen, Bee, QueenBee), honeys/points, leaderboard, task creation, Honeycomb, and invite flow"
  artifacts:
    - path: "src/app/(app)/help/page.tsx"
      provides: "Help page with auth guard and bee-themed content"
      min_lines: 80
  key_links:
    - from: "src/components/layout/header.tsx"
      to: "/help"
      via: "Link component in nav"
      pattern: "href.*help"
---

<objective>
Add a /help page for logged-in users that explains how Honey_Do works in depth — roles, honeys, leaderboard, tasks, Honeycomb, and invites — using the same bee-themed style as the landing page.

Purpose: Give users an in-app reference for all Honey_Do concepts beyond the brief landing page overview.
Output: New help page at /help with auth guard, plus a Help link in the app header.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/landing/landing-page.tsx
@src/app/(app)/hive/page.tsx
@src/components/layout/header.tsx
@src/components/ui/button.tsx
@src/app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create the /help page with auth guard and full content</name>
  <files>src/app/(app)/help/page.tsx</files>
  <action>
Create a new server component at `src/app/(app)/help/page.tsx`. This page lives inside the `(app)` route group, so it automatically gets the Header layout from `src/app/(app)/layout.tsx`.

Auth guard pattern (copy from `src/app/(app)/hive/page.tsx`):
```typescript
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
```
Check session with `await auth.api.getSession({ headers: await headers() })`. If no session, `redirect("/login")`.

Page content — use the same visual style as `landing-page.tsx`:
- Outer wrapper: `div` with `min-h-screen bg-white/80`
- Max width container: `max-w-3xl mx-auto px-6 py-12`
- Section headings: `text-2xl font-bold text-queen` with bottom margin
- Body text: `text-stone-600`
- Use lucide-react icons matching the landing page style (Hexagon, ClipboardList, Trophy, plus Crown, Users, HelpCircle as needed)
- Use the amber/honey color palette from globals.css (text-honey, text-queen, text-bee, bg-honey)

Sections to include (each as its own `<section>` with a heading and descriptive paragraphs):

1. **Page title**: "The Honey Do Guide" with a bee emoji and subtitle "Everything you need to know about buzzing through your chores."

2. **Roles in the Hive** — Explain the three roles:
   - **Queen**: The hive creator. Can invite members, manage the hive, assign tasks to anyone.
   - **Bee**: A hive member. Can create tasks, complete tasks, and earn honeys.
   - **QueenBee**: Has Queen powers AND earns honeys like a Bee. Best of both worlds.
   Use a 3-column grid on desktop (1-col on mobile) like the landing page "How It Works" section, with Crown icon for Queen, Users icon for Bee, and a combined icon or Hexagon for QueenBee.

3. **Honeys (Points)** — Explain:
   - Every task has a honey value (5, 10, 20, or a custom number).
   - When you complete a task, you earn those honeys.
   - Honeys are tracked per-hive — your score in one hive is separate from another.

4. **The Honeycomb (Task List)** — Explain:
   - The Honeycomb is your hive's shared task board.
   - Anyone in the hive can see all tasks.
   - Tasks show who created them, who they're assigned to, and the honey reward.
   - Task text is limited to 160 characters — keep it short and sweet.

5. **Creating & Assigning Tasks** — Explain:
   - Tap "New Task" to create one.
   - Pick a hive member to assign it to.
   - Set the honey value (how many points it's worth).
   - The assignee sees it in their Honeycomb and can mark it done to earn the honeys.

6. **The Leaderboard** — Explain:
   - The leaderboard ranks hive members by total honeys earned.
   - It updates in real time as tasks get completed.
   - Friendly competition keeps everyone motivated.

7. **Inviting Hivemates** — Explain:
   - Queens and QueenBees can generate an invite link.
   - Share the link with your housemate — they click it, create an account (or sign in), and join the hive.
   - Each hive can have multiple members.

8. **Back to Hive link**: At the bottom, a link back to `/hive` using the Button component with variant="primary". Text: "Back to the Hive".

Use `Link` from `next/link` for the back button. Import `Button` from `@/components/ui/button`.
  </action>
  <verify>
    <automated>cd /Users/cj.holler/Desktop/honey_do2 && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - /help page renders for authenticated users with all 7 content sections
    - Unauthenticated users are redirected to /login
    - Visual style matches landing page (same colors, fonts, layout patterns)
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Help link to the app header</name>
  <files>src/components/layout/header.tsx</files>
  <action>
Modify `src/components/layout/header.tsx` to add a "Help" link in the header nav, next to the Log out button.

Add `import Link from "next/link"` at the top.

In the header's right-side flex container (the div containing the Log out button), add a Help link BEFORE the Log out button:

```tsx
<Link
  href="/help"
  className="text-sm font-medium text-amber-900 hover:underline"
>
  Help
</Link>
```

Wrap the right-side items in a `flex items-center gap-3` container to space the Help link and Log out button properly. The current layout already has `flex items-center justify-between` on the parent — just wrap the two right-side elements in a new `div` with `flex items-center gap-3`.
  </action>
  <verify>
    <automated>cd /Users/cj.holler/Desktop/honey_do2 && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Header shows a "Help" link next to the Log out button on all app pages
    - Clicking Help navigates to /help
    - Layout looks balanced with both items on the right side
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. Visit /help while logged in — all 7 sections render with bee-themed styling
3. Visit /help while logged out — redirects to /login
4. Header on any app page shows "Help" link that navigates to /help
</verification>

<success_criteria>
- Authenticated users can access /help and read a comprehensive guide covering roles, honeys, Honeycomb, task creation, leaderboard, and invites
- Unauthenticated users are redirected to /login
- Help link is accessible from the app header on every authenticated page
- Visual style is consistent with the existing bee theme
</success_criteria>

<output>
This is a quick task — no SUMMARY file needed.
</output>
