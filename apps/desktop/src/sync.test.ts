import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { updateCredential } from "./credentials";
import { isAllowedMockOrigin } from "./mockPortal";
import { httpUploader, jitter, nextRun, runSync } from "./sync";
import { InsecureMemoryCredentialStore, InsecureMemorySyncState } from "./testing/insecureMemory";
import type { PageLike } from "./types";

const SID = "10000000-0000-0000-0000-00000000000a";
const FIXTURE_URL = "file:///app/fixtures/mock-portal/index.html";
const fixture = readFileSync(join(__dirname, "../fixtures/mock-portal/index.html"), "utf8");

/** Fake Page over the fixture: parses data-* divs so unit tests need no browser download. */
function fakePage(o: { landOn?: string; loginOk?: boolean; extraAssignments?: number } = {}) {
  const filled: Record<string, string> = {};
  let current = "about:blank";
  const elems = (sel: string) => {
    const attr = sel.slice(1, -1);
    const found = [...fixture.matchAll(new RegExp(`<div\\s+${attr}="[^"]*"[^>]*>`, "g"))].map(([tag]) => {
      const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
      return { getAttribute: (k: string) => attrs[k] ?? null } as unknown as Element;
    });
    if (attr === "data-assignment") for (let i = 0; i < (o.extraAssignments ?? 0); i++) found.push(found[0]!);
    return found;
  };
  const page: PageLike & { filled: typeof filled } = {
    filled,
    goto: async (u) => void (current = o.landOn ?? u),
    url: () => current,
    fill: async (s, v) => void (filled[s] = v),
    click: async () => {},
    waitForSelector: async () => null,
    $$eval: async (sel, fn) =>
      sel.startsWith("#error") ? fn(o.loginOk === false ? [{} as Element] : []) : fn(elems(sel)),
  };
  return page;
}

const setup = async () => {
  const creds = new InsecureMemoryCredentialStore();
  const state = new InsecureMemorySyncState();
  await creds.set(SID, { username: "demo", password: "s3cret-demo" });
  return { creds, state, base: { studentId: SID, portalUrl: FIXTURE_URL, creds, state, backoffMs: 1 } };
};

describe("origin pin (DEC-168)", () => {
  it("allows only the bundled fixture or localhost", () => {
    expect(isAllowedMockOrigin(FIXTURE_URL)).toBe(true);
    expect(isAllowedMockOrigin("http://localhost:4173/")).toBe(true);
    expect(isAllowedMockOrigin("https://evil.example/fixtures/mock-portal/index.html")).toBe(false);
    expect(isAllowedMockOrigin("file:///etc/passwd")).toBe(false);
    expect(isAllowedMockOrigin("http://localhost.evil.example/")).toBe(false);
  });
  it("refuses a foreign site reached after navigation and never types credentials", async () => {
    const { base } = await setup();
    const page = fakePage({ landOn: "https://evil.example/login" });
    const upload = vi.fn();
    expect(await runSync({ ...base, page, upload })).toEqual({ ok: false, error: "portal_origin_mismatch" });
    expect(page.filled).toEqual({});
    expect(upload).not.toHaveBeenCalled();
  });
  it("refuses a foreign configured URL before navigating", async () => {
    const { base } = await setup();
    const page = fakePage();
    const goto = vi.spyOn(page, "goto");
    const r = await runSync({ ...base, portalUrl: "https://evil.example/", page, upload: vi.fn() });
    expect(r).toEqual({ ok: false, error: "portal_origin_mismatch" });
    expect(goto).not.toHaveBeenCalled();
  });
});

describe("desktop sync agent (mock portal)", () => {
  it("scrapes the fixture and uploads a valid batch without any credential in it", async () => {
    const { base } = await setup();
    const upload = vi.fn(async () => ({ status: 202, body: { ok: true } }));
    const page = fakePage();
    const r = await runSync({ ...base, page, upload, runId: "run-uuid", now: () => new Date("2026-10-22T12:00:00Z") });
    expect(r).toEqual({ ok: true, assignments: 3, queued: true });
    expect(page.filled["#login [name=password]"]).toBe("s3cret-demo");
    const [, batch, key] = upload.mock.calls[0] as unknown as [string, object, string];
    expect(JSON.stringify(batch)).not.toContain("s3cret-demo");
    expect(JSON.stringify(batch)).not.toMatch(/password|"demo"/);
    expect(key).toBe("run-uuid");
    expect((batch as { assignments: { score: number | null }[] }).assignments[2]!.score).toBe(18);
  });
  it("uses a fresh random runKey per run, reused across retries", async () => {
    const { base } = await setup();
    const keys: string[] = [];
    const upload = vi.fn(async (_s: string, _b: unknown, k: string) => {
      keys.push(k);
      return keys.length === 1 ? { status: 503, body: null } : { status: 202, body: {} };
    });
    await runSync({ ...base, page: fakePage(), upload });
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
  });
  it("wrong password → bad_credentials, nothing uploaded, schedule paused until the credential is updated", async () => {
    const { base, creds, state } = await setup();
    const upload = vi.fn();
    expect(await runSync({ ...base, page: fakePage({ loginOk: false }), upload })).toEqual({
      ok: false,
      error: "bad_credentials",
    });
    expect(upload).not.toHaveBeenCalled();
    const page = fakePage();
    expect(await runSync({ ...base, page, upload })).toEqual({ ok: false, error: "paused_bad_credentials" });
    expect(page.filled).toEqual({}); // did not retry the password
    await updateCredential(creds, state, SID, { username: "demo", password: "new" });
    upload.mockResolvedValue({ status: 202, body: {} });
    expect((await runSync({ ...base, page: fakePage(), upload })).ok).toBe(true);
  });
  it("a duplicate reply on retry is unconfirmed, never success", async () => {
    const { base } = await setup();
    const upload = vi
      .fn()
      .mockResolvedValueOnce({ status: 502, body: null })
      .mockResolvedValueOnce({ status: 200, body: { ok: true, duplicate: true } });
    expect(await runSync({ ...base, page: fakePage(), upload })).toEqual({ ok: false, error: "unconfirmed" });
  });
  it("classifies HTTP outcomes", async () => {
    const { base, creds } = await setup();
    const run = (status: number) =>
      runSync({ ...base, page: fakePage(), upload: async () => ({ status, body: null }) });
    expect(await run(401)).toEqual({ ok: false, error: "session_expired" });
    expect(await run(403)).toEqual({ ok: false, error: "session_expired" });
    expect(await run(422)).toEqual({ ok: false, error: "upload_rejected" });
    expect(await run(302)).toEqual({ ok: false, error: "upload_rejected" });
    expect(await run(429)).toEqual({ ok: false, error: "rate_limited" });
    expect(await run(204)).toEqual({ ok: true, assignments: 3, queued: false });
    expect(await run(503)).toEqual({ ok: false, error: "unknown" });
    const flaky = vi.fn().mockRejectedValueOnce(new Error("net")).mockResolvedValue({ status: 200, body: {} });
    expect((await runSync({ ...base, page: fakePage(), upload: flaky })).ok).toBe(true);
    const broken = { ...fakePage(), goto: async () => Promise.reject(new Error("down")) };
    expect(await runSync({ ...base, page: broken, upload: vi.fn() })).toEqual({
      ok: false,
      error: "portal_unreachable",
    });
    await creds.delete(SID);
    expect(await runSync({ ...base, page: fakePage(), upload: vi.fn() })).toEqual({
      ok: false,
      error: "no_credentials",
    });
  });
  it("bounds what the scraper uploads", async () => {
    const { base } = await setup();
    const upload = vi.fn();
    const r = await runSync({ ...base, page: fakePage({ extraAssignments: 500 }), upload });
    expect(r).toEqual({ ok: false, error: "payload_too_large" });
    expect(upload).not.toHaveBeenCalled();
  });
  it("caps the whole run with a budget so a hung portal can't pin the agent", async () => {
    const { base } = await setup();
    const hung = { ...fakePage(), goto: () => new Promise(() => {}) };
    expect(await runSync({ ...base, page: hung, upload: vi.fn(), budgetMs: 20 })).toEqual({
      ok: false,
      error: "timeout",
    });
  });
  it("uploads with the Supabase session token and idempotency key, no redirects followed", async () => {
    const f = vi.fn(async () => Response.json({ ok: true }, { status: 202 }));
    await httpUploader("https://api.test", async () => "jwt", f as never)(SID, {} as never, "k1");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.test/ingest/${SID}/batch`);
    expect(init.redirect).toBe("manual");
    expect(init.headers).toMatchObject({ Authorization: "Bearer jwt", "Idempotency-Key": "k1" });
  });
  it("jittered backoff stays within [0, base·2^n]", () => {
    expect(jitter(1000, 2, () => 0)).toBe(0);
    expect(jitter(1000, 2, () => 0.999)).toBeLessThanOrEqual(4000);
  });
});

describe("schedule (DEC-165, device-local; TZ=America/New_York in the test script)", () => {
  it("runs 3 AM / 11 AM / 7 PM local", () => {
    expect(nextRun(new Date(2026, 9, 22, 12, 0)).getHours()).toBe(19);
    const t = nextRun(new Date(2026, 9, 22, 20, 0));
    expect([t.getDate(), t.getHours()]).toEqual([23, 3]);
  });
  it("handles DST fall-back (2026-11-01) and spring-forward (2027-03-14) exactly once at 03:00", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
    const fall = nextRun(new Date("2026-11-01T04:30:00Z")); // 00:30 EDT
    expect(fall.toISOString()).toBe("2026-11-01T08:00:00.000Z"); // 03:00 EST
    expect(nextRun(fall).toISOString()).toBe("2026-11-01T16:00:00.000Z"); // 11:00 EST, no repeat of 03:00
    const spring = nextRun(new Date("2027-03-14T05:30:00Z")); // 00:30 EST
    expect(spring.toISOString()).toBe("2027-03-14T07:00:00.000Z"); // 03:00 EDT, not skipped
    expect(nextRun(spring).toISOString()).toBe("2027-03-14T15:00:00.000Z");
  });
});
