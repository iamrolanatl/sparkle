# SOP-04 — Secrets & Access Management

| Field | Value |
|---|---|
| SOP ID | SOP-04 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Control where secrets live, who can use them, and how they are rotated and revoked.

## 2. Scope
Supabase, Cloudflare, Google Cloud (`sparkle-app-2566`), GitHub, AI provider keys (xAI/Anthropic — not yet issued).

## 3. Roles
- **Owner of all accounts:** Rolan.
- **Custodian:** Grok Bot (uses secrets only via env/tools; never prints or commits them).

## 4. Prerequisites
Inventory below kept current.

## 5. Procedure
**Where secrets live**
| Secret | GitHub Actions | Box (`~/.sparkle/config.env`, `keys.json`, env) | Cloudflare | Notes |
|---|---|---|---|---|
| `SUPABASE_SECRET_KEY` | secret | yes | worker secret (`sparkle-api`) | service role — server only |
| `SUPABASE_ACCESS_TOKEN` | secret | yes | — | CLI / migrations |
| `CLOUDFLARE_API_TOKEN` | secret | yes | — | scoped token |
| `GOOGLE_OAUTH_CLIENT_SECRET` | secret | — | — | also in Supabase Auth provider settings |
| Public: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_REF`, `CLOUDFLARE_ACCOUNT_ID`, `GOOGLE_OAUTH_CLIENT_ID`, `GCP_PROJECT_ID` | variables | yes | vars | not secret |

1. Never commit secrets; only names in `.env.example`. CI secret-scan: TBD.
2. **Rotation:** every **90 days** and immediately on staff/agent change or suspected exposure. Order: create new → update GitHub secret (`gh secret set`) → update box env → update Cloudflare (`wrangler secret put`) / Supabase → redeploy → revoke old.
3. **Grant access:** least privilege, named accounts, scoped tokens; record grant in RAID/Change Log.
4. **Revocation:** revoke tokens in each provider dashboard, remove GitHub collaborator, rotate shared secrets.
5. Admin app role (`app_metadata.role=admin`) granted only by Rolan; review quarterly.

## 6. Verification
Next rotation date recorded in the Change Log; `gh secret list` matches inventory; old tokens show revoked.

## 7. Rollback / Exception handling
If a rotation breaks a deploy, restore the previous secret only if it was not compromised; otherwise fix forward. Exposure → SOP-05 incident.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
