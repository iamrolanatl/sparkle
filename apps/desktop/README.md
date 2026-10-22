# @sparkle/desktop — sync agent (Team D, FR-11, WBS 3.2)

TypeScript core + Tauri v2 shell for the desktop agent. **Mock portal only** (DEC-161).

- `credentials.ts` – `CredentialStore` (OS keychain via the shell; DEC-160) and `SyncStateStore` (per-student pause). Test doubles live in `src/testing/` only.
- `mockPortal.ts` – Playwright adapter for `fixtures/mock-portal`. Origin pin (bundled fixture or localhost) checked after navigation and before any typing (DEC-168). Client-side size/length bounds.
- `sync.ts` – run → batch → `POST /ingest/:id/batch` with the user's Supabase session. One random `runKey` per run, reused across retries; jittered backoff; 90 s run budget. Result codes: `bad_credentials` (pauses the schedule until the credential is updated), `session_expired` (401/403), `upload_rejected` (other 3xx/4xx), `rate_limited`, `unconfirmed` (server reported duplicate; never shown as green), `timeout`, `portal_origin_mismatch`, `payload_too_large`, `portal_unreachable`, `unknown`. 2xx = success (202 queued; 200/204 written inline).
- `config/agent.json` – the single API base per env. `pnpm gen:tauri-config [dev|production]` writes the matching CSP; a unit test fails if they drift.
- `e2e/` – real Chromium run against the fixture with a hard network wall (`context.route` aborts anything non-`file:`).
- `src-tauri/` – keychain commands (`credential_set/exists/delete`, keyed `<profile_id>:<student_id>`, `Zeroizing` buffers; the webview can never read a password back), strict CSP, `core:default` only, `bundle.active = false`, **no signing** (SA-D3).

CI: `.github/workflows/desktop.yml` (paths-scoped; pinned action SHAs; unit + Playwright, `cargo check --locked` + Rust tests + `cargo deny check advisories`).

Not yet included: signed installers (SA-D3) and the Node/Playwright sidecar wiring inside the shell.
