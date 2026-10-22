# Shopping list (FR-08) + Vault (FR-24) — build plan (DRAFT, awaiting mockup approval)

## Shopping list API (apps/api/src/shopping/route.ts, mounted /shopping)
| Method | Path | Notes |
|---|---|---|
| GET | /students/:id/list | calls `household_for_student` → returns items + members (display name, initials, role only) |
| POST | /lists/:hh/items | {title, quantity, category, class_label?, notes?, assigned_to?}; zod; NL parse "2 notebooks for ELA" → qty/category/class |
| PATCH | /items/:id | qty, notes, assigned_to, done, position (Idempotency-Key) |
| DELETE | /items/:id | soft delete (`deleted_at`); 7-day undo client-side |
| GET | /students/:id/list/suggestions | supply mentions from `post_insights` (teacher posts); add only on tap |
Realtime: web subscribes to `postgres_changes` on `shopping_items` filtered by household_id (RLS enforced). Presence channel for "online".
Tests: RLS suite — non-member read/write denied; member can't reassign household/created_by; assignee outside household rejected; no grades/messages fields in payload (FR-08 no-leakage).

## Vault
Backend already merged (migration 20261022150000_c_vault_schema.sql, apps/api/src/vault/*): documents upload/list/content/delete, consent, grants, access log, KEK rotation, fail-closed flag. Build = web UI only:
- /app/vault page replacing the "Soon" link: list + class filters, search over OCR text, review card (sender/date/action → optional task, human confirm per FR-24f), upload (on-device tesseract per DEC-127), access log, who-can-see legend, sensitive step-up re-auth (DEC-39).
- Stays behind `vault_enabled=false` + `is_sample=true` (DEC-37/144); sample banner shown. No new migration needed unless search index missing (check `ocr_text` tsvector index).
