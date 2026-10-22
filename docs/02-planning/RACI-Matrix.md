# RACI Matrix — Key Activities

| Field | Value |
|---|---|
| Document ID | SPK-PLN-006 |
| Project | Sparkle — Student Success Platform |
| Version | 1.2 |
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

## Engineering workstreams (CR-0009, 2026-10-21)

ENG is split into six Grok Bot teams, each with a Tech Lead. All report to the Integration lead; Rolan (SP) stays **A** for gates, spend, legal and external comms. Each team works in its own clone (`/workspace/team-<letter>/sparkle`), lands small PRs off `main`, and logs decisions only in its reserved DEC range.

| Team | Lane | DEC range | Owns (R) |
|---|---|---|---|
| **INT** Integration (lead) | Phase 1 completion, `sparkle-dev`, **all dev deploys**, merge queue and conflict arbitration, shared docs index, G-gate reports, Phase 2+ items outside other lanes (Today, PWA, weather, comm hub, shopping list, admin console) | DEC-01..99 | Merge order, deploys, gate reports |
| **A** NL tasks / AI | Natural-language tasks (4.8), AI router use, coach/crisis guardrails (5.4) | DEC-100..119 | AI features |
| **B** OCR | Worksheet/calendar OCR (4.10), sample docs only | DEC-120..139 | OCR pipeline |
| **C** Vault | FR-24 mail vault behind a flag; **no launch** until counsel + pen test (SA gates) | DEC-140..159 | Vault build |
| **D** Desktop agent / sync | Desktop agent and school sync (3.2), within portal ToS, no credentials | DEC-160..179 | Sync |
| **E** Quality / launch | Test strategy, SLO evidence, runbooks, launch checklist, hardening (Phase 5) | DEC-180..199 | Quality gates |

| Activity | SP | INT | A | B | C | D | E |
|---|---|---|---|---|---|---|---|
| Lane implementation & tests | I | C | R | R | R | R | C |
| Shared migrations & Decision Log coordination | I | A/R | C | C | C | C | C |
| Merge queue, conflict arbitration | I | A/R | C | C | C | C | C |
| Dev deploys | I | A/R | I | I | I | I | C |
| Phase-gate reports | A | R | C | C | C | C | C |
| Quality gates / SLO evidence | I | C | C | C | C | C | A/R |
| Spend, legal sign-off, external messages | A/R | I | I | I | I | I | I |

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
| 1.2 | 2026-10-21 | Grok Bot (Integration lead, for Rolan Chowdhury) | CR-0009 | Six engineering teams (INT, A–E), lanes, DEC ranges, team RACI. |
