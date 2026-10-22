# Runbooks (Team E, launch readiness)

Runbooks are for *incidents*. SOPs are for *routine* work. Every runbook follows the same steps: detect, triage, mitigate, verify, then follow up with a post-incident review (SOP-05).

| ID | Runbook | Trigger (alert) |
|---|---|---|
| RB-01 | [API error spike / outage](RB-01-API-Errors.md) | 5xx > 1 % for 5 min, or `/health` failing in 2 regions |
| RB-02 | [Latency SLO burn](RB-02-Latency.md) | p95 > 2× SLO for 10 min, or fast burn (14.4×, 1 h) |
| RB-03 | [Supabase degraded / connection exhaustion](RB-03-Database.md) | `/health?deep=1` → `supabaseReachable=false`, or 503s |
| RB-04 | [AI provider outage / cost spike](RB-04-AI.md) | Router breaker open > 10 min, or budget alert |
| RB-05 | [Privacy or security incident (Sev-1)](RB-05-Privacy-Security.md) | Cross-family data exposure, leaked secret, vault anomaly |
| RB-06 | [Release rollback](RB-06-Rollback.md) | Any DEC-183 rollback trigger |

**Severity:** Sev-1 means a privacy exposure or a full outage. Sev-2 means a core flow is broken for many users. Sev-3 is degraded or partial. Sev-4 is cosmetic.
**Owner today:** Rolan (accountable), with Grok Bot on-call automation (responsible). No human on-call rota exists yet (R-35).
