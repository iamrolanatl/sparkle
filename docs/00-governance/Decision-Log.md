# Decision Log (incl. Architecture Decision Records)

| Field | Value |
|---|---|
| Document ID | SPK-GOV-003 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) / Engineering Lead |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Implementation Handoff §6, §8 |

> **Purpose.** Records key project and architectural decisions with context, rationale, and status. Seeded from handoff §6 (and §8 delivery approach).

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

| ID | Date | Decision | Context / rationale | Alternatives | Decided by | Status |
|---|---|---|---|---|---|---|
| ADR-01 | Oct 2026 | Device-default credential storage (agent OS secure store) | Minimize central secret risk for school credentials | Central vault | Handoff v1.0 | Accepted |
| ADR-02 | Oct 2026 | Precomputed Today document (cached in KV) | Meet NFR-01/03; cacheability | On-demand query | Handoff v1.0 | Accepted |
| ADR-03 | Oct 2026 | Deterministic GPA engine; AI only explains | Correctness, trust | AI-computed GPA | Handoff v1.0 | Accepted |
| ADR-04 | Oct 2026 | Explicit confirmation required for any outbound communication | Safety, trust, policy compliance | Auto-send | Handoff v1.0 | Accepted |
| ADR-05 | Oct 2026 | Platform Profiles for multi-district expansion without code forks | NFR-07 | Per-district forks | Handoff v1.0 | Accepted |
| ADR-06 | Oct 2026 | Rive for Sparkle character | Full-body personality at low CPU | Lottie, video, 3D | Handoff v1.0 | Accepted |
| ADR-07 | Oct 2026 | Modular monolith first; extract ingestion/AI workers only when load triggers hit | Speed + simplicity; scale path | Microservices | Handoff v1.0 | Accepted |
| DEC-01 | Oct 2026 | Hybrid delivery: fixed-scope phases + 2-week sprints + go/no-go gates | Integration/compliance control + UX iteration | Pure Agile / Waterfall | Handoff v1.0 | Accepted |
| DEC-02 | 2026-10-21 | Project docs maintained as Markdown in `docs/` of `iamrolanatl/sparkle`, PMP process-group structure, CR-controlled | Sponsor direction | Word library | Rolan Chowdhury | Accepted |
| DEC-03 | 2026-10-21 | Use scoped API tokens / OAuth clients (not passwords) for Supabase, Cloudflare, Google Cloud, AI providers | Security, revocability, CI use | Shared passwords | Rolan Chowdhury | Proposed |
| DEC-04 | — | Age threshold for student-controlled sharing (13 vs 14) | Handoff recommends 13/14 | — | Rolan | Open |

All ADRs are "Accepted" as inputs from the handoff and are ratified on approval of CR-0001.

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
