# Target Operating Model (TOM)

| Field | Value |
|---|---|
| Document ID | SPK-OPS-001 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Operations Lead — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Target Operating Model (01M5GCZSDZEYH61C0A5PEC207K.docx) |

> **Purpose.** Describes how Sparkle is run after go-live: principles, recurring processes, support model, and roles.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Operating Principles
- Student experience stays calm and progressive; operations absorb complexity.
- Explicit confirmation for any outbound communication.
- Device-default credentials; minimal central secret surface.
- Observability and synthetic checks before scale.

## 2. Key Processes
| Cadence | Process | Owner |
|---|---|---|
| Daily | Sync health review, AI spend check, Sev triage | Ops |
| Weekly | RAID review, executive status, backlog refinement | PM / PO |
| Per release | Phase-gate checklist, budget verification, staged rollout | Eng |
| Ongoing | Platform Profile maintenance, connector drift monitoring | Eng / Ops |
| Ongoing | Access reviews (admin roles, JIT elevations) *(added)* | Ops / Counsel |

## 3. Support Model
Tiered support (L1/L2/L3 — staffing **TBD (Rolan)**) via the admin console. View-as is consent-based, time-limited, recorded with a visible banner, fully audited. Redacted support bundles available from any sync run. Incident severity follows the Test Strategy definitions.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Target Operating Model (01M5GCZSDZEYH61C0A5PEC207K.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
