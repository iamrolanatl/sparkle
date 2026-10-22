# SOP Library

| Field | Value |
|---|---|
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Maintainer | Grok Bot |
| Review cadence | At every phase gate **and** whenever the process changes |
| Last Updated | 2026-10-21 |

Every SOP change is logged in the [Change Log](../../00-governance/Change-Log.md), under its CR or as an **"SOP update"** entry, with a revision row in the SOP itself. Steps that describe future-state tooling are marked **TBD**.

## Index
| SOP | Title |
|---|---|
| SOP-01 | [Branching, Pull Requests & Code Review](SOP-01-Branching-PR-Code-Review.md) |
| SOP-02 | [Release, Deploy & Rollback](SOP-02-Release-Deploy-Rollback.md) |
| SOP-03 | [Database Migrations](SOP-03-Database-Migrations.md) |
| SOP-04 | [Secrets & Access Management](SOP-04-Secrets-Access-Management.md) |
| SOP-05 | [Incident Response & Severity](SOP-05-Incident-Response.md) |
| SOP-06 | [AI Operations — Budgets, Kill Switches & Chat Monitoring](SOP-06-AI-Operations.md) |
| SOP-07 | [Privacy Requests & Data Deletion](SOP-07-Privacy-Requests.md) |
| SOP-08 | [Support Tickets & Chatbot Human Handoff](SOP-08-Support-Tickets-Handoff.md) |
| SOP-09 | [Feature Flags & Staged Rollout](SOP-09-Feature-Flags-Staged-Rollout.md) |
| SOP-10 | [Change Control (Lane 1 / Lane 2)](SOP-10-Change-Control.md) |
| SOP-11 | [Backup & Restore Test](SOP-11-Backup-Restore-Test.md) |
| SOP-12 | [Adding a School Platform or District Platform Profile](SOP-12-New-Platform-Profile.md) |
| SOP-13 | [Repository Hygiene](SOP-13-Repo-Hygiene.md) |
| SOP-14 | [Cross-Team Review and Merge](SOP-14-Cross-Team-Review-Merge.md) |
| SOP-15 | [Database Change Safety](SOP-15-Database-Change-Safety.md) |

## SOP Template
```markdown
# SOP-NN — Title
| Field | Value |  (SOP ID, Version, Status, Owner, Performer, Review cadence, Last Updated)
## 1. Purpose
## 2. Scope
## 3. Roles
## 4. Prerequisites
## 5. Procedure (numbered steps; mark future-state steps TBD)
## 6. Verification
## 7. Rollback / Exception handling
## 8. Revision History
| Version | Date | Author | CR / entry | Description |
```
