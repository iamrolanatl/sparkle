# Feature Register

| Field | Value |
|---|---|
| Document ID | SPK-GOV-004 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Product Owner — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Implementation Handoff §3 |

> **Purpose.** Master list of product features (from handoff §3) with IDs, requirement links, phase, and status. Status values: Proposed · Planned · In Progress · Done · Deferred · Removed (removal requires a CR).

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

| ID | Feature | Handoff | Reqs | Epic | Phase | Priority | Status |
|---|---|---|---|---|---|---|---|
| F-01 | Data aggregation & normalization (Cobb sources → per-class/unit) | 3.1 | FR-01 | E1 | 1–2 | Must | Planned |
| F-02 | AI prioritization, reasons, item statuses, "What changed", quiet hours/digest | 3.1, 2 | FR-02, FR-15 | E2 | 2 | Must | Planned |
| F-03 | Family setup, Google sign-in, invitations, sharing & access list | 3.2 | FR-03, FR-04 | E5 | 1 | Must | Planned |
| F-04 | Desktop sync agent + web fallback | 3.3 | FR-11 | E1 | 1 | Must | Planned |
| F-05 | Calendar & bell schedule digitization | 3.4 | FR-13 | E6 | 4 | Should | Planned |
| F-06 | Deterministic GPA & simulator | 3.4 | FR-06 | E5 | 2 | Must | Planned |
| F-07 | Per-class success workspace | 3.5 | FR-05 | E3 | 2 | Must | Planned |
| F-08 | Student daily input | 3.6 | FR-07 | E2 | 2 | Should | Planned |
| F-09 | Shared shopping list | 3.7 | FR-08 | E6 | 4 | Should | Planned |
| F-10 | Communication hub | 3.8 | FR-09 | E6 | 4 | Should | Planned |
| F-11 | AI-assisted communication (safeguarded, confirm-before-send) | 3.9 | FR-09 | E6 | 1 (gate) / 4 | Must | Planned |
| F-12 | Interactive Sparkle robot (3-tier AI, voice, crisis protocol) | 3.10 | FR-10, FR-14 | E4 | 0 / 3 | Must | Planned |
| F-13 | Admin backend & operations console | 3.11 | FR-12 | E7 | 1 / 4 | Must | Planned |
| F-00 | Design system (glass, neon, light/dark, animated background) | 2 | NFR-02, 11, 13 | E2 | 0 | Must | Planned |

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
