import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../index";

const SID = "10000000-0000-0000-0000-00000000000a";
const env = { SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "sk", SUPABASE_PUBLISHABLE_KEY: "pk" };
const auth = { Authorization: "Bearer t", "Content-Type": "application/json" };
const stub = (flag: boolean | null, can = true) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("feature_flags")) return Response.json(flag === null ? [] : [{ enabled: flag }]);
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "u1" });
      if (url.includes("rpc/can_view_student")) return Response.json(can);
      if (url.includes("rpc/student_age")) return Response.json(12);
      return Response.json([]);
    }),
  );
const ask = (text: string, e: object = env) =>
  app.request(`/study-helper/${SID}`, { method: "POST", headers: auth, body: JSON.stringify({ text }) }, e);

describe("study helper (DEC-108)", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("is off when the flag row is missing or false", async () => {
    stub(null);
    expect((await ask("help")).status).toBe(404);
    expect(await (await app.request("/study-helper/status", {}, env)).json()).toEqual({ enabled: false });
    stub(false);
    expect((await ask("help")).status).toBe(404);
  });
  it("respects ai_chat limits and reports router pending as 503", async () => {
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
