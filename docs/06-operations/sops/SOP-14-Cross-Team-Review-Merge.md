# SOP-14 — Cross-Team Review and Merge

| Field | Value |
|---|---|
| SOP ID | SOP-14 |
| Version | 1.0 |
| Status | Active (CR-0010) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Integration team (merger); all teams (reviewers) |
| Review cadence | Every PR; audited at each phase gate |
| Last Updated | 2026-10-21 |

## 1. Purpose
Every change to `main` gets an independent review by another team, and only one owner (Integration) merges, so parallel teams (CR-0009) don't break each other or production.

## 2. Roles
| Author team | Reviewer | Label |
|---|---|---|
| A, B, C, D | Team E | `needs-review:E` |
| E | Integration | `needs-review:I` |
| Integration | Team E (or, if E unavailable, a documented Integration self-review against §4, flagged in the gate report) | `needs-review:E` |
| Any PR touching `supabase/migrations/`, CI, `packages/ui`, or shared docs | **also** Integration | `needs-review:I` |

## 3. Procedure
1. **Author**: rebase on `main`; fill the PR template; apply the reviewer label. **No auto-merge.**
2. **Reviewer** (start of each work cycle): list `gh pr list --label needs-review:<team>`; review against §4; post `gh pr review <n> --comment` (or `--request-changes`) with the body headed **`Review by Team X`** and one line per checklist item.
3. **Integration** merges one PR at a time:
   1. Confirm a recorded review exists from the correct team (`gh pr view <n> --json reviews,comments`), with no open request-changes.
   2. `gh pr update-branch <n>` (or rebase), wait for **all** checks green on the new head.
   3. `gh pr merge <n> --squash --delete-branch`.
   4. If the PR touches migrations, follow SOP-15 before/after merge.
   5. Redeploy dev (SOP-02) after a batch; smoke-test.
4. Conflicts: Integration arbitrates; the author rebases. Integration may resolve trivial union conflicts in shared registers (Decision Log, Change Log, WBS, RAID, SAI) and notes it in the PR.

## 4. Review checklist
Correctness · tests (CI green) · security/RLS (server-side authz, RLS + pg tests, no PII in logs) · performance (bounded queries, FK indexes, perf budget) · resilience (timeouts, error boundaries) · Definition of Done (docs, WBS, DEC in team range, RAID) · no secrets · lane discipline.

## 5. Records
The review comment is the record. At each gate, Integration runs an audit: every merged PR since the last gate has a `Review by Team X` comment or review; gaps are reviewed retroactively and listed in the gate report.
