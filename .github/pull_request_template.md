## What & why
<!-- One paragraph. Link WBS / FR / CR / DEC ids. -->

**Team:** <!-- INT | A | B | C | D | E -->  **Reviewer label:** <!-- needs-review:E (A–D) · needs-review:I (E, migrations, shared files) -->

## Review checklist (SOP-14) — reviewer posts "Review by Team X" covering each item
- [ ] **Correctness** — behaviour matches the requirement; edge cases handled
- [ ] **Tests** — unit/E2E added or updated; CI green
- [ ] **Security / RLS** — authz checked server-side; RLS policies + pg tests for any new table; no PII in logs
- [ ] **Performance** — bounded queries, indexes for new FKs, no N+1; perf budget (NFR-47/48) respected
- [ ] **Resilience** — timeouts, error boundaries / graceful degradation (CR-0007)
- [ ] **Definition of Done** — docs, WBS status, DEC entry (team range), RAID updated
- [ ] **No secrets** committed or printed
- [ ] **Lane** — only this team's directories; shared files in small separate commits

## Database (SOP-15) — only if `supabase/migrations/` changes
- [ ] Additive only (no DROP / TRUNCATE / destructive ALTER / data rewrite) — or CR id: ___
- [ ] Named `<timestamp>_<team>_<name>.sql`, newer than latest on main
- [ ] `-- rollback:` note in the file
- [ ] pg test (incl. RLS assertions) in `supabase/tests`
- [ ] Integration applies: backup → dry-run → sparkle-dev → tests → main
