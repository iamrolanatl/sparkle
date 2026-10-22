# SOP-09 — Feature Flags & Staged Rollout

| Field | Value |
|---|---|
| SOP ID | SOP-09 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Ship risky features dark and turn them on gradually and reversibly.

## 2. Scope
`public.feature_flags` (`sales_chat`, `vault_enabled`, future flags); agent staged rollout (Phase 1, TBD).

## 3. Roles
- **Approver:** Rolan for any flag change in production.
- **Operator:** Grok Bot / Rolan.

## 4. Prerequisites
Flag row exists (added by migration); feature code checks it.

## 5. Procedure
1. New risky/live/animated features ship behind a flag defaulting to **off**.
2. Turn on in a test environment first (staging TBD).
3. Production enable: Rolan approves → change via admin UI (where available) or SQL (`update feature_flags set enabled = true where key = '…'`), logged in Change Log.
4. Staged rollout by % or district: TBD (config field in `feature_flags.config`).
5. `vault_enabled` stays **false** until legal + security review (R-16).
6. Remove flags that have been fully on for two releases.

## 6. Verification
Feature behaves as expected; metrics (errors, latency, cost) stable for 24 h.

## 7. Rollback / Exception handling
Set the flag back to off; that is the first containment step in SOP-05.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
