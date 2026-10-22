# Cutover & Go-Live Runbook

| Field | Value |
|---|---|
| Document ID | SPK-CLO-001 |
| Project | Sparkle — Student Success Platform |
| Version | 1.1 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Operations Lead — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Cutover & Go-Live Runbook (01M5GCZSBMAWEYD0NJ472GNN79.docx) |

> **Purpose.** Step-by-step checklist for production go-live, rollback, and hypercare, and transition into operations.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Pre-Go-Live Checklist (all required; record evidence link)
| # | Item | Owner | Evidence | ✓ |
|---|---|---|---|---|
| 1 | Performance budgets verified on reference devices | Eng | | ☐ |
| 2 | Circuit breakers and fallbacks tested | Eng | | ☐ |
| 3 | Admin health and KPI dashboards live | Ops | | ☐ |
| 4 | Privacy review complete; sharing rules confirmed | Counsel | | ☐ |
| 5 | Security review complete; no open Sev-1 | Eng | | ☐ |
| 6 | UAT signed off by PO | PO | | ☐ |
| 7 | Staged agent rollout plan approved; signed builds | Eng | | ☐ |
| 8 | On-call and escalation paths confirmed | Ops | | ☐ |
| 9 | Crisis protocol verified | AI/Platform | | ☐ |
| 10 | Backups / restore tested (Supabase) | Eng | | ☐ |
| 11 | Sponsor G5 go/no-go recorded in Decision Log | Sponsor | | ☐ |
| 12 | Trademark re-check: counsel full clearance of 'Sparkle' (DEC-40, R-26, SA-11) done before domain purchase and public launch | Rolan / Counsel | | ☐ |

## 2. Go-Live Steps
1. Enable production feature flags for initial cohort (cohort definition **TBD (Rolan)**).
2. Monitor sync success, AI latency, error rates.
3. Confirm first student end-to-end path.
4. Communicate status to stakeholders.

## 3. Rollback Criteria
Automatic or manual rollback if error rate exceeds threshold (**TBD (Eng Lead)**), performance budgets are breached, or any Sev-1 privacy issue is detected. Agent versions can be revoked. Rollback decision owner: Sponsor (or on-call lead out of hours).

## 4. Hypercare & Transition
Daily health review for the first two weeks; then hand-off to the [Target Operating Model](../06-operations/Target-Operating-Model.md). Capture [lessons learned](Lessons-Learned-Register.md) for the next district onboarding.

**Corrections vs. original:** added owners/evidence, security, UAT, crisis protocol, backup and sponsor go/no-go items; undefined thresholds flagged TBD.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Cutover & Go-Live Runbook (01M5GCZSBMAWEYD0NJ472GNN79.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0006 | Added item 12 trademark re-check (DEC-40). |
