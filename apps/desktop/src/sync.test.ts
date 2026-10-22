import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MemoryCredentialStore } from "./credentials";
import { httpUploader, nextRun, runSync } from "./sync";
import type { PageLike } from "./types";

const SID = "10000000-0000-0000-0000-00000000000a";
const fixture = readFileSync(join(__dirname, "../fixtures/mock-portal/index.html"), "utf8");

/** Fake Page over the fixture: parses data-* divs so tests need no browser download. */
function fakePage(): PageLike & { filled: Record<string, string> } {
  const filled: Record<string, string> = {};
  const elems = (sel: string) => {
    const attr = sel.slice(1, -1);
    return [...fixture.matchAll(new RegExp(`<div\\s+${attr}="[^"]*"[^>]*>`, "g"))].map(([tag]) => {
      const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
      return { getAttribute: (k: string) => attrs[k] ?? null } as unknown as Element;
    });
  };
  return {
    filled,
    goto: async () => null,
    fill: async (s, v) => void (filled[s] = v),
    click: async () => {},
    $$eval: async (sel, fn) => fn(elems(sel)),
  };
}

describe("desktop sync agent (mock portal)", () => {
  it("scrapes the fixture and uploads a valid batch without any credential in it", async () => {
    const creds = new MemoryCredentialStore();
    await creds.set(SID, { username: "demo", password: "s3cret-demo" });
    const upload = vi.fn(async () => ({ status: 202, body: { ok: true } }));
    const page = fakePage();
    const r = await runSync({
      studentId: SID,
      portalUrl: "file://mock",
      page,
      creds,
      upload,
      now: () => new Date("2026-10-22T12:00:00Z"),
    });
    expect(r).toEqual({ ok: true, assignments: 3, queued: true });
    expect(page.filled["#login [name=password]"]).toBe("s3cret-demo");
    const [, batch, key] = upload.mock.calls[0] as unknown as [string, object, string];
    expect(JSON.stringify(batch)).not.toContain("s3cret-demo");
    expect(JSON.stringify(batch)).not.toMatch(/password|demo"/);
    expect(key).toBe("10000000-20261022120000000");
    expect((batch as { assignments: { score: number | null }[] }).assignments[2]!.score).toBe(18);
  });
  it("classifies failures", async () => {
    const creds = new MemoryCredentialStore();
    const base = { studentId: SID, portalUrl: "x", page: fakePage(), creds, backoffMs: 1 };
    expect(await runSync({ ...base, upload: vi.fn() })).toEqual({ ok: false, error: "no_credentials" });
    await creds.set(SID, { username: "u", password: "p" });
    expect(await runSync({ ...base, upload: async () => ({ status: 429, body: null }) })).toEqual({
      ok: false,
      error: "rate_limited",
    });
    expect(await runSync({ ...base, upload: async () => ({ status: 422, body: null }) })).toEqual({
      ok: false,
      error: "upload_rejected",
    });
    const flaky = vi.fn().mockRejectedValueOnce(new Error("net")).mockResolvedValue({ status: 200, body: {} });
    expect((await runSync({ ...base, upload: flaky })).ok).toBe(true);
    const broken = { ...fakePage(), goto: async () => Promise.reject(new Error("down")) };
    expect(await runSync({ ...base, page: broken, upload: vi.fn() })).toEqual({
      ok: false,
      error: "portal_unreachable",
    });
  });
  it("uploads with the Supabase session token and idempotency key", async () => {
    const f = vi.fn(async () => Response.json({ ok: true }, { status: 202 }));
    await httpUploader("https://api.test", async () => "jwt", f as never)(SID, {} as never, "k1");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.test/ingest/${SID}/batch`);
    expect(init.headers).toMatchObject({ Authorization: "Bearer jwt", "Idempotency-Key": "k1" });
  });
  it("schedules 3 AM / 11 AM / 7 PM local", () => {
    expect(nextRun(new Date(2026, 9, 22, 12, 0)).getHours()).toBe(19);
    const t = nextRun(new Date(2026, 9, 22, 20, 0));
    expect([t.getDate(), t.getHours()]).toEqual([23, 3]);
  });
});
