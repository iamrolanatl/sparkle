# RB-06: Release rollback (DEC-183)
**Triggers (any one):** 5xx > 1 % for 5 min, p95 > 2× SLO for 10 min, or any Sev-1 privacy issue.
1. **API:** `cd apps/api && npx wrangler rollback` to the previous version (or use `wrangler versions deploy` for a gradual rollback).
2. **Web:** redeploy the previous OpenNext build (`wrangler rollback` on `sparkle-web`).
3. **Database:** migrations are additive (SOP-15), so code rollback is safe without a DB rollback. If a migration itself is at fault, apply its `-- rollback:` note as a **new** additive migration through Integration.
4. **Verify:** the smoke tests (`tests/load/smoke.js` against dev, plus the Playwright smoke) pass.
5. Record the rollback in the Change Log, and the incident in the RAID register.
