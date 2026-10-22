# Definition of Done

| Field | Value |
|---|---|
| Document ID | SPK-GOV-005 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003) |
| Owner | Rolan Chowdhury |
| Last Updated | 2026-10-21 |

## Story / PR level
- [ ] Linked FR/NFR (and CR if Lane 2) cited in the PR title/body.
- [ ] Acceptance criteria met; applicable NFR/performance budget checked.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass locally and in CI.
- [ ] New tables have RLS + tests in `supabase/tests/rls_test.sql`; no client writes to synced school data.
- [ ] No secrets committed; new env names added to `.env.example`.
- [ ] Accessibility: contrast, keyboard, reduced-motion verified for UI changes.
- [ ] Risky/live features behind a feature flag (default off).
- [ ] Docs updated: RTM/Feature Register status; CR + changelog + revision bump if a baseline changed; SOPs if a process changed.
- [ ] No open Sev-1/Sev-2 findings.
- [ ] PR body states what was NOT done (e.g., migration not applied, not deployed).
- [ ] **Enterprise standard (CR-0007):** change fits the capacity model (1M users / 30k concurrent); no unbounded queries (pagination, indexes on filter + RLS columns, `(select auth.uid())`); outbound calls have timeouts/retries; POSTs idempotent; UI wrapped in an error boundary with a degraded state; k6 smoke thresholds pass; no new crash sources.
- [ ] **Repo hygiene (SOP-13):** `pnpm format:check` and `pnpm knip` pass (no dead code/unused deps); Conventional Commit PR title; branch deleted after merge.
- [ ] **UI (CR-0008):** reduced-motion + touch fallbacks; perf budget respected (Lighthouse mobile ≥ 90, 60 fps target).

## Release level
- [ ] SOP-02 followed; Rolan approved; migration applied per SOP-03.
- [ ] Health checks and smoke tests pass; rollback path confirmed.
- [ ] Canary (gradual deployment) observed with no error-rate or SLO regression before 100 % (SOP-02).

## Phase-gate level
- [ ] Gate exit criteria (Charter §5) met; Test Strategy exit criteria met.
- [ ] RAID reviewed; SOP library reviewed; landing/marketing content updated.
- [ ] Sponsor decision recorded in the Decision Log.

## Revision History
| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Consolidated DoD (from Backlog DoD + SOP-01). |
