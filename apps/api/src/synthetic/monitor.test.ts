import { describe, expect, it } from "vitest";
import { probe, runProbes, targets } from "./monitor";

const env = { API_URL: "https://api.test", WEB_URL: "https://web.test" };
const ok: typeof fetch = async (u) =>
  String(u).endsWith("/health") ? Response.json({ ok: true }) : new Response("hi", { status: 200 });

describe("synthetic monitor", () => {
  it("passes when api /health is ok and web serves 200", async () => {
    const r = await runProbes(targets(env), ok);
    expect(r.every((x) => x.ok)).toBe(true);
  });
  it("throws (alerts) when a target fails", async () => {
    const bad: typeof fetch = async (u) =>
      String(u).endsWith("/health") ? Response.json({ ok: false }) : new Response("x", { status: 503 });
    await expect(runProbes(targets(env), bad)).rejects.toThrow(/api-health=200, web-home=503/);
  });
  it("records network errors without leaking details", async () => {
    const boom: typeof fetch = async () => {
      throw new TypeError("network");
    };
    const r = await probe({ name: "x", url: "https://x" }, boom);
    expect(r).toMatchObject({ ok: false, status: 0, error: "TypeError" });
  });
});
