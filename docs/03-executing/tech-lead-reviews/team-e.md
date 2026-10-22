# Tech Lead Review: Team E (Quality and Launch Readiness, Phases 3-5)

## 2026-10-21 (start of lane)
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
