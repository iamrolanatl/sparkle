# Requirements Baseline — Functional and Non-Functional

| Field | Value |
|---|---|
| Document ID | SPK-PLN-001 |
| Project | Sparkle — Student Success Platform |
| Version | 1.3 |
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
| FR-16 | *(CR-0002)* Helper access: a guardian (always) or the student (at/over the age threshold; below it a guardian must approve) can invite helpers — parent, guardian, sibling, cousin, aunt, uncle, grandparent, babysitter/caregiver, tutor, teacher, other (+ free-text label) — via email link or short code (hashed, single use, 72 h expiry, rate-limited, email-bound when set). Helper signs in with own Google account and redeems via `redeem_invitation`; creates a read-only share (or a guardian link for parent/guardian invited by a guardian). Helpers may hold access to many students (student switcher). Teachers/tutors default to academic scopes only. Shares revocable by inviter, any guardian, or the student (at/over threshold); all grants/revokes audit-logged and shown on the student's access list. | M | F-14 | Sponsor 2026-10-21 |
| FR-17 | *(CR-0002)* Public marketing landing page at `/` (responsive, glass/neon) with hero, features, how it works, FAQ, Privacy/Terms links; primary CTA "Sign up with Google"; secondary waitlist email capture (insert-only, rate-limited, honeypot); SEO metadata, OG image, sitemap, robots; signed-in app at `/app`. Copy is draft, grade-8, no unverifiable claims. | M | F-15 | Sponsor 2026-10-21 |

### 1.1 Additions under CR-0003 (landing, legal, chat, admin)
| ID | Requirement | Pri | Feature | Source |
|---|---|---|---|---|
| FR-18 | Legal/compliance pages, each marked *draft — pending legal review*: Terms of Service; Privacy Policy with a children's/student data section (COPPA, FERPA); Cookie Policy + consent banner (essential-only default, analytics opt-in, GPC forces opt-out); Accessibility Statement (WCAG 2.2 AA target + feedback contact); "Do Not Sell or Share My Personal Information" (CCPA/CPRA) request form saved to `privacy_requests` (insert-only for anon/authed; read by service role/admin only), honoring Global Privacy Control. Public launch also needs production domain/DNS. | M | F-16 | Sponsor 2026-10-21 |
| FR-19 | Public "Questions?" sales & support chat on the landing page: Hono `/chat` route streaming from Cloudflare Workers AI (Tier 1 open Llama-class instruct model) through AI Gateway; system prompt grounded in a repo knowledge file; no account; per-IP rate limits; per-day token budget + kill switch (feature flag `sales_chat`); refuses off-topic/unsafe asks; crisis safety reply; never collects sensitive student data (redacts emails/phones/IDs before storage); "Talk to a human" handoff to `support_tickets`; AI disclosure; `chat_sessions`/`chat_messages` with 30-day retention TTL. | M | F-17 | Sponsor 2026-10-21 |
| FR-20 | Admin command center minimum slice (pulled forward from FR-12/Phase 4): `/admin`, role-gated by `app_metadata.role = admin` (404 otherwise, never public, noindex); *Sales & Support Chat* module (live/recent sessions, redacted transcripts, flagged conversations, escalations/tickets, token usage vs budget, error rate, kill-switch toggle) and *Privacy requests* queue; all admin actions audit-logged. **TODO before launch:** company SSO + hardware MFA. | M | F-18 | Sponsor 2026-10-21 |

### 1.2 Additions under CR-0004 (scope addition — amends handoff §1)
| ID | Requirement | Pri | Feature | Phase |
|---|---|---|---|---|
| FR-21 | **Natural-language tasks.** Student/parent types or says e.g. "remind me Friday to study for the bio quiz"; parsed into a task with due date, class/unit link and priority. Deterministic date parsing first, Tier 1 AI fallback. Interpretation shown for confirm/edit before saving. Tasks feed Today prioritization (FR-02). | S | F-19 | 2 |
| FR-22 | **Live weather (school-day context).** Local forecast on Today: rain/cold, severe-weather or closure alerts for the school morning. Location from a user-set school ZIP (no continuous GPS). Cached in KV; graceful fallback when unavailable. Provider TBD (cost/terms). | C | F-20 | 2 |
| FR-23 | **OCR document scanning.** Snap or upload handouts, syllabi, flyers, permission slips, report cards, school calendars, bell schedules. OCR on-device/in-browser first, Workers AI vision as fallback. Extracted text becomes tasks, due dates, unit resources, or feeds FR-13 calendar digitization. **Always human review before saving.** Originals stored in private R2 bucket `sparkle-scans`. | S | F-21 | 2 (calendar/bell use in 4) |
| FR-24 | **School mail vault.** Secure per-student/household vault for scanned physical school mail and documents (school letters, permission slips, report cards, IEP/504 docs, school medical/immunization forms). RLS scoped like other student data; **sensitive-doc flag** defaults to guardians-only and is excluded from helper/teacher shares unless explicitly granted; encrypted in private R2 bucket `sparkle-vault` with short-lived signed URLs; retention and deletion controls; audit log. Non-school personal mail is out of scope. Behind feature flag `vault_enabled=false` (sample data only) until legal/security review. **Acceptance criteria (OCR explicit):** (a) every item added — camera capture, photo upload, PDF, multi-page scan — runs through the FR-23 OCR pipeline; (b) OCR text stored RLS-protected alongside the original; (c) full-text search over extracted text; (d) auto-classification/tagging; (e) extraction of key fields — sender, date, due date or action; (f) human review before any action item is saved. | S | F-22 | 4 |

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
| NFR-20 | *(CR-0005)* Verifiable parental consent recorded before any vault is created for a student (DEC-21). | E2E consent tests |
| NFR-21 | *(CR-0005)* Pre-save detectors auto-redact SSN/card/bank numbers; warn-and-confirm on medical/legal docs; 0 SSNs persisted in test corpus (DEC-22). | Detector test corpus |
| NFR-22 | *(CR-0005)* Vault classes standard/academic/sensitive with default visibility per DEC-23 enforced by RLS. | RLS/privacy suite |
| NFR-23 | *(CR-0005)* TLS 1.2+; at-rest encryption; mandatory envelope encryption + crypto-shred for sensitive class (DEC-24). | Crypto tests, key-rotation drill |
| NFR-24 | *(CR-0005)* Presigned URL TTL ≤ 5 min, single object; sensitive via authenticated proxy with step-up (DEC-25). | Integration tests |
| NFR-25 | *(CR-0005)* Append-only vault access log for all actions; visible to guardians; 24-month retention (DEC-26). | Audit tests |
| NFR-26 | *(CR-0005)* No standing admin access to vault; break-glass view-as ≤ 30 min, MFA, audited, family notified (DEC-27). | Admin tests |
| NFR-27 | *(CR-0005)* Deletion: primary ≤ 30 days, all copies ≤ 60 days; inactivity and age-18 rules (DEC-28). | Purge job tests |
| NFR-28 | *(CR-0005)* Breach notice: declare ≤ 24 h; families ≤ 30 days target, ≤ 60 days max; regulators per DEC-29. | Tabletop exercise |
| NFR-29 | *(CR-0005)* Every subprocessor under DPA (no training, ≤ 24 h breach notice, US processing); no vault content to Tier 2/3 AI without opt-in, never sensitive (DEC-30). | Contract index, router tests |
| NFR-30 | *(CR-0005)* OCR on-device for sensitive; no third-party OCR APIs; no model training on vault content (DEC-31/32). | Architecture review, network tests |
| NFR-31 | *(CR-0005)* Vault data stored/processed in the US (DEC-33). | Config audit |
| NFR-32 | *(CR-0005)* Written Information Security Program maintained and reviewed annually (DEC-34). | Annual review |
| NFR-33 | *(CR-0005)* Independent pen test pre-launch, Critical/High fixed; cross-tenant RLS suite in CI; ASVS 5.0 L2 for vault (DEC-35). | Pen-test report, CI |
| NFR-34 | *(CR-0005)* Step-up re-auth (≤ 15 min) for sensitive documents (DEC-39). | E2E |

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
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0002 | Added FR-16 (helper access) and FR-17 (landing page + waitlist). |
| 1.2 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003, CR-0004 | CR-0003: FR-18 legal/compliance + GPC, FR-19 sales/support chat, FR-20 admin chat monitoring. CR-0004: FR-21 NL tasks, FR-22 weather, FR-23 OCR, FR-24 mail vault (OCR acceptance explicit). |
| 1.3 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0005 | Added NFR-20..34 (vault controls) per CR-0005. |
