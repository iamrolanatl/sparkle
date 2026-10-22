# SOP-06 — AI Operations — Budgets, Kill Switches & Chat Monitoring

| Field | Value |
|---|---|
| SOP ID | SOP-06 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Keep AI features safe, accurate and within budget.

## 2. Scope
Public sales/support chat (FR-19) now; Sparkle AI router tiers (Phase 3) later.

## 3. Roles
- **Owner:** Rolan.
- **Monitor:** Grok Bot / Rolan using `/admin/chat`.

## 4. Prerequisites
Admin role on your account; AI Gateway `sparkle-gateway` created.

## 5. Procedure
1. **Daily:** open `/admin/chat`: check live sessions, tokens today vs `daily_token_budget`, error rate.
2. **Flagged review:** filter *Flagged*; read each transcript (viewing is audit-logged). Classify: false positive / knowledge gap / unsafe answer / abuse.
3. Knowledge gap → update `apps/api/src/chat/knowledge.ts` via PR (SOP-01). Unsafe answer → Sev-2 (Sev-1 if crisis handling failed) per SOP-05.
4. **Budget:** chat stops automatically at the daily budget. Change the budget by updating `feature_flags.config.daily_token_budget` (service role / SQL editor), logged in Change Log.
5. **Kill switch:** `/admin/chat` → *Turn chat off* (audited). Use for abuse, cost spikes, or unsafe output.
6. **Weekly:** review AI Gateway analytics (cost, latency, errors); report in the weekly status.
7. Router tiers (Grok/Claude) budgets and circuit breakers: TBD (Phase 3).

## 6. Verification
Status report shows spend < budget and no unreviewed flagged sessions older than 24 h.

## 7. Rollback / Exception handling
Turn chat off; revert knowledge/prompt change via PR; re-enable only after Rolan approves.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
