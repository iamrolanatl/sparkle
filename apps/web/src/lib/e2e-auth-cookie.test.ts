import { describe, expect, it } from "vitest";
import { authCookie } from "../../e2e/fixtures/cookie";

describe("authCookie", () => {
  it("names the cookie after the project ref and chunks large sessions", () => {
    const small = authCookie("https://abc.supabase.co", { a: 1 });
    expect(small[0]!.name).toBe("sb-abc-auth-token");
    expect(small[0]!.value.startsWith("base64-")).toBe(true);
    const big = authCookie("https://abc.supabase.co", { a: "x".repeat(5000) });
    expect(big.map((c) => c.name)).toEqual(["sb-abc-auth-token.0", "sb-abc-auth-token.1", "sb-abc-auth-token.2"]);
  });
});
