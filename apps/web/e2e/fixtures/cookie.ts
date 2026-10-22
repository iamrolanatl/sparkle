/** @supabase/ssr auth cookie(s) for a session (no Playwright import, unit-tested). */
export function authCookie(projectUrl: string, session: unknown) {
  const ref = new URL(projectUrl).hostname.split(".")[0];
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  // @supabase/ssr chunks cookies over ~3180 chars: name.0, name.1, ...
  const name = `sb-${ref}-auth-token`;
  const size = 3180;
  if (value.length <= size) return [{ name, value }];
  const out: { name: string; value: string }[] = [];
  for (let i = 0; i * size < value.length; i++)
    out.push({ name: `${name}.${i}`, value: value.slice(i * size, (i + 1) * size) });
  return out;
}
