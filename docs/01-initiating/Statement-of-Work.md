# Statement of Work

| Field | Value |
|---|---|
| Document ID | SPK-INI-003 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (Sponsor / PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Statement of Work (01M5GCZTDANAJPQ5FKR48X2FH9.docx) |

> **Purpose.** Defines the engagement to design, build, and deliver the Sparkle platform for initial Cobb County, GA deployment with multi-district readiness.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Parties and Period of Performance
| Item | Value |
|---|---|
| Buyer / Sponsor | Rolan Chowdhury |
| Performing organization | TBD (Rolan) — currently Rolan + Grok Bot (AI implementation agent) |
| Period of performance | TBD (Rolan) |
| Place of performance | Remote; cloud accounts: GitHub `iamrolanatl/sparkle`, Supabase project `nklbdyezbsugkdvaidtt`, Cloudflare, Google Cloud |
| Commercial terms / payment | TBD (Rolan) / N/A if internal |

## 2. Delivery Approach — Hybrid (Agile within Phase Gates)
Fixed-scope MVP phases with internal 2-week sprints and formal go/no-go gates. **Rationale:** school integrations, credential handling and compliance need controlled acceptance (gates); UI, robot personality, prioritization and admin diagnostics benefit from iteration (Agile).

## 3. Objectives
1. Production-ready student and parent experience (glass cockpit + Sparkle), desktop- and mobile-friendly.
2. Secure aggregation from Cobb platforms via desktop agent **and** web-only fallback.
3. Tiered AI prioritization and voice-capable robot within budgets and safety gates.
4. Admin console for operations, health and KPIs.
5. Architecture + Platform Profiles supporting more districts and 1M users.

## 4. Deliverables
| ID | Deliverable | Acceptance | Doc |
|---|---|---|---|
| D-01 | Product Blueprint + Requirements Baseline | Sponsor sign-off | 01/02 folders |
| D-02 | Technical Design Document, ADRs, architecture runway | Eng Lead + Sponsor sign-off | [TDD](../02-planning/Technical-Design-Document.md) |
| D-03 | Working MVP (web + desktop agent + admin) meeting budgets | §6 below | — |
| D-04 | Test Strategy, UAT scripts, CI/CD pipeline | Exit criteria in Test Strategy | [Test](../02-planning/Test-Strategy-and-Plan.md), [CI/CD](../02-planning/CI-CD-Release-Management-Plan.md) |
| D-05 | Go-live runbook, training materials, operational dashboards | Go-live checklist complete | [Runbook](../05-closing/Cutover-Go-Live-Runbook.md), [OCM](../03-executing/OCM-Training-Strategy.md) |
| D-06 | Project documentation set under change control | Maintained per docs/README | [Index](../README.md) |

## 5. Assumptions and Constraints
- School platform access and credentials provided under appropriate agreements (A-01).
- AI is coach-mode for academic work; no automatic sending without confirmation.
- Credentials stored device-side by default.
- Applicable student-privacy regulations (e.g., FERPA, COPPA, Georgia student-data law) — **TBD (Rolan / counsel)**: applicability not yet assessed in source docs.

## 6. Acceptance Criteria (MVP)
MVP accepted when **all** of:
1. A student can sign in (Google), link to a parent, and see a prioritized Today view meeting NFR-01.
2. ≥ 1 school data path (sync → normalized model → Today) works end-to-end, then into focus mode.
3. Sparkle appears as the full-body character and responds with a tiered AI answer that cites a source.
4. Any draft message requires explicit confirmation before send.
5. Admin can view sync health.
6. Test Strategy exit criteria met; no open Sev-1.

## 7. Corrections vs. original
- Added parties/period/terms table (TBD), deliverable acceptance mapping, and regulatory-applicability assumption.
- Aligned acceptance criteria with handoff §11 (original omitted the parent-link and full-body character conditions).

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Statement of Work (01M5GCZTDANAJPQ5FKR48X2FH9.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
