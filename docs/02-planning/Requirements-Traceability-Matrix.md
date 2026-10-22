# Requirements Traceability Matrix

| Field | Value |
|---|---|
| Document ID | SPK-PLN-002 |
| Project | Sparkle — Student Success Platform |
| Version | 1.3 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Product Owner — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Requirements Traceability Matrix (01M5GCZRRWHGCGR3HNV2MT26PW.docx) |

> **Purpose.** Traces every requirement to features, backlog epics, design elements, and tests. Maintained in-repo (single source) and updated at each sprint review.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

| Req | Feature | Epic | Design / ADR | Test level(s) | Status |
|---|---|---|---|---|---|
| FR-01 | F-01 | E1 | ADR-05, Data Mapping | Integration, contract (connector) | Not started |
| FR-02 | F-02 | E2 | ADR-02 | Unit (rules), E2E, UAT | Not started |
| FR-03 | F-03 | E5 | Supabase Auth + Google | Integration, E2E; RLS isolation tests | In progress |
| FR-04 | F-03 | E5 | RLS, TDD §8.2 | RLS tests (guardian limits, shares) | In progress |
| FR-05 | F-07 | E3 | — | E2E, UAT | Not started |
| FR-06 | F-06 | E5 | ADR-03 | Unit (deterministic engine) | Not started |
| FR-07 | F-08 | E2 | — | Unit, E2E | Not started |
| FR-08 | F-09 | E6 | RLS | Integration, privacy | Not started |
| FR-09 | F-10, F-11 | E6 | ADR-04 | E2E, UAT (confirm gate), audit | Not started |
| FR-10 | F-12 | E4 | ADR-06, AI router | Router, voice fallback, citation | Not started |
| FR-11 | F-04 | E1 | ADR-01 | Agent integration, staged rollout | Not started |
| FR-12 | F-13 | E7 | RBAC | Admin health, audit | Not started |
| FR-13 | F-05 | E6 | — | Integration, UAT | Not started |
| FR-14 | F-12 | E4 | — | Safety scenario tests | Not started |
| FR-15 | F-02 | E2 | — | Unit, UAT | Not started |
| FR-16 | F-14 | E5 | TDD §8.3, DEC-07 | RLS tests (multi-student helper, revoke, tutor scopes, approval, rate limit) | In progress |
| FR-17 | F-15 | — | Landing, waitlist RLS | Waitlist RLS tests; build | In progress |
| FR-18 | F-16 | — | Legal pages, consent banner, `privacy_requests` | RLS tests (insert-only, no read); manual GPC check | In progress |
| FR-19 | F-17 | — | `apps/api` /chat, Workers AI + AI Gateway, feature flag | API tests (stream, crisis, rate limit, kill switch, redaction); RLS (no client access) | In progress |
| FR-20 | F-18 | E7 | `/admin` role gate, audit | Build; manual role check; SSO/MFA TODO | In progress |
| FR-21 | F-19 | E2 | Parser + Tier 1 fallback | Unit (date parsing), UAT confirm/edit | Not started |
| FR-22 | F-20 | E2 | KV cache, provider TBD | Integration, fallback | Not started |
| FR-23 | F-21 | E6 | OCR pipeline, R2 `sparkle-scans` | Integration, human-review UAT | Not started |
| FR-24 | F-22 | E6 | Vault tables + RLS, R2 `sparkle-vault`, signed URLs | RLS (sensitive flag, helper exclusion), security review | Not started (flag off) |
| FR-24 → FR-23 | F-22 → F-21 | — | Every vault item runs through the FR-23 OCR pipeline (acceptance a–f) | OCR + search + tagging + key-field extraction tests | Not started |
| NFR-01..04, 09, 10 | — | All | ADR-02 | Performance suite | Not started |
| NFR-05, 08 | — | E1, E5, E7 | ADR-01, RLS | Security & privacy suite | Not started |
| NFR-06, 12 | — | E4, all | Resilience patterns | Resilience suite | Not started |
| NFR-07 | — | E1 | ADR-05, ADR-07 | Architecture review | Not started |
| NFR-11, 13 | — | E2 | Design system | A11y + device matrix | Not started |
| NFR-20..22, 27 | F (FR-24 Mail vault) | Vault | DEC-21..23, 28; Vault Plan §5–6 | E2E consent, detector corpus, RLS/privacy, purge | Not started |
| NFR-23..26, 34 | FR-24 | Vault, E7 | DEC-24..27, 39 | Crypto, integration, audit, admin, E2E | Not started |
| NFR-28, 32, 33 | FR-24 | All | DEC-29, 34..36 | Tabletop, WISP review, pen test, CI RLS | Not started |
| NFR-29..31 | FR-23, FR-24 | Vault, E4 | DEC-30..33 | Contract index, router tests, config audit | Not started |

**Corrections vs. original:** original summary left FR-07, FR-08, FR-09 untraced and listed FR-02 in two groups; it also pointed to an external "tracking tool" that doesn't exist yet — the matrix now lives here.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Requirements Traceability Matrix (01M5GCZRRWHGCGR3HNV2MT26PW.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0002 | Added FR-16/17; statuses for FR-03/04. |
| 1.2 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003, CR-0004 | Traced FR-18..FR-24, plus a dependency row FR-24 → FR-23. |
| 1.3 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0005 | Traced NFR-20..34 to FR-23/FR-24 and DEC-20..39. |
