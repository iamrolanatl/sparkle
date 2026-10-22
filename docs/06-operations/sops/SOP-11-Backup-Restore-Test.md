# SOP-11 — Backup & Restore Test

| Field | Value |
|---|---|
| SOP ID | SOP-11 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Prove each quarter that we can restore data.

## 2. Scope
Supabase Postgres (prod); R2 buckets `sparkle-scans`, `sparkle-vault`.

## 3. Roles
- **Owner:** Rolan.
- **Operator:** Grok Bot.

## 4. Prerequisites
Supabase plan backup capability confirmed (PITR availability depends on plan — TBD); a non-prod target project (TBD).

## 5. Procedure
1. **Quarterly** (and before major migrations): note the latest Supabase backup time in the dashboard.
2. Take a logical dump: `supabase db dump -f prod-<date>.sql` (+ `--data-only` dump), stored privately (never git).
3. Restore into a non-production project (TBD) or local `supabase start`: `psql -f prod-<date>.sql`.
4. Run `supabase/tests/rls_test.sql` and spot-check row counts for key tables.
5. R2: confirm bucket listing; object versioning/lifecycle policy TBD.
6. Record result (date, duration, issues) in the Change Log as an "Ops check" entry.

## 6. Verification
Restore completes, RLS tests pass, row counts match within expected drift.

## 7. Rollback / Exception handling
If restore fails, raise Sev-2 issue and fix before the next prod migration.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
