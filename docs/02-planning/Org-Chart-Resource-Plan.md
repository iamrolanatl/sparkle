# Organization Chart & Resource Management Plan

| Field | Value |
|---|---|
| Document ID | SPK-PLN-007 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Organization Chart & Resource Plan (01M5GCZST682ZF0H02K0740F9M.docx) |

> **Purpose.** Defines the project team structure, roles, reporting lines, staffing, and how resources scale.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Organization Chart
```
Sponsor / Project Manager — Rolan Chowdhury
 ├── Product Owner — TBD (Rolan)
 ├── Engineering Lead — TBD (Rolan)
 │    ├── Frontend / Full-stack Engineers (2–3) — TBD
 │    ├── AI / Platform Engineer — TBD
 │    └── Grok Bot — AI implementation & documentation agent
 ├── Designer (glass system, Rive character) — TBD
 ├── Operations / Support — TBD
 └── Compliance / Privacy Counsel — TBD
```
## 2. Roles
| Role | Responsibilities | Name | Allocation |
|---|---|---|---|
| Sponsor / PM | Funding, phase gates, CR approval, stakeholder alignment, documentation | Rolan Chowdhury | TBD |
| Product Owner | Prioritization, acceptance, UAT sign-off | TBD | TBD |
| Engineering Lead | Architecture, delivery, quality | TBD | TBD |
| FE/Full-stack (2–3) | Next.js, agent integration | TBD | TBD |
| AI/Platform Eng | Router, budgets, observability | TBD | TBD |
| Designer | Glass system, Sparkle (Rive), interaction | TBD | TBD |
| Ops/Support | Admin console, runbooks, on-call | TBD | TBD |
| Compliance/Privacy | Sharing rules, data handling review | TBD | TBD |

## 3. Reporting & Cadence
Engineering + Design report to Engineering Lead for delivery; PO accountable for scope and acceptance; weekly cross-functional sync and executive status.

## 4. Scaling
Connector engineers and support added as districts onboard; no per-district team thanks to Platform Profiles.

## 5. Access & Accounts (project resources)
| Resource | Account | Status |
|---|---|---|
| GitHub repo | `iamrolanatl/sparkle` | Active |
| Supabase | project `nklbdyezbsugkdvaidtt` | Tokens pending |
| Cloudflare | account (iamrolan@gmail.com) | API token pending |
| Google Cloud | iamrolan@gmail.com | OAuth client pending |
| AI providers | xAI (Grok), Anthropic (Claude) | Keys pending (Phase 3) |

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Organization Chart & Resource Plan (01M5GCZST682ZF0H02K0740F9M.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
