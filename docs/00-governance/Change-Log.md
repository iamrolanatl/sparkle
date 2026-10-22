# Change Log

| Field | Value |
|---|---|
| Document ID | SPK-GOV-001 |
| Project | Sparkle — Student Success Platform |
| Version | 1.3 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | New |

> **Purpose.** Chronological, append-only record of every change to baselined documents, scope, or decisions. One line per change; newest first.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

| Date | CR | Documents affected | Summary | Author |
|---|---|---|---|---|
| 2026-10-21 | Lane 1 (Phase 1 build) | Decision Log (DEC-04 decided, DEC-56..63), WBS, RAID, Sponsor-Action-Items | PRs #8–#15: RLS perf, hygiene gates, UI effects/applets, API resilience, family invitations, CSV import + Today doc, sync health, confirmation gate; migrations 20261022000000/010000/020000 applied to dev | Grok Bot |
| 2026-10-21 | DEC-46..50 (Lane 1, go-live dev) | Decision Log, Sponsor-Action-Items, WBS 2.2/2.7.2, RAID D-12 closed | Migrations applied to Supabase; AI Gateway created; API + web deployed to workers.dev; auth redirect URLs set; purge-chats cron; chat model swapped (deprecation); site noindex | Grok Bot |
| 2026-10-21 | CR-0007, CR-0008 | Requirements (NFR-35..48), Scalability-Reliability-Plan (new), Design-System (new), Definition-of-Done, SOP-13 (new), SOP README, Decision Log (DEC-51..55), CR Register, WBS, RAID, Sponsor-Action-Items, docs index | Enterprise standard (1M users, 99.9 %, crash-free, RPO/RTO, hygiene) and design direction baselined | Grok Bot |
| 2026-10-21 | CR-0003 (SOP update) | New: `06-operations/sops/` README + SOP-01..SOP-12, `00-governance/Definition-of-Done.md`, `00-governance/ADR-Template.md`; WBS 1.1/1.2 | SOP library created (sponsor request): branching/PR, release/rollback, migrations, secrets (90-day rotation), incidents + breach hook, AI ops, privacy requests, support handoff, feature flags, change control lanes + G1 design freeze, quarterly backup/restore, platform profiles | Grok Bot (for Rolan Chowdhury) |
| 2026-10-21 | CR-0004 | Requirements v1.2, RTM v1.2, Feature Register v1.2, WBS v1.2, RAID v1.2, Decision Log v1.2 | Scope addition approved by sponsor: FR-21 NL tasks, FR-22 weather, FR-23 OCR, FR-24 mail vault (OCR acceptance a–f; FR-24→FR-23 trace). Amends handoff §1 (DEC-09). Landing "coming soon" cards | Grok Bot (for Rolan Chowdhury) |
| 2026-10-21 | CR-0003 | Requirements v1.2, RTM v1.2, TDD v1.2, WBS v1.2, Feature Register v1.2, RAID v1.2, Decision Log v1.2 | Crystal-style landing; legal pages (draft) + cookie consent + Do Not Sell/Share form + GPC; `/chat` (Workers AI via AI Gateway) with rate limits, budget kill switch, redaction, human handoff; `/admin` chat monitoring + privacy queue; R2 enabled and bound (I-03 closed); vault flag off | Grok Bot (for Rolan Chowdhury) |
| 2026-10-21 | CR-0002 | Requirements v1.1, RTM v1.1, TDD v1.1, WBS v1.1, Feature Register v1.1, Decision Log v1.1, RAID v1.1, RACI v1.1, Comms plan v1.1 | Phase 0 code baseline (pnpm monorepo: web/api/ui/character, Supabase migration + RLS tests, CI, manual API deploy). Added FR-16 helper access, FR-17 landing page + waitlist; DEC-05 (one Google Web OAuth client), DEC-06 (guardian limits, pending confirmation), DEC-07 (helpers). WBS: Status/Notes columns, 2.6 Access & tooling Done, R2 blocked, new elements (dev/staging Supabase, branch protection, domain/DNS, OAuth verification, code-signing, portal ToS review gating 3.2, FERPA/COPPA as G1 entry, PWA, AI keys, Tier-1 selection, Sentry, 2.7 landing, recurring landing updates). Resourcing reality recorded in WBS/RACI/RAID; I-01 closed, I-03 opened | Grok Bot (for Rolan Chowdhury) |
| 2026-10-21 | CR-0001 | All docs under `docs/` | Initial PMP documentation baseline created from Implementation Handoff v1.0 + 20-document library; gaps reconciled; TBDs flagged for sponsor | Grok Bot (for Rolan Chowdhury) |

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
| 2026-10-21 | CR-0006 | Sponsor-Action-Items (new), Trademark-Clearance-Notes (new), Environments-and-Cost-Guardrails (new), Decision-Log, CR Register, WBS, RAID | Sponsor action register SA-01..13; trademark knock-out (bare SPARKLE = high risk); dev/staging plan (dev not created — plan unverifiable); Cloudflare $10 budget alert verified; DEC-40..45; R-26..30 | Grok Bot (for Rolan Chowdhury) |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0005 | CR-0005 entry. |
| 1.2 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0006 | CR-0006 entry. |
| 1.3 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0006 | SA-11 decided by Rolan: keep plain Sparkle; DEC-40 and R-26 updated; Runbook item 12 added. |
| 1.4 | 2026-10-21 | Grok Bot (Integration lead, for Rolan Chowdhury) | CR-0010 | SOP-14, SOP-15, CI migration lint, CODEOWNERS, PR template, DEC-71, R-33/R-34. |
| 1.5 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0007 | Connectors used: Supabase plan/quota checked (SA-12 blocked by free-project limit), Cloudflare alerts created (SA-13 partial); DEC-64..69 logged. |
| 1.5 | 2026-10-21 | Grok Bot (Integration lead, for Rolan Chowdhury) | CR-0009 | CR-0009 recorded; RACI v1.2 with six teams and DEC ranges. |
| 1.6 | 2026-10-21 | Grok Bot (Integration lead, for Rolan Chowdhury) | CR-0009 | CR-0009 recorded; RACI v1.2 with six teams and DEC ranges. |
