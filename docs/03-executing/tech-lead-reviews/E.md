# Tech Lead Review: Team E (Quality and Launch Readiness, Phases 3-5)

## 2026-10-21 22:45 ET (start of lane)
**Docs reviewed:** Requirements Baseline (FRs, NFR-11, NFR-33, NFR-35..48), Scalability-Reliability Plan, TDD §8, Design System (CR-0008), WBS, Decision Log (to DEC-69), RAID (to R-32), SOP library, Definition of Done, Test Strategy, Cutover/Go-Live Runbook, Vault Compliance Plan.

| # | Gap | Type | Action |
|---|---|---|---|
| 1 | NFR-11 still says WCAG level "TBD (Rolan)", but the Accessibility Statement (FR-18) and DoD already target WCAG 2.2 AA | Contradiction | DEC-182 sets WCAG 2.2 AA as the baseline; NFR-11 fix is with Integration (Lane 2 baseline doc) — issue `docs-gap` |
| 2 | Go-Live Runbook rollback error-rate threshold "TBD (Eng Lead)" | Ambiguous | DEC-183 proposes: roll back if 5xx > 1 % for 5 min, p95 > 2x SLO for 10 min, or any Sev-1 privacy issue |
| 3 | WBS 2.3 says observability "Not started", while 2.13 says crash reporter done (PR #10/#11) | Stale | Flagged to Integration (WBS is shared); reality: reporter is a no-op until Sentry DSN (SA) |
| 4 | Test Strategy device matrix "TBD (Eng Lead)" | Ambiguous | Team E uses Playwright Desktop Chrome + Pixel 7 as the reference matrix until a real-device lab exists |
| 5 | CSP / ASVS headers not specified for web | Gap | DEC-180, PR #27 |
| 6 | Automated a11y not in CI | Gap | DEC-181, PR #29 |
| 7 | Nonce-based CSP missing (script-src allows 'unsafe-inline') | Residual risk | Proposed RAID R-E1, follow-up PR |

**Interface changes:** PR #27 adds a CSP. Any team that adds a new browser-side origin (fetch, image or script) must add it to `apps/web/src/lib/security-headers.ts`. This is announced in an `interface-change` issue.

**Reviews given (SOP-14):** #30 (Team D ingest), with changes requested: data loss when a write fails after admission, scores dropped, student self-ingest integrity, TDD heading placement. #28 (Integration safeguards): approved with follow-ups, mainly that authz function replacements bypass the migration lint.

## 2026-10-21 23:30 ET (milestone: lane cycle 2)
**Reviews given (SOP-14):**
- #38 vault schema: changes requested. `vault_log` is executable by any user (audit forgery); DEK, household and r2-key references aren't checked against the student's household; the client sets `is_sample`.
- #39 tasks: changes requested. DEC-06 is bypassed on writes; the migration timestamp collides with #38 and #44.
- #44 scans: changes requested. DEC-06 is bypassed on select; `client_text` is trusted as already redacted.
- #40 tasks API: changes requested. `source_text` skips the safety screen; POST isn't idempotent.
- #45 OCR: changes requested. A 10 MB array spread can run the Worker out of memory; the sensitive check is skipped when OCR runs on the server.
- #53 vault API: changes requested. Service-role key operations run before authorization; decryption uses the latest key instead of the document's `dek_id`; the uploader can pick a class that skips encryption; purge can leave data behind.
- #47 desktop agent: small changes. Pin the credential origin.
- #50 tasks UI: small changes. The review gate is cosmetic.
- #55: approved.
- #19 and #20: changes requested. #19 can exhaust the KV write quota; #20 can double-spend when the budget write fails.
- #25: changes requested. Caching 206 video responses breaks the service worker.
- #21, #22, #23, #24 and #26: approved.

**Docs reviewed again:** DoD, SOP-14/15, Sponsor Action Items, RAID. The new gaps are recorded in the DoD re-check (PR #68) and issue #67.
