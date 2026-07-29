# Feature Landscape

**Domain:** Gamified household task management (chore apps for cohabitants)
**Project:** Honey_Do
**Researched:** 2026-03-26
**Confidence note:** Web research tools were unavailable. Analysis draws on training knowledge (cutoff Aug 2025) of this well-documented market — OurHome, Tody, Choreganizers, ChoreMonster, Homey, Habitica, BusyKid, Sweepy, and similar apps. Confidence is MEDIUM for market patterns (consistent across many sources in training data), LOW for specific app version details.

---

## Table Stakes

Features users expect when they install a gamified chore app. Missing = the product doesn't feel like it belongs in the category.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Task creation with text description | Core primitive — nothing works without it | Low | Honey_Do caps at 160 chars; keeps it simple |
| Task assignment to a specific person | Household apps are fundamentally collaborative; solo to-do apps handle personal tasks | Low | Requires user identity within a group |
| Task status tracking (pending / done) | Users need to know what's done and what isn't | Low | "In progress" is a nice-to-have but commonly expected too |
| Group/household as a first-class concept | A shared space separates household apps from personal to-do apps | Low–Med | Called "Hive" in Honey_Do; requires invite flow |
| Points or score for completing tasks | The defining mechanic of gamified chore apps — without it, it's just a to-do list | Low–Med | Called "honeys" in Honey_Do |
| Leaderboard within the household | Social comparison is the engine of engagement; every competitor has this | Med | Requires aggregated scoring per user per group |
| Invite flow to join the household | Users need a frictionless way to get housemates into the same group | Low–Med | Link-based invite is the modern pattern (vs join codes) |
| View of your own assigned tasks | Users need a personal queue; without it they can't act | Low | Called "Honeycomb" in Honey_Do |
| View of completed tasks | Closure and history — users want to see what they accomplished | Low | Separate from the active queue |
| Authentication (sign up / log in) | Access control for personal and household data | Med | Email/password is sufficient for v1 |
| Role differentiation (assigner vs assignee) | Household dynamics have natural authority structures; pure peer-to-peer creates friction | Med | Queen / Bee / QueenBee model in Honey_Do |
| Mobile-responsive web UI | Chore apps are checked on the couch, not at a desk | Med | Next.js + responsive CSS handles this |
| Distinct personality / theme | Generic productivity UI loses to themed competitors — theme IS product differentiation in this space | Med–High | Bee theme is Honey_Do's core brand; not a veneer |

---

## Differentiators

Features that separate winning products from commodity chore apps. Not universally expected, but meaningfully valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Playful contextual copy based on task load | Personality that responds to user state — makes the app feel alive, not just functional | Med | "Whoa! Better get to work!" / "Go play golf!" — already specced in Honey_Do |
| Custom honey values per task | Acknowledges that tasks have real-world effort variance; players feel the economy is fair | Low | Honey_Do supports 5 / 10 / 20 / custom |
| Named household (Hive naming) | Personalization creates ownership and identity; increases retention | Low | Queen names the Hive |
| Bee-themed UI patterns (honeycomb grid, bee puns) | Immersive theme raises switching cost — you can't easily get "this exact experience" elsewhere | High | Honeycomb layout, pun copy, bee iconography |
| Task load personality states | Dynamic UI state that mirrors game feedback loops | Med | Fewer tasks = encouraging; overloaded = playful alarm |
| QueenBee role (assigner AND assignee) | Real households have power users who both manage and participate; supporting this reduces friction | Low | Solves the "I'm the house manager AND a participant" use case |
| Hive vs Hive competition (Colonies) | Cross-household competition dramatically widens the social graph and adds external motivation | High | Deferred to v2 in Honey_Do — smart call |
| Badges, levels, unlockable rewards | Deeper progression loop; common in successful gamified apps (Habitica, ChoreMonster) | High | Deferred to v2 — honeys-only is the right v1 scope |
| Recurring task scheduling | Reduces manual overhead for weekly/monthly chores | Med–High | Not in v1 scope; would be v2 priority |
| Task categories / rooms | Organizational layer (kitchen, bathroom, yard) helps larger households | Med | Not in v1 — text-only is simpler |
| Task deadlines / due dates | Urgency mechanic; common ask from power users | Med | Not in v1 scope |
| Task photo proof on completion | Anti-cheat mechanic; reduces "I did it" disputes | Med | Adds storage and UX complexity; v2 material |
| Push / email notifications | Reminder loop that brings users back without opening the app | High | Explicitly deferred; users check Honeycomb manually in v1 |
| Activity feed / history | Social transparency — see who did what and when | Med | Natural v2 addition to leaderboard |
| Streak tracking | Behavioral reinforcement; works well for recurring tasks | Med | More meaningful once recurring tasks exist |

---

## Anti-Features

Things to deliberately NOT build. Building these in v1 would add complexity without proportional value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| OAuth / social login | Adds third-party dependencies, token refresh complexity, and scope creep for v1 | Email/password; revisit in v2 if conversion data shows login friction |
| Native mobile app (iOS/Android) | Requires separate codebase, app store submissions, review cycles — all before PMF is validated | Responsive web app via Next.js; browser covers household couch use |
| Real-time updates / WebSockets | Adds infrastructure cost and implementation complexity before the core loop is proven | Standard request/response; users can refresh manually |
| Complex task recurrence rules | iCal-style rules (every 2nd Tuesday) are hard to build and harder to explain | Defer all recurrence; v1 tasks are one-off |
| Subtasks / task dependencies | Project management complexity that fights the "it's a game, not a chore" positioning | Keep tasks atomic — 160 chars is a natural forcing function |
| File / photo attachments | Storage costs, moderation surface area, upload UX — none of this helps the core loop | If disputes arise, address in v2 with photo proof |
| Administrative dashboard / analytics | This is a consumer game, not an enterprise tool | The leaderboard IS the analytics; don't add a separate reporting layer |
| Public/open Hive registration | Cross-household strangers joining the same household context is a privacy and moderation problem | Invite-link only; join by explicit invitation |
| Money / real-reward economy | Converting honeys to cash or gift cards adds legal, financial, and trust complexity | Honeys are symbolic; prestige only |
| Task marketplace (users browse and claim tasks) | Adds a discovery UX that fights the assignment model; in households, someone needs to be in charge | Assignment-first model; Queen assigns, Bee accepts |
| Notifications in v1 | Reduces scope significantly; adds SMTP/push infrastructure and user preference management | Manual check pattern; revisit when retention data shows a drop-off pattern |

---

## Feature Dependencies

```
Auth (sign up / log in)
  └── Hive creation (Queen)
        └── Invite flow → Bee / QueenBee joins Hive
              ├── Task creation (Queen or QueenBee assigns to Bee/QueenBee)
              │     ├── Honeycomb view (assignee sees their tasks)
              │     │     └── Mark in-progress / done
              │     │           └── Honeys awarded on completion
              │     │                 └── Leaderboard (aggregated per Hive)
              │     └── Completed tasks view
              └── Playful contextual copy (depends on task load count)

Hive naming → requires Hive creation
QueenBee role → requires both assigner + assignee flows to exist
Custom honey values → requires honey value system to exist
```

---

## MVP Recommendation

### Must ship (table stakes for v1)

1. Email/password auth
2. Hive creation + invite link
3. Queen / Bee / QueenBee roles
4. Task creation (160-char text, honey value selection)
5. Task assignment
6. Honeycomb view (personal task queue)
7. Mark in-progress / done
8. Completed tasks view
9. Honeys awarded on completion
10. Leaderboard within Hive
11. Hive naming
12. Full bee theme (copy, UI patterns, puns)
13. Contextual dynamic copy based on task load

### Strongly recommended for v1 (differentiators that cost little)

- Custom honey values (already specced; low complexity, high fairness perception)
- QueenBee role (already specced; minimal implementation delta over Queen + Bee)
- Playful contextual copy states (already specced; pure frontend, high personality payoff)

### Defer to v2 (validated by PROJECT.md Out of Scope decisions)

- Colonies / Hive-vs-Hive competition
- Badges, levels, unlockable rewards
- Notifications (email / push)
- OAuth / social login
- Native mobile app
- Real-time updates
- Recurring tasks
- Task deadlines
- Task photo proof
- Activity feed

---

## Competitive Context

**Apps in this space (training data, MEDIUM confidence):**

- **OurHome** — most direct competitor; household task assignment, points, rewards store, shopping lists. Points can be exchanged for parent-defined rewards (family-oriented skew).
- **Habitica** — RPG-style; individual habit tracking with social party mechanics. Not household-assignment-first; more personal accountability with optional group quests.
- **ChoreMonster** — Parent/child dynamic with monster-themed rewards. Points unlock reward images kids choose. Skewed toward young children.
- **Sweepy** — Scheduling-first chore app with gamification layer. Rotation scheduling for roommates; less playful than Honey_Do aims to be.
- **Homey** — Family-oriented; chore charts, allowance tracking, banking. Financial reward model; not a game.
- **Tody** — Cleaning scheduler, no gamification. Purely functional.

**Honey_Do's differentiation niche:** Peer-to-peer household (adults, couples, roommates) with a strong playful brand identity and no financial reward model. The bee theme is a genuine product differentiator — no direct competitor owns this identity.

---

## Sources

- Training knowledge of OurHome, Habitica, ChoreMonister, Sweepy, Homey, Tody, ChoreMonster (MEDIUM confidence — consistent market pattern, training cutoff Aug 2025)
- PROJECT.md (`/Users/cj.holler/Desktop/honey_do2/.planning/PROJECT.md`) — requirements, out of scope decisions, constraints (HIGH confidence — primary spec)
- Web research tools were unavailable during this session; findings rely on training data for competitive landscape and LOW confidence for specific competitor version details
