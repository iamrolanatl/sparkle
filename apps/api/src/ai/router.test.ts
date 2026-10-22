import { describe, expect, it, vi } from "vitest";
import { BudgetExceededError, createRouter, type Provider } from "./router";

const ok =
  (text: string): Provider =>
  async () => ({ text, tokens: 10 });
const bad: Provider = async () => {
  throw new Error("down");
};
const src = [{ id: "a1", title: "Assignment: Lab report" }];

describe("AI router (WBS 5.2)", () => {
  it("routes by task to the preferred tier", async () => {
    const r = createRouter({
      providers: {
        t1: { model: "m1", call: ok("one") },
        t2: { model: "m2", call: ok("two") },
        t3: { model: "m3", call: ok("three") },
      },
    });
    expect((await r.run({ task: "summarize", system: "", prompt: "x", sources: src, budgetKey: "s" })).tier).toBe("t1");
    expect((await r.run({ task: "draft", system: "", prompt: "x", sources: src, budgetKey: "s" })).tier).toBe("t2");
    expect((await r.run({ task: "reason", system: "", prompt: "x", sources: src, budgetKey: "s" })).tier).toBe("t3");
  });
  it("falls back to a cheaper tier when keys are missing or a tier fails", async () => {
    const r = createRouter({ providers: { t1: { model: "m1", call: ok("one") }, t3: { model: "m3", call: bad } } });
    const out = await r.run({ task: "reason", system: "", prompt: "x", sources: src, budgetKey: "s" });
    expect(out.tier).toBe("t1");
    expect(out.sources).toEqual(src);
  });
  it("opens the circuit after 3 failures", async () => {
    let t = 0;
    const call = vi.fn(bad);
    const r = createRouter({
      providers: { t2: { model: "m2", call }, t1: { model: "m1", call: ok("one") } },
      now: () => t,
    });
    for (let i = 0; i < 3; i++) await r.run({ task: "draft", system: "", prompt: "x", sources: src, budgetKey: "s" });
    expect(r.breakers.t2.open).toBe(true);
    await r.run({ task: "draft", system: "", prompt: "x", sources: src, budgetKey: "s" });
    expect(call).toHaveBeenCalledTimes(3);
    t = 31_000;
    expect(r.breakers.t2.open).toBe(false);
  });
  it("enforces the daily budget", async () => {
    const r = createRouter({
      providers: { t1: { model: "m1", call: ok("x") } },
      budget: { get: async () => 20_000, add: async () => {} },
    });
    await expect(
      r.run({ task: "summarize", system: "", prompt: "x", sources: src, budgetKey: "s" }),
    ).rejects.toBeInstanceOf(BudgetExceededError);
  });
  it("requires grounding sources for generative tasks", async () => {
    const r = createRouter({ providers: { t1: { model: "m1", call: ok("x") } } });
    await expect(r.run({ task: "explain", system: "", prompt: "x", sources: [], budgetKey: "s" })).rejects.toThrow(
      /sources/,
    );
  });
});

describe("router from env", () => {
  it("uses Workers AI as T1 and records budget", async () => {
    const { routerFromEnv } = await import("./env");
    const store = new Map<string, string>();
    const kv = {
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string) => void store.set(k, v),
    } as unknown as KVNamespace;
    const ai = { run: vi.fn(async () => ({ response: "hi [1]", usage: { total_tokens: 42 } })) };
    const out = await routerFromEnv({ AI: ai, TODAY_CACHE: kv }).run({
      task: "explain",
      system: "s",
      prompt: "p",
      sources: src,
      budgetKey: "k",
    });
    expect(out).toMatchObject({ tier: "t1", tokens: 42, text: "hi [1]" });
    expect([...store.values()]).toEqual(["42"]);
  });
});
