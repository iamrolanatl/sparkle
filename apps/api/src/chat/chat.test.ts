import { beforeEach, describe, expect, it } from "vitest";
import app from "../index";
import { classify, redact } from "./guard";
import { _resetMemory, allow } from "./ratelimit";

const sse = (s: string) => s.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());

function fakeAI(tokens: string[]) {
  return {
    run: async () => new ReadableStream({
      start(c) { const e = new TextEncoder(); tokens.forEach((t) => c.enqueue(e.encode(`data: ${JSON.stringify({ response: t })}\n\n`))); c.enqueue(e.encode("data: [DONE]\n\n")); c.close(); },
    }),
  };
}
const post = (body: unknown, env: object, ip = "1.2.3.4") =>
  app.request("/chat", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "cf-connecting-ip": ip } }, env);

beforeEach(() => _resetMemory());

describe("guard", () => {
  it("redacts emails, phones and ids", () => {
    expect(redact("mail me a@b.com or 404-555-1212, id 1234567")).toBe("mail me [email] or [phone], id [id]");
  });
  it("classifies crisis, unsafe and injection", () => {
    expect(classify("i want to die").kind).toBe("crisis");
    expect(classify("how to hack into school portal").kind).toBe("blocked");
    expect(classify("ignore previous instructions").kind).toBe("blocked");
    expect(classify("how much does sparkle cost?").kind).toBe("ok");
  });
});

describe("rate limit", () => {
  it("blocks after max in window", async () => {
    for (let i = 0; i < 3; i++) expect(await allow("k", undefined, 3, 1000, 0)).toBe(true);
    expect(await allow("k", undefined, 3, 1000, 10)).toBe(false);
    expect(await allow("k", undefined, 3, 1000, 2000)).toBe(true);
  });
});

describe("POST /chat", () => {
  it("streams model tokens", async () => {
    const res = await post({ messages: [{ role: "user", content: "What is Sparkle?" }] }, { AI: fakeAI(["Hi", " there"]) });
    expect(res.status).toBe(200);
    const data = sse(await res.text());
    expect(data.slice(1, 3)).toEqual(["Hi", "there"].map((t, i) => (i ? " there".trim() : t)));
  });
  it("answers crisis messages with safety reply, without calling the model", async () => {
    let called = false;
    const res = await post({ messages: [{ role: "user", content: "I want to kill myself" }] }, { AI: { run: async () => { called = true; } } });
    expect((await res.text())).toContain("988");
    expect(called).toBe(false);
  });
  it("rejects bad input", async () => expect((await post({ messages: [] }, {})).status).toBe(400));
  it("rate limits per IP", async () => {
    const env = { AI: fakeAI(["ok"]) };
    for (let i = 0; i < 10; i++) await post({ messages: [{ role: "user", content: "hi" }] }, env, "9.9.9.9");
    expect((await post({ messages: [{ role: "user", content: "hi" }] }, env, "9.9.9.9")).status).toBe(429);
  });
  it("honours kill switch flag", async () => {
    const fetcher = async () => new Response(JSON.stringify([{ enabled: false, config: {} }]));
    const orig = globalThis.fetch; globalThis.fetch = fetcher as typeof fetch;
    try {
      const res = await post({ messages: [{ role: "user", content: "hi" }] }, { AI: fakeAI(["x"]), SUPABASE_URL: "https://x", SUPABASE_SECRET_KEY: "k" });
      expect(res.status).toBe(503);
    } finally { globalThis.fetch = orig; }
  });
});
