import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../index";
import { coordinate, MIN_INTERVAL_MS } from "./coordinator";
import { ingestQueue } from "./route";
import { validateBatch, type SyncBatch } from "./schema";
import { writeBatch } from "./writer";

const SID = "10000000-0000-0000-0000-00000000000a";
const good = (): SyncBatch => ({
  studentId: SID,
  source: "mock-portal",
  runKey: "run-1",
  capturedAt: "2026-10-22T12:00:00Z",
  classes: [{ externalId: "c1", name: "Algebra I", teacher: "Ms. Rivera", period: "2" }],
  assignments: [
    {
      externalId: "a1",
      classExternalId: "c1",
      title: "Worksheet 3",
      dueAt: "2026-10-23T03:59:00Z",
      status: "assigned",
      score: null,
      maxScore: 10,
    },
  ],
});

describe("validateBatch", () => {
  it("accepts a good batch", () => expect(validateBatch(good(), SID).errors).toEqual([]));
  it("rejects any credential-shaped field, at any depth", () => {
    const b = good() as unknown as Record<string, unknown>;
    (b.classes as Record<string, unknown>[])[0]!.sessionCookie = "x";
    expect(validateBatch(b, SID).errors[0]).toMatch(/credentials stay on the device/);
    expect(validateBatch({ ...good(), password: "p" }, SID).errors[0]).toMatch(/password/);
  });
  it("lets legitimate keys like author / sessionNumber through", () => {
    const b = good() as unknown as Record<string, unknown>;
    const c = (b.classes as Record<string, unknown>[])[0]!;
    Object.assign(c, { author: "x", authorName: "y", sessionNumber: 2, tokenizer: "z" });
    expect(validateBatch(b, SID).errors).toEqual([]);
    for (const k of ["accessToken", "api_key", "Authorization", "session_id", "PASSWORD"])
      expect(validateBatch({ ...good(), [k]: "v" }, SID).errors[0]).toMatch(/credentials stay on the device/);
  });
  it("rejects real/unknown portals, mismatched student, bad rows", () => {
    expect(validateBatch({ ...good(), source: "powerschool" }, SID).errors).toContain(
      'Unsupported source "powerschool".',
    );
    expect(validateBatch(good(), "20000000-0000-0000-0000-00000000000b").errors).toContain(
      "studentId must match the URL.",
    );
    const b = good();
    b.assignments[0]!.classExternalId = "nope";
    expect(validateBatch(b, SID).errors).toEqual(["assignments[0]: unknown class."]);
  });
});

describe("SyncCoordinator two-phase admission", () => {
  const mem = () => {
    const m = new Map<string, unknown>();
    return { get: async <T>(k: string) => m.get(k) as T, put: async (k: string, v: unknown) => void m.set(k, v) };
  };
  it("only records a runKey after commit; release lets the same runKey retry", async () => {
    const s = mem();
    const t = 1_000_000;
    expect(await coordinate(s, "reserve", "r1", t)).toEqual({ ok: true });
    expect((await coordinate(s, "reserve", "r1", t + 1)) as object).toMatchObject({ ok: false, reason: "in_flight" });
    await coordinate(s, "release", "r1", t + 2); // write failed
    expect(await coordinate(s, "reserve", "r1", t + 3)).toEqual({ ok: true }); // retry is NOT a duplicate
    await coordinate(s, "commit", "r1", t + 4);
    expect(await coordinate(s, "reserve", "r1", t + 5)).toEqual({ ok: false, reason: "duplicate" });
    expect((await coordinate(s, "reserve", "r2", t + 6)) as object).toMatchObject({ reason: "too_soon" });
    expect(await coordinate(s, "reserve", "r2", t + 4 + MIN_INTERVAL_MS)).toEqual({ ok: true });
  });
});

describe("writeBatch", () => {
  it("upserts source-namespaced keys and closes the sync run", async () => {
    const calls: { path: string; body: unknown }[] = [];
    const rest = vi.fn(async (path: string, init: RequestInit = {}) => {
      calls.push({ path, body: init.body ? JSON.parse(String(init.body)) : null });
      if (path === "sync_runs") return [{ id: "run" }];
      if (path.startsWith("classes")) return [{ id: "cid", external_key: "mock-portal:c1" }];
      if (path.startsWith("assignments")) return [{ id: "aid", external_key: "mock-portal:a1" }];
      return null;
    }) as never;
    const del = vi.fn();
    const b = good();
    b.assignments[0]!.score = 9;
    const r = await writeBatch({ TODAY_CACHE: { delete: del } as never }, { batch: b, enteredBy: "student" }, rest);
    expect(r).toEqual({ classes: 1, assignments: 1, grades: 1 });
    const g = calls.find((c) => c.path.startsWith("grades"))!.body as Record<string, unknown>[];
    expect(g[0]).toMatchObject({
      assignment_id: "aid",
      score: 9,
      max_score: 10,
      source: "mock-portal",
      entered_by: "student",
    });
    expect(calls[0]!.body).toMatchObject({ actor: "student" });
    const a = calls.find((c) => c.path.startsWith("assignments"))!.body as Record<string, unknown>[];
    expect(a[0]).toMatchObject({ external_key: "mock-portal:a1", class_id: "cid", entered_by: "student" });
    expect(calls.at(-1)!.body).toMatchObject({ status: "ok" });
    expect(del).toHaveBeenCalledWith(`today:${SID}`);
  });
});

describe("POST /ingest/:id/batch", () => {
  afterEach(() => vi.unstubAllGlobals());
  const env = { SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "sk", SUPABASE_PUBLISHABLE_KEY: "pk" };
  const post = (e: object, body: unknown = good()) =>
    app.request(
      `/ingest/${SID}/batch`,
      { method: "POST", headers: { Authorization: "Bearer t" }, body: JSON.stringify(body) },
      e,
    );
  const stub = (allowed: boolean) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/auth/v1/user") ? Response.json({ id: "u1" }) : Response.json(allowed),
      ),
    );
  it("401 without a token", async () => {
    const r = await app.request(`/ingest/${SID}/batch`, { method: "POST" }, env);
    expect(r.status).toBe(401);
  });
  it("403 when not guardian/self", async () => {
    stub(false);
    expect((await post(env)).status).toBe(403);
  });
  it("422 on invalid batch, 202 when queued", async () => {
    stub(true);
    expect((await post(env, { ...good(), token: "x" })).status).toBe(422);
    const send = vi.fn();
    const r = await post({ ...env, INGEST_QUEUE: { send } });
    expect(r.status).toBe(202);
    expect(send).toHaveBeenCalledOnce();
  });
});

describe("ingest route safety", () => {
  afterEach(() => vi.unstubAllGlobals());
  const env = { SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "sk", SUPABASE_PUBLISHABLE_KEY: "pk" };
  const allow = (self: boolean) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/auth/v1/user")
          ? Response.json({ id: "u1" })
          : Response.json(url.includes("is_student_self") ? self : !self),
      ),
    );
  const req = (e: object, headers: Record<string, string> = {}, body = JSON.stringify(good())) =>
    app.request(
      `/ingest/${SID}/batch`,
      { method: "POST", headers: { Authorization: "Bearer t", ...headers }, body },
      e,
    );
  const doNs = (fetchImpl: (r: unknown, init: RequestInit) => Promise<Response>) => {
    const ops: string[] = [];
    return {
      ops,
      ns: {
        idFromName: () => "id",
        get: () => ({
          fetch: async (r: unknown, init: RequestInit) => {
            ops.push(JSON.parse(String(init.body)).op);
            return fetchImpl(r, init);
          },
        }),
      },
    };
  };
  it("rejects oversize by Content-Length before auth/reading", async () => {
    expect((await req(env, { "Content-Length": "3000000" })).status).toBe(413);
  });
  it("rejects oversize streamed bodies (bytes, not chars)", async () => {
    allow(false);
    expect((await req(env, {}, "é".repeat(1_100_000))).status).toBe(413);
  });
  it("releases the reservation when the queue send fails, commits on success, tags student uploads", async () => {
    allow(true);
    const d = doNs(async () => Response.json({ ok: true }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = await req({
      ...env,
      SYNC_COORDINATOR: d.ns,
      INGEST_QUEUE: { send: vi.fn().mockRejectedValue(new Error("q")) },
    });
    expect(bad.status).toBe(500);
    expect(d.ops).toEqual(["reserve", "release"]);
    const send = vi.fn();
    const okRes = await req({ ...env, SYNC_COORDINATOR: d.ns, INGEST_QUEUE: { send } });
    expect(okRes.status).toBe(202);
    expect(d.ops.slice(2)).toEqual(["reserve", "commit"]);
    expect(send.mock.calls[0]![0]).toMatchObject({ enteredBy: "student" });
  });
  it("fails closed with 503 when the coordinator times out", async () => {
    allow(false);
    vi.useFakeTimers();
    const d = doNs(() => new Promise(() => {}));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const p = req({ ...env, SYNC_COORDINATOR: d.ns, INGEST_QUEUE: { send: vi.fn() } });
    await vi.advanceTimersByTimeAsync(2000);
    const r = await p;
    vi.useRealTimers();
    expect(r.status).toBe(503);
    expect(r.headers.get("Retry-After")).toBe("30");
  });
});

describe("queue consumer", () => {
  it("retries with backoff on failure (no supabase config)", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    await ingestQueue(
      { messages: [{ body: { batch: good(), enteredBy: "guardian" }, attempts: 2, ack, retry }] } as never,
      {},
    );
    expect(ack).not.toHaveBeenCalled();
    expect(retry).toHaveBeenCalledWith({ delaySeconds: 20 });
  });
});

describe("queue registration (#55)", () => {
  it("registers the ingest consumer for sparkle-ingest", async () => {
    const { queueHandlers } = await import("../queues");
    expect(queueHandlers["sparkle-ingest"]).toBe(ingestQueue);
  });
});
