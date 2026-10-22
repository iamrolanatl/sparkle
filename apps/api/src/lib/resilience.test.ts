import { describe, expect, it, vi } from "vitest";
import { backoff, resilientFetch } from "./resilience";
import { Hono } from "hono";
import { idempotency } from "./middleware";

const noSleep = { sleep: async () => {} };

describe("resilientFetch", () => {
  it("retries GET on 503 then succeeds", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok"));
    const r = await resilientFetch(f as unknown as typeof fetch, noSleep)("https://x");
    expect(await r.text()).toBe("ok");
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("never retries POST by default", async () => {
    const f = vi.fn().mockResolvedValue(new Response("", { status: 503 }));
    const r = await resilientFetch(f as unknown as typeof fetch, noSleep)("https://x", { method: "POST" });
    expect(r.status).toBe(503);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("times out a hung request", async () => {
    const hang: typeof fetch = (_i, init) =>
      new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
    await expect(resilientFetch(hang, { timeoutMs: 20, retries: 1, ...noSleep })("https://x")).rejects.toThrow();
  });
  it("bounded jittered backoff", () => {
    expect(backoff(0, 100, () => 0)).toBe(50);
    expect(backoff(2, 100, () => 1)).toBe(400);
  });
});

describe("idempotency middleware", () => {
  it("replays the first response for a repeated key", async () => {
    const mem = new Map<string, Response>();
    const cache = {
      match: async (r: Request) => mem.get(r.url)?.clone(),
      put: async (r: Request, res: Response) => void mem.set(r.url, res),
    } as unknown as Cache;
    let n = 0;
    const app = new Hono();
    app.use("*", idempotency(cache));
    app.post("/t", (c) => c.json({ n: ++n }));
    const h = { "Idempotency-Key": "abcdef123456" };
    const a = await (await app.request("/t", { method: "POST", headers: h })).json();
    const second = await app.request("/t", { method: "POST", headers: h });
    expect(await second.json()).toEqual(a);
    expect(second.headers.get("Idempotent-Replayed")).toBe("true");
    expect(n).toBe(1);
  });
});
