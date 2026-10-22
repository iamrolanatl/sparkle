# SOP-08 — Support Tickets & Chatbot Human Handoff

| Field | Value |
|---|---|
| SOP ID | SOP-08 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Make sure every "Talk to a human" request gets a timely answer.

## 2. Scope
`support_tickets` created by chat handoff; email support (TBD address).

## 3. Roles
- **Owner:** Rolan.
- **Agent:** Rolan (human reply); Grok Bot may draft replies for approval.

## 4. Prerequisites
Admin role; support mailbox TBD.

## 5. Procedure
1. Check *Escalations / tickets* in `/admin/chat` daily.
2. Open the linked transcript for context.
3. Mark *In progress*; reply to the user's email from the support address (never share other users' data; ask for no sensitive student data by email).
4. Mark *Closed* when answered. Bugs → GitHub issue; product gaps → backlog; knowledge gaps → SOP-06 step 3.
5. Target first response: 2 business days (TBD with Rolan).

## 6. Verification
No open tickets older than the target.

## 7. Rollback / Exception handling
If a reply was sent in error, follow up with a correction; privacy-impacting mistakes → SOP-05.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
