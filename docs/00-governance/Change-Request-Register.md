# Change Request Register

| Field | Value |
|---|---|
| Document ID | SPK-GOV-002 |
| Project | Sparkle — Student Success Platform |
| Version | 1.2 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | New |

> **Purpose.** Integrated change control (PMBOK Perform Integrated Change Control): every proposed change to scope, schedule, cost, quality, requirements, architecture decisions, or privacy posture is logged, assessed, and decided here.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Process
1. **Submit** — add a row (next CR-NNNN) with status *Submitted*, or open a GitHub issue labelled `change-request` and mirror it here.
2. **Assess** — impact on scope, schedule, cost, quality, risk, privacy; list affected docs/FRs.
3. **Decide** — PM approves if no baseline impact; otherwise Sponsor (Rolan). Record in the Decision Log if architectural/policy.
4. **Implement** — one PR containing: CR row → *Approved/Implemented*, a Change Log line, and revision bump in each affected doc.
5. **Verify & close.**

Statuses: Submitted · Under Assessment · Approved · Rejected · Deferred · Implemented · Closed.

## 2. Register
| CR | Date | Title | Requester | Type | Impact (scope/sched/cost/quality/risk) | Affected docs | Decision by | Status |
|---|---|---|---|---|---|---|---|---|
| CR-0004 | 2026-10-21 | Scope addition: NL tasks, weather, OCR scanning, mail vault (FR-21..FR-24) | Rolan Chowdhury | Scope addition — **amends handoff §1** | **Scope:** +4 features, framed as student-success only (school tasks, school-day weather, school documents, school mail); adult/personal use stays out. **Schedule:** Phase 2 (+FR-21..23), Phase 4 (FR-24, OCR for calendars); dates TBD. **Cost:** weather API, Workers AI vision/OCR, R2 storage — amounts TBD. **Risk:** R-16, R-18. **Privacy:** sensitive school docs (IEP/504/medical) → guardians-only default, excluded from helper shares, encrypted R2, vault behind disabled flag until legal + security review | Requirements, RTM, Feature Register, WBS, RAID, Decision Log (DEC-09), landing "coming soon" cards | Rolan Chowdhury | **Approved by sponsor 2026-10-21** |
| CR-0003 | 2026-10-21 | Landing redesign (Crystal POC reference), legal/compliance pages + GPC, sales/support chat, admin chat monitoring; R2 bindings | Rolan Chowdhury | Scope addition | Scope +FR-18..20; pulls part of 6.4 into Phase 0/1; cost: Workers AI usage (budgeted by flag); risk R-14, R-15, R-17 | Requirements, RTM, TDD, WBS, Feature Register, RAID, Decision Log (DEC-08) | Rolan Chowdhury | Submitted — approved on PR merge |
| CR-0002 | 2026-10-21 | Phase 0 foundation: monorepo code baseline, multi-tenant data model & RLS, Google sign-in, CI; new sponsor requirements FR-16 (helpers) and FR-17 (landing page); DEC-05/06/07; WBS re-baselined to actual status | Rolan Chowdhury | Scope addition + baseline update | Scope +FR-16, +FR-17; schedule: privacy review now G1 entry; risk: R-10..R-13; no budget baseline | Requirements, RTM, TDD, WBS, Feature Register, Decision Log, RAID, RACI, Comms plan | Rolan Chowdhury | Submitted — approved on PR merge |
| CR-0001 | 2026-10-21 | Establish initial PMP documentation baseline (v1.0) reconciled with Implementation Handoff v1.0 | Rolan Chowdhury | Baseline | Establishes scope, requirements (FR-01..15, NFR-01..13), WBS, RAID; no budget/schedule baseline yet (TBD) | All | Rolan Chowdhury | Submitted — approved on PR merge |
| CR-0005 | 2026-10-21 | FR-24 Mail vault compliance & security posture (Blocker 2): legal classification, consent, minimization, encryption, retention, breach, subprocessors, WISP, pen test, launch gate | Rolan Chowdhury | Requirements / privacy | Scope +NFR-20..34 and WBS 6.7/7.5; schedule: vault launch gated on counsel + pen test (est. 4–8 wks external lead time); cost: counsel review, pen test, VPC fees, ID vendor (TBD); risk ↓ R-06 | Vault plan, Decision Log, Req Baseline, RTM, RAID, WBS, Change Log | Grok Bot under Rolan's delegated sponsor authority (2026-10-21) | Approved |
| CR-0006 | 2026-10-21 | Sponsor Action Items register; trademark knock-out research; environments (dev/staging) plan; repo security posture; cost guardrails; privacy-respecting analytics; automated weekly status | Rolan Chowdhury | Governance / scope | Scope: WBS 2.20–2.25, DEC-40..45, R-26..30; cost: possible GitHub Pro $4/mo, Supabase Pro if staging branching (sponsor decisions, not taken); schedule: brand decision before domain purchase | Sponsor-Action-Items (new), Trademark-Clearance-Notes (new), Environments-and-Cost-Guardrails (new), Decision Log, WBS, RAID, Change Log | Rolan Chowdhury (approved in chat 2026-10-21) | Approved |

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
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0005 | Added CR-0005. |
| 1.2 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0006 | Added CR-0006. |
