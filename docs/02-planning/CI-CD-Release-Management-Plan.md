# DevOps CI/CD Plan & GitHub Release Management

| Field | Value |
|---|---|
| Document ID | SPK-PLN-010 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Engineering Lead — TBD (Rolan) |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | DevOps CI/CD Plan & GitHub Release Management (01M5GCZSKQ2BE69YJSE01VHQW9.docx) |

> **Purpose.** Defines the build/deploy pipeline, branching, environments, feature flags, release cadence, and rollback for web, API, and desktop agent.

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

## 1. Repository & Branching
- Repo: `github.com/iamrolanatl/sparkle`. Trunk-based: short-lived branches (`feat/…`, `fix/…`, `docs/…`) → PR → `main`.
- Branch protection on `main`: PR required, CI green, ≥1 review (**TBD (Rolan)** who reviews), no force-push.
- Conventional Commits; doc-baseline changes must reference a CR ID.

## 2. Pipeline (GitHub Actions)
| Trigger | Steps |
|---|---|
| Pull request | lint, typecheck, unit, integration, perf smoke, docs control check (CR/changelog present when `docs/` baseline changes) |
| Merge to `main` | deploy to **staging** (Cloudflare Workers + Next.js), Supabase migrations to staging |
| Release tag | manual approval (GitHub Environment) after staging verification + phase-gate checklist → **production** |

## 3. Secrets
Stored in GitHub Environments / Cloudflare secrets; never in the repo. Required: Supabase access token, anon & service-role keys; Cloudflare API token; Google OAuth client; xAI & Anthropic keys (Phase 3); code-signing certificates (agent).

## 4. Feature Flags
All new animation, robot behaviors, live features and connector changes behind flags; staged rollout by % or district.

## 5. Desktop Agent
Signed Windows/macOS builds; staged % rollout; instant rollback; version reporting in admin fleet view; force-update/revoke.

## 6. Release Cadence & Versioning
Web/API continuous behind flags; agent bi-weekly or as needed; major releases aligned to phase gates. SemVer tags; GitHub Releases notes generated from changelog.

## 7. Rollback
Automated on error-rate/latency regression (thresholds **TBD (Eng Lead)**); agent versions revocable from admin.

**Corrections vs. original:** added branching/protection, secrets, Supabase migrations, docs-control check, versioning; production deploy is by tag + approval rather than ambiguous "after staging".

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
| 0.1 | Oct 2026 | Original library author | — | Original Word version (DevOps CI/CD Plan & GitHub Release Management (01M5GCZSKQ2BE69YJSE01VHQW9.docx)). |
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
