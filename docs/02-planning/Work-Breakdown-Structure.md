# Work Breakdown Structure — MVP

| Field | Value |
|---|---|
| Document ID | SPK-PLN-004 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Work Breakdown Structure (01M5GCZRQDWWN9EC6SFSEKHJA9.docx) |

> **Purpose.** Deliverable-oriented decomposition of MVP scope into phases and work packages; detailed tasks are decomposed in sprint planning.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## WBS
| WBS | Element | Gate |
|---|---|---|
| 1.0 | **Project Management** — charter, plans, CR control, status, RAID, phase gates | All |
| 2.0 | **Phase 0 — Foundation** | G0 |
| 2.1 | Architecture runway, ADRs, scale-trigger values | |
| 2.2 | Repo, CI/CD, branch protection, environments (dev/staging/prod), secrets | |
| 2.3 | Feature flags + observability baseline (OTel, Sentry, synthetics) | |
| 2.4 | Design system: glass, neon, light/dark, responsive, a11y, animated background w/ auto-disable | |
| 2.5 | Sparkle character Rive states (idle, excited, bored/thoughtful, helping) | |
| 3.0 | **Phase 1 — Core Data & Identity** | G1 |
| 3.1 | Google auth (Supabase Auth) + family invitation (email link / short code) + sharing/RLS model | |
| 3.2 | Desktop agent skeleton (Tauri, secure store, schedule) + first connector (StudentVue) | |
| 3.3 | Web fallback: manual upload path | |
| 3.4 | Normalized data model + Today document precomputation | |
| 3.5 | Admin: basic sync health view *(moved earlier — handoff §9 says "in parallel once core data path exists")* | |
| 3.6 | Explicit-confirmation framework for outbound comms (from first implementation, handoff §9) | |
| 4.0 | **Phase 2 — Student Experience** | G2 |
| 4.1 | Today view + item statuses + "What changed" + focus mode | |
| 4.2 | Classes + unit workspace | |
| 4.3 | GPA engine + simulator | |
| 4.4 | Student daily input | |
| 4.5 | Additional connectors (ParentVue, CTLS Learn/Parent, O365, Synergy, Clever) | |
| 5.0 | **Phase 3 — Sparkle & AI** | G3 |
| 5.1 | Rive integration + personality states in app | |
| 5.2 | AI router, budgets, circuit breakers, source citation | |
| 5.3 | Voice pipeline with text fallback | |
| 5.4 | Crisis protocol, hide/mute, coach-mode guardrails | |
| 6.0 | **Phase 4 — Supporting Features & Admin** | G4 |
| 6.1 | Shared shopping list | |
| 6.2 | Communication hub + AI drafts (confirm gate) | |
| 6.3 | Calendar / bell-schedule digitization with human review | |
| 6.4 | Full admin console: diagnostics, KPI, flags, audit, view-as, platform profiles | |
| 7.0 | **Phase 5 — Hardening & Go-Live** | G5 |
| 7.1 | Performance & resilience testing against budgets | |
| 7.2 | UAT, security & privacy review | |
| 7.3 | Runbooks, training, staged rollout & monitoring | |
| 8.0 | **Closing** — acceptance, lessons learned, transition to operations | |

## WBS Dictionary
Each work package's acceptance criteria = linked requirement acceptance + sprint Definition of Done (see [Product Backlog](Product-Backlog.md)). Estimates and owners are assigned in sprint planning — **TBD**.

## Corrections vs. original
Added 1.0 PM and 8.0 Closing branches; added web fallback, connectors beyond StudentVue, daily input, crisis protocol, comms confirm framework; pulled basic admin sync health into Phase 1 to match handoff §9/§11.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Work Breakdown Structure (01M5GCZRQDWWN9EC6SFSEKHJA9.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
