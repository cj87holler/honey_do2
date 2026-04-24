---
title: "UAT: Leave hive + multi-hive membership (up to 3)"
priority: high
source: production UAT (2026-04-14)
phase: post-v1
---

## Issue

When a signed-in user who already belongs to a hive clicks an invite link to a different hive, they see "You are already in a Hive" with a message to leave first — but there is no "leave hive" feature.

## Steps to Reproduce

1. User A signs up and creates a hive
2. User B signs up and creates a hive
3. User B generates an invite link and sends to User A
4. User A clicks the invite link while logged in
5. App shows "You need to leave your current Hive before joining a new one" with no way to leave

## Root Cause

Single-hive enforcement at `src/app/invite/[token]/page.tsx:51` (D-07 guard) with no corresponding leave-hive action.

## Decision

1. **Add "leave hive" feature** — users can leave any hive they belong to
2. **Multi-hive membership up to 3** — remove single-hive restriction, allow users to be in up to 3 hives simultaneously
3. **Multi-hive as paid feature** — free tier gets 1 hive, paid tier unlocks up to 3

## Scope

- Leave hive action + confirmation
- Multi-hive hive switcher UI (dashboard needs to show which hive you're viewing)
- Honeycomb/leaderboard scoped per-hive (already designed this way via hiveMembers)
- Monetization gate: free = 1 hive, paid = up to 3

## Impact

Blocks the core invite flow for any user who has already created or joined a hive. First thing hit during real-user testing.
