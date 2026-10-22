# Requirements Traceability Matrix

| Field | Value |
|---|---|
| Document ID | SPK-PLN-002 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Product Owner — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Requirements Traceability Matrix (01M5GCZRRWHGCGR3HNV2MT26PW.docx) |

> **Purpose.** Traces every requirement to features, backlog epics, design elements, and tests. Maintained in-repo (single source) and updated at each sprint review.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

| Req | Feature | Epic | Design / ADR | Test level(s) | Status |
|---|---|---|---|---|---|
| FR-01 | F-01 | E1 | ADR-05, Data Mapping | Integration, contract (connector) | Not started |
| FR-02 | F-02 | E2 | ADR-02 | Unit (rules), E2E, UAT | Not started |
| FR-03 | F-03 | E5 | Supabase Auth + Google | Integration, E2E | Not started |
| FR-04 | F-03 | E5 | RLS | Privacy tests, UAT | Not started |
| FR-05 | F-07 | E3 | — | E2E, UAT | Not started |
| FR-06 | F-06 | E5 | ADR-03 | Unit (deterministic engine) | Not started |
| FR-07 | F-08 | E2 | — | Unit, E2E | Not started |
| FR-08 | F-09 | E6 | RLS | Integration, privacy | Not started |
| FR-09 | F-10, F-11 | E6 | ADR-04 | E2E, UAT (confirm gate), audit | Not started |
| FR-10 | F-12 | E4 | ADR-06, AI router | Router, voice fallback, citation | Not started |
| FR-11 | F-04 | E1 | ADR-01 | Agent integration, staged rollout | Not started |
| FR-12 | F-13 | E7 | RBAC | Admin health, audit | Not started |
| FR-13 | F-05 | E6 | — | Integration, UAT | Not started |
| FR-14 | F-12 | E4 | — | Safety scenario tests | Not started |
| FR-15 | F-02 | E2 | — | Unit, UAT | Not started |
| NFR-01..04, 09, 10 | — | All | ADR-02 | Performance suite | Not started |
| NFR-05, 08 | — | E1, E5, E7 | ADR-01, RLS | Security & privacy suite | Not started |
| NFR-06, 12 | — | E4, all | Resilience patterns | Resilience suite | Not started |
| NFR-07 | — | E1 | ADR-05, ADR-07 | Architecture review | Not started |
| NFR-11, 13 | — | E2 | Design system | A11y + device matrix | Not started |

**Corrections vs. original:** original summary left FR-07, FR-08, FR-09 untraced and listed FR-02 in two groups; it also pointed to an external "tracking tool" that doesn't exist yet — the matrix now lives here.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Requirements Traceability Matrix (01M5GCZRRWHGCGR3HNV2MT26PW.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
