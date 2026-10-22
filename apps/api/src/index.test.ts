import { describe, expect, it } from "vitest";
import app from "./index";

describe("api", () => {
  it("GET /health returns ok without leaking secrets", async () => {
    const res = await app.request(
      "/health",
      {},
      { APP_ENV: "test", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "s3cret" },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(body.checks).toEqual({ supabaseConfigured: true, aiT1: false, aiT2: false, aiT3: false });
    expect(JSON.stringify(body)).not.toContain("s3cret");
  });
  it("404s unknown routes", async () => expect((await app.request("/nope")).status).toBe(404));
});
