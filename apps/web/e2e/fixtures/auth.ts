import { authCookie } from "./cookie";
import { test as base, expect, type BrowserContext } from "@playwright/test";

/**
 * Signed-in session fixture (sparkle-dev only). Signs the sample E2E user in with the
 * password grant and injects the @supabase/ssr auth cookie, so specs start signed in.
 * Needs E2E_SUPABASE_URL, E2E_SUPABASE_KEY (publishable), E2E_EMAIL, E2E_PASSWORD.
 * Without them, signed-in specs are skipped. Never point this at production.
 */
const env = {
  url: process.env.E2E_SUPABASE_URL,
  key: process.env.E2E_SUPABASE_KEY,
  email: process.env.E2E_EMAIL,
  password: process.env.E2E_PASSWORD,
};
export const hasSession = Boolean(env.url && env.key && env.email && env.password);

export async function signIn(context: BrowserContext, baseURL: string) {
  const res = await fetch(`${env.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.key!, "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.email, password: env.password }),
  });
  if (!res.ok) throw new Error(`E2E sign-in failed: ${res.status}`);
  const session = await res.json();
  const { hostname } = new URL(baseURL);
  await context.addCookies(
    authCookie(env.url!, session).map((c) => ({
      ...c,
      domain: hostname,
      path: "/",
      sameSite: "Lax" as const,
      secure: baseURL.startsWith("https"),
    })),
  );
}

export const test = base.extend<{ signedIn: void }>({
  signedIn: async ({ context, baseURL }, provide, testInfo) => {
    testInfo.skip(!hasSession, "E2E session env not set (sparkle-dev only)");
    await signIn(context, baseURL!);
    await provide();
  },
});
export { expect };
