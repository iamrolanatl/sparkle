# Launch Readiness Checklist (G5 entry; Team E, DEC-190)

This complements the [Cutover & Go-Live Runbook](Cutover-Go-Live-Runbook.md). Every item needs evidence (a link) before the G5 go/no-go.
Status: ☐ open · ◐ partial · ☑ done · ⛔ sponsor-gated

## Quality and reliability (CR-0007)
| # | Item | Evidence | Status |
|---|---|---|---|
| Q1 | Capacity model reviewed; `mix.js` run at ≥ 3 scales with extrapolation | tests/load/README.md, #63 | ◐ (harness only) |
| Q2 | Full-scale load window on paid tiers (≥ 25 % of design RPS) | k6 summary | ⛔ SA-16 + Supabase paid |
| Q3 | Crash reporting live; crash-free ≥ 99.9 % over 14 days of beta | Sentry release view | ⛔ SA-17 |
| Q4 | Error boundaries on root, routes and applets; no unhandled rejections in E2E | #10, Playwright | ◐ |
| Q5 | SLO dashboards and burn alerts configured | SLO-Dashboards.md | ☐ |
| Q6 | Runbooks RB-01..06 rehearsed once (tabletop) | Runbook README | ☐ |
| Q7 | Backup restore drill passed (SOP-11), PITR on | SOP-11 record | ⛔ paid tier |

## Security (OWASP ASVS L2; vault ASVS 5.0 L2, NFR-33)
| # | Item | Evidence | Status |
|---|---|---|---|
| S1 | CSP and security headers (static plus nonce on signed-in routes) | #27, #58 | ◐ |
| S2 | Cross-tenant RLS suite green; SECURITY DEFINER functions audited | supabase/tests, #64 | ◐ |
| S3 | Dependabot alerts at 0 high/critical; `pnpm audit` in CI | GitHub security tab | ◐ |
| S4 | Secret scanning / push protection | ⛔ GitHub Pro or public repo (sponsor) | ⛔ |
| S5 | Independent pen test; Critical/High fixed | report | ⛔ sponsor/vendor |
| S6 | Admin SSO + hardware MFA (FR-20) | config | ☐ |
| S7 | Vault launch gate LG-01..14 | Vault plan | ⛔ counsel |

## Accessibility (WCAG 2.2 AA, DEC-182)
| # | Item | Evidence | Status |
|---|---|---|---|
| A1 | axe at 0 violations on public pages (desktop and mobile) | #29 | ☑ (pending merge) |
| A2 | axe on signed-in flows (auth fixtures) | | ☐ |
| A3 | Manual keyboard and screen-reader pass (NVDA + VoiceOver) on core flows | | ☐ |
| A4 | Reduced-motion and contrast checks on neon effects and video | | ◐ |

## Product, legal, operations
| # | Item | Status |
|---|---|---|
| P1 | E2E covers sign-in, family invite, Today, tasks, import, scan review | ◐ |
| P2 | Privacy, Terms, COPPA/FERPA counsel sign-off (SA-19) | ⛔ |
| P3 | Production domain, DNS, OAuth consent verification (WBS 2.8/2.9) | ⛔ |
| P4 | Trademark clearance for "Sparkle" (DEC-40) | ⛔ |
| P5 | Rollback rehearsed (RB-06) | ☐ |
| P6 | Sponsor go/no-go recorded in the Decision Log | ⛔ |
