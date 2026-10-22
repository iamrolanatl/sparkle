import { describe, expect, it, vi } from "vitest";
import { redact } from "./redact";
import { extractFields, findDates } from "./extract";
import { processScan, MAX_ATTEMPTS, SENSITIVE, type PipelineDeps, type ScanRow } from "./pipeline";
import { parseOcrResult } from "./ocr-contract";
import { purgeScans, sanitizeConfirmed, scanQueue } from "./route";
import app from "../index";

// SAMPLE documents only (no real student data). Numbers are synthetic test values.
const SLIP = `Maple Grove Middle School
Field Trip Permission Slip
Student Name: Sample Student
Trip date: Nov 14, 2026. Cost $12.50
Please sign and return by 11/07/2026.
Parent signature: ________
Guardian SSN: 123-45-6789
Card 4111 1111 1111 1111
Bank account: 000123456789`;

describe("redact (DEC-22)", () => {
  it("removes SSN, Luhn-valid cards and bank numbers", () => {
    const r = redact(SLIP);
    expect(r.text).not.toMatch(/123-45-6789|4111 1111|000123456789/);
    expect(r.counts).toEqual({ ssn: 1, card: 1, bank: 1 });
    expect(r.text).toContain("[REDACTED-CARD •••1111]");
  });
  it("leaves dates, phone-like and invalid SSNs alone", () => {
    const t = "Call 404-555-0100 on 11/07/2026; id 000-12-3456; score 1234567890123";
    expect(redact(t).text).toBe(t);
  });
  it("is idempotent", () => expect(redact(redact(SLIP).text).text).toBe(redact(SLIP).text));
});

describe("extractFields", () => {
  it("parses a sample permission slip", () => {
    const f = extractFields(redact(SLIP).text, 2026);
    expect(f.kind).toBe("permission_slip");
    expect(f.school).toBe("Maple Grove Middle School");
    expect(f.studentName).toBe("Sample Student");
    expect(f.dueDate).toBe("2026-11-07");
    expect(f.dates).toEqual(["2026-11-07", "2026-11-14"]);
    expect(f.amounts).toEqual(["$12.50"]);
    expect(f.signatureRequired).toBe(true);
  });
  it("finds varied date formats and rejects invalid", () => {
    expect(findDates("2026-01-05, 13/45, Sept 3rd", 2026)).toEqual(["2026-01-05", "2026-09-03"]);
  });
});

function fakeDeps(row: ScanRow) {
  const state = { ...row } as ScanRow & Record<string, unknown>;
  const deleted: string[] = [];
  let failUpdates = 0;
  const deps: PipelineDeps = {
    getScan: async () => ({ ...state }),
    update: async (_id, from, patch) => {
      if (!from.includes(state.status)) return false;
      if (patch.status === "review" && failUpdates-- > 0) throw new Error("db down");
      Object.assign(state, patch);
      return true;
    },
    deleteObject: async (k) => {
      deleted.push(k);
    },
  };
  return { state, deps, deleted, failNext: (n: number) => (failUpdates = n) };
}
const ROW: ScanRow = { id: "s1", status: "queued", attempts: 0, client_text: SLIP };
const JOB = { scanId: "s1", key: "k" };

describe("pipeline (idempotent, retryable)", () => {
  it("redacts, extracts, clears client text; re-delivery is a no-op", async () => {
    const { state, deps } = fakeDeps(ROW);
    expect(await processScan(JOB, deps)).toBe("ok");
    expect(state.status).toBe("review");
    expect(String(state.ocr_text)).not.toContain("123-45-6789");
    expect(state.client_text).toBeNull();
    expect(await processScan(JOB, deps)).toBe("skip");
    expect(state.attempts).toBe(1);
  });
  it("discards sensitive docs, deletes the original, keeps no text (DEC-124)", async () => {
    const { state, deps, deleted } = fakeDeps({ ...ROW, client_text: "Annual IEP review meeting" });
    expect(await processScan(JOB, deps)).toBe("ok");
    expect(state).toMatchObject({
      status: "discarded",
      client_text: null,
      ocr_text: null,
      error: "sensitive_use_vault",
    });
    expect(deleted).toEqual(["k"]);
  });
  it("fails fast without on-device text (DEC-127)", async () => {
    const { state, deps } = fakeDeps({ ...ROW, client_text: null });
    expect(await processScan(JOB, deps)).toBe("skip");
    expect(state.status).toBe("failed");
  });
  it("retries transient errors then fails after MAX_ATTEMPTS", async () => {
    const { state, deps, failNext } = fakeDeps(ROW);
    failNext(99);
    const results = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) results.push(await processScan(JOB, deps));
    expect(results).toEqual(["retry", "retry", "skip"]);
    expect(state.status).toBe("failed");
    expect(state.client_text).toBeNull();
  });
  it("queue consumer retries (and logs) on throw", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await scanQueue({ messages: [{ body: JOB, attempts: 1, ack, retry }] } as never, {});
    expect(retry).toHaveBeenCalled();
    expect(ack).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});

describe("OcrResult contract (#54)", () => {
  it("accepts valid and rejects malformed", () => {
    expect(parseOcrResult(JSON.stringify({ engine: "on_device", text: "hi", confidence: 0.9 }))).toMatchObject({
      engine: "on_device",
    });
    expect(parseOcrResult({ engine: "x", text: "hi", confidence: 0.9 })).toBeNull();
    expect(parseOcrResult({ engine: "on_device", text: "hi", confidence: 2 })).toBeNull();
    expect(parseOcrResult({ engine: "on_device", text: "a".repeat(200_001), confidence: 1 })).toBeNull();
    expect(parseOcrResult("{bad")).toBeNull();
  });
});

describe("purge job (DEC-126)", () => {
  it("deletes R2 originals then rows", async () => {
    const calls: string[] = [];
    const del = vi.fn(async () => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method} ${url.split("/rest/v1/")[1]}`);
        return new Response(url.includes("rpc/") ? JSON.stringify([{ id: "i1", r2_key: "scans/a" }]) : "", {
          status: 200,
        });
      }),
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    const n = await purgeScans({
      SUPABASE_URL: "https://x",
      SUPABASE_SECRET_KEY: "k",
      SCANS_BUCKET: { delete: del } as never,
    });
    expect(n).toBe(1);
    expect(del).toHaveBeenCalledWith(["scans/a"]);
    expect(calls).toEqual(["POST rpc/scans_due_for_purge", "DELETE scans?id=in.(i1)&status=neq.saved"]);
    vi.unstubAllGlobals();
  });
});

describe("review gate", () => {
  it("sanitizes user-confirmed fields and redacts free text", () => {
    const f = sanitizeConfirmed({ kind: "evil", title: "SSN 123-45-6789", dueDate: "bad", dates: ["2026-11-07", 5] });
    expect(f).toMatchObject({ kind: "other", title: "SSN [REDACTED-SSN]", dueDate: null, dates: ["2026-11-07"] });
    expect(sanitizeConfirmed("x")).toBeNull();
  });
  it("routes reject bad ids and unauthenticated callers", async () => {
    expect((await app.request("/students/nope/scans", { method: "POST" })).status).toBe(400);
    expect((await app.request("/students/10000000-0000-0000-0000-00000000000a/scans", { method: "POST" })).status).toBe(
      401,
    );
    expect((await app.request("/scans/10000000-0000-0000-0000-00000000000a")).status).toBe(401);
  });
});

describe("sensitive classifier (DEC-124)", () => {
  it("flags IEP/504/health and passes ordinary slips", () => {
    expect(SENSITIVE.test("Annual IEP meeting notice")).toBe(true);
    expect(SENSITIVE.test("Immunization record required")).toBe(true);
    expect(SENSITIVE.test(SLIP)).toBe(false);
  });
});

describe("registration (#55)", () => {
  it("scan queue and daily purge are registered", async () => {
    const { queueHandlers } = await import("../queues");
    const { cronHandlers } = await import("../scheduled");
    expect(queueHandlers["sparkle-scans-ocr"]).toBeTypeOf("function");
    expect(cronHandlers["30 3 * * *"]!.length).toBeGreaterThanOrEqual(1);
  });
});
