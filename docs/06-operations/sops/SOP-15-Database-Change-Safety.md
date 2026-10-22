# SOP-15 — Database Change Safety

| Field | Value |
|---|---|
| SOP ID | SOP-15 |
| Version | 1.0 |
| Status | Active (CR-0010); supersedes the apply steps in SOP-03 where stricter |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | **Integration team only** applies migrations |
| Review cadence | Every migration |
| Last Updated | 2026-10-21 |

## 1. Rules
1. **Additive only**: no `DROP`, `TRUNCATE`, destructive `ALTER` (drop/rename/type change), `DELETE`/`UPDATE` data rewrites, or disabling RLS — unless an approved CR is cited in the file as `-- destructive-ok: CR-xxxx`. CI (`scripts/check-migrations.mjs`) enforces this.
2. Name `<YYYYMMDDHHMMSS>_<int|a|b|c|d|e>_<name>.sql`; must sort after the latest migration on `main` (CI order lint). Files ≤ `20261022020000` are grandfathered.
3. Each file has a `-- rollback:` note; each PR adds a pg test (PGlite suite, RLS assertions included).
4. One migration PR in flight at a time; Integration sequences them.
5. Teams never run `supabase db push` or apply SQL to any hosted project.
6. **Access-widening changes** — `CREATE OR REPLACE` of an access function (`can_view_student`, `redeem_invitation`, `is_active_guardian`, `is_student_self`, `student_age`), `ALTER POLICY`, or any `SECURITY DEFINER` function — need an explicit `-- integration-signoff: <PR#>` line (added by Integration after review) **and** RLS pg tests proving no new access. CI enforces.
7. `drop policy if exists X on T;` is allowed only when the same file re-creates policy `X on T` (policy rewrite); a bare policy drop is destructive.
8. The `-- rollback:` note must describe the rollback; blank, `n/a`, `none` or `TBD` fail CI.

## 2. Apply procedure (Integration)
1. **Backup** both targets to `/workspace/backups/<YYYYMMDD-HHMMSS>/<project-ref>/`: `schema.sql` (schema dump) and `data.sql` (data-only dump of `public`), plus `migrations.txt` (applied versions). **Never commit backups** — they contain user data. `/workspace/backups` lives outside the repo, is `chmod 700`, and `backups/`, `*.dump`, `*.backup` are gitignored.
   **Retention:** keep 14 days, then delete (`find /workspace/backups -mindepth 1 -maxdepth 1 -mtime +14 -exec rm -rf {} +`), always keeping the latest backup per project; Integration runs it at each PM sync. Backups are never copied off the box or shared.
2. **Dry run**: `supabase db push --dry-run` (or the SQL wrapped in `BEGIN … ROLLBACK` through the Management API / connector) and review the plan.
3. **Apply to `sparkle-dev`** (`wqfzzfggyirvgaxfqcts`) first; run the RLS/pg test suite and API smoke against dev.
4. **Apply to main** (`nklbdyezbsugkdvaidtt`) only after step 3 is green; record the version in `supabase_migrations.schema_migrations`.
5. Log in the PR: backup path, dry-run result, dev result, main apply time (ET).

## 3. Rollback
Follow the file's `-- rollback:` note in a new additive migration where possible; restoring from a backup is a destructive operation on production and needs Rolan's approval (hard limit).
