# Communications & Marketing Plan

| Field | Value |
|---|---|
| Document ID | SPK-PLN-012 |
| Project | Sparkle — Student Success Platform |
| Version | 1.1 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Product Owner — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Marketing & Communication Plan (01M5GCZSAX0RSBB5DBBBP5GJ2Q.docx) |

> **Purpose.** Covers both (a) external product positioning/marketing and (b) the PMBOK project communications plan (who gets what, when, how).

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## Part A — Product Marketing
**Positioning:** Sparkle helps students focus on what matters next without overwhelm; the glass cockpit and companion robot make prioritization calm and supportive.

| Audience | Message |
|---|---|
| Students | "See your next priority and stay focused." |
| Parents | "Stay informed without constant checking. You control what is shared." *(note: student controls sharing after the age threshold — wording to be reviewed)* |
| Districts | "Secure aggregation with diagnostic visibility and multi-district readiness." |

Channels: in-app onboarding + Sparkle intro; parent invitation email; district partnership materials.
Guardrails: no claims that Sparkle replaces effort or guarantees grade improvement; AI always coach mode; no district endorsement claims without written agreement.

**Landing page (FR-17):** draft at `/`; content updated at every phase gate (WBS 2.12, 3.7, 4.7, 5.5, 6.5, 7.4). Public launch needs production domain, OAuth consent verification, and reviewed Privacy/Terms.

## Part B — Project Communications Matrix
| Communication | Audience | Owner | Frequency | Channel |
|---|---|---|---|---|
| Executive status report | Sponsor, stakeholders | PM | Weekly | `docs/04-monitoring-controlling/status/` + summary message |
| RAID review | Core team | PM | Weekly | RAID Register |
| Sprint review / demo | PO, team | Eng Lead | Bi-weekly | Demo |
| Phase-gate review | Sponsor | PM | Per gate | Gate checklist + Decision Log |
| Change requests | Sponsor, PO | Requester/PM | As needed | CR Register + PR |
| Release notes | Users, ops | Eng Lead | Per release | GitHub Releases |

**Corrections vs. original:** original had no project-communications matrix (PMBOK requirement); flagged parent-message conflict with student-controlled sharing.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Marketing & Communication Plan (01M5GCZSAX0RSBB5DBBBP5GJ2Q.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0002 | Landing page ownership and per-gate update cadence. |
