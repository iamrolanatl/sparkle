# SOP-07 — Privacy Requests & Data Deletion

| Field | Value |
|---|---|
| SOP ID | SOP-07 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Handle Do Not Sell/Share, access, deletion and correction requests, including Global Privacy Control.

## 2. Scope
Requests from `/do-not-sell` (table `privacy_requests`) and by email (TBD address).

## 3. Roles
- **Owner:** Rolan.
- **Processor:** Grok Bot / Rolan via `/admin/privacy`.
- **Counsel:** TBD for edge cases.

## 4. Prerequisites
Admin role; legal-reviewed response templates (TBD).

## 5. Procedure
1. Check `/admin/privacy` at least weekly (daily once public).
2. **GPC / Do Not Sell or Share:** Sparkle does not sell/share; mark *completed* and confirm by email. GPC signals are also honored automatically by the cookie banner.
3. **Access/Delete/Correct:** mark *verifying*; verify identity by replying from the account's email (method TBD with counsel). For students under 13 only a parent/guardian may request.
4. **Deletion:** delete the user's auth account (cascades profile); remove students they solely guard, shares, invitations, notes, chat sessions by email/ip_hash where identifiable; R2 objects (scans/vault) for those students. Keep audit records required by law.
5. Mark *completed* or *denied* (with reason). Statutory timelines (e.g., 45 days CCPA) — confirm with counsel.
6. Log counts in the weekly status.

## 6. Verification
Request status updated; requester notified; data no longer queryable.

## 7. Rollback / Exception handling
If deletion was wrong, restore from backup only with Rolan + counsel approval (SOP-11).

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
