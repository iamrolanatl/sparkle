# Tech Lead Review — Team D (Desktop sync agent & ingest)

## 2026-10-21 (pre-build / milestone 1)

**Docs reviewed:** Requirements-Baseline (FR-02/03/11/12, NFR-05/10/37, CR-0007 NFRs), TDD §8 (access model) and new §8.7, Design-System (CR-0008 — no UI in this milestone), WBS 3.x, Decision Log, RAID, SOP-02/03/12, Definition of Done, Vault Compliance Plan (no overlap: no vault data in ingest).

| # | Gap | Action |
|---|---|---|
| 1 | FR-03 / NFR-05 say credentials are "device-stored **by default**", implying a central option; conflicts with on-device-only rule | Issue #32 (`docs-gap`) — needs Lane 2 CR by Integration/PM; DEC-160 records the rule |
| 2 | FR-11 traces to WBS 3.3, but the desktop agent is WBS 3.2 | Issue #32 |
| 3 | FR-11 schedule timezone TBD | DEC-165 device-local — **accepted by PM 2026-10-21** |
| 4 | WBS 3.2 shown fully "Blocked", but mock-only work is not gated | WBS 3.2 → In progress (mock only) |
| 5 | TDD had no ingest pipeline design (DO/Queue/DLQ, contract) | TDD §8.7 added (PR #30) |
| 6 | Queues need Workers Paid; no cost item existed | SA-D2, DEC-164, R-D1 |
| 7 | SOP-12 lacked an explicit terms-of-use review step | SOP-12 v1.1 step 2 added (PM request) |

**Interface changes announced:** issue #31 (`POST /ingest/:id/batch`, Worker `queue` handler, `SyncCoordinator` export).

## 2026-10-21 (milestone 2 — after Team E review of #30)
Gaps from review fixed in #30 (two-phase admission, scores persisted, provenance, byte cap, DO timeouts, credential filter, TDD §8.7 placement). New DEC-166, DEC-167. Interface update posted on #31.

## 2026-10-22 (milestone 3 — Team C/E reviews of #47/#61, Integration requests on #30)
- #30: migration renamed `20261022130000_d_ingest_provenance.sql` (only in #30), SOP-15 rollback note, rebased on main, queue handler registered via `queues.ts` (#55); default export untouched.
- #47/#61: all blockers and should-fixes addressed (DEC-168); R-D2 added; WBS 3.2 updated. Stack order: #30 → #47 → #61 → #51.
- Docs gap #32 superseded by CR-0011 (SA-21) on main.
