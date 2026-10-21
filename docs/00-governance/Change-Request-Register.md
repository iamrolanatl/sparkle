# Change Request Register

| Field | Value |
|---|---|
| Document ID | SPK-GOV-002 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | New |

> **Purpose.** Integrated change control (PMBOK Perform Integrated Change Control): every proposed change to scope, schedule, cost, quality, requirements, architecture decisions, or privacy posture is logged, assessed, and decided here.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Process
1. **Submit** — add a row (next CR-NNNN) with status *Submitted*, or open a GitHub issue labelled `change-request` and mirror it here.
2. **Assess** — impact on scope, schedule, cost, quality, risk, privacy; list affected docs/FRs.
3. **Decide** — PM approves if no baseline impact; otherwise Sponsor (Rolan). Record in the Decision Log if architectural/policy.
4. **Implement** — one PR containing: CR row → *Approved/Implemented*, a Change Log line, and revision bump in each affected doc.
5. **Verify & close.**

Statuses: Submitted · Under Assessment · Approved · Rejected · Deferred · Implemented · Closed.

## 2. Register
| CR | Date | Title | Requester | Type | Impact (scope/sched/cost/quality/risk) | Affected docs | Decision by | Status |
|---|---|---|---|---|---|---|---|---|
| CR-0001 | 2026-10-21 | Establish initial PMP documentation baseline (v1.0) reconciled with Implementation Handoff v1.0 | Rolan Chowdhury | Baseline | Establishes scope, requirements (FR-01..15, NFR-01..13), WBS, RAID; no budget/schedule baseline yet (TBD) | All | Rolan Chowdhury | Submitted — approved on PR merge |

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
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
