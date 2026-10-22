# Tech Lead Review — Team A (FR-21 natural-language tasks, AI study-helper guardrails)

## 2026-10-21 (pre-build)
**Docs reviewed:** Requirements-Baseline (FR-02, FR-21, NFRs incl. CR-0007 NFR-35+), TDD §8 (8.1–8.6), Design-System (CR-0008), WBS, Decision-Log, RAID, SOP-01/03/06/10/13, Definition-of-Done, Vault-Compliance plan (no FR-21 impact; vault untouched).

**Gaps found → actions**
| # | Gap | Action |
|---|---|---|
| 1 | TDD §8.1 has no `tasks` entity; §8.1 says school data is service-role-write only, which would wrongly forbid user-authored tasks | Added `tasks` row + DEC-101 (user-authored, RLS-writable by student/guardian; helpers read-only) in Team A docs PR |
| 2 | WBS 4.8 "Not started", no sub-items for review step / guardrails | Updated 4.8 to In progress with 4.8.1–4.8.4 |
| 3 | WBS 4.1, 4.3, 4.9, 5.2 show "Not started" though PRs #17/#19/#20/#23 exist | Not my lane — flagged in a `docs-gap` issue for Integration |
| 4 | FR-21 "Tier 1 AI fallback" depends on router PR #20 (unmerged); no stated confidence threshold | DEC-100: deterministic first, AI suggestion only when confidence < 0.6, always human review |
| 5 | WBS 5.4 coach-mode / crisis guardrails unowned, crisis copy needs expert review | DEC-102/103; crisis copy reused from FR-19 guard; counsel/expert review logged for Rolan (RAID R-A1) |
| 6 | `student_age(uuid)` RPC is granted to `authenticated` with no access check (any user can learn any student's age by id) | Security gap, pre-existing, not Team A code — reported in `docs-gap` issue for Integration |
