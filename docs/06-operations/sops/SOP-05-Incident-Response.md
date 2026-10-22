# SOP-05 — Incident Response & Severity

| Field | Value |
|---|---|
| SOP ID | SOP-05 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Detect, triage, contain and learn from incidents, including possible data breaches.

## 2. Scope
Production web, API, database, chat, and any data exposure.

## 3. Roles
- **Incident commander:** Rolan.
- **Responder:** Grok Bot (diagnosis, fixes via PR).
- **Counsel:** TBD (breach notifications).

## 4. Prerequisites
Severity definitions from the [Test Strategy](../../02-planning/Test-Strategy-and-Plan.md#4-defect-severity).

## 5. Procedure
| Sev | Definition | Response target |
|---|---|---|
| 1 | Privacy/data leakage, credential exposure, message sent without confirmation, crisis-protocol failure, total outage | Immediately; Rolan notified at once |
| 2 | Core path broken without workaround (sync, Today, sign-in); budget breach | Same day |
| 3 | Degraded with workaround | Next sprint |
| 4 | Cosmetic | Backlog |

1. **Detect:** user report, support ticket, admin dashboard, Cloudflare/Sentry alerts (Sentry TBD).
2. **Triage:** assign Sev; open a GitHub issue `incident` with timeline.
3. **Contain:** kill switches/feature flags (SOP-09), `wrangler rollback` (SOP-02), revoke/rotate secrets (SOP-04).
4. **Fix** via PR; verify.
5. **Breach-notification hook (Sev-1 involving personal data):** preserve evidence, notify Rolan immediately, engage counsel to assess notification duties (state breach laws, FERPA/COPPA, and any district contracts) within the legally required windows — process details TBD with counsel.
6. **Post-incident review** within 5 business days → Lessons Learned register + RAID.

## 6. Verification
Issue closed with root cause, fix PR, and lessons-learned entry.

## 7. Rollback / Exception handling
If a fix makes things worse, roll back to last known good release and keep the feature flag off.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
