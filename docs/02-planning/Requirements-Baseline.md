# Requirements Baseline — Functional and Non-Functional

| Field | Value |
|---|---|
| Document ID | SPK-PLN-001 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Product Owner — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Requirements Baseline (01M5GCZT4HQPAJHSN86DM3E1N4.docx) |

> **Purpose.** Baselined functional (FR) and non-functional (NFR) requirements for the MVP. Original IDs FR-01..FR-12 / NFR-01..NFR-08 are preserved for traceability; new IDs were added for handoff requirements the original omitted.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

Priority uses MoSCoW (M = Must for MVP acceptance, S = Should, C = Could). Feature IDs map to the [Feature Register](../00-governance/Feature-Register.md).

## 1. Functional Requirements
| ID | Requirement | Pri | Feature | Handoff ref |
|---|---|---|---|---|
| FR-01 | Pull and normalize data from StudentVue, ParentVue, CTLS Learn, **CTLS Parent**, Office 365 (**email + calendar**), Synergy, Clever and other available Cobb sources into per-class, per-unit views. | M | F-01 | 3.1 |
| FR-02 | AI prioritizes present and future work; missed work only when still actionable; every item shows a plain-language reason; student can mark **Done / Working / Later / Ignore**; short **"What changed"** summary after each sync; default short list with detail behind progressive disclosure. | M | F-02 | 3.1 |
| FR-03 | Google sign-in for all users; parent adds students and credentials (device-stored by default); invitation + acceptance via email link **or short code**. | M | F-03 | 3.2 |
| FR-04 | Explicit, revocable, read-only sharing with age-threshold control (recommended 13/14 — **TBD (Rolan)** final value); plain-language share preview; always-visible access list for the student. | M | F-03 | 3.2 |
| FR-05 | Per-class workspace with current unit as primary container (syllabus, handouts, posts, AI-suggested third-party resources e.g. Khan Academy, YouTube, Blooket, Quizlet, and user-added links/docs); organized by subject and unit; focus mode when a class is opened. | M | F-07 | 3.5 |
| FR-06 | Deterministic weighted/unweighted GPA calculation and simulator. AI explains only; never calculates. | M | F-06 | 3.4 |
| FR-07 | Optional end-of-day / after-class student note merged into prioritization; private unless shared. | S | F-08 | 3.6 |
| FR-08 | Shared parent–student shopping list for supplies; real-time; no leakage of grades or private data. | S | F-09 | 3.7 |
| FR-09 | Communication hub with separate student and parent views; source + time shown; AI-drafted teacher replies / attendance / tardy letters, always shown for review/edit; **explicit confirmation before any send**; audit trail; respects class/district AI policies. | M (confirm gate) / S (hub) | F-10, F-11 | 3.8, 3.9 |
| FR-10 | Full-body Sparkle robot, real model responses, voice with text fallback; 3-tier escalation (T1 Workers AI/Ollama-class for everyday + voice, T2 Grok, T3 Claude) by complexity with safety gates and budgets; sources shown; coach mode; one-tap hide/mute; states idle/excited/bored-thoughtful/helping. | M | F-12 | 3.10 |
| FR-11 | Signed Windows/macOS desktop agent (Tauri + Playwright), OS secure store, scheduled runs **3 AM / 11 AM / 7 PM** (local time — **TBD (Rolan)** confirm timezone handling) + manual trigger, live console with next steps and redacted error classification; full web-only path (manual upload + official integrations) remains available. | M | F-04 | 3.3 |
| FR-12 | Separate role-based admin console (company SSO + hardware MFA) with modules: Overview, Families & users, Sync ops (live log, run explorer, agent fleet), Mail & comms outbox, Platform profiles & schema review, AI ops, KPI dashboard, Health dashboard, Privacy & compliance, Feature flags, Audit log; redacted support bundles; remote pause/resume; least privilege; JIT elevation; recorded, time-limited, consent-based view-as with visible banner. | M (health) / S (rest) | F-13 | 3.11 |
| FR-13 | *(new)* Upload or link school calendar and bell schedule → digitization with human review. | S | F-05 | 3.4 |
| FR-14 | *(new)* Robot crisis protocol: detect crisis language and route to defined safe responses/resources. Protocol content **TBD (Rolan / counsel)**. | M | F-12 | 3.10, 7 |
| FR-15 | *(new)* Quiet hours and daily digest options for notifications. | S | F-02 | 2 |

## 2. Non-Functional Requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-01 | Today view interactive on mid-range phone / 4G: p75 ≤ 2.0 s first visit, ≤ 1.0 s repeat. | Perf tests + RUM |
| NFR-02 | Glass/background effects ≥ 50 fps; auto-disable < 30 fps, reduced-motion, or data saver. | FPS harness |
| NFR-03 | API reads p95 ≤ 300 ms; cached Today document ≤ 100 ms. | Load tests |
| NFR-04 | Chat first token p95 ≤ 1.5 s on Tiers 1–2. | Synthetic checks |
| NFR-05 | Device-default credential storage; row-level security; age-aware sharing. | Security tests |
| NFR-06 | Circuit breakers, bulkheads, **rate limits**, graceful degradation on all external dependencies; UI error boundaries so one failure never blanks the screen. | Chaos / resilience tests |
| NFR-07 | Multi-district expansion via Platform Profiles without rewrite; target 1,000,000 users. | Architecture review |
| NFR-08 | Audit log of admin actions, share changes, and outbound message confirmations. | Audit tests |
| NFR-09 | *(new)* Voice end-of-speech → first audio p50 ≤ 1.2 s. | Synthetic checks |
| NFR-10 | *(new)* Sync for one student p95 ≤ 3 minutes. | Sync telemetry |
| NFR-11 | *(new)* Accessibility: high-contrast light/dark, readable text, reduced-motion respected, grade-8 reading level. WCAG level **TBD (Rolan)** (recommend 2.2 AA). | A11y tests |
| NFR-12 | *(new)* Per-user AI budgets and kill switches; feature flags for all new animation/live features. | Router tests |
| NFR-13 | *(new)* Responsive: desktop- and mobile-friendly web (per sponsor direction). | Device matrix |

## 3. Expert-Informed Constraints
Progressive disclosure; one idea per message; growth-mindset language; no punishing streaks; quiet hours and daily digest; crisis protocol; coach mode only for academic work.

## 4. Corrections vs. original
- Added NFR-09 (voice) and NFR-10 (sync) — present in handoff §4, missing from original.
- FR-01 missed CTLS Parent and Office 365 email; FR-02 missed item statuses and "What changed".
- Calendar/bell digitization, crisis protocol and quiet hours had no FR; added FR-13..15.
- Admin SSO/MFA, view-as rules and modules folded into FR-12.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Requirements Baseline (01M5GCZT4HQPAJHSN86DM3E1N4.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
