import { describe, expect, it, vi, afterEach } from "vitest";
import { minimize } from "./minimize";
import { suggestClass, validateOcrForClass } from "./ocr";
import { newWrappedDek, unwrapDek, seal, open, openText } from "./crypto";
import { _test, hexToBytes, bytesToHex } from "./route";
import app from "../index";

const KEK = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

describe("vault minimization (DEC-22)", () => {
  it("redacts SSN, Luhn-valid cards and ABA bank numbers; keeps ordinary numbers", () => {
    const m = minimize("SSN 123-45-6789 card 4111 1111 1111 1111 routing 021000021 acct 12345678 room 4111");
    expect(m.text).toContain("[REDACTED-SSN]");
    expect(m.text).toContain("[REDACTED-CARD]");
    expect(m.text).toContain("[REDACTED-BANK]");
    expect(m.text).toContain("room 4111");
    expect(m.text).not.toMatch(/6789|1111 1111|021000021/);
  });
  it("ignores invalid SSN areas and non-Luhn digit runs", () => {
    expect(minimize("000-12-3456 and 1234 5678 9012 3456").redactions).toEqual([]);
  });
  it("warns on medical and legal documents", () => {
    expect(minimize("Diagnosis: F90.0 custody order").warnings).toEqual(["medical_record", "legal_document"]);
  });
});

describe("OCR contract (FR-23 ↔ FR-24)", () => {
  it("suggests classes", () => {
    expect(suggestClass("Annual IEP review meeting")).toBe("sensitive");
    expect(suggestClass("Quarter 1 Report Card")).toBe("academic");
    expect(suggestClass("Bake sale Friday")).toBe("standard");
  });
  it("requires on-device OCR for sensitive (DEC-31)", () => {
    expect(validateOcrForClass({ engine: "workers_ai", text: "x", confidence: 0.9 }, "sensitive")).toBe(
      "sensitive_requires_on_device_ocr",
    );
    expect(validateOcrForClass({ engine: "on_device", text: "x", confidence: 0.9 }, "sensitive")).toBeNull();
  });
});

describe("envelope encryption (DEC-24)", () => {
  it("round-trips with AAD and rejects tampering / wrong doc binding", async () => {
    const wrapped = await newWrappedDek(KEK);
    expect(wrapped.length).toBe(40);
    const dek = await unwrapDek(KEK, hexToBytes(`\\x${bytesToHex(wrapped)}`));
    const sealed = await seal(dek, "IEP sample text", "doc-1");
    expect(await openText(dek, sealed, "doc-1")).toBe("IEP sample text");
    await expect(open(dek, sealed, "doc-2")).rejects.toThrow();
    sealed[20] = sealed[20]! ^ 1;
    await expect(open(dek, sealed, "doc-1")).rejects.toThrow();
  });
  it("rejects a short KEK", async () => {
    await expect(newWrappedDek(btoa("short"))).rejects.toThrow();
  });
});

describe("step-up (DEC-39)", () => {
  const tok = (iat: number) => `h.${btoa(JSON.stringify({ iat }))}.s`;
  it("accepts tokens issued within 15 minutes only", () => {
    const now = 1_800_000_000;
    expect(_test.stepUpOk(tok(now - 60), now)).toBe(true);
    expect(_test.stepUpOk(tok(now - 16 * 60), now)).toBe(false);
    expect(_test.stepUpOk("garbage", now)).toBe(false);
  });
});

describe("vault routes behind kill switch (DEC-37)", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("is 404 when flag off", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ enabled: false, config: {} }]))),
    );
    const r = await app.request(
      "/vault/students/10000000-0000-0000-0000-00000000000a/documents",
      {},
      {
        SUPABASE_URL: "https://x.supabase.co",
        SUPABASE_SECRET_KEY: "s",
      },
    );
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "vault_disabled" });
  });
  it("fails closed when flag store is unreachable or unconfigured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    expect((await app.request("/vault/documents/10000000-0000-0000-0000-00000000000a/content", {}, {})).status).toBe(
      404,
    );
    expect(
      (
        await app.request(
          "/vault/documents/10000000-0000-0000-0000-00000000000a/content",
          {},
          {
            SUPABASE_URL: "https://x.supabase.co",
            SUPABASE_SECRET_KEY: "s",
          },
        )
      ).status,
    ).toBe(404);
  });
});
