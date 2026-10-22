import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

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
