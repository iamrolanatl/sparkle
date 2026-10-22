import { resilientFetch } from "../lib/resilience";

export interface AuthEnv {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
}

/** Resolve the caller from their Supabase access token (Authorization: Bearer). Returns null if invalid. */
export async function getUser(
  env: AuthEnv,
  authHeader: string | undefined,
  f: typeof fetch = resilientFetch(fetch, { timeoutMs: 3000 }),
) {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !env.SUPABASE_URL) return null;
  const r = await f(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_SECRET_KEY ?? "",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!r.ok) return null;
  const u = (await r.json()) as { id?: string };
  return u.id ? { id: u.id, token } : null;
}

/** Ask Postgres (as the user, through RLS-aware RPCs) whether they may act on a student. */
export async function userRpc<T>(
  env: AuthEnv,
  token: string,
  fn: string,
  args: Record<string, unknown>,
  f: typeof fetch = resilientFetch(fetch, { timeoutMs: 3000 }),
): Promise<T | null> {
  const r = await f(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_SECRET_KEY ?? "",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) return null;
  return (await r.json()) as T;
}
