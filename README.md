# Sparkle

Student Success Platform: a calm, high-performance student-success app that aggregates school data, prioritizes next actions with AI, and includes the Sparkle companion robot.

Project documentation lives in [`docs/`](docs/README.md).

## Monorepo (Phase 0 foundation)

| Path | What |
|---|---|
| `apps/web` | Next.js (App Router) + TS + Tailwind 4 + Framer Motion, mobile-first; Google sign-in via `@supabase/ssr`; deploys to Cloudflare Workers via OpenNext |
| `apps/api` | Hono on Cloudflare Workers (`GET /health`) |
| `packages/ui` | Glass + cyan/teal neon tokens, light/dark high-contrast themes, reduced-motion, FPS-guarded aurora background |
| `packages/sparkle-character` | Placeholder full-body Sparkle robot (idle / excited / thoughtful / helping) with a Rive integration point |
| `supabase/` | Migrations (multi-tenant model + RLS) and RLS tests |

## Local development

Requires Node 22 (`.nvmrc`) and pnpm 10.

```bash
pnpm install
cp .env.example apps/web/.env.local     # fill SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
cp .env.example apps/api/.dev.vars      # optional
pnpm dev                                # web on :3000, api via wrangler dev
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm test` also runs `supabase/tests/rls_test.sql` against the migration in an in-memory Postgres (PGlite).

## Database migrations (not auto-applied)

```bash
# Local (Docker): supabase start && supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls_test.sql
# Remote (only after sponsor approval):
supabase link --project-ref "$SUPABASE_PROJECT_REF"   # uses SUPABASE_ACCESS_TOKEN
supabase db push --dry-run                            # review
supabase db push
```

## Deploy (manual)

- API: GitHub → Actions → **Deploy API worker** → Run workflow, type `deploy`. Or locally: `cd apps/api && pnpm exec wrangler deploy` with `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` set.
- Web: `cd apps/web && pnpm deploy` (OpenNext → Cloudflare Workers) with the Supabase public vars set. Add the deployed URL `/auth/callback` to Supabase Auth redirect URLs.

Never commit secrets. Use `.env.example` for names only.
