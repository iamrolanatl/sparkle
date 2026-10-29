import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./lib/env";
import { NONCE_ROUTES, contentSecurityPolicy } from "./lib/security-headers";

/** Refreshes the Supabase auth session cookie on each request. */
export async function middleware(request: NextRequest) {
  // DEC-186: per-request nonce CSP for signed-in (dynamic) routes; Next applies the nonce to its scripts.
  let csp: string | null = null;
  if (NONCE_ROUTES.test(request.nextUrl.pathname)) {
    const nonce = btoa(crypto.randomUUID());
    const api = (process.env.NEXT_PUBLIC_API_URL ?? "https://sparkle-api.crystal-iamrolan.workers.dev").split(",");
    csp = contentSecurityPolicy(process.env.SUPABASE_URL ?? "", api, process.env.NEXT_PUBLIC_SENTRY_DSN, nonce);
    request.headers.set("x-nonce", nonce);
    request.headers.set("Content-Security-Policy", csp);
  }
  const withCsp = (r: NextResponse) => {
    if (csp) r.headers.set("Content-Security-Policy", csp);
    return r;
  };
  let response = NextResponse.next({ request });
  const env = supabaseEnv();
  if (!env) return withCsp(response);
  // CR-0007: anonymous visitors (no Supabase auth cookie) never trigger an Auth round-trip.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return withCsp(response);
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims refreshes an expired session (writing cookies) but verifies the JWT locally otherwise: no Auth round-trip per request.
  await supabase.auth.getClaims();
  return withCsp(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|riv|mp4|webm|webmanifest)$).*)",
  ],
};
