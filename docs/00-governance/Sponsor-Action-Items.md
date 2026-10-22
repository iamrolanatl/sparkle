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
| SA-12 | Approve creating `sparkle-dev` Supabase project (free tier) — token couldn't confirm org plan; create in dashboard or issue an account-level token | Rolan | TBD | Open | [Environments](../02-planning/Environments-and-Cost-Guardrails.md) |
| SA-13 | Set AI spend limits in xAI and Anthropic consoles; confirm Supabase spend cap ON; add Cloudflare usage alerts (or grant token "Notifications: Edit") | Rolan | TBD | Open | [Cost guardrails](../02-planning/Environments-and-Cost-Guardrails.md) |
| SA-14 | Sign in once at https://sparkle-web.crystal-iamrolan.workers.dev/login with iamrolan@gmail.com so I can grant admin (DEC-50) | Rolan | — | Open | DEC-50 |
| SA-15 | Before public launch: Supabase Pro ($25/mo) for PITR (RPO 5 min, NFR-40), no auto-pause, bigger pool | Rolan | Before G5 | Open | DEC-51 |
| SA-16 | Before public launch: Workers Paid ($5/mo) for CPU limits/Queues headroom and a full-scale load test window | Rolan | Before G5 | Open | DEC-55 |
| SA-17 | Create a free Sentry account and share the DSN (via secret form) to switch on crash reporting | Rolan | Phase 1 | Open | DEC-54, D-10 |
| SA-18 | (Optional, later) choose a transactional email provider for invitation emails — free tiers exist; needs your OK to send email from the app | Rolan | Phase 2+ | Open | DEC-57 |
| SA-19 | Engage privacy counsel for the G1 entry review (FERPA/COPPA/GA SDPATA, DEC-04/06) and portal-ToS review for the desktop agent (WBS 2.10, 3.2) | Rolan | Before G1 | Open | DEC-63 |
| SA-C1 | Choose and approve a verifiable-parental-consent vendor (card verification; ID + face-match fallback) and sign its DPA — paid; adapter is ready (DEC-154) | Rolan | Before vault launch gate | Open | DEC-21 |
| SA-C2 | Approve a vault pen-test vendor (DEC-35) — paid | Rolan | Before vault launch gate | Open | DEC-35 |

## Revision History
| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0006 | Created and seeded. |
