# Project Charter

| Field | Value |
|---|---|
| Document ID | SPK-INI-002 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (Sponsor / PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Project Charter (01M5GCZTB6R34AQEG8YKQ9KBS3.docx) |

> **Purpose.** Formally authorizes the Sparkle project, names the sponsor and project manager, and sets high-level objectives, success criteria, scope, constraints, and governance.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Project Purpose
Deliver a calm, high-performance student-success platform that reduces cognitive load for students and parents by aggregating school data, prioritizing next actions, and providing a supportive AI companion (Sparkle).

## 2. Business Case
Students and parents track work across many disconnected platforms (StudentVue, ParentVue, CTLS, Office 365, Synergy, Clever). Sparkle consolidates this into a single, prioritized, non-overwhelming experience while preserving privacy and giving operators diagnostic visibility.

## 3. Measurable Objectives & Success Criteria
| ID | Criterion | Target | Source |
|---|---|---|---|
| SC-01 | Day-30 retention | **TBD (Rolan)** — target to be set in KPI dashboard | Charter |
| SC-02 | Next-action completion rate | **TBD (Rolan)** | Charter |
| SC-03 | Sync success rate for supported platforms | ≥ 98% | Charter |
| SC-04 | Performance budgets met on mid-range devices | NFR-01..NFR-06 | Handoff §4 |
| SC-05 | Sev-1 privacy / data-leakage incidents | 0 | Charter |
| SC-06 | First Implementation Increment criteria (handoff §11) met | All 5 | Handoff §11 |

## 4. High-Level Scope
MVP covers Cobb County (GA) data sources, student/parent experience, Sparkle robot (text + voice), desktop agent + web fallback, GPA tools, supporting features (shopping list, communication hub, calendar digitization), and admin console. Expansion to other districts is enabled by design but **not** required for MVP acceptance. Detail: [Product Blueprint](Product-Blueprint.md), [Requirements Baseline](../02-planning/Requirements-Baseline.md).

## 5. High-Level Milestones (Phase Gates)
| Gate | Phase | Exit criteria (summary) | Target date |
|---|---|---|---|
| G0 | Phase 0 — Foundation | Design system, Rive states, CI/CD, ADRs | TBD (Rolan) |
| G1 | Phase 1 — Core Data & Identity | Google auth + invite; first connector; Today doc precompute | TBD (Rolan) |
| G2 | Phase 2 — Student Experience | Today + focus mode within budget; classes; GPA | TBD (Rolan) |
| G3 | Phase 3 — Sparkle & AI | Tiered router w/ citations; voice w/ fallback | TBD (Rolan) |
| G4 | Phase 4 — Supporting Features & Admin | Shopping, comms, calendar; admin KPIs | TBD (Rolan) |
| G5 | Phase 5 — Hardening & Go-Live | UAT, security review, staged rollout | TBD (Rolan) |

## 6. Summary Budget
**TBD (Rolan).** Cost categories and 15% contingency recommendation are in the [Budget & Cost Plan](../02-planning/Budget-Cost-Plan.md). No figures have been provided.

## 7. High-Level Risks, Assumptions, Constraints
- Risks: see [RAID Register](../04-monitoring-controlling/RAID-Register.md) R-01..R-08.
- Constraints: coach mode only; no outbound message without confirmation; device-default credential storage; performance budgets; student-only scope.
- Assumptions: Cobb platform access obtainable under appropriate agreements; users accept Google sign-in.

## 8. Stakeholders
| Role | Name |
|---|---|
| Sponsor | Rolan Chowdhury |
| Project Manager | Rolan Chowdhury (assisted by Grok Bot for documentation and implementation) |
| Product Owner | TBD (Rolan) — defaults to Rolan until assigned |
| Engineering Lead | TBD (Rolan) |
| AI / Platform Engineer | TBD (Rolan) |
| Design (UI/UX + character) | TBD (Rolan) |
| Operations / Support | TBD (Rolan) |
| Compliance / Privacy Counsel | TBD (Rolan) |
| End users | Students, parents/guardians; future: districts |

## 9. Project Manager Authority
The PM may: prioritize backlog within approved phase scope; approve CRs with no impact on scope baseline, schedule gates, budget, or privacy posture; accept sprint increments. Escalate to Sponsor: anything changing phase gates, budget, scope baseline, privacy/sharing rules, or AI provider selection. (While Rolan holds both roles, escalation = documented decision in the Decision Log.)

## 10. Governance
Hybrid: Product Owner prioritizes within phase scope; phase gates require sponsor approval; weekly executive status + RAID review; all baseline changes via the CR process.

## 11. Corrections vs. original
- Original named no sponsor, PM, budget, or milestones; sponsor/PM now Rolan Chowdhury, others TBD.
- Added explicit PM authority levels and phase-gate milestone table (dates TBD).
- Linked success criteria to handoff §11 First Increment criteria.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Project Charter (01M5GCZTB6R34AQEG8YKQ9KBS3.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
