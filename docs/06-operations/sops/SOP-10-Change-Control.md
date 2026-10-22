# SOP-10 — Change Control (Lane 1 / Lane 2)

| Field | Value |
|---|---|
| SOP ID | SOP-10 |
| Version | 1.0 |
| Status | Draft — pending sponsor approval (CR-0003 PR) |
| Owner | Rolan Chowdhury (Sponsor / PM) |
| Performer | Grok Bot (build/PM agent) unless stated; Rolan approves |
| Review cadence | Every phase gate + whenever the process changes |
| Last Updated | 2026-10-21 |

## 1. Purpose
Separate everyday sprint changes from baseline changes that need a Change Request.

## 2. Scope
All scope, requirements, design, schedule, cost and privacy changes.

## 3. Roles
- **Requester:** anyone (usually Rolan).
- **Assessor:** Grok Bot (impact analysis).
- **Decider:** Rolan.

## 4. Prerequisites
Registers in `docs/00-governance/`.

## 5. Procedure
**Lane 1 — sprint-level (no CR):** bug fixes, refactors, story-level details, copy tweaks within an existing FR, SOP clarifications. Needs: PR with FR ID; changelog entry only if a baselined doc changes ("SOP update" / "Minor" entry).

**Lane 2 — Change Request:** new/removed FR, changed NFR target, architecture decision, phase/gate change, budget, privacy/sharing rules, vendor/provider changes, anything amending the handoff.
1. Add CR row (next CR-NNNN) to the [CR Register](../../00-governance/Change-Request-Register.md) with impact on scope, schedule, cost, risk, privacy.
2. Rolan decides (Approved / Rejected / Deferred). Record in Decision Log if architectural or policy.
3. Implement in one PR: CR status, changelog line, doc revision bumps, code.

**Design baseline freeze:** before Phase 1 (G1) the design baseline (Requirements, TDD §8 data model, DEC-05..09) is frozen; after G1 any change to it is Lane 2 only.

## 6. Verification
Every merged PR either cites a Lane-1 FR or a CR; registers match.

## 7. Rollback / Exception handling
A rejected or reverted CR gets a changelog line and status update; code reverted per SOP-01.

## 8. Revision History
| Version | Date | Author | CR / entry | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003 | Initial SOP grounded in current repo/tooling; future-state steps marked TBD. |
