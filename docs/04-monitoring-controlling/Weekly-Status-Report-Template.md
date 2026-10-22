# Weekly Executive Status Report — Template

| Field | Value |
|---|---|
| Document ID | SPK-MC-002 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Weekly Executive Status Report Template (01M5GCZRR3GP6CZXAJZYS7ZXAZ.docx) |

> **Purpose.** Standard template for the weekly executive update. Copy to `docs/04-monitoring-controlling/status/YYYY-MM-DD.md` each week.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

```markdown
# Sparkle — Weekly Status — YYYY-MM-DD
**Reporting period:** … · **Current phase / next gate:** … / G? (target date)

## 1. Overall Status: 🟢 / 🟡 / 🔴
One-sentence rationale. | Scope 🟢 | Schedule 🟢 | Cost 🟢 | Quality 🟢 | Risk 🟢

## 2. Progress This Week
- Completed stories / milestones (link PRs)
- Demo highlights (Today, Sparkle, admin)

## 3. Performance & Health (vs. budget)
| Metric | Target | Actual |
|---|---|---|
| Sync success rate | ≥ 98% | |
| Sync p95 per student | ≤ 3 min | |
| Today p75 (first / repeat) | ≤ 2.0 s / ≤ 1.0 s | |
| Chat first token p95 | ≤ 1.5 s | |
| Voice first audio p50 | ≤ 1.2 s | |
| AI spend vs. budget | < 70% alert | |

## 4. Risks & Issues — top 3 from RAID with mitigation status
## 5. Change Requests — new / approved / rejected this week
## 6. Decisions Needed — phase-gate items or trade-offs for sponsor
## 7. Next Week Focus — priorities and dependency blockers
```

**Corrections vs. original:** added RAG by dimension, CR section, gate tracking, voice/sync metrics with targets.

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (Weekly Executive Status Report Template (01M5GCZRR3GP6CZXAJZYS7ZXAZ.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
