# Tech Lead Review — Team B (FR-23 OCR scanning)

## 2026-10-21 (pre-build)
**Reviewed:** Requirements-Baseline (FR-23, FR-24, NFR-20..34), CR-0007 NFRs / Scalability-Reliability-Plan, TDD §8, Design-System (CR-0008), WBS 4.10 / 6.7, Decision Log (DEC-20..39), RAID (R-16, R-18, R-23), SOPs, Definition of Done, Vault-Compliance-and-Security-Plan, RTM.

| # | Gap | Action |
|---|-----|--------|
| 1 | FR-23 accepts any school doc, but DEC-31 forbids server OCR for the sensitive class; nothing says how scans tell sensitive from standard. | DEC-124: scans reject sensitive docs (user flag + keyword check) and point to the vault (FR-24). |
| 2 | R-23: Workers AI may process outside the US; FR-23 makes it the fallback with no switch. | DEC-125: server OCR is off by default (`SCANS_OCR_SERVER`); on-device text required until Integration turns it on in dev. |
| 3 | No retention rule for `sparkle-scans` originals or unsaved scans (Vault Plan covers vault files only). | DEC-126 proposes a 30-day purge of unsaved/discarded scans; cron is backlog (WBS 4.10.4). Docs-gap issue for Integration to add to the retention schedule. |
| 4 | TDD §8 has no `scans` entity. | Covered by the migration PR plus an interface-change issue; Integration to add a §8 row. |
| 5 | DEC-22 also lists passwords/PINs; regex redaction can't detect those reliably. | Logged as a known limit; the review gate is the control. |
| 6 | No Queue binding exists in wrangler.toml; Scalability Plan assumes Queues. | Code falls back to `waitUntil` when `SCAN_QUEUE` is unbound; Integration to create queue `sparkle-scans-ocr` (free tier). |

## 2026-10-21 (milestone: review responses)
**Reviewed again:** Team E reviews on #44/#45, Integration notes on SOP-15 and #55, Team C OcrResult contract (#54).

| # | Gap | Action |
|---|-----|--------|
| 7 | Scans RLS ignored DEC-06 student limits | Policy and API now require `can_view_student(...,'resources')` for guardians (#44, #45) |
| 8 | Server OCR (llava) unsafe: captioning model, OOM risk, sensitive bypass | DEC-127: on-device only; DEC-125 superseded |
| 9 | Two producers of the OCR hand-off | Adopted #54 OcrResult; asked for a shared SENSITIVE regex in `shared/ocr.ts` |
| 10 | No cron registry for purge | `purgeScans()` ready; Integration to wire daily cron (#49) |
