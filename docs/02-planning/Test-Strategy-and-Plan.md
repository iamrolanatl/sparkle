# Test Strategy & Plan (Quality Management)

| Field | Value |
|---|---|
| Document ID | SPK-PLN-009 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Engineering Lead — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Test Strategy & Plan (01M5GCZRRK14PFXWMMB3NABJAC.docx) |

> **Purpose.** Defines quality objectives, test levels, environments, UAT, automation, defect severity, and exit criteria for phase gates and go-live.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Objectives
Verify functional correctness, performance budgets, privacy controls, accessibility and resilience so each phase gate passes without Sev-1 defects.

## 2. Test Levels
| Level | Scope | Tooling (proposed) |
|---|---|---|
| Unit | GPA engine, prioritization rules, sharing logic, AI router decisions | Vitest |
| Integration | Connector flows, Today doc generation, AI gateway fallbacks, RLS | Vitest + Supabase local |
| Contract | Connector schema vs Platform Profile (drift) | fixtures |
| End-to-end | sync → Today → focus mode → Sparkle; invite flow; confirm-before-send | Playwright |
| Performance | NFR-01..04, 09, 10 | Lighthouse CI, k6, FPS harness |
| Security & privacy | RLS, credential non-exposure, audit completeness, sharing visibility, view-as | automated + manual review |
| Accessibility | contrast, reduced-motion, keyboard, screen reader | axe |
| Resilience | circuit breakers, AI tier / voice / live→cached fallbacks, error boundaries | fault injection |
| AI safety | coach mode, citations, crisis protocol scenarios | scripted eval set |

## 3. Environments & Reference Devices
dev / staging / production. Reference "mid-range phone over 4G" device and desktop matrix — **TBD (Eng Lead)**.

## 4. Defect Severity
| Sev | Definition |
|---|---|
| 1 | Privacy/data leakage, credential exposure, message sent without confirmation, crisis-protocol failure, total outage |
| 2 | Core path broken (sync, Today, sign-in) without workaround; budget breach |
| 3 | Degraded function with workaround |
| 4 | Cosmetic |

## 5. UAT
Scripts for student and parent personas: prioritization accuracy, focus mode, robot interaction, sharing, explicit confirmation before any send. Acceptance: no Sev-1, budgets met on reference devices. Participants — **TBD (Rolan)**.

## 6. Automation & CI
Unit + integration on every PR; perf smoke on key paths; synthetics in staging/prod for sync success and AI latency.

## 7. Exit Criteria (per gate / go-live)
All Sev-1/2 closed or accepted with mitigation by Sponsor; performance budgets met; privacy & security review complete; UAT sign-off by Product Owner.

**Corrections vs. original:** added accessibility, contract, AI-safety levels, severity definitions, environments; voice and sync budgets now tested.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Test Strategy & Plan (01M5GCZRRK14PFXWMMB3NABJAC.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
