# Data Integration & ETL Mapping Matrix

| Field | Value |
|---|---|
| Document ID | SPK-PLN-011 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Engineering Lead — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Data Migration & ETL Mapping Matrix (01M5GCZSB7ZC2ZY7MNJTSWHA0N.docx) |

> **Purpose.** Sparkle performs no one-time bulk migration; it continuously and incrementally syncs via the desktop agent, web fallback, and official integrations. This defines source→target mappings, processing, and drift handling.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Source → Target Mapping (conceptual)
| Source | Data | Target entity | Path |
|---|---|---|---|
| StudentVue / ParentVue | grades, assignments, attendance | Assignment, Grade | Agent |
| CTLS Learn / CTLS Parent | posts, materials, syllabus | UnitMaterial (linked to current Unit) | Agent |
| Office 365 | calendar | CalendarEvent (merged w/ uploaded school calendar) | Agent / official API |
| Office 365 | email (school-related) | Message (Communication hub) | Agent / official API |
| Synergy / Clever | roster, enrollment | Student, Class, Enrollment | Agent / official API |
| Uploaded calendar / bell schedule | dates, periods | CalendarEvent, BellSchedule (after human review) | Web upload |
| Manual upload | any of the above | as mapped | Web fallback |

Field-level mappings are defined per **Platform Profile** in Phase 1 (**TBD**).

## 2. Processing
Raw payloads → R2 (retention **TBD (Rolan/counsel)**) → normalize via Queues/Workflows → Postgres (RLS) → precompute Today document → KV cache → AI prioritization on normalized model + student input.

## 3. Drift Handling
Platform Profiles define expected schemas; drift detection alerts operators; human review queue for mapping changes (admin "Platform profiles & schema review").

**Corrections vs. original:** added O365 email, CTLS Parent, uploaded calendar/bell schedule, manual upload path, KV and Queues; flagged raw-data retention as open.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Data Migration & ETL Mapping Matrix (01M5GCZSB7ZC2ZY7MNJTSWHA0N.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
