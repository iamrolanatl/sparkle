import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../index";
import { _resetStudyFlagCache } from "./route";
import { _resetMemory } from "../chat/ratelimit";

const SID = "10000000-0000-0000-0000-00000000000a";
const env = { SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "sk", SUPABASE_PUBLISHABLE_KEY: "pk" };
const auth = { Authorization: "Bearer t", "Content-Type": "application/json" };
const stub = (flag: boolean | null, can = true) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("feature_flags")) return Response.json(flag === null ? [] : [{ enabled: flag }]);
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "u1" });
      if (url.includes("rpc/is_student_self")) return Response.json(can);
      if (url.includes("rpc/student_age")) return Response.json(12);
      return Response.json([]);
    }),
  );
const ask = (text: string, e: object = env) =>
  app.request(`/study-helper/${SID}`, { method: "POST", headers: auth, body: JSON.stringify({ text }) }, e);

describe("study helper (DEC-108)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    _resetStudyFlagCache();
    _resetMemory();
  });
  it("is off when the flag row is missing or false", async () => {
    stub(null);
    expect((await ask("help")).status).toBe(404);
    expect(await (await app.request("/study-helper/status", {}, env)).json()).toEqual({ enabled: false });
    _resetStudyFlagCache();
    stub(false);
    expect((await ask("help")).status).toBe(404);
  });
  it("caches the flag, rate-limits per user, bounds body, flags crisis to admin queue", async () => {
    stub(true);
    await ask("help");
    await ask("help");
    const f = globalThis.fetch as unknown as { mock: { calls: [string, RequestInit?][] } };
    expect(f.mock.calls.filter(([u]) => u.includes("feature_flags")).length).toBe(1);
    expect((await ask("x".repeat(5000))).status).toBe(413);
    await ask("i want to die");
    const flag = f.mock.calls.find(([u, i]) => u.endsWith("/chat_sessions") && i?.method === "POST");
    expect(JSON.parse(String(flag![1]!.body))).toEqual({ page: "study-helper", flagged: true, flag_reason: "crisis" });
    for (let i = 0; i < 20; i++) await ask("help");
    expect((await ask("help")).status).toBe(429);
  });
  it("passes budgetKey = student id to the router", async () => {
    stub(true);
    const complete = vi.fn(async (r: { budgetKey?: string }) => (r ? "Try drawing a number line." : ""));
    await ask("fractions?", { ...env, STUDY_ROUTER: { complete } });
    expect(complete.mock.calls[0]![0].budgetKey).toBe(SID);
  });
  it("only the student self (DEC-109); router pending = 503 and reports router pending as 503", async () => {
    stub(true, false);
    expect((await ask("help")).status).toBe(403);
    stub(true);
    expect((await ask("help with fractions")).status).toBe(503);
  });
  it("crisis before any model; coach mode via router", async () => {
    stub(true);
    expect(await (await ask("i want to die")).json()).toMatchObject({ safety: "crisis" });
    const complete = vi.fn(async () => "Let's break the essay into steps. What's your thesis?");
    const r = await ask("write my essay for me", { ...env, STUDY_ROUTER: { complete } });
    expect(await r.json()).toMatchObject({ safety: "ok", mode: "coach" });
  });
});
