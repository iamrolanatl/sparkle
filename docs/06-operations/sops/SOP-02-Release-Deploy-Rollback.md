# SOP-02 — Release, Deploy & Rollback

| Field | Value |
|---|---|
| SOP ID | SOP-02 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Deploy the API worker and web app to Cloudflare in a controlled, reversible way.

## 2. Scope
`apps/api` (worker `sparkle-api`) and `apps/web` (worker `sparkle-web`, OpenNext). Desktop agent releases: TBD (Phase 1).

## 3. Roles
- **Approver:** Rolan (must approve every production deploy).
- **Operator:** Grok Bot or Rolan.

## 4. Prerequisites
- Change merged to `main` with green CI.
- GitHub secrets/vars set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_SECRET_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Any required DB migration already applied (SOP-03).

## 5. Procedure
1. Record the intended release in the Change Log (CR or "Release" entry) and get Rolan's approval.
2. **API:** GitHub → Actions → *Deploy API worker* → Run workflow → type `deploy`. The workflow runs tests, `wrangler deploy`, and sets `SUPABASE_SECRET_KEY` as a worker secret.
3. **Web:** currently manual: `cd apps/web && pnpm deploy` with the public Supabase vars set (CI workflow for web: TBD).
4. Tag the release: `git tag vX.Y.Z && git push --tags`; create GitHub Release notes from the changelog.
5. Staging environment: TBD (WBS 2.2.1). Until then, deploy to production only after local verification.

## 6. Verification
`curl https://sparkle-api.<subdomain>.workers.dev/health` → `status: ok`; load `/`, sign in, `/app`; check Cloudflare dashboard for errors in the first 15 min.

## 7. Rollback / Exception handling
`wrangler rollback` (API: `cd apps/api && pnpm exec wrangler rollback`; web: same in `apps/web`) to the previous version, or re-run the deploy from the previous tag. Turn off risky features with flags first (SOP-09). Log the rollback in the Change Log and RAID.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
