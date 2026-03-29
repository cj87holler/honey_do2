# Requirements: Honey_Do

**Defined:** 2026-03-26
**Core Value:** People in a household can assign tasks to each other and actually get them done, because the gamified bee-themed experience makes chores feel like play rather than nagging.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can create account with email and password
- [x] **AUTH-02**: User can log in and stay logged in across browser refresh
- [ ] **AUTH-03**: User can log out from any page

### Hive Management

- [x] **HIVE-01**: Queen can create a new Hive
- [x] **HIVE-02**: Queen can name the Hive
- [ ] **HIVE-03**: Queen can generate an invite link to bring Bees into the Hive
- [ ] **HIVE-04**: Invited user can join a Hive via invite link and create an account
- [x] **HIVE-05**: Roles are enforced: Queen (creates/assigns tasks), Bee (receives tasks), QueenBee (creates AND receives tasks)

### Tasks

- [ ] **TASK-01**: Queen or QueenBee can create a task with text (160-char limit)
- [ ] **TASK-02**: Task must be assigned a honey value (5, 10, 20, or custom number)
- [ ] **TASK-03**: Task must be assigned to a Bee or QueenBee
- [ ] **TASK-04**: Assigned tasks appear on the assignee's Honeycomb (personal to-do list)
- [ ] **TASK-05**: Assignee can mark a task "in progress"
- [ ] **TASK-06**: Assignee can mark a task "done" and earn the honey value
- [ ] **TASK-07**: Completed tasks are visible in a separate completed area

### Leaderboard

- [ ] **LEAD-01**: Hive shows a leaderboard ranking members by total honeys earned

### Theme & Personality

- [ ] **THEME-01**: Full bee theme with honeycomb UI patterns, bee puns, and buzzy personality
- [ ] **THEME-02**: Dynamic contextual copy based on task load (e.g. "whoa! better get to work!" / "go play golf!")

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Colonies

- **COLN-01**: Hives can form Colonies to compete across households
- **COLN-02**: Colony leaderboard aggregates all Bees and QueenBees across Hives

### Gamification

- **GAME-01**: Badges earned at honey milestones (e.g. "Worker Bee" at 100 honeys)
- **GAME-02**: Levels or ranks based on accumulated honeys
- **GAME-03**: Custom rewards set by Queen (e.g. "500 honeys = pick dinner")

### Notifications

- **NOTF-01**: Email notification when assigned a new task
- **NOTF-02**: In-app notification badge for new tasks

### Tasks (Extended)

- **TASK-08**: Recurring task scheduling (weekly, monthly chores)
- **TASK-09**: Task deadlines / due dates
- **TASK-10**: Task photo proof on completion

### Social

- **SOCL-01**: Activity feed showing recent completions
- **SOCL-02**: Streak tracking for consistent task completion

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| OAuth / social login | Email/password sufficient for v1; adds third-party complexity |
| Native mobile app | Web-first; validate PMF before investing in native |
| Real-time updates / WebSockets | Standard request/response is fine for household scale |
| Subtasks / task dependencies | Fights the "it's a game" positioning; 160-char limit keeps tasks atomic |
| File / photo attachments | Storage costs and moderation surface area; not core loop |
| Admin dashboard / analytics | The leaderboard IS the analytics for v1 |
| Public Hive registration | Privacy risk; invite-only by design |
| Money / real-reward economy | Legal and trust complexity; honeys are symbolic |
| Task marketplace (browse & claim) | Fights the assignment model; Queen assigns, Bee accepts |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Pending |
| HIVE-01 | Phase 1 | Complete |
| HIVE-02 | Phase 1 | Complete |
| HIVE-03 | Phase 2 | Pending |
| HIVE-04 | Phase 2 | Pending |
| HIVE-05 | Phase 1 | Complete |
| TASK-01 | Phase 3 | Pending |
| TASK-02 | Phase 3 | Pending |
| TASK-03 | Phase 3 | Pending |
| TASK-04 | Phase 3 | Pending |
| TASK-05 | Phase 3 | Pending |
| TASK-06 | Phase 3 | Pending |
| TASK-07 | Phase 3 | Pending |
| LEAD-01 | Phase 4 | Pending |
| THEME-01 | Phase 5 | Pending |
| THEME-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after roadmap creation*
