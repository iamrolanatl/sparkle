# SOP-01 — Branching, Pull Requests & Code Review

| Field | Value |
|---|---|
| SOP ID | SOP-01 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Keep `main` always releasable and every change traceable to a requirement or change request.

## 2. Scope
All code and docs in `iamrolanatl/sparkle`.

## 3. Roles
- **Author:** Grok Bot (or any contributor).
- **Reviewer/approver:** Rolan (merging = approval). Second human reviewer TBD when staffed.

## 4. Prerequisites
- `gh` authenticated; Node 22 + pnpm 10; local `.env` from `.env.example` (never committed).

## 5. Procedure
1. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`. One topic per branch.
2. Commit with Conventional Commits; cite IDs: `feat(FR-19): …`, `docs(CR-0003): …`.
3. Run locally: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
4. Open a PR with `gh pr create`. The body must list FR/CR IDs, what changed, test evidence, and what was NOT done (e.g. "migration not applied, nothing deployed").
5. If a baselined doc changes, the same PR includes the CR entry, a changelog line and the doc revision bump (see [docs/README](../../README.md)).
6. CI (`.github/workflows/ci.yml`) must be green.
7. Reviewer checks the [Definition of Done](../../00-governance/Definition-of-Done.md), then approves and merges (squash or merge commit — TBD, Rolan).
8. Delete the branch after merge.

## 6. Verification
PR shows green CI, linked IDs, DoD checklist ticked; `main` builds.

## 7. Rollback / Exception handling
Revert the merge with `git revert -m 1 <sha>` in a new PR (never force-push `main`). Branch protection on `main` is not yet enabled (WBS 2.2.2).

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
