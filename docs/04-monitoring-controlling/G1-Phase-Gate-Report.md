# G1 Phase-Gate Report: Phase 1, Core Data & Identity

| Field | Value |
|---|---|
| Gate | G1 (Project Charter §Gates) |
| Date | 2026-10-22 |
| Prepared by | Team Integration (for Rolan Chowdhury, Sponsor) |
| Recommendation | **HOLD.** The engineering exit criteria are largely met. The gate is held for counsel review (SA-19) and the school-portal terms review (SA-D1). |

## 1. Exit criteria

| Criterion (Charter) | Status | Evidence |
|---|---|---|
| Google auth + invite | Met | Auth + invitations live on dev; RLS tests (`can_view_student`); E2E signed-in fixture (#74) |
| First connector | Partial | Desktop-agent ingest API #30 approved but **not merged** (CI blocked, §4). Agent core #47/#61 queued behind it. Portal use held for SA-D1 |
| Today doc precompute | Met | Today view + CSV import + queue/cron dispatcher live on dev |
| Security baseline | Met | CSP/OWASP headers (#27) live; student_age guard (#62); additive-only migration lint (SOP-15) |
| NFRs (CR-0007) | Partial | Lighthouse mobile is borderline (0.86–0.89 vs 0.90 gate, flaky). k6 capacity model #63 is still open |

## 2. Merged this cycle (CR-0010, one at a time, CI green)
#20 AI router · #19 weather (rebased) · #25 PWA · #73 shared OCR contract · #74 E2E session · #76 dev /health env label · #39 tasks migration · #50 tasks UI · #27 security headers · #45 OCR scan API (registers the `sparkle-scans-ocr` queue + `purgeScans` cron).

## 3. Database
| Migration | Dev (sparkle-dev) | Main (sparkle) |
|---|---|---|
| 20261022100000_a_tasks | Applied (backup + dry-run first) | Applied (backup + dry-run first) |
| 20261022130000_d_ingest_provenance | Not applied (#30 unmerged) | Not applied |
| Team B scans (#44), Team C vault (#38) | Not applied: waiting on fixes and sign-off | Not applied |

Backups: `/workspace/backups/20261022-pre39/` (on the build box, not in the repo).

## 4. Blockers
1. **GitHub Actions cannot run.** "Recent account payments have failed or your spending limit needs to be increased." No CI means no merges under CR-0010. **Sponsor action**, because it involves spending.
2. Lighthouse perf gate is flaky at 0.86–0.89. Team E owns a fix (or a CR to change the gate).
3. #65 is stacked on #40, which has a pending fix (`source_text`). #44 has a trigger fix pending. #38 conflicts and depends on #44. #53 (vaultDaily) is not yet approved, so vaultDaily is not wired. #69 and #71 have pending fixes.
4. Ingest queue/Durable Object bindings stay off until Workers Paid (SA-D2). The code falls back to inline processing.
5. `apps/api/wrangler.toml` `SUPABASE_URL` points to the **main** project, not sparkle-dev. Integration will move dev to sparkle-dev in a follow-up (DEC-82).

## 5. Held items (Sponsor / legal)
- SA-19 counsel review. SA-D1 portal-terms review. SA-A1 child-safety expert review.
- Paid items: Workers Paid ($5/mo), Apple Developer ($99/yr), Windows code-signing, GitHub Actions billing.

## 6. Decision
G1 = **HOLD** until SA-19 and SA-D1 close and CI is restored. Re-assess at the next Integration cycle.
