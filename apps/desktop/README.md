# @sparkle/desktop — sync agent core (Team D, FR-11, WBS 3.2)

TypeScript core for the Tauri + Playwright desktop agent. **Mock portal only.**

- `credentials.ts` – on-device credential store interface (OS keychain via Tauri keyring in the shell; DEC-160). Never uploaded.
- `mockPortal.ts` – Playwright adapter for `fixtures/mock-portal` (synthetic data). No real-portal adapters until terms review (DEC-161, SA-D1).
- `sync.ts` – run → batch → `POST /ingest/:id/batch` with the user's Supabase session; redacted error classes; 3/11/19 local schedule.

Not yet included (gated): the Tauri Rust shell + signed installers (needs Apple/Windows code-signing certs, D-05/SA-D3) and a real Playwright browser run in CI (adds ~150 MB browsers; follow-up).
