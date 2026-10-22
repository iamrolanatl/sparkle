# Sparkle — Project Documentation Library

Owner: **Rolan Chowdhury** (Sponsor / Project Manager) · Standard: PMBOK-aligned, organized by process group · Baseline: **v1.0 (CR-0001)**

## Index

| ID | Document | Process group | Source |
|---|---|---|---|
| — | [Implementation Handoff (reference input)](handoff.md) | Input | Handoff docx |
| SPK-GOV-001 | [Change Log](00-governance/Change-Log.md) | Governance | New |
| SPK-GOV-002 | [Change Request Register](00-governance/Change-Request-Register.md) | Governance | New |
| SPK-GOV-003 | [Decision Log / ADRs](00-governance/Decision-Log.md) | Governance | Handoff §6 |
| SPK-GOV-004 | [Feature Register](00-governance/Feature-Register.md) | Governance | Handoff §3 |
| SPK-INI-001 | [Product Blueprint](01-initiating/Product-Blueprint.md) | Initiating | Blueprint |
| SPK-INI-002 | [Project Charter](01-initiating/Project-Charter.md) | Initiating | Charter |
| SPK-INI-003 | [Statement of Work](01-initiating/Statement-of-Work.md) | Initiating | SOW |
| SPK-PLN-001 | [Requirements Baseline](02-planning/Requirements-Baseline.md) | Planning | Req. Baseline |
| SPK-PLN-002 | [Requirements Traceability Matrix](02-planning/Requirements-Traceability-Matrix.md) | Planning | RTM |
| SPK-PLN-003 | [Technical Design Document](02-planning/Technical-Design-Document.md) | Planning | TDD |
| SPK-PLN-004 | [Work Breakdown Structure](02-planning/Work-Breakdown-Structure.md) | Planning | WBS |
| SPK-PLN-005 | [Product Backlog](02-planning/Product-Backlog.md) | Planning | Backlog |
| SPK-PLN-006 | [RACI Matrix](02-planning/RACI-Matrix.md) | Planning | RACI |
| SPK-PLN-007 | [Org Chart & Resource Plan](02-planning/Org-Chart-Resource-Plan.md) | Planning | Org chart |
| SPK-PLN-008 | [Cost Management Plan & Budget](02-planning/Budget-Cost-Plan.md) | Planning | Budget |
| SPK-PLN-009 | [Test Strategy & Plan](02-planning/Test-Strategy-and-Plan.md) | Planning | Test Strategy |
| SPK-PLN-010 | [CI/CD & Release Management Plan](02-planning/CI-CD-Release-Management-Plan.md) | Planning | CI/CD plan |
| SPK-PLN-011 | [Data Integration & ETL Mapping](02-planning/Data-Migration-ETL-Mapping.md) | Planning | ETL matrix |
| SPK-PLN-012 | [Communications & Marketing Plan](02-planning/Communications-Marketing-Plan.md) | Planning | Marketing plan |
| SPK-EXE-001 | [OCM & Training Strategy](03-executing/OCM-Training-Strategy.md) | Executing | OCM |
| SPK-MC-001 | [RAID Register](04-monitoring-controlling/RAID-Register.md) | Monitoring & Controlling | RAID |
| SPK-MC-002 | [Weekly Status Report Template](04-monitoring-controlling/Weekly-Status-Report-Template.md) | Monitoring & Controlling | Status template |
| SPK-CLO-001 | [Cutover & Go-Live Runbook](05-closing/Cutover-Go-Live-Runbook.md) | Closing / Transition | Runbook |
| SPK-CLO-002 | [Lessons Learned Register](05-closing/Lessons-Learned-Register.md) | Closing | New |
| SPK-OPS-001 | [Target Operating Model](06-operations/Target-Operating-Model.md) | Operations | TOM |
| SPK-OPS-002 | [SOP Library (SOP-01..15)](06-operations/sops/README.md) | Operations | New (CR-0003) |
| SPK-EXE-TLR | [Tech Lead Reviews](03-executing/tech-lead-reviews/README.md) | Executing | New (CR-0009) |
| SPK-EXE-PMS | [PM Sync notes](03-executing/pm-sync/README.md) | Executing | New (CR-0009, DEC-72) |
| SPK-GOV-005 | [Definition of Done](00-governance/Definition-of-Done.md) | Governance | New (CR-0003) |
| — | [ADR Template](00-governance/ADR-Template.md) | Governance | New (CR-0003) |
| SPK-GOV-010 | [Sponsor Action Items](00-governance/Sponsor-Action-Items.md) | Governance | New (CR-0006) |
| SPK-PLN-020 | [Vault Compliance & Security Plan](02-planning/Vault-Compliance-and-Security-Plan.md) | Planning | New (CR-0005) |
| SPK-PLN-021 | [Trademark Clearance Notes](02-planning/Trademark-Clearance-Notes.md) | Planning | New (CR-0006) |
| SPK-PLN-022 | [Environments & Cost Guardrails](02-planning/Environments-and-Cost-Guardrails.md) | Planning | New (CR-0006) |
| SPK-PLN-023 | [Scalability & Reliability Plan](02-planning/Scalability-Reliability-Plan.md) | Planning | New (CR-0007) |
| SPK-PLN-024 | [Design System](02-planning/Design-System.md) | Planning | New (CR-0008) |

## Document Control Convention

1. **Every agreed change = one commit (one PR) containing all three:**
   - a CR entry in the [Change Request Register](00-governance/Change-Request-Register.md) (new or status update),
   - a line in the [Change Log](00-governance/Change-Log.md) referencing the CR,
   - a version bump + Revision History row in each affected document (minor `x.y+1` for clarifications, major `x+1.0` for re-baselines).
2. Commit message format: `docs(CR-NNNN): <summary>`.
3. Architectural/policy decisions also get a row in the [Decision Log](00-governance/Decision-Log.md); feature additions/removals update the [Feature Register](00-governance/Feature-Register.md) and the [RTM](02-planning/Requirements-Traceability-Matrix.md).
4. Approval = Sponsor (Rolan Chowdhury) approving/merging the PR; the sign-off table in each doc is updated at baseline events.
5. `handoff.md` is a frozen reference input; changes to intent go through CRs against the baselined docs, not the handoff.
6. Items marked **TBD (Rolan)** are open sponsor inputs; resolving one is a CR.
