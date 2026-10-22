import { resilientFetch } from "./resilience";

/** Service-role PostgREST helper (server only). Writes school data on behalf of authorized users. */
export function serviceRest(
  env: { SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string },
  f: typeof fetch = resilientFetch(fetch, { timeoutMs: 5000 }),
) {
  return async <T = unknown>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> => {
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("supabase not configured");
    const r = await f(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        Prefer: init.prefer ?? "return=representation",
      },
    });
    if (!r.ok) throw new Error(`supabase ${path.split("?")[0]} ${r.status}`);
    const t = await r.text();
    return (t ? JSON.parse(t) : null) as T;
  };
}
