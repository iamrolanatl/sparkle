# Product Blueprint

| Field | Value |
|---|---|
| Document ID | SPK-INI-001 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Product Owner — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Product Blueprint (01M5GCZTEPQYBT11CY6F3EJTNV.docx) |

> **Purpose.** Defines the product vision, scope boundaries, design principles, and core capabilities that every other baseline document traces to.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Purpose and Vision
Sparkle is a student-success platform focused **exclusively** on helping students succeed in school. It aggregates data from school systems (StudentVue, ParentVue, CTLS Learn, CTLS Parent, Office 365 email + calendar, Synergy, Clever, and other available Cobb County sources), prioritizes present and future work with AI, and presents it through a calm, modern **glass cockpit** interface. A full-body companion robot named **Sparkle** provides encouragement and guidance with real (non-scripted) AI responses across a 3-tier model. The experience must never overwhelm the student.

## 2. Scope Boundaries
| In scope (MVP) | Out of scope (MVP) |
|---|---|
| Student and parent views (desktop- and mobile-friendly web) | Adult / life-management features |
| Desktop sync agent (Tauri) + full web-only fallback path | Unrestricted browsing of private student content (incl. by admins) |
| Per-class unit workspaces with AI-suggested resources | Automatic sending of any message without explicit confirmation |
| Deterministic GPA calculator and simulator | AI completing academic work for the student (coach mode only) |
| Calendar / bell-schedule digitization with human review | Districts other than Cobb County for MVP acceptance (design-ready only) |
| Shared shopping list | Native iOS/Android apps — **TBD (Rolan)**: confirm responsive web/PWA satisfies "mobile friendly" |
| Communication hub + AI drafts with explicit confirmation | |
| Interactive Sparkle robot with voice + text fallback | |
| Admin operations console | |
| Multi-district readiness via Platform Profiles | |

## 3. Design Principles
1. **Overview, then focus.** Clean Today landing showing only the highest-priority items; auto-hiding toolbars / hamburger; single-subject focus mode.
2. **Glass + neon.** Glass panes with subtle cyan/teal neon borders; high-contrast light and dark modes; text always readable.
3. **Live but light.** Subtle animated background (aurora/particles or lightweight video) that auto-disables under 30 fps, with reduced-motion, or data saver.
4. **Sparkle the companion.** Cute full-body robot (head, torso, arms, legs) with human-like expressions; personality eager, playful, encouraging, respectful of focus. States: idle, excited, bored/thoughtful, helping.
5. **Wellbeing.** Growth-mindset language; no punishing streaks; quiet hours and daily digest; crisis protocol.
6. **Progressive disclosure.** One idea per message; grade-8 reading level.
7. **Privacy by default.** Explicit, revocable sharing; age threshold; always-visible access list.
8. **Performance budgets are requirements** (see Requirements Baseline NFR-01..NFR-06).

## 4. Core Capabilities
| # | Capability | Feature IDs |
|---|---|---|
| 1 | Data aggregation + AI prioritization (present/future first) | F-01, F-02 |
| 2 | Family setup, identity, sharing | F-03 |
| 3 | Desktop sync agent + web fallback | F-04 |
| 4 | Calendar, bell schedule, GPA | F-05, F-06 |
| 5 | Per-class success workspace | F-07 |
| 6 | Student daily input | F-08 |
| 7 | Shared shopping list | F-09 |
| 8 | Communication hub + safeguarded AI drafting | F-10, F-11 |
| 9 | Interactive Sparkle robot (3-tier AI: Workers AI/Ollama-class → Grok → Claude) | F-12 |
| 10 | Admin backend and operations console | F-13 |

See the [Feature Register](../00-governance/Feature-Register.md).

## 5. Scalability Intent
Modular monolith on Cloudflare edge + portable Postgres (Supabase) with RLS. Platform Profiles enable multi-district expansion without code forks. Written scale triggers extract ingestion and AI workers when load requires. Target: **1,000,000 users** without architectural rewrite.

## 6. Corrections vs. original
- Original was labelled "Approved for Baseline v1.0" with no approver or date of approval recorded. Status reset to *pending sign-off* until Rolan approves this PR.
- Added CTLS Parent, Office 365 email, calendar digitization, student daily input, communication hub, quiet hours/digest, crisis protocol, and grade-8 reading level (present in handoff, missing from blueprint).

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Product Blueprint (01M5GCZTEPQYBT11CY6F3EJTNV.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
