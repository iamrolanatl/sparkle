# Scalability & Reliability Plan (Enterprise Standard)

| Field | Value |
|---|---|
| Document ID | SPK-PLN-023 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Baselined under CR-0007 (approved by Rolan Chowdhury 2026-10-21) |
| Document Owner | Rolan Chowdhury (Sponsor / PM) |
| Author | Grok Bot (for Rolan Chowdhury) |
| Last Updated | 2026-10-21 |

## 1. Binding requirement
Rolan (2026-10-21): *the whole implementation must meet enterprise standards for 1,000,000 users, with no app crashes, scalable, and repos kept clean.* Measurable targets are NFR-35..NFR-48 in the [Requirements Baseline](Requirements-Baseline.md); decision DEC-51.

## 2. Capacity model (planning assumptions — revisit at each gate)
| Quantity | Assumption | Value |
|---|---|---|
| Registered users | target | **1,000,000** |
| Daily active (DAU) | 30 % of registered | 300,000 |
| Peak-hour active | 35 % of DAU in the 6–9 PM ET homework window | 105,000 |
| **Concurrent peak** | 30 % of peak-hour actives online at once | **≈ 30,000 concurrent sessions** |
| API requests / active session | 1 per 10 s (Today doc, polling-free via cache + push) | — |
| **Peak API rate** | 30,000 / 10 s | **≈ 3,000 RPS** (design for 2× = **6,000 RPS**) |
| DB-touching share | ≤ 20 % (rest from KV/edge cache: precomputed Today doc) | ≈ 600–1,200 QPS |
| Postgres connections | Supavisor transaction mode; Workers never hold direct connections | pool ≤ 60 server conns |
| Chat (FR-19) | ≤ 2 % of sessions, 10 msgs/min/IP limit | ≈ 600 concurrent streams |
| Storage | 50 MB/student (scans, vault) × 600k students | ≈ 30 TB R2 (zero egress) |

Scale levers in order: (1) cache precomputed docs in KV / Cache API; (2) Queues for sync, OCR, notifications (async, idempotent); (3) read replicas; (4) partition hot tables by `student_id`; (5) Durable Objects for per-household realtime fan-out.

## 3. SLOs, error budgets, recovery
| Objective | Target | Error budget (30 days) |
|---|---|---|
| Availability (API + web, synthetic + real-user) | **99.9 %** | 43.2 min downtime |
| Crash-free sessions (web + PWA + desktop agent) | **≥ 99.9 %** | 1 crash per 1,000 sessions |
| API latency (edge, cached read) | p95 ≤ 200 ms, p99 ≤ 500 ms | 0.1 % of requests over p99 |
| API latency (DB write) | p95 ≤ 400 ms | — |
| Web vitals (mobile, p75) | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1; Lighthouse ≥ 90 | — |
| Chat first token | p95 ≤ 2 s | — |
| **RPO** | ≤ 24 h now (Supabase daily backups, Free); ≤ 5 min with PITR (paid, SA-15) | — |
| **RTO** | ≤ 4 h (restore + redeploy per SOP-11 / SOP-02) | — |

Error-budget policy: burn > 50 % in 7 days → feature freeze on that service until fixed; burn > 100 % → incident review (SOP-05) and Lane-1 reliability work takes priority.

## 4. Engineering controls (all on free tiers)
| Area | Control | Where |
|---|---|---|
| Crash prevention | React error boundaries at root, route and **per applet**; graceful degradation (cached/“offline” states); typed API errors | `packages/ui` `ErrorBoundary`, `apps/web/src/app/error.tsx`, `global-error.tsx` |
| Crash reporting | Sentry-compatible reporter (free Developer tier, 5k events/mo) with PII scrubbing; no-op until DSN set (SA: Sentry account) | `apps/web/src/lib/report.ts`, `apps/api/src/lib/report.ts` |
| Timeouts / retries | Every outbound call wrapped: timeout, ≤ 2 retries with jittered backoff, idempotent methods only | `apps/api/src/lib/resilience.ts` |
| Idempotency | `Idempotency-Key` header on POSTs; 24 h dedupe | API middleware |
| Rate limits | Workers Rate Limiting binding per IP/user; AI Gateway limit | `wrangler.toml` |
| Caching | `Cache-Control` + Cache API for public GETs; KV for Today doc (Phase 1) | API |
| Queues | Cloudflare Queues for sync/OCR/notifications (Phase 1+, free tier 10k ops/day) | API |
| Feature flags | `feature_flags` table + kill switches; SOP-09 | DB / API |
| DB performance | Index every FK and RLS policy column; `(select auth.uid())` wrapping in policies; Supabase advisors clean | migrations |
| Connection pooling | Supavisor (transaction mode, port 6543) for any server-side Postgres use; Workers use PostgREST over HTTP | TDD §6 |
| Load testing | k6 smoke (CI, every PR, local API) + capacity script for scheduled runs; thresholds = SLOs | `tests/load/` |
| Observability | Workers Logs + Analytics (free), AI Gateway analytics, `/health` deep checks, synthetic checks in CI cron; alerts by email via Cloudflare Notifications (SA-13) | SOP-05 |
| Release safety | Gradual deployments (Workers versions) canary 10 % → 100 %; `wrangler rollback`; SOP-02 | SOP-02 |

## 5. Repo hygiene (recurring — SOP-13)
Merged branches deleted automatically; knip (unused files/exports/deps) and Prettier check in CI; ESLint + typecheck gates; CODEOWNERS; Conventional Commits checked on PR titles; docs index kept current (`docs/README.md`).

## 6. Free-tier limits that cap real scale (sponsor decisions)
Full-scale load tests, PITR, read replicas, Workers Paid ($5/mo) and Supabase Pro ($25/mo) are **not** purchased. They are listed in Sponsor-Action-Items (SA-15, SA-16) for the go-live decision. Until then, load tests run at smoke scale and the capacity model is validated by extrapolation.

## Revision History
| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0007 | Initial plan. |
