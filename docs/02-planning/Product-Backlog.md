# Product Backlog — MVP Epics and Features

| Field | Value |
|---|---|
| Document ID | SPK-PLN-005 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Product Owner — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Product Backlog (01M5GCZRR51HBDZF52XGWME1CD.docx) |

> **Purpose.** Prioritized epic/feature backlog derived from the Requirements Baseline, sized for 2-week sprints within hybrid phase gates. Story-level backlog will live in GitHub Issues/Projects.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

| Epic | Feature / item | Req | Phase | Pri |
|---|---|---|---|---|
| **E1 Data Aggregation & Sync** | Desktop agent (Tauri) w/ OS secure store, scheduled 3 AM/11 AM/7 PM + manual | FR-11 | 1 | M |
| | Connectors: StudentVue, ParentVue, CTLS Learn, CTLS Parent, O365 email+calendar, Synergy, Clever | FR-01 | 1–2 | M |
| | Web fallback path + manual upload | FR-11 | 1 | M |
| | Sync console: next steps, redacted error classification | FR-11 | 1 | M |
| **E2 Today & Focus** | Today landing: prioritized cards, plain-language reasons, Done/Working/Later/Ignore, "What changed" | FR-02 | 2 | M |
| | Auto-hiding chrome + single-subject focus mode | FR-05 | 2 | M |
| | Glass panes, neon borders, light/dark meeting contrast + FPS budgets | NFR-02, 11 | 0 | M |
| | Student daily input | FR-07 | 2 | S |
| | Quiet hours + daily digest | FR-15 | 4 | S |
| **E3 Per-Class Workspace** | Expandable class list w/ grades and progress | FR-05 | 2 | M |
| | Unit container: syllabus, materials, AI-suggested resources, user links | FR-05 | 2 | M |
| **E4 Sparkle & AI** | Full-body Rive character: idle, excited, bored/thoughtful, helping | FR-10 | 0/3 | M |
| | 3-tier AI router w/ budgets, circuit breakers, kill switches, citation | FR-10, NFR-12 | 3 | M |
| | Voice with text fallback; coach mode; hide/mute | FR-10 | 3 | M |
| | Crisis protocol | FR-14 | 3 | M |
| **E5 Family, Sharing & GPA** | Google sign-in, parent-adds-student invitation (link/code) | FR-03 | 1 | M |
| | Revocable sharing, age threshold, visible access list | FR-04 | 1 | M |
| | Deterministic GPA calculator + simulator | FR-06 | 2 | M |
| **E6 Supporting Features** | Shared shopping list | FR-08 | 4 | S |
| | Communication hub + AI drafts with explicit confirmation | FR-09 | 4 (gate framework in 1) | M/S |
| | Calendar + bell schedule digitization w/ human review | FR-13 | 4 | S |
| **E7 Admin & Ops** | Basic sync health | FR-12 | 1 | M |
| | Diagnostics, health + KPI dashboards, feature flags | FR-12 | 4 | S |
| | RBAC, JIT elevation, audit log, consent-based recorded view-as | FR-12, NFR-08 | 4 | M |

## Definition of Ready
Story has acceptance criteria, linked FR/NFR, design (if UI), and no unresolved dependency.

## Definition of Done (Sprint)
- Meets acceptance criteria and applicable NFRs; perf budget checked where applicable.
- Unit + integration tests pass in CI; code reviewed via PR.
- Accessibility contrast and reduced-motion verified.
- No Sev-1 security/privacy findings.
- Docs updated (RTM status, Feature Register status, changelog if baseline affected).

## Corrections vs. original
Added CTLS Parent, O365 email, item statuses, "What changed", daily input, quiet hours/digest, crisis protocol, JIT elevation, Definition of Ready, and docs update to DoD.

---

## Approval / Sign-off

| Role | Name | Decision | Date | Signature / PR approval |
|---|---|---|---|---|
| Sponsor / Project Manager | Rolan Chowdhury | Pending | TBD (Rolan) | |
| Product Owner | TBD (Rolan) | Pending | | |
| Engineering Lead | TBD (Rolan) | Pending | | |

## Revision History

| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Product Backlog (01M5GCZRR51HBDZF52XGWME1CD.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
