# SOP-13 — Repository Hygiene

| Field | Value |
|---|---|
| SOP ID | SOP-13 |
| Version | 1.0 |
| Status | Active (CR-0007) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot |
| Review cadence | **Every PR (automated) + weekly with the Friday status report + every phase gate** |
| Last Updated | 2026-10-21 |

## 1. Purpose
Keep the repository clean as the codebase grows to enterprise scale (CR-0007).

## 2. Every PR (CI-enforced)
1. PR title follows Conventional Commits (`feat|fix|docs|chore|refactor|test|perf|ci|build(scope): …`).
2. `pnpm lint`, `pnpm typecheck`, `pnpm format:check` (Prettier), `pnpm knip` (unused files, exports, dependencies) pass.
3. CODEOWNERS review requested automatically.
4. Squash-merge; head branch deleted on merge (repo setting `delete_branch_on_merge`).

## 3. Weekly (with the status report)
1. `git fetch --prune`; list remote branches merged into `main` and delete them; close stale PRs (> 14 days idle) with a note.
2. Review Dependabot alerts; fix in a small `fix(deps)` PR.
3. Check `docs/README.md` index lists every doc; remove or archive superseded docs.
4. Remove TODOs older than one phase or convert them to backlog items.

## 4. Phase gate
Re-run all of the above; record result in the gate review.

## Revision History
| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0007 | Initial SOP. |
