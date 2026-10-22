# Environments & Cost Guardrails

| Field | Value |
|---|---|
| Document ID | SPK-PLN-022 |
| Version | 1.0 (2026-10-21) |
| CR | CR-0006 |
| Owner | Rolan Chowdhury; maintained by Grok Bot |

## 1. Environments (DEC-41)
| Env | Supabase | Cloudflare | Status |
|---|---|---|---|
| prod | `sparkle` — ref `nklbdyezbsugkdvaidtt`, us-east-1, org `otmtfioutxkemtxjwktg` | Workers `sparkle` (+ R2 `sparkle-scans`, `sparkle-vault`) | Exists |
| dev | `sparkle-dev` (planned, same org/region, **Free tier only**) | Workers env `dev`, R2 `sparkle-dev-*` | **Not created** — see below |
| staging | Plan only (below) | Workers env `staging` | Not created |

**Why dev wasn't created (2026-10-21).** The access token on the box can see the `sparkle` project, but org endpoints (`GET /v1/organizations`, `/v1/organizations/{slug}`) return empty/403, so the org's plan and free-project count can't be verified. Per the rule "create only if verifiably free", nothing was created. Supabase pricing: Free plan allows **2 active free projects**; on a Pro org every extra project adds compute (~$10/month for Micro, partly offset by Pro's compute credit) — https://supabase.com/pricing , https://supabase.com/docs/guides/platform/billing-on-supabase .
**To unblock (SA-12):** either (a) Rolan opens the dashboard → org → *Billing* to confirm the plan is Free and creates `sparkle-dev` (us-east-1), or (b) issues an account-level token from the same account so Grok Bot can verify and create it. Afterwards: ref goes in `~/.sparkle/config.env` (`DEV_SUPABASE_REF`), keys in `~/.sparkle/keys-dev.json` (chmod 600), GitHub vars/secrets `DEV_SUPABASE_URL`, `DEV_SUPABASE_PUBLISHABLE_KEY`, `DEV_SUPABASE_SECRET_KEY`.

**Staging plan.** Preferred: **Supabase Branching** (preview branches per PR + a persistent `staging` branch) once the org is on Pro — each branch bills compute hourly while running. Alternative on Free: a third project is not possible within the 2-free-project limit, so staging stays a Workers `staging` env pointed at dev DB until Pro. Decision to buy Pro is a sponsor cost decision (not taken).

## 2. Repository security (DEC-44)
GitHub Free + private repo: **no branch protection/rulesets, required reviews, or secret-scanning push protection.** Enabled 2026-10-21: Dependabot alerts + automated security fixes. Compensating controls until GitHub Pro ($4/mo, SA-10): CI secret scan (gitleaks) on every PR, PR-only workflow by convention, CODEOWNERS file.

## 3. Cost guardrails (DEC-43)
| Provider | Current state | Action |
|---|---|---|
| **Cloudflare** | Budget alert policy "Default budget alert (auto-created)" — **enabled, $10 total spend, emails sponsor@example.com** (verified via API). Creating extra usage alerts via API failed: token `sparkle-ci` lacks *Notifications/Alerting: Edit*. | Dashboard: **Notifications → Add → Billing → "Usage Based Billing"** → product (Workers requests, R2 storage/ops, Workers AI neurons, Queues, D1) → threshold (~80% of included) → email sponsor@example.com → Save. Optional: lower budget alert to $5. Or add *Account › Notifications: Edit* to the token and Grok Bot will create them. |
| **Supabase** | Spend cap applies to Pro orgs; Free orgs can't incur overage. | Keep **Spend Cap ON** (Org → Billing → Cost Control). Never disable without a CR. |
| **xAI** | — | console.x.ai → Team → **Billing → set a monthly spending limit / use prepaid credits without auto-recharge**; add low-balance email alert. Suggested: $25/month until G3. |
| **Anthropic** | — | console.anthropic.com → **Settings → Limits → Spend limits** (monthly cap) + email notification thresholds; keep auto-reload off. Suggested: $25/month until G3. |
| App level | NFR-12 | Per-user AI budgets, 70/90% alerts, kill switches already required. |
No payment methods or plans were changed by Grok Bot.

## 4. Analytics & KPIs (DEC-42)
Privacy-respecting only: **Cloudflare Web Analytics** (cookieless) on the public site; product KPIs from first-party server events (Postgres `events` table, no third-party trackers, no session replay, no ad pixels anywhere; nothing on child-facing pages beyond first-party aggregate events). KPI set: activation (family sign-up → first student linked), weekly active families, Today-view opens, sync success rate, AI cost per active user, NPS. GPC honored; covered in Privacy & Cookie policies.

## 5. Weekly status (DEC-45)
Automated every **Friday ~4 PM ET**: written to `docs/04-monitoring-controlling/status/YYYY-MM-DD.md` and sent to Rolan in chat; includes CRs, RAID changes, Sponsor Action Items.
