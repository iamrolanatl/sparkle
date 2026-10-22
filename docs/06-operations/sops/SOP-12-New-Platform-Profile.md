# SOP-12 — Adding a School Platform or District Platform Profile

| Field | Value |
|---|---|
| SOP ID | SOP-12 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Add a new school data source or district without forking code (ADR-05).

## 2. Scope
Connectors (StudentVue, ParentVue, CTLS, O365, Synergy, Clever, …) and Platform Profiles. Connector framework: TBD (Phase 1).

## 3. Roles
- **Approver:** Rolan (and counsel for ToS).
- **Engineer:** Grok Bot.

## 4. Prerequisites
- **Legal/ToS review of automated access completed** (D-06) — hard gate.
- Test accounts from the district/family (D-01).

## 5. Procedure
1. Raise a CR (Lane 2) for each new district or platform.
2. Document the platform: auth method, data available, rate limits, ToS constraints.
3. Create the Platform Profile (expected schema, field mappings to the normalized model, schedule) — format TBD.
4. Build/extend the connector behind a feature flag; credentials stay on device (ADR-01).
5. Contract tests with recorded fixtures; drift detection alerts on.
6. Pilot with a small cohort (SOP-09); monitor sync success ≥ 98% and p95 ≤ 3 min.
7. Update the landing page and marketing content (WBS recurring item).

## 6. Verification
Sync success and latency targets met for the pilot; no Sev-1/2 open.

## 7. Rollback / Exception handling
Disable the connector flag; revoke the agent version if needed (SOP-02).

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
