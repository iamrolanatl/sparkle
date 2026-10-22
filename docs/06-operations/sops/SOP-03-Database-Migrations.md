# SOP-03 — Database Migrations

| Field | Value |
|---|---|
| SOP ID | SOP-03 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Change the Supabase schema safely, with review, tests and backups.

## 2. Scope
`supabase/migrations/*.sql` for project `nklbdyezbsugkdvaidtt` (prod). Dev/staging projects: TBD (WBS 2.2.1).

## 3. Roles
- **Author:** Grok Bot.
- **Approver:** Rolan (explicit approval required before any prod `db push`).

## 4. Prerequisites
- Supabase CLI; `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` in env.
- Migration has RLS on every new table and tests in `supabase/tests/rls_test.sql`.

## 5. Procedure
1. Write a new timestamped file `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql` (never edit an applied migration).
2. Add/extend assertions in `supabase/tests/rls_test.sql`; run `pnpm test:db` (PGlite) and, if Docker is available, `supabase start && supabase db reset` + `psql -f supabase/tests/rls_test.sql`.
3. Open a PR (SOP-01); reviewer checks RLS, grants, and that no secrets/credentials are stored.
4. **Staging first** (when a staging project exists — TBD): `supabase link --project-ref <staging>` → `supabase db push`.
5. **Backup before prod:** confirm the latest automatic backup in the Supabase dashboard (Database → Backups), or `supabase db dump -f backup-<date>.sql` (store privately, never in git).
6. `supabase link --project-ref $SUPABASE_PROJECT_REF` → `supabase db push --dry-run` → share output with Rolan → on approval `supabase db push`.
7. Log in the Change Log.

## 6. Verification
`supabase migration list` shows the migration applied; smoke test the affected feature; check the advisors (Dashboard → Advisors) for RLS warnings.

## 7. Rollback / Exception handling
Write a forward "down" migration that reverses the change and push it the same way; for data loss, restore from backup (SOP-11). Never run ad-hoc DDL in prod.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
