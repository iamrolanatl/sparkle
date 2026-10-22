# SOP-12 — Adding a School Platform or District Platform Profile

| Field | Value |
|---|---|
| SOP ID | SOP-12 |
| Version | 1.1 |
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
2. **Terms-of-use review (hard gate, DEC-161, SA-D1).** Before any code beyond mock fixtures:
   a. Collect the platform's current terms of use, acceptable-use and privacy policies, and any district agreement; save them (with date and URL) in the CR.
   b. Check first for an official API, OneRoster/Clever-style integration or data-sharing agreement, and prefer it.
   c. Counsel reviews whether automated access by a family's own device agent is permitted; record the written outcome, any conditions (rate limits, user-agent, consent) and the reviewer in the Decision Log.
   d. If not permitted or unclear: stop; offer only manual import (CSV) for that platform; mark the WBS item Blocked.
   e. Re-review when the terms change (drift check each phase gate).
3. Document the platform: auth method, data available, rate limits, ToS constraints.
4. Create the Platform Profile (expected schema, field mappings to the normalized model, schedule) — format TBD.
5. Build/extend the connector behind a feature flag; credentials stay on device only (ADR-01, DEC-160); only mock fixtures until step 2 is passed.
6. Contract tests with recorded fixtures; drift detection alerts on.
7. Pilot with a small cohort (SOP-09); monitor sync success ≥ 98% and p95 ≤ 3 min.
8. Update the landing page and marketing content (WBS recurring item).

## 6. Verification
Sync success and latency targets met for the pilot; no Sev-1/2 open.

## 7. Rollback / Exception handling
Disable the connector flag; revoke the agent version if needed (SOP-02).

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
| 1.1 | 2026-10-21 | Grok Bot (Team D) | DEC-161 | Added explicit terms-of-use review step (PM request). |
