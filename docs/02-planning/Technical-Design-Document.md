# Technical Design Document / Solution Architecture

| Field | Value |
|---|---|
| Document ID | SPK-PLN-003 |
| Project | Sparkle — Student Success Platform |
| Version | 1.2 |
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
| Identity | Supabase Auth + Google (one OAuth Web client, DEC-05; `@supabase/ssr` cookies, PKCE); upgrade path to WorkOS (or similar) for district SSO; admin via company SSO + hardware MFA |
| Hosting of Next.js | Cloudflare Workers via OpenNext (`apps/web`, CR-0002) |

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

> **AI router notes (#20, Team E review):** circuit breakers are per Worker isolate (each isolate learns independently; acceptable at our scale); token budgets are soft, batched per isolate and flushed to KV; every output passes a required output filter (unsafe → safe fallback with 988); source titles are sanitized and passed as data.
RLS by family/tenant; age-threshold sharing with visible access list; redacted support bundles and logs; audit log; admin SSO + hardware MFA, least privilege, JIT elevation, recorded view-as; secrets in Cloudflare/GitHub secret stores, never in repo.

## 6. Scale Triggers
Documented thresholds (concurrent sessions, p95 latency, DB CPU/connection saturation) move to managed Postgres with replicas, extract ingestion/AI workers, and add regional voice media servers. Numeric trigger values **TBD (Eng Lead)** — to be set in Phase 0 architecture runway.

## 8. Data Model & Access Control *(CR-0002)*
Implemented in `supabase/migrations/20261021000000_initial_tenant_model.sql`; proven by `supabase/tests/rls_test.sql` (35 assertions, run in CI via PGlite).

### 8.1 Entities
| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One per auth user | `id = auth.uid()` |
| `students` | The student record (exists before the student has a login) | `display_name, birth_date, profile_id` (null until the student accepts), `created_by` |
| `student_guardians` | Parent↔child link, many-to-many | `student_id, guardian_profile_id, relationship, status active/revoked, is_primary` |
| `shares` | Read-only third-party/helper access = the student's visible access list | `student_id, grantee_profile_id, scopes[], relationship (enum), relationship_label, granted_by, expires_at, revoked_at` |
| `invitations` | Student-login and helper invites | `student_id, email?, role student/helper, relationship, scopes[], code_hash, requires_approval, approved_*, expires_at (72 h), accepted_*, revoked_at` |
| `invitation_redeem_attempts` | Rate limiting (5 failures / 15 min / user) | |
| `guardian_access_limits` | Student-set limits after age threshold | `student_id, scope (daily_notes / ai_chat / resources only), limited_by` |
| `households`, `household_members`, `shopping_items` | Shopping list, **separate from academic data** | |
| `daily_notes` | Student input | `visibility private / guardians / shared` (default private) |
| `classes, units, assignments, grades, sync_runs, ai_drafts` | School data; every row has `student_id` | **Service-role ingest worker writes only**; clients have SELECT only |
| `share_audit_log`, `admin_audit_log` | Audit | no client write; admin log has no client read |
| `app_settings` | `guardian_limit_age_threshold` (placeholder 13, DEC-04) | read-only to clients |
| `tasks` | Student tasks from natural language (FR-21, Team A, #39) | `student_id, title, due_at, status`; created only with explicit confirmation |
| `scans` | Worksheet/calendar OCR uploads (FR-23, Team B, #44) | `student_id, status, ocr result`; RLS guardians + student. **Retention:** originals and unsaved scans deleted after **30 days** (DEC-126) |
| `vault_documents`, `vault_grants`, `vault_access_log`, `consents`, `household_keys` | FR-24 vault (Team C, #38) — behind flag, **not launched** | see Vault Compliance & Security Plan |
| `waitlist` | Landing page email capture (FR-17) | insert-only anon/authed; trigger rate limit per `ip_hash`; read by service role only |

Scopes (`access_scope` enum): core = grades, attendance, assignments, schedule, messages (never limitable); limitable = daily_notes, ai_chat, resources.

### 8.2 The access gate
`can_view_student(student_id, scope)` — single `SECURITY DEFINER` function used by every academic SELECT policy. True when:
1. caller is the student (`students.profile_id = auth.uid()`); or
2. caller is an **active guardian**, unless the student is at/over the threshold **and** has a `guardian_access_limits` row for that scope (DEC-06); or
3. caller holds an **active, unexpired, unrevoked share** whose `scopes` contain the scope.

### 8.3 Helper invitations (FR-16, DEC-07)
- Guardians can always invite; the student can invite helpers — below threshold the invite has `requires_approval` and a guardian must call `approve_invitation`.
- Raw code / link token is never stored (`code_hash` = sha256 of normalized code). `redeem_invitation(code)` (SECURITY DEFINER) checks expiry, single use, approval, email binding, rate limit; returns null on failure (no enumeration).
- Result: `student_guardians` row if relationship is parent/guardian and the inviter is a guardian; otherwise a `shares` row with `default_scopes(relationship)` (teachers/tutors: academic only, enforced by trigger).
- Many-to-many: a helper (incl. a sibling who is a student) can hold shares on many students → UI student switcher.
- Revocation: inviter, any active guardian, or the student at/over threshold. Grants and revokes are written to `share_audit_log` by trigger.

### 8.4 Admin & secrets
No admin read policies. Admin access only via `admin_request_view_as` (stub: requires `support_admin` role claim, reason, ≤ 30 min, audited; grants nothing yet — Phase 4 adds SSO + hardware MFA + consent + banner). **School-portal credentials are never stored in the database** (ADR-01).

### 8.5 Applying the migration
Not applied to the live project in CR-0002. Procedure: local `supabase start && supabase db reset` → run `rls_test.sql` → `supabase link --project-ref nklbdyezbsugkdvaidtt` → `supabase db push --dry-run` → sponsor approval → `supabase db push`.

## 8.6 Public chat, legal & admin (CR-0003)
- `apps/api` `POST /chat` (SSE) → guard (`classify`, `redact`) → Workers AI `@cf/meta/llama-3.1-8b-instruct` via AI Gateway `sparkle-gateway`; `POST /chat/handoff` → `support_tickets`. Rate limiting: Workers Rate Limiting binding `CHAT_RATE_LIMITER` (10/min/IP). Kill switch/budget: `feature_flags.sales_chat`. Storage via PostgREST with service role; `chat_sessions` expire after 30 days (`purge_expired_chats()` via pg_cron).
- `privacy_requests`, `waitlist`: insert-only for anon/authed; trigger rate-limits per `ip_hash`.
- `/admin`: server-side gate on `app_metadata.role = admin`; service-role reads only after the gate; actions written to `admin_audit_log`.
- R2: `SCANS_BUCKET` → `sparkle-scans`, `VAULT_BUCKET` → `sparkle-vault` (private, ENAM). Vault gated by `feature_flags.vault_enabled = false`.

## 9. Corrections vs. original (v1.0)
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
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0002 | New §8 Data Model & Access Control (multi-tenant, can_view_student, helpers, guardian limits, waitlist); Next.js hosting = OpenNext; DEC-05 identity. |
| 1.2 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | §8.6 chat/legal/admin architecture; R2 bindings. |
