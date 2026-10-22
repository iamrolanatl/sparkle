# SLO Dashboards and Alerts (NFR-36..39, NFR-44; Team E, DEC-189)

All of these run on free tiers. No paid observability is assumed. Panels are defined here so they can be rebuilt in Cloudflare and Supabase dashboards, and later in Grafana Cloud Free if Rolan approves.

| SLO | Target | SLI (how measured) | Source | Panel |
|---|---|---|---|---|
| Availability (NFR-36) | 99.9 % / 30 d | 1 − (5xx ÷ all requests), API and web Workers | Workers Analytics (GraphQL `workersInvocationsAdaptive`) | Error rate, 5 min and 30 d windows |
| Latency, cached read (NFR-38) | p95 ≤ 200 ms, p99 ≤ 500 ms | Wall time by route (`/students/:id/today`) | Workers Analytics, `observe` logs | p95/p99 by route |
| Latency, DB write | p95 ≤ 400 ms | POST routes | same | p95 by route |
| Crash-free sessions (NFR-37) | ≥ 99.9 % | 1 − sessions with ≥ 1 crash event ÷ sessions | Sentry Releases (SA-17), once a DSN exists; until then, `onError` counts in logs | Crash-free % by release |
| DB health | p95 query < 100 ms; connections < 70 % | Supabase Reports | Supabase dashboard | Query p95, connections |
| AI budget | < 80 % of the daily cap | `aibudget:*` KV counters, AI Gateway | AI Gateway analytics | Tokens/day by tier |
| Synthetic | 100 % | `/health?deep=1` every 5 min from 2 regions | Cloudflare Health Checks (Free, where available), or a GitHub Actions cron | Uptime |

## Error-budget alerts (multi-window burn rate)
| Alert | Condition | Action |
|---|---|---|
| Fast burn (page) | Burn > 14.4× over 1 h **and** over 5 min | RB-01 / RB-06 |
| Slow burn (ticket) | Burn > 6× over 6 h | RB-02 |
| Budget policy (NFR-39) | 50 % of the 30-day budget used within 7 days | Feature freeze; Rolan informed |

Delivery is email to Rolan through Cloudflare Notifications. That's already used for cost alerts and is configured by Integration with Rolan's approval. No Slack or SMS without approval.

## Gaps
- Crash-free sessions can't be measured until SA-17 (a free Sentry DSN) is done. The adapters are ready and do nothing until then (DEC-184).
- Cloudflare Health Checks may need a zone on a production domain (SA, domain TBD). Interim: a GitHub Actions scheduled synthetic check (to be proposed by Team E).
