# RB-01: API error spike / outage
**Detect:** Cloudflare Workers analytics shows 5xx > 1 % for 5 min (DEC-183), a synthetic `/health` check fails, or the crash reporter (DEC-184) shows a new spike.
1. **Triage (5 min).** Check `wrangler tail sparkle-api --format json` for `level:error` lines, read the `X-Request-Id` of a failing request, and look at the last deploy time (`wrangler deployments list`).
2. **If a deploy happened in the last 2 h,** roll back first and diagnose afterwards (RB-06).
3. **If no deploy happened,** check `/health?deep=1`. If `supabaseReachable=false`, go to RB-03. If AI routes are failing, go to RB-04.
4. **Mitigate:** flip the affected feature flag off (`feature_flags`). The kill switches for chat and the vault fail closed.
5. **Verify:** 5xx stays under 0.1 % for 15 min and `/health` is green.
6. **Follow-up:** write a post-incident note in the RAID register, and add a regression test.
