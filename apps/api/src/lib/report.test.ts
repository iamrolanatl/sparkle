import { describe, expect, it, vi } from "vitest";
import { crashSink, sentrySink, toCrashEvent } from "./report";

describe("crash reporter (DEC-184)", () => {
  it("is a no-op without a DSN", () => {
    expect(crashSink({})).toBeNull();
    expect(crashSink(undefined)).toBeNull();
    expect(sentrySink("not-a-dsn")).toBeNull();
  });
  it("scrubs PII from events", () => {
    const e = toCrashEvent(
      new Error("boom for kid@example.com token eyJa.eyJb.sig id 10000000-0000-0000-0000-00000000000a"),
      { path: "/students/10000000-0000-0000-0000-00000000000a/import", method: "POST" },
      "dev",
    );
    expect(e.message).not.toMatch(/example\.com|eyJ|10000000/);
    expect(e.path).toBe("/students/[id]/import");
  });
  it("posts a Sentry envelope and never throws", async () => {
    const f = vi.fn(async () => {
      throw new Error("network");
    });
    const sink = sentrySink("https://k@o1.ingest.sentry.io/123", f as never)!;
    await expect(sink({ message: "m", name: "Error", path: "/", method: "GET", env: "dev" })).resolves.toBeUndefined();
    expect(String((f.mock.calls[0] as unknown[])[0])).toContain("/api/123/envelope/");
  });
});
