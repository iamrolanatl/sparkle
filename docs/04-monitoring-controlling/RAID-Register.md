# RAID Register — Risks, Assumptions, Issues, Dependencies

| Field | Value |
|---|---|
| Document ID | SPK-MC-001 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | RAID Register (01M5GCZSY9EJ7Q070TY62K5S1A.docx) |

> **Purpose.** Living register of risks, assumptions, issues, and dependencies; reviewed weekly. Probability/Impact on a 1–5 scale; Score = P×I.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## Risks
| ID | Risk | P | I | Score | Response | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| R-01 | School platform schema changes break sync | 4 | 4 | 16 | Mitigate | Platform Profiles, drift alerts, human review queue, web fallback | Eng Lead | Open |
| R-02 | AI cost overrun or provider outage | 3 | 4 | 12 | Mitigate | Per-user budgets, 70/90% alerts, circuit breakers, tier fallback, kill switches | AI/Platform | Open |
| R-03 | Credential handling incident | 2 | 5 | 10 | Avoid/Mitigate | Device-default storage, minimal central secrets, audit, counsel review | Eng Lead | Open |
| R-04 | Performance regression from glass/robot effects | 3 | 3 | 9 | Mitigate | FPS budgets, auto-disable, flags, synthetics | Design/Eng | Open |
| R-05 *(new)* | Automated access to school portals may conflict with district/vendor terms of use | 3 | 5 | 15 | Mitigate | Legal review; prefer official integrations; obtain agreements (A-01) | Sponsor/Counsel | Open |
| R-06 *(new)* | Student-privacy regulatory non-compliance (minors' data; FERPA/COPPA/state law applicability unassessed) | 3 | 5 | 15 | Mitigate | Counsel assessment before Phase 1 handles real data | Counsel | Open |
| R-07 *(new)* | Unsafe robot response to a student in crisis | 2 | 5 | 10 | Mitigate | Crisis protocol FR-14, safety eval set, Sev-1 classification | AI/Platform | Open |
| R-08 *(new)* | Key-person / staffing gap (most roles TBD) | 4 | 4 | 16 | Mitigate | Staff roles; document everything in repo; Grok Bot assists | Sponsor | Open |
| R-09 *(new)* | Unsigned/blocked desktop agent installers (cert cost/lead time) | 3 | 3 | 9 | Mitigate | Procure code-signing certs early; web fallback | Eng Lead | Open |

## Assumptions
| ID | Assumption | Validation | Status |
|---|---|---|---|
| A-01 | Cobb platform access obtainable under appropriate agreements for MVP | Sponsor confirms before G1 | Open |
| A-02 | Users accept Google sign-in and invitation flow | UAT | Open |
| A-03 *(new)* | Responsive web/PWA satisfies "desktop and mobile friendly" (no native apps for MVP) | Sponsor confirms | Open |

## Issues
| ID | Issue | Owner | Opened | Status |
|---|---|---|---|---|
| I-01 | Service access (Supabase tokens, Cloudflare API token, Google OAuth client) not yet provisioned — blocks Phase 0 deploy pipeline | Rolan | 2026-10-21 | Open |
| I-02 | Most named roles, budget, and gate dates are TBD | Rolan | 2026-10-21 | Open |

## Dependencies
| ID | Dependency | Needed by | Status |
|---|---|---|---|
| D-01 | School platform credentials and test accounts | G1 | Open |
| D-02 | AI provider agreements, keys, rate limits (xAI, Anthropic, Cloudflare Workers AI) | G3 | Open |
| D-03 | Sparkle character design assets (Rive) | G0 | Open |
| D-04 *(new)* | Cloud accounts + tokens (Supabase, Cloudflare, Google Cloud) | G0 | Open |
| D-05 *(new)* | Windows/macOS code-signing certificates | G1 | Open |

**Corrections vs. original:** added scoring, owners, status; added R-05..R-09, A-03, issues I-01/I-02 (original said "none open" though access was already blocking), D-04/D-05.

---

## Approval / Sign-off

| Role | Name | Decision | Date | Signature / PR approval |
|---|---|---|---|---|
| Sponsor / Project Manager | Rolan Chowdhury | Pending | TBD (Rolan) | |
| Product Owner | TBD (Rolan) | Pending | | |
| Engineering Lead | TBD (Rolan) | Pending | | |

## Revision History

| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 0.1 | Oct 2026 | Original library author | — | Original Word version (RAID Register (01M5GCZSY9EJ7Q070TY62K5S1A.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
