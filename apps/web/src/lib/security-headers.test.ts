import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders, sentryOrigin } from "./security-headers";

describe("security headers (DEC-180)", () => {
  it("locks framing, objects and base-uri", () => {
    const csp = contentSecurityPolicy("https://x.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self' https://x.supabase.co wss://x.supabase.co");
  });
  it("includes HSTS and nosniff", () => {
    const keys = securityHeaders("https://x.supabase.co").map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining(["Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options"]),
    );
  });
});

describe("CSP integration fixes (#27 review)", () => {
  const sb = "https://abc.supabase.co";
  it("form-action allows Supabase OAuth redirect", () => {
    expect(contentSecurityPolicy(sb)).toMatch(
      /form-action 'self' https:\/\/abc\.supabase\.co https:\/\/accounts\.google\.com/,
    );
  });
  it("connect-src includes the Sentry ingest origin when a DSN is set", () => {
    expect(contentSecurityPolicy(sb, [], "https://k@o1.ingest.sentry.io/42")).toMatch(
      /connect-src [^;]*https:\/\/o1\.ingest\.sentry\.io/,
    );
    expect(sentryOrigin("not a url")).toBe("");
  });
  it("geolocation is disabled (weather uses school ZIP, DEC-75)", () => {
    const pp = securityHeaders(sb).find((h) => h.key === "Permissions-Policy")!.value;
    expect(pp).toContain("geolocation=()");
  });
  it("allows self-hosted tesseract wasm + worker for /app/scan, no blob:/CDN (DEC-77)", () => {
    const csp = contentSecurityPolicy("https://x.supabase.co");
    const dir = (n: string) => csp.split("; ").find((d) => d.startsWith(n + " "))!;
    expect(dir("script-src")).toContain("'wasm-unsafe-eval'");
    expect(dir("worker-src")).toBe("worker-src 'self'");
    expect(csp).not.toMatch(/jsdelivr|unpkg|cdnjs/);
  });
});
