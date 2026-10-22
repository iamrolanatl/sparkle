# Definition-of-Done Re-check: PRs #1–#25 (Team E, 2026-10-21 ET)

**Method:**
- An automated scan of each PR for: an FR/CR/WBS/DEC reference in the title, test files, docs changes, a "not done" statement, and a recorded review.
- A database privilege audit: all migrations applied in PGlite, then a check of RLS, policies, grants and SECURITY DEFINER execute rights.
- Manual code review of every open PR (#19–#26), plus spot checks of merged code.

## Summary
| Check | Result |
|---|---|
| RLS enabled on every `public` table (26/26) | ✅ |
| Anon has no SELECT on any table | ✅ |
| SECURITY DEFINER functions executable by anon | Only trigger functions (`privacy_requests_guard`, `waitlist_rate_limit`), which is OK |
| SECURITY DEFINER functions executable by authenticated without a caller check | ❌ `student_age()` / `student_at_or_over_threshold()` leak a child's age across families. **Fix: #64 (DEC-188)** |
| Review recorded (SOP-14) on merged #1–#18 | ✅ (retroactive Integration reviews) |
| Review on open #19–#26 | ✅ Team E reviews posted |
| FR/CR/WBS/DEC reference in title | 17/18 merged (#5 is a deps fix, which is acceptable) |
| "Not done" statement in PR body (DoD) | ❌ Missing on 14 of the 18 merged PRs. A process gap, so the PR template from #28 adds it |
| Docs updated with code (RTM / Feature Register / WBS) | ◐ Code PRs #8–#18 changed no docs. WBS status was caught up later in #16 |
| Tests with code changes | ◐ #14 (admin sync health) has no tests. Follow-up issue below |

## Per-PR findings (merged)
| PR | Gap | Severity | Follow-up |
|---|---|---|---|
| #2 | `student_age()` has no caller check (found in the audit) | Medium (children's data) | #64 |
| #5 | No FR/CR reference (deps hygiene) | Info | none |
| #8–#13, #15, #17, #18 | No "not done" line; RTM / Feature Register not updated in the same PR | Low | PR template (#28); RTM catch-up by Integration |
| #14 | No tests for `/admin/sync`. It reads via the service role (`adminDb`), so the admin gate is the only control | Medium | Issue: add an E2E proving non-admins get 404 |
| #10 | Crash reporter on web only; API had none | Low | #56 (DEC-184) |
| #9 | `capacity.js` only exercised `/health` | Low | #63 (DEC-187) |

## Open PRs #19–#26 (reviews posted)
| PR | Verdict | Key issue |
|---|---|---|
| #19 weather | Changes requested | Unauthenticated: can exhaust the shared KV write quota (Today cache) |
| #20 AI router | Changes requested | Double spend when the budget write fails; output filter not enforced |
| #21 docs | Approve | none |
| #22 CSV upload | Approve, notes | No Idempotency-Key sent |
| #23 Today view | Approve | none |
| #24 deploy script | Approve, nit | Python path interpolation; no `pipefail` |
| #25 PWA | Changes requested | The service worker caches mp4 Range (206) responses: `cache.put` rejects, so video breaks |
| #26 docs | Approve | Reviews filename convention |
