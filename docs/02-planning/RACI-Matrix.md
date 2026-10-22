# RACI Matrix — Key Activities

| Field | Value |
|---|---|
| Document ID | SPK-PLN-006 |
| Project | Sparkle — Student Success Platform |
| Version | 1.1 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | RACI Matrix (01M5GCZRQR7WW434E8J0B92Y4B.docx) |

> **Purpose.** Assigns Responsible, Accountable, Consulted, Informed roles for key activities. Exactly one A per row.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

Roles: **SP** Sponsor/PM (Rolan Chowdhury) · **PO** Product Owner (TBD) · **ENG** Engineering Lead + team (incl. Grok Bot as implementation agent) · **DES** Design · **OPS** Operations/Support · **CMP** Compliance/Privacy counsel

| Activity | SP | PO | ENG | DES | OPS | CMP |
|---|---|---|---|---|---|---|
| Charter, SOW approval | A/R | C | C | I | I | C |
| Requirements baseline | I | A/R | C | C | C | C |
| Change Request approval (baseline impact) | A | R | C | C | C | C |
| Architecture & ADRs | I | C | A/R | C | C | C |
| UI & Sparkle character | I | C | C | A/R | I | I |
| AI router, budgets, crisis protocol | I | C | A/R | I | C | C |
| Privacy & sharing rules | C | C | R | I | C | A |
| CI/CD & releases | I | I | A/R | I | C | I |
| Testing & quality | I | C | A/R | C | C | C |
| UAT sign-off | I | A/R | C | C | C | I |
| Phase-gate decision | A | R | C | C | C | C |
| Go-live readiness | A | C | R | I | R | C |
| Weekly status & RAID | A | R | C | I | C | I |
| Documentation control | A | C | R | I | I | I |

**Current staffing (2026-10-21):** Rolan Chowdhury holds SP, PO, DES, OPS and CMP; ENG work is performed by Grok Bot (R) under Rolan's approval at each gate (A). No human engineering, design, or legal staff yet; privacy/legal "A" items cannot be closed without engaging counsel (R-10, R-12).

**Corrections vs. original:** original had no Sponsor/PM column, "Ops/Compliance" merged, Phase-gate A on Product (PMBOK: sponsor approves gates), and privacy A held by ops. Split roles; one A per row. Until roles are staffed, Rolan holds every unassigned role — **TBD (Rolan)**.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (RACI Matrix (01M5GCZRQR7WW434E8J0B92Y4B.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0002 | Recorded actual staffing: Rolan holds all roles; Grok Bot responsible for build. |
