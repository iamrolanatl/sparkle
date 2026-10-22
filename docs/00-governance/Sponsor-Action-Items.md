# Sponsor Action Items (Rolan)

| Field | Value |
|---|---|
| Document ID | SPK-GOV-010 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Active register (CR-0006) |
| Document Owner | Rolan Chowdhury (Sponsor / PM) |
| Last Updated | 2026-10-21 |

> **Purpose.** Tracked list of items that only Rolan can do or decide. Grok Bot reviews it in every weekly status report. Statuses: Open · In progress · Done · Dropped.

| ID | Item | Owner | Due | Status | Link |
|---|---|---|---|---|---|
| SA-01 | Hire an edtech/COPPA privacy lawyer; get vault & policy sign-off (LG-01) | Rolan | TBD | Open | [Vault Plan §8](../02-planning/Vault-Compliance-and-Security-Plan.md) |
| SA-02 | Approve the WISP and accept the Information Security Coordinator role | Rolan | TBD | Open | DEC-34 |
| SA-03 | Pick a pen-test firm, a consent card-check (payment) vendor, and an ID-check vendor | Rolan | TBD | Open | DEC-21, DEC-35 |
| SA-04 | Sign DPAs: Supabase, Cloudflare, xAI and Anthropic (no-training / zero-retention), Sentry | Rolan | TBD | Open | DEC-30 |
| SA-05 | Consider cyber-liability insurance | Rolan | TBD | Open | LG-14 |
| SA-06 | Merge PR #1 (PMP baseline), then PR #3 (vault compliance) | Rolan | TBD | Open | https://github.com/iamrolanatl/sparkle/pulls |
| SA-07 | Choose a production domain (after trademark direction, SA-11) | Rolan | TBD | Open | WBS 2.21 |
| SA-08 | Choose a go-live target month so gate dates can be set | Rolan | TBD | Open | WBS |
| SA-09 | Decide age threshold 13 vs 14 | Rolan | TBD | Open | DEC-04 |
| SA-10 | Decide on GitHub Pro ($4/mo) — on the Free plan a private repo can't use branch protection, required reviews, or secret-scanning push protection. Dependabot alerts + automated security fixes are already enabled (2026-10-21) | Rolan | TBD | Open | DEC-44, R-27 |
| SA-11 | Trademark direction | Rolan | 2026-10-21 | Decided — keep plain 'Sparkle' for now; revisit before SA-07 and public launch with counsel clearance | [Trademark notes](../02-planning/Trademark-Clearance-Notes.md), DEC-40, R-26 |
| SA-12 | `sparkle-dev` Supabase project — **created 2026-10-21** via connector after Rolan paused his other free project (ref `wqfzzfggyirvgaxfqcts`, us-east-1, Free, $0). Migrations + pg_cron applied; publishable key stored (`~/.sparkle/keys-dev.json`, GitHub `SUPABASE_PUBLISHABLE_KEY_DEV`, `SUPABASE_URL_DEV`). Cutover tracked in SA-20. | Rolan | 2026-10-21 | Done | [Environments](../02-planning/Environments-and-Cost-Guardrails.md) |
| SA-13 | Cloudflare alerts **done** via connector (DEC-67): budget alerts $1 (new) + $10 (default), usage alerts Workers requests ≥2.5M and KV reads ≥2.5M, emailed to sponsor@example.com. Workers AI/CPU product keys not accepted by API — add in dashboard if wanted. **Still open:** set AI spend limits in xAI and Anthropic consoles; confirm Supabase spend cap ON (Free plan has no overage billing). | Rolan | TBD | Partially done | [Cost guardrails](../02-planning/Environments-and-Cost-Guardrails.md) |
| SA-14 | Sign in once at https://sparkle-web.crystal-iamrolan.workers.dev/login with sponsor@example.com so I can grant admin (DEC-50) | Rolan | — | Open | DEC-50 |
| SA-15 | Before public launch: Supabase Pro ($25/mo) for PITR (RPO 5 min, NFR-40), no auto-pause, bigger pool | Rolan | Before G5 | Open | DEC-51 |
| SA-16 | Before public launch: Workers Paid ($5/mo) for CPU limits, Queues and Durable Objects (needed by Team D ingest #30 / SA-D2) and a full-scale load test window; capacity model shows the DB needs a paid Supabase tier plus the pooler (≈2.2k DB RPS at design load) | Rolan | Before G5 | Open | DEC-55, DEC-187 |
| SA-17 | Create a free Sentry account and share the DSN (via secret form) to switch on crash reporting. Web (`NEXT_PUBLIC_SENTRY_DSN`) and API (`SENTRY_DSN`) adapters are ready and do nothing until it's set | Rolan | Phase 1 | Open | DEC-54, D-10, DEC-184 |
| SA-18 | (Optional, later) choose a transactional email provider for invitation emails — free tiers exist; needs your OK to send email from the app | Rolan | Phase 2+ | Open | DEC-57 |
| SA-19 | Engage privacy counsel for the G1 entry review (FERPA/COPPA/GA SDPATA, DEC-04/06) and portal-ToS review for the desktop agent (WBS 2.10, 3.2) | Rolan | Before G1 | Open | DEC-63 |
| SA-20 | sparkle-dev cutover: connector can't read the **secret key** or set **Auth URL config**, and the CLI token is project-scoped. Either (a) in Supabase dashboard → sparkle-dev → API keys, create a secret key and add it to `~/.sparkle/keys-dev.json`/GitHub as `SUPABASE_SECRET_KEY_DEV`, and set Auth Site URL + redirect URLs as on the main project; or (b) issue an account-level access token. Then run `SPARKLE_SUPABASE_REF=wqfzzfggyirvgaxfqcts SPARKLE_KEYS=~/.sparkle/keys-dev.json scripts/deploy-dev.sh`. | Rolan | TBD | Open | [Environments](../02-planning/Environments-and-Cost-Guardrails.md) |
| SA-21 | Approve CR-0011: portal credentials on-device only, never sent to Sparkle (FR-03/NFR-05 wording) | Rolan | TBD | Open | [CR Register](Change-Request-Register.md) |
| SA-D1 | Counsel review of school-portal terms of use (StudentVue/Cobb first) before any real-portal adapter is built; prefer official APIs/agreements | Rolan + counsel | Before G2 | Open | DEC-161, R-05, D-06 |
| SA-D2 | Approve Cloudflare Workers Paid ($5/mo) for Queues (ingest burst buffering); until then ingest writes inline | Rolan | Before real sync | Open | DEC-164 |
| SA-D3 | Buy Apple Developer ($99/yr) + Windows code-signing certificate for the desktop agent installers | Rolan | Before G2 | Open | D-05, R-09 |
| SA-A1 | Have a child-safety / counsel expert review the crisis reply and the K-12 AI guardrail policy (DEC-102/103) before real students use the study helper | Rolan | Before G3 | Open | DEC-102 |
| SA-C1 | Choose and approve a verifiable-parental-consent vendor (card verification; ID + face-match fallback) and sign its DPA — paid; adapter is ready (DEC-154) | Rolan | Before vault launch gate | Open | DEC-21 |
| SA-C2 | Approve a vault pen-test vendor (DEC-35) — paid | Rolan | Before vault launch gate | Open | DEC-35 |

## Revision History
| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0006 | Created and seeded. |
