import { describe, expect, it, vi, afterEach } from "vitest";
import { minimize } from "./minimize";
import { suggestClass, validateOcrForClass } from "./ocr";
import { newWrappedDek, unwrapDek, seal, open, openText } from "./crypto";
import { rotateKek } from "./rotation";
import { DevStubVerifier } from "./consent";
import { _test } from "./route";
import { hexToBytes, bytesToHex } from "./rotation";
import { purgeDue, vaultDaily } from "./jobs";
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
  const tok = (amr: unknown) => `h.${btoa(JSON.stringify({ iat: 1_800_000_000, amr }))}.s`;
  it("uses amr sign-in time, not iat", () => {
    const now = 1_800_000_000;
    expect(_test.stepUpOk(tok([{ method: "oauth", timestamp: now - 60 }]), now)).toBe(true);
    expect(_test.stepUpOk(tok([{ method: "oauth", timestamp: now - 16 * 60 }]), now)).toBe(false);
    expect(_test.stepUpOk(tok(undefined), now)).toBe(false);
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

describe("purge job (DEC-28)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const env = (del: () => Promise<void>) => ({
    SUPABASE_URL: "https://x.supabase.co",
    SUPABASE_SECRET_KEY: "s",
    VAULT_BUCKET: { delete: vi.fn(del) } as unknown as R2Bucket,
  });
  it("finalizes rows only after R2 deletes succeed", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string, init?: RequestInit) => {
        calls.push(`${u.split("/rpc/")[1]} ${init?.body ?? ""}`);
        return new Response(u.endsWith("claim") ? JSON.stringify([{ r2_key: "v1/a" }, { r2_key: "v1/b" }]) : "1");
      }),
    );
    expect(await purgeDue(env(async () => {}))).toEqual({ purged: 2, failed: 0 });
    expect(calls[1]).toBe('vault_purge_finalize {"p_keys":["v1/a","v1/b"]}');
  });
  it("keeps rows claimed (not deleted) when R2 delete fails", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        calls.push(u);
        return new Response(JSON.stringify([{ r2_key: "v1/a" }]));
      }),
    );
    expect(await purgeDue(env(async () => Promise.reject(new Error("r2 down"))))).toEqual({ purged: 0, failed: 1 });
    expect(calls.some((u) => u.endsWith("finalize"))).toBe(false);
  });
});

describe("KEK rotation (DEC-24)", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("re-wraps DEKs so data sealed before rotation still opens", async () => {
    const OLD = KEK;
    const NEW = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)));
    const wrapped = await newWrappedDek(OLD);
    const sealed = await seal(await unwrapDek(OLD, wrapped), "sample", "doc");
    let stored = `\\x${bytesToHex(wrapped)}`;
    let rotatedOnce = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          stored = (JSON.parse(String(init.body)) as { wrapped_dek: string }).wrapped_dek;
          return new Response("");
        }
        return new Response(
          stored.startsWith("\\x") && u.includes("kek_version=lt.2") && !rotatedOnce++
            ? JSON.stringify([{ id: "k1", wrapped_dek: stored }])
            : "[]",
        );
      }),
    );
    const r = await rotateKek({
      SUPABASE_URL: "https://x",
      SUPABASE_SECRET_KEY: "s",
      VAULT_KEK: NEW,
      VAULT_KEK_PREV: OLD,
      VAULT_KEK_VERSION: "2",
    });
    expect(r).toEqual({ rewrapped: 1, failed: 0 });
    const dek = await unwrapDek(NEW, hexToBytes(stored));
    expect(await openText(dek, sealed, "doc")).toBe("sample");
    await expect(unwrapDek(OLD, hexToBytes(stored))).rejects.toThrow();
  });
});

describe("consent adapter (DEC-21)", () => {
  it("dev stub verifies outside production and refuses production", async () => {
    expect((await new DevStubVerifier("development").verify({ guardianId: "abcdef12-x", studentId: "s" })).ok).toBe(
      true,
    );
    const prod = await new DevStubVerifier("production").verify({ guardianId: "a", studentId: "s" });
    expect(prod).toMatchObject({ ok: false, reason: "stub_disabled_in_production" });
  });
});

describe("upload authorization order (review #53)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const SID = "10000000-0000-0000-0000-00000000000a";
  const meta = (m: object) => btoa(JSON.stringify({ title: "Sample", mime: "application/pdf", sample: true, ...m }));
  function stub(rpc: Record<string, unknown>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        if (u.includes("feature_flags")) return new Response(JSON.stringify([{ enabled: true, config: {} }]));
        if (u.includes("/auth/v1/user"))
          return new Response(JSON.stringify({ id: "00000000-0000-0000-0000-0000000000a5" }));
        const fn = u.split("/rpc/")[1];
        return new Response(JSON.stringify(fn && fn in rpc ? rpc[fn] : null));
      }),
    );
  }
  const env = (put: ReturnType<typeof vi.fn>) => ({
    SUPABASE_URL: "https://x.supabase.co",
    SUPABASE_SECRET_KEY: "s",
    VAULT_KEK: KEK,
    VAULT_BUCKET: { put, delete: vi.fn(async () => {}) } as unknown as R2Bucket,
  });
  const req = (m: object) => ({
    method: "POST",
    headers: { Authorization: "Bearer t", "X-Vault-Meta": meta(m), "Content-Type": "application/octet-stream" },
    body: new Uint8Array([1, 2, 3]),
  });
  it("rejects an outsider before any key or R2 work", async () => {
    stub({ vault_can_manage: false, is_student_self: false, vault_has_consent: true });
    const put = vi.fn();
    const r = await app.request(`/vault/students/${SID}/documents`, req({}), env(put));
    expect(r.status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });
  it("a student cannot downgrade an IEP to standard to skip encryption", async () => {
    stub({ vault_can_manage: false, is_student_self: true, vault_has_consent: true });
    const put = vi.fn();
    const r = await app.request(
      `/vault/students/${SID}/documents`,
      req({ class: "standard", ocr: { engine: "on_device", text: "Annual IEP meeting notice", confidence: 0.9 } }),
      env(put),
    );
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "guardian_required_for_sensitive" });
    expect(put).not.toHaveBeenCalled();
  });
  it("requires consent and sample data", async () => {
    stub({ vault_can_manage: true, is_student_self: false, vault_has_consent: false });
    expect((await app.request(`/vault/students/${SID}/documents`, req({}), env(vi.fn()))).status).toBe(403);
    expect((await app.request(`/vault/students/${SID}/documents`, req({ sample: false }), env(vi.fn()))).status).toBe(
      403,
    );
  });
});

describe("daily vault maintenance", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("runs purge, lifecycle, log prune; skips rotation without a previous KEK; sends nothing", async () => {
    const fns: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        fns.push(u.split("/rpc/")[1] ?? u);
        return new Response(
          u.endsWith("lifecycle_run") ? JSON.stringify([{ event_student: "s", event_kind: "age18_60d" }]) : "[]",
        );
      }),
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    const r = await vaultDaily({
      SUPABASE_URL: "https://x",
      SUPABASE_SECRET_KEY: "s",
      VAULT_BUCKET: { delete: vi.fn() } as unknown as R2Bucket,
    });
    expect(fns).toEqual(["vault_purge_claim", "vault_lifecycle_run", "vault_access_log_prune"]);
    expect(r.lifecycle).toHaveLength(1);
    expect(r.rotation).toEqual({ rewrapped: 0, failed: 0 });
  });
});
