# Technical Design Document / Solution Architecture

| Field | Value |
|---|---|
| Document ID | SPK-PLN-003 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Engineering Lead — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Technical Design Document (01M5GCZT2B8FBR5T6NDN14HG45.docx) |

> **Purpose.** Describes the solution architecture, technology choices, architectural decisions (ADRs), performance/resilience, security, and scale triggers.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Architecture Overview
Modular monolith on Cloudflare edge with portable Postgres (Supabase initially). Web (student/parent) and admin delivered as Next.js. Desktop agent is Tauri + Playwright. AI routed through Cloudflare AI Gateway with a small escalation router.

```
[Browser: Next.js web / admin] ──► [Cloudflare Workers (Hono) + Durable Objects]
                                         │        │        │
                       KV (Today doc) ◄──┘   Queues/Workflows   AI Gateway ─► T1 Workers AI │ T2 Grok │ T3 Claude
                                         │
                       Supabase Postgres (RLS) + Supabase Auth (Google)      R2 (raw payloads)
[Desktop agent: Tauri + Playwright + OS secure store] ──► ingest API ──► Queues ──► normalize ──► Postgres ──► Today precompute ──► KV
```

## 2. Technology Stack
| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind, Framer Motion |
| Robot | Rive (or equivalent) state machines |
| API & edge | Cloudflare Workers (Hono) + Durable Objects |
| Database | Supabase Postgres with RLS (portable) |
| Cache / queues / storage | Cloudflare KV / Queues + Workflows / R2 |
| Desktop agent | Tauri + Playwright, OS secure store |
| AI | Cloudflare AI Gateway + router: T1 Workers AI/Ollama-class → T2 Grok → T3 Claude |
| Observability | OpenTelemetry, structured redacted logs, Sentry, synthetic checks |
| Identity | Supabase Auth + Google; upgrade path to WorkOS (or similar) for district SSO; admin via company SSO + hardware MFA |
| Hosting of Next.js | **TBD (Rolan)** — Cloudflare Pages/Workers (OpenNext) recommended to keep one edge platform |

## 3. Architecture Decision Records (summary)
Full decisions with status in the [Decision Log](../00-governance/Decision-Log.md).
| ADR | Decision |
|---|---|
| ADR-01 | Device-default credential storage |
| ADR-02 | Precomputed Today document |
| ADR-03 | Deterministic GPA engine; AI only explains |
| ADR-04 | Explicit confirmation for any outbound communication |
| ADR-05 | Platform Profiles for multi-district expansion |
| ADR-06 | Rive for Sparkle |
| ADR-07 | Modular monolith first; extract ingestion/AI workers only on load triggers *(added — missing from original)* |

## 4. Performance and Resilience
Budgets NFR-01..04, 09, 10 enforced in CI (smoke) and production (synthetics/RUM). Circuit breakers, bulkheads, rate limits and automatic fallbacks (AI tier, voice→text, live→last-known/cached). Per-user AI budgets + kill switches. Feature flags for all new animation and live features. UI error boundaries.

## 5. Security and Privacy
RLS by family/tenant; age-threshold sharing with visible access list; redacted support bundles and logs; audit log; admin SSO + hardware MFA, least privilege, JIT elevation, recorded view-as; secrets in Cloudflare/GitHub secret stores, never in repo.

## 6. Scale Triggers
Documented thresholds (concurrent sessions, p95 latency, DB CPU/connection saturation) move to managed Postgres with replicas, extract ingestion/AI workers, and add regional voice media servers. Numeric trigger values **TBD (Eng Lead)** — to be set in Phase 0 architecture runway.

## 7. Corrections vs. original
Added ADR-07, KV/Queues/Workflows/R2, observability and identity stack (all in handoff §5 but missing), rate limits and error boundaries; flagged Next.js hosting and scale-trigger values as open.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Technical Design Document (01M5GCZT2B8FBR5T6NDN14HG45.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
