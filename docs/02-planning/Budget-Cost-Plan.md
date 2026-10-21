# Cost Management Plan & Budget Tracking

| Field | Value |
|---|---|
| Document ID | SPK-PLN-008 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (Sponsor / PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Financial Budget & Cost Tracking (01M5GCZSYFVCFYEZZKP68T2W0Q.docx) |

> **Purpose.** Defines cost categories, estimating/tracking approach, control thresholds, and contingency. No budget figures have been provided; all amounts are TBD.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Cost Baseline
| Category | Includes | Planned | Actual to date |
|---|---|---|---|
| Personnel | Engineering, Design, Product, Operations | TBD (Rolan) | — |
| Infrastructure | Cloudflare (Workers, KV, R2, Queues, AI Gateway), Supabase, observability (Sentry) | TBD (Rolan) | — |
| AI usage | Workers AI, Grok, Claude (per-user budgets) | TBD (Rolan) | — |
| Tools & licenses | Rive, CI/CD, security scanning, code-signing certificates (Windows/macOS) | TBD (Rolan) | — |
| Contingency reserve | 15% recommended for integration/compliance unknowns | TBD (Rolan) | — |
| Management reserve | Sponsor-held | TBD (Rolan) | — |

## 2. Tracking & Control
- Ledger: this file (monthly actuals vs. plan) until a financial system is chosen — **TBD (Rolan)**.
- AI spend tracked separately with alerts at 70% and 90% of budget; per-user caps and kill switches.
- Infrastructure monitored against scale triggers (TDD §6).
- Variance > 10% of a category (threshold **TBD (Rolan)**) → raise a CR.

## 3. Scale Cost Drivers
AI inference and database/replica growth dominate variable cost; edge cache, precomputed Today doc and tier fallbacks keep unit cost predictable toward 1M users.

**Corrections vs. original:** added code-signing certs (needed for signed agent), management reserve, variance-to-CR rule; original referenced an unnamed "project financial system".

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Financial Budget & Cost Tracking (01M5GCZSYFVCFYEZZKP68T2W0Q.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
