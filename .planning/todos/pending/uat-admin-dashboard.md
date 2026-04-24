---
title: "Admin dashboard — hive management, user management, password resets"
priority: high
source: production UAT (2026-04-14)
phase: post-v1
---

## Need

App owner needs an admin view to manage the production app — view all hives, see members, reset passwords, and handle support issues.

## Features

### Hive Management
- List all hives with member count, creation date
- View hive details: members, roles, task stats, honey totals
- Ability to delete/archive hives

### User Management
- List all users with email, sign-up date, hive membership
- Reset user passwords
- Disable/delete accounts

### Password Reset
- Admin-initiated password reset (generate reset link or set temporary password)
- Self-service password reset flow for users (forgot password)

## Notes

- Should be restricted to a designated admin role (not Queen — that's a hive-level role)
- Could be a separate `/admin` route group with its own auth gate
- Consider whether this is a full UI or a simpler internal tool initially
