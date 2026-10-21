# Sparkle — Implementation Handoff Document

> Verbatim conversion of the source Word document (01M5GCNQSEHN6SZD9TP3S3G576.docx), Version 1.0, October 2026. This is a **reference input**; the governed baseline is the document set indexed in [README.md](README.md). Do not edit except to fix conversion errors.

**Purpose: Single source of truth for a Grok Bot or engineering team to begin implementation. Consolidates every requirement, design decision, architecture choice, and constraint discussed.**

**Version: 1.0  |  Date: October 2026  |  Status: Ready for Implementation**


## 1. Vision and Scope

- Sparkle is a student-success platform focused exclusively on helping students succeed in school. It aggregates data from school platforms, prioritizes present and future work with AI, and presents it through a calm, modern glass cockpit interface. A full-body companion robot named Sparkle provides encouragement and guidance.
- Adult/life-management features are explicitly out of scope. The experience must never overwhelm the student.

## 2. Design System and Experience Principles

- Clean Today landing page showing only the highest-priority items.
- Auto-hiding toolbars or hamburger menu. Single-subject focus mode that hides non-essential chrome so the student can work without distraction.
- Glass panes with subtle neon (cyan/teal) borders and accents. High-contrast light and dark modes. Text always readable.
- Subtle animated background (aurora / particles or lightweight video) for a live cockpit feel. Auto-disable under 30 fps, reduced motion, or data saver.
- Sparkle is a cute, full-body little robot with head, torso, arms, and legs, plus human-like expressions and personality (eager, playful, encouraging, respectful of focus). States: idle, excited, bored/thoughtful, helping.
- Growth-mindset language. No punishing streaks. Quiet hours and daily digest options.
- Progressive disclosure everywhere. One idea per message. Grade-8 reading level.

## 3. Functional Requirements (Complete)


### 3.1 Data Aggregation and Prioritization

- Pull from StudentVue, ParentVue, CTLS Learn, CTLS Parent, Office 365 (email + calendar), Synergy, Clever, and other available Cobb County sources.
- Normalize into per-class, per-unit views.
- AI prioritizes present and future work. Missed work appears only when still actionable.
- Every item shows a plain-language reason. Student can mark Done / Working / Later / Ignore.
- Short “What changed” summary after each sync.
- Default to a short list; full detail behind progressive disclosure.

### 3.2 Family Setup, Identity, and Sharing

- Google sign-in for all users.
- Parent adds students and credentials (device-stored by default).
- Invitation + acceptance via email link or short code.
- Explicit, revocable read-only sharing with age-threshold control (recommended 13/14).
- Plain-language share preview and always-visible access list for the student.

### 3.3 Desktop Sync Agent and Web Fallback

- Signed Windows/macOS installer (Tauri). OS secure store. Scheduled runs (3 AM / 11 AM / 7 PM) plus manual trigger.
- Live console with clear next steps and redacted error classification.
- Full web-only path (manual upload + official integrations) remains available.

### 3.4 Calendar, Bell Schedule, and GPA

- Upload or link school calendar and bell schedule → digitization with human review.
- Deterministic weighted/unweighted GPA calculation and simulator. AI explains only; never calculates.

### 3.5 Per-Class Success Workspace

- Current unit as the primary container: syllabus, handouts, posts, AI-suggested third-party resources (Khan Academy, YouTube, Blooket, Quizlet, etc.), and user-added links/documents.
- Organized by subject and unit. Focus mode when a class is opened.

### 3.6 Student Daily Input

- Optional end-of-day or after-class note merged into prioritization. Private unless shared.

### 3.7 Shared Shopping List

- Simple parent–student list for supplies and materials. Real-time, clear visibility, no leakage of grades or private data.

### 3.8 Communication Hub

- Separated student and parent views for school-related messages.
- Source and time shown. Nothing sent without explicit confirmation.

### 3.9 AI-Assisted Communication (Safeguarded)

- Grok (via tiered router) drafts teacher replies or attendance/tardy letters from parent/student input.
- Always shown for review and edit. Explicit confirm required before send.
- Audit trail. Respects class/district AI policies. Coach mode only for academic work.

### 3.10 Interactive AI Robot (Sparkle)

- Real model responses (not scripted). Voice with text fallback.
- 3-tier escalation: Tier 1 (Cloudflare Workers AI / Ollama-class) for everyday + voice; Tier 2 Grok; Tier 3 Claude. Escalation by complexity with safety gates and budgets.
- Sources shown. Coach mode. One-tap hide/mute. Crisis protocol. Growth-mindset language.
- Full-body character with expressions and personality states.

### 3.11 Admin Backend and Operations Console

- Separate role-based console (company SSO + hardware MFA).
- Modules: Overview, Families & users, Sync operations (live log, run explorer, agent fleet), Mail & communication outbox, Platform profiles & schema review, AI operations, KPI dashboard, Health dashboard, Privacy & compliance, Feature flags, Audit log.
- Diagnostic capabilities: redacted support bundles, error classification, remote pause/resume, correlation of user issues to sync/AI decisions.
- Least-privilege roles. Just-in-time elevation. Recorded, time-limited view-as with visible banner. No unrestricted browsing of private student content.

## 4. Non-Functional Requirements and Performance Budgets

- Today view interactive on mid-range phone over 4G: p75 ≤ 2.0 s first visit, ≤ 1.0 s repeat.
- Glass and background effects: ≥ 50 fps; auto-disable under 30 fps.
- API reads p95 ≤ 300 ms (cached Today document ≤ 100 ms).
- Chat first token p95 ≤ 1.5 s on Tiers 1–2.
- Voice end-of-speech to first audio p50 ≤ 1.2 s.
- Sync for one student p95 ≤ 3 minutes.
- Device-default credential storage. Row-level security. Age-aware sharing.
- Circuit breakers, bulkheads, rate limits, and graceful degradation on all external dependencies.
- Support expansion to additional districts via Platform Profiles without rewrite. Target: 1,000,000 users.

## 5. Recommended Technology Stack

- Frontend: Next.js (App Router) + React + TypeScript + Tailwind + Framer Motion.
- Robot character: Rive (or equivalent) for full-body states and expressions.
- API & Edge: Cloudflare Workers (Hono) + Durable Objects.
- Database: Supabase Postgres with RLS (portable; documented triggers to managed Postgres with replicas).
- Desktop agent: Tauri + Playwright, OS secure store.
- AI Gateway: Cloudflare AI Gateway + small router (Tier 1 Workers AI/Ollama-class → Tier 2 Grok → Tier 3 Claude).
- Cache: Cloudflare KV. Queues: Cloudflare Queues + Workflows. Storage: R2.
- Observability: OpenTelemetry, structured redacted logs, Sentry, synthetic checks.
- Identity: Supabase Auth + Google (upgrade path to WorkOS or similar for district SSO).

## 6. Key Architectural Decisions

- Device-default credential storage.
- Precomputed Today document for performance and cacheability.
- Deterministic GPA engine; AI only explains.
- Explicit confirmation required for any outbound communication.
- Platform Profiles for multi-district expansion without code forks.
- Rive for Sparkle to achieve full-body personality at low CPU cost.
- Modular monolith first; extract ingestion and AI workers only when load triggers are hit.

## 7. Resilience and Safety

- Circuit breakers and automatic fallbacks (AI tier, voice → text, live → last-known).
- Per-user AI budgets and kill switches.
- Feature flags for all new animation and live features.
- Staged agent rollouts with instant rollback.
- Error boundaries in the UI so a single failure does not blank the screen.
- Crisis protocol for the robot.

## 8. Delivery Approach

- Hybrid: fixed-scope MVP phases with internal 2-week Agile sprints and formal go/no-go gates. Chosen because school integrations and compliance need controlled acceptance, while the student experience, robot personality, and prioritization benefit from iteration.

## 9. Implementation Starting Point for Grok Bot

- Begin with Phase 0: design system (glass + neon), Sparkle Rive character states, CI/CD baseline, and architecture runway.
- Implement identity and family invitation flow next.
- Stand up the first connector and Today document precomputation.
- Build Today view and focus mode against the performance budgets.
- Integrate Sparkle with the tiered AI router and source citation.
- Add admin health and sync diagnostics in parallel once core data path exists.
- Enforce explicit confirmation on all communication features from the first implementation.

## 10. Related Documents in the Library

- This handoff is supported by the full document set: Product Blueprint, Statement of Work, Project Charter, Requirements Baseline, Technical Design Document, RAID Register, Product Backlog, WBS, RACI, Test Strategy, and the operational documents (TOM, OCM, Go-Live Runbook, CI/CD plan, etc.).

## 11. Success Criteria for First Implementation Increment

- A student can sign in, link to a parent, and see a prioritized Today view that meets the performance budget.
- At least one school data path (sync → normalized model → Today) works end-to-end.
- Sparkle appears as the full-body character and can respond with a tiered AI answer that cites a source.
- Any draft message requires explicit confirmation before send.
- Admin can view basic sync health.
