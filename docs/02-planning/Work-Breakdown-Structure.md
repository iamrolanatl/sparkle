# Work Breakdown Structure — MVP

| Field | Value |
|---|---|
| Document ID | SPK-PLN-004 |
| Project | Sparkle — Student Success Platform |
| Version | 1.4 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Work Breakdown Structure (01M5GCZRQDWWN9EC6SFSEKHJA9.docx) |

> **Purpose.** Deliverable-oriented decomposition of MVP scope into phases and work packages; detailed tasks are decomposed in sprint planning.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## Resourcing reality (as of 2026-10-21)
Rolan Chowdhury is Sponsor and currently holds **every** project role (PO, Eng Lead, Design, Ops, Compliance). Grok Bot performs build and PM work via `gh` on its own computer, with Rolan's approval at each gate (PR merge = approval). There is **no human engineering, design, or legal staff yet**; items needing them are marked *Blocked* or carry a dependency. All dates TBD.

## WBS
| WBS | Element | Gate | Status | Notes / Dependency |
|---|---|---|---|---|
| 1.0 | **Project Management** — charter, plans, CR control, status, RAID, gates | All | In progress | Docs baseline done (PR #1, awaiting sponsor merge); CR-0002 in PR for Phase 0 |
| 1.1 | SOP library creation & upkeep (`docs/06-operations/sops/`) | All | In progress | SOP-01..12 drafted (CR-0003); reviewed at every gate and on process change |
| 1.2 | Definition of Done + ADR template | All | Done | `docs/00-governance/` (CR-0003) |
| 1.3 | Automated weekly status report (Fridays ~4 PM ET) — DEC-45 *(in place)* |  | In place | CR-0006 |
| 2.0 | **Phase 0 — Foundation** | G0 | In progress | |
| 2.1 | Architecture runway, ADRs, scale-trigger values | | In progress | Data model & access control (TDD §8) done in CR-0002; scale-trigger numbers TBD |
| 2.2 | Repo, CI/CD, environments, secrets | | In progress | Dev deployed 2026-10-21 via `scripts/deploy-dev.sh` (DEC-46, DEC-48); GitHub Actions secrets/vars set; Supabase prod project `nklbdyezbsugkdvaidtt` exists; CI + manual API deploy workflow in CR-0002 |
| 2.2.1 | Separate dev/staging Supabase projects | | Not started | Needs Rolan to create projects (free tier limits) |
| 2.2.2 | Branch protection on `main` | | Not started | Rolan to enable once CI is green |
| 2.3 | Feature flags + observability baseline | | Not started | Needs Sentry account (2.11) |
| 2.4 | Design system: glass, neon, light/dark, responsive, a11y, FPS-guarded aurora | | In progress | `packages/ui` in CR-0002 |
| 2.4.1 | Neon glass windows, cursor glow, magnetic buttons, tilt cards (CR-0008) | | Done | PR #10 |
| 2.4.2 | Seamless VideoBackground (CR-0008) | | Done | PR #10 |
| 2.4.3 | Applets framework (isolated, lazy, skeleton) (CR-0008) | | Done | PR #10; DEC-58 |
| 2.4.4 | Playwright E2E + visual tests; Lighthouse CI budget (CR-0008) | | Done | PR #10; DEC-56, DEC-59 |
| 2.5 | Sparkle character states | | In progress | **Placeholder only** (`packages/sparkle-character`, Rive integration point stubbed). Production full-body Rive character needs an illustrator/animator — who/how TBD (D-03, R-11) |
| 2.6 | Access and tooling | | Done | Supabase token; Google auth enabled in Supabase; GCP project `sparkle-app-2566` with OAuth Web client (web + mobile via Supabase, DEC-05); Cloudflare token verified; Rolan's Windows laptop: git, node, gh, gcloud, wrangler, supabase CLI |
| 2.6.1 | Enable Cloudflare R2 | | Done | Enabled 2026-10-21; private buckets `sparkle-scans`, `sparkle-vault` (ENAM, no public access); bound as SCANS_BUCKET / VAULT_BUCKET in `apps/api` (CR-0003) — I-03 closed |
| 2.7 | Landing page and sign-up (FR-17) | | In progress | Crystal-style cockpit redesign, "coming soon" cards for FR-21..24 (CR-0003/4); depends on 2.8 domain and 2.10 legal text before public launch |
| 2.7.1 | Legal/compliance pages + cookie consent + privacy requests/GPC (FR-18) | | In progress | Drafts; **all policy text needs legal review** (R-14) |
| 2.7.2 | Sales & support chat (FR-19) | | In progress | Live on dev workers.dev (DEC-47, DEC-48); gateway created |
| 2.7.3 | Admin chat monitoring + privacy queue (FR-20) — partial 6.4 pulled into Phase 0/1 | | In progress | SSO + hardware MFA TODO before launch |
| 2.8 | Production domain + DNS (Cloudflare) | | Not started | Domain name TBD (Rolan) |
| 2.9 | Google OAuth consent screen verification / publishing | | Not started | Required before public launch; needs domain, privacy policy URL |
| 2.10 | Privacy & legal review — FERPA/COPPA/state law, Privacy Policy, Terms, DEC-06 | | Not started | **G1 entry criterion** (moved earlier from Phase 5). Needs counsel (none engaged) |
| 2.11 | Sentry account + DSN | | Not started | Rolan |
| 2.12 | Update landing page features & marketing content | | Recurring | At each gate, per [Communications & Marketing Plan](Communications-Marketing-Plan.md) |
| 2.13 | Enterprise reliability baseline: error boundaries, crash reporter, resilience lib (CR-0007) | | Done | PR #10, #11 |
| 2.14 | RLS performance migration + indexes (CR-0007) | | Done | PR #8 |
| 2.15 | k6 load tests in CI + capacity model (CR-0007) | | Done | PR #9; dev capacity smoke 50 VUs: p95 22 ms, 0/5,594 errors |
| 2.16 | Repo hygiene gates: knip, Prettier, PR title, CODEOWNERS, branch auto-delete (CR-0007) | | Done | PR #9; branch auto-delete on |
| 2.17 | Observability & alerting baseline (CR-0007) | | In progress | Request-id logs, deep health (PR #11); alerts need SA-13 |
| 2.18 | Canary / rollback via gradual deployments (CR-0007) | | In progress | SOP-02 update pending |
| 2.19 | Idempotency, rate limits, caching middleware (CR-0007) | | Done | PR #11, #13 |
| 2.20 | Trademark clearance (knock-out done; counsel full search & filing) — DEC-40 |  | Not started | CR-0006 |
| 2.21 | Production domain purchase + DNS (after brand decision) |  | Not started | CR-0006 |
| 2.22 | Separate dev Supabase project; staging via Branching or Workers env — DEC-41 |  | Not started | CR-0006 |
| 2.23 | Repo security: Dependabot (done), gitleaks CI, CODEOWNERS; branch protection if GitHub Pro — DEC-44 |  | Not started | CR-0006 |
| 2.24 | Cost alerts & budgets: Cloudflare, Supabase, xAI, Anthropic — DEC-43 |  | Not started | CR-0006 |
| 2.25 | Privacy-respecting analytics + KPI instrumentation — DEC-42 |  | Not started | CR-0006 |
| 3.0 | **Phase 1 — Core Data & Identity** | G1 | Not started | Entry: 2.10 complete |
| 3.1 | Google auth + family/helper invitations + sharing/RLS | | In progress | Schema + RLS (CR-0002) + UI PR #12 |
| 3.2 | Desktop agent skeleton (Tauri) + first connector (StudentVue) | | Blocked | **Gated** by legal/ToS review of automated access to StudentVue/Cobb portals (R-05); needs Apple + Windows code-signing certificates (D-05) |
| 3.3 | Web fallback: manual upload | | In progress | CSV import API PR #13; upload UI next |
| 3.4 | Normalized data model + Today doc precompute | | In progress | Today doc API + KV PR #13 |
| 3.5 | Admin basic sync health | | In progress | PR #14 |
| 3.6 | Explicit-confirmation framework for outbound comms | | In progress | PR #15 |
| 3.7 | Update landing page features & marketing content | | Recurring | At G1 |
| 4.0 | **Phase 2 — Student Experience** | G2 | Not started | |
| 4.1 | Today view + statuses + "What changed" + focus mode | | Not started | |
| 4.2 | Classes + unit workspace | | Not started | |
| 4.3 | GPA engine + simulator | | Not started | |
| 4.4 | Student daily input | | Not started | `daily_notes` table in CR-0002 |
| 4.5 | Additional connectors | | Not started | Same gating as 3.2 |
| 4.6 | Mobile delivery: responsive web / PWA | | In progress | MVP = responsive web/PWA; native apps out of MVP unless a CR adds them |
| 4.7 | Update landing page features & marketing content | | Recurring | At G2 |
| 4.8 | Natural-language tasks (FR-21) | | Not started | CR-0004 |
| 4.9 | School-day weather (FR-22) | | Not started | Weather provider TBD (cost/terms) |
| 4.10 | OCR scanning (FR-23) | Team B | In progress | API pipeline + `scans` table in review (DEC-120..126); next: web camera/upload + on-device OCR + review UI; 30-day purge cron |
| 5.0 | **Phase 3 — Sparkle & AI** | G3 | Not started | |
| 5.1 | Rive integration + personality states | | Not started | Depends on animator (2.5) |
| 5.2 | AI router, budgets, circuit breakers, citations | | Not started | Needs xAI + Anthropic API keys (D-02) |
| 5.2.1 | Tier 1 model selection (Workers AI vs Ollama-class) | | Not started | |
| 5.3 | Voice pipeline with text fallback | | Not started | |
| 5.4 | Crisis protocol, hide/mute, coach-mode guardrails | | Not started | Crisis content needs counsel/expert |
| 5.5 | Update landing page features & marketing content | | Recurring | At G3 |
| 6.0 | **Phase 4 — Supporting Features & Admin** | G4 | Not started | |
| 6.1 | Shared shopping list | | Not started | households/shopping_items in schema |
| 6.2 | Communication hub + AI drafts | | Not started | |
| 6.3 | Calendar / bell schedule digitization | | Not started | |
| 6.4 | Full admin console | | Not started | view-as stubbed (audited); chat-monitoring + privacy-queue slice delivered early as 2.7.3 |
| 6.5 | Update landing page features & marketing content | | Recurring | At G4 |
| 6.6 | School mail vault (FR-24) incl. OCR acceptance | | Not started | Gated: legal + security review (R-16); flag `vault_enabled=false`; R2 `sparkle-vault` ready |
| 6.7 | OCR for calendar / bell schedules (FR-23 → FR-13) | | Not started | |
| 6.7.1 | Write & approve WISP (NIST CSF 2.0 + Privacy Framework); first risk assessment |  | Not started | CR-0006 |
| 6.7.2 | VPC consent flow (card verification + ID/face fallback) + consent receipts |  | Not started | CR-0006 |
| 6.7.3 | Minimization detectors, auto-redaction, sensitivity classifier |  | Not started | CR-0006 |
| 6.7.4 | Envelope encryption, key rotation, crypto-shred; Worker download proxy |  | Not started | CR-0006 |
| 6.7.5 | Vault RLS + access log + break-glass view-as |  | Not started | CR-0006 |
| 6.7.6 | Retention/purge jobs (30/60-day, inactivity, age-18 transfer) |  | Not started | CR-0006 |
| 6.7.7 | Incident runbook, notification templates, tabletop |  | Not started | CR-0006 |
| 6.7.8 | Subprocessor DPAs + public subprocessor page |  | Not started | CR-0006 |
| 6.7.9 | Privacy Policy vault section + retention schedule (Plan §9) |  | Not started | CR-0006 |
| 6.8 | **Mail vault compliance & security (CR-0005)** — vault stays behind `vault_enabled` until launch gate | G4/G5 | Not started | DEC-37 |
| 6.8.1 | Write & approve WISP (NIST CSF 2.0 + Privacy Framework); first risk assessment |  | Not started | CR-0005 |
| 6.8.2 | VPC consent flow (card verification + ID/face fallback) + consent receipts |  | Not started | CR-0005 |
| 6.8.3 | Minimization detectors, auto-redaction, sensitivity classifier |  | Not started | CR-0005 |
| 6.8.4 | Envelope encryption, key rotation, crypto-shred; Worker download proxy |  | Not started | CR-0005 |
| 6.8.5 | Vault RLS + access log + break-glass view-as |  | Not started | CR-0005 |
| 6.8.6 | Retention/purge jobs (30/60-day, inactivity, age-18 transfer) |  | Not started | CR-0005 |
| 6.8.7 | Incident runbook, notification templates, tabletop |  | Not started | CR-0005 |
| 6.8.8 | Subprocessor DPAs + public subprocessor page |  | Not started | CR-0005 |
| 6.8.9 | Privacy Policy vault section + retention schedule (Plan §9) |  | Not started | CR-0005 |
| 7.0 | **Phase 5 — Hardening & Go-Live** | G5 | Not started | |
| 7.1 | Performance & resilience testing | | Not started | |
| 7.2 | UAT, security & privacy re-review | | Not started | |
| 7.3 | Runbooks, training, staged rollout | | Not started | |
| 7.4 | Update landing page for launch | | Recurring | Needs 2.8, 2.9, 2.10 |
| 7.5 | Third-party penetration test (vault, RLS, auth, R2, view-as) + remediation/retest |  | Not started | CR-0005 |
| 7.6 | Privacy counsel sign-off (LG-01) and vault launch-gate review (LG-01..14) |  | Not started | CR-0005 |
| 8.0 | **Closing** | | Not started | |

## WBS Dictionary
Each work package's acceptance = linked requirement acceptance + sprint Definition of Done ([Product Backlog](Product-Backlog.md)). Owner for all packages today: Rolan (accountable) with Grok Bot (responsible for build/docs) — no other staff. Estimates and dates TBD.

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
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0002 | Added Status and Notes/Dependency columns; reflected actual progress; added 2.2.x, 2.6–2.12, recurring landing-page updates per phase, mobile=PWA, legal gating of 3.2, privacy review as G1 entry; resourcing reality. |
| 1.2 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003, CR-0004 | Added 1.1 SOP library, 1.2 DoD/ADR template; R2 done (I-03 closed); 2.7.1–2.7.3 (legal, chat, admin slice); CR-0004 elements 4.8–4.10, 6.6, 6.7. |
| 1.3 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0005 | Added 6.8.x vault compliance (renumbered from 6.7.x on rebase), sorted rows, 7.5 pen test, 7.6 counsel sign-off/launch gate. |
| 1.4 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0006 | Added 2.20–2.25 and 1.1 (CR-0006). |
