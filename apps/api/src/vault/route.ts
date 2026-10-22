import { Hono, type Context, type Next } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import { serviceRest } from "../lib/supa";
import { resilientFetch } from "../lib/resilience";
import { Store } from "../chat/store";
import { newWrappedDek, unwrapDek, seal, open, sha256Hex } from "./crypto";
import { minimize } from "./minimize";
import { suggestClass, validateOcrForClass, type OcrResult, type VaultClass } from "./ocr";
import { bytesToHex, hexToBytes, kekVersion } from "./rotation";
import { consentVerifier } from "./consent";

export interface VaultEnv extends AuthEnv {
  VAULT_BUCKET?: R2Bucket;
  VAULT_KEK?: string; // Workers secret (base64, 32 bytes) — never logged
  VAULT_KEK_VERSION?: string;
  APP_ENV?: string;
}
type C = Context<{ Bindings: VaultEnv }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_BYTES = 10 * 1024 * 1024; // CR-0007: bounded memory in a 128 MB isolate
const STEP_UP_SECONDS = 15 * 60;
const RANK: Record<VaultClass, number> = { standard: 0, academic: 1, sensitive: 2 };
const http = resilientFetch(fetch, { timeoutMs: 5000 });

export const vault = new Hono<{ Bindings: VaultEnv }>();

/** Kill switch (DEC-36/37/147): fail CLOSED — vault is off unless the flag row says enabled. */
async function vaultFlag(c: C, next: Next) {
  let on = false;
  try {
    on = Boolean((await new Store(c.env).flag("vault_enabled"))?.enabled);
  } catch {
    on = false;
  }
  if (!on) return c.json({ error: "vault_disabled" }, 404);
  await next();
}
vault.use("*", vaultFlag);

/**
 * Step-up (DEC-39): most recent *authentication* time from the JWT `amr` claim (not `iat`, which
 * renews on silent refresh). Requires a sign-in within 15 minutes.
 */
function lastAuthAt(token: string): number {
  try {
    const p = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as {
      amr?: { method?: string; timestamp?: number }[];
    };
    return Math.max(0, ...(p.amr ?? []).map((a) => a.timestamp ?? 0));
  } catch {
    return 0;
  }
}
const stepUpOk = (token: string, now = Date.now() / 1000) => now - lastAuthAt(token) <= STEP_UP_SECONDS;

async function ipHash(c: C) {
  const ip = c.req.header("CF-Connecting-IP") ?? "";
  return ip ? (await sha256Hex(new TextEncoder().encode(`vault:${ip}`))).slice(0, 32) : null;
}

/** POST an RPC as the user; returns {ok, data} so void RPCs and failures are distinguishable. */
async function rpcAs<T>(c: C, token: string, fn: string, args: Record<string, unknown>) {
  const r = await http(`${c.env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: c.env.SUPABASE_PUBLISHABLE_KEY ?? "",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const t = r.ok ? await r.text() : "";
  return { ok: r.ok, status: r.status, data: (t ? JSON.parse(t) : null) as T | null };
}

/** Household for sensitive docs: derived server-side from the caller's memberships (RLS), never from the body. */
async function callerHousehold(c: C, token: string): Promise<string | null> {
  const r = await http(
    `${c.env.SUPABASE_URL}/rest/v1/household_members?select=household_id&order=created_at.asc&limit=1`,
    {
      headers: { apikey: c.env.SUPABASE_PUBLISHABLE_KEY ?? "", Authorization: `Bearer ${token}` },
    },
  );
  if (!r.ok) return null;
  const rows = (await r.json()) as { household_id: string }[];
  return rows[0]?.household_id ?? null;
}

async function dekForHousehold(env: VaultEnv, household: string) {
  if (!env.VAULT_KEK) throw new Error("vault key not configured");
  const rest = serviceRest(env);
  const rows = await rest<{ id: string; wrapped_dek: string }[]>(
    `household_keys?household_id=eq.${household}&shredded_at=is.null&select=id,wrapped_dek&order=created_at.desc&limit=1`,
  );
  if (rows[0]) return { id: rows[0].id, key: await unwrapDek(env.VAULT_KEK, hexToBytes(rows[0].wrapped_dek)) };
  const wrapped = await newWrappedDek(env.VAULT_KEK);
  const [row] = await rest<{ id: string }[]>("household_keys", {
    method: "POST",
    body: JSON.stringify({
      household_id: household,
      wrapped_dek: `\\x${bytesToHex(wrapped)}`,
      kek_version: kekVersion(env),
    }),
  });
  return { id: row!.id, key: await unwrapDek(env.VAULT_KEK, wrapped) };
}

async function dekById(env: VaultEnv, dekId: string) {
  if (!env.VAULT_KEK) throw new Error("vault key not configured");
  const [row] = await serviceRest(env)<{ wrapped_dek: string | null }[]>(
    `household_keys?id=eq.${dekId}&shredded_at=is.null&select=wrapped_dek`,
  );
  if (!row?.wrapped_dek) return null; // crypto-shredded
  return unwrapDek(env.VAULT_KEK, hexToBytes(row.wrapped_dek));
}

interface UploadMeta {
  class?: VaultClass;
  title: string;
  mime: string;
  ocr?: OcrResult;
  tags?: string[];
  confirm_school_form?: boolean;
  sample: boolean;
}

/**
 * Upload: raw file bytes as the body; metadata JSON (base64url) in X-Vault-Meta.
 * Order: authenticate → authorize + consent (as user) → class decision → keys → R2 → RPC (re-checks in DB) → cleanup on failure.
 */
vault.post("/students/:id/documents", async (c) => {
  const sid = c.req.param("id");
  if (!UUID.test(sid)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);

  let m: UploadMeta;
  try {
    m = JSON.parse(atob((c.req.header("X-Vault-Meta") ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as UploadMeta;
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }
  if (typeof m.title !== "string" || !m.title.trim() || m.title.length > 200 || !MIMES.has(m.mime))
    return c.json({ error: "bad_request" }, 400);
  if (m.sample !== true) return c.json({ error: "sample_data_only" }, 403);
  const len = Number(c.req.header("Content-Length") ?? "0");
  if (len > MAX_BYTES) return c.json({ error: "too_large" }, 413);

  const [manage, self, consent] = await Promise.all([
    userRpc<boolean>(c.env, user.token, "vault_can_manage", { p_student: sid }),
    userRpc<boolean>(c.env, user.token, "is_student_self", { p_student: sid }),
    userRpc<boolean>(c.env, user.token, "vault_has_consent", { p_student: sid }),
  ]);
  if (!manage && !self) return c.json({ error: "forbidden" }, 403);
  if (!consent) return c.json({ error: "guardian_consent_required" }, 403);

  // Class: the uploader may only *raise* the suggested class unless they manage the vault (DEC-23).
  const suggested: VaultClass = m.ocr ? suggestClass(m.ocr.text) : "standard";
  let cls: VaultClass = m.class ?? suggested;
  if (!manage && RANK[cls] < RANK[suggested]) cls = suggested;
  if (cls === "sensitive" && !manage) return c.json({ error: "guardian_required_for_sensitive" }, 403);
  if (m.ocr) {
    const bad = validateOcrForClass(m.ocr, cls);
    if (bad) return c.json({ error: bad }, 422);
  }
  const mini = m.ocr ? minimize(m.ocr.text) : null;
  if (mini?.warnings.length && !m.confirm_school_form)
    return c.json({ error: "confirm_school_form_required", warnings: mini.warnings }, 409);

  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return c.json({ error: "bad_size" }, 413);
  if (!c.env.VAULT_BUCKET) return c.json({ error: "storage_unavailable" }, 503);

  const r2Key = `v1/${sid}/${crypto.randomUUID()}`;
  let body: Uint8Array = bytes;
  let ocrEnc: string | null = null;
  let dekId: string | null = null;
  let household: string | null = null;
  if (cls === "sensitive") {
    household = await callerHousehold(c, user.token);
    if (!household) return c.json({ error: "household_required" }, 409);
    const dek = await dekForHousehold(c.env, household);
    dekId = dek.id;
    body = await seal(dek.key, bytes, r2Key);
    if (mini) ocrEnc = `\\x${bytesToHex(await seal(dek.key, mini.text, `${r2Key}#ocr`))}`;
  }
  await c.env.VAULT_BUCKET.put(r2Key, body, {
    httpMetadata: { contentType: cls === "sensitive" ? "application/octet-stream" : m.mime },
    customMetadata: { class: cls, sample: "true" },
  });
  const res = await rpcAs<string>(c, user.token, "vault_insert_document", {
    p_student: sid,
    p_class: cls,
    p_title: m.title.trim(),
    p_r2_key: r2Key,
    p_sha256: await sha256Hex(bytes),
    p_size: bytes.length,
    p_mime: m.mime,
    p_ocr_text: cls === "sensitive" ? null : (mini?.text ?? null),
    p_ocr_text_enc: ocrEnc,
    p_tags: (m.tags ?? []).slice(0, 20).map((t) => String(t).slice(0, 40)),
    p_dek: dekId,
    p_household: household,
  });
  if (!res.ok || !res.data) {
    await c.env.VAULT_BUCKET.delete(r2Key).catch(() => undefined); // no orphan object
    return c.json({ error: "forbidden" }, 403);
  }
  return c.json({ id: res.data, class: cls, redactions: mini?.redactions ?? [] }, 201);
});

/** List / OCR search (RLS applies: request runs as the user). */
vault.get("/students/:id/documents", async (c) => {
  const sid = c.req.param("id");
  if (!UUID.test(sid)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const q = (c.req.query("q") ?? "").slice(0, 100);
  const tag = (c.req.query("tag") ?? "").replace(/[{},"]/g, "").slice(0, 40);
  let path = `vault_documents?student_id=eq.${sid}&deleted_at=is.null&select=id,class,title,mime,received_on,tags,created_at&order=created_at.desc&limit=50`;
  if (q) path += `&ocr_tsv=wfts(english).${encodeURIComponent(q)}`;
  if (tag) path += `&tags=cs.${encodeURIComponent(`{${tag}}`)}`;
  const r = await http(`${c.env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: c.env.SUPABASE_PUBLISHABLE_KEY ?? "", Authorization: `Bearer ${user.token}` },
  });
  if (!r.ok) return c.json({ error: "upstream" }, 502);
  c.header("Cache-Control", "private, no-store");
  return c.json({ documents: await r.json() });
});

/** Download via authenticated Worker proxy (DEC-25/146). Sensitive: step-up ≤ 15 min, decrypted with the doc's own DEK. */
vault.get("/documents/:doc/content", async (c) => {
  const doc = c.req.param("doc");
  if (!UUID.test(doc)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const allowed = await userRpc<boolean>(c.env, user.token, "can_view_vault_doc", { p_doc: doc });
  if (!allowed) return c.json({ error: "not_found" }, 404);
  const [meta] = await serviceRest(c.env)<{ class: VaultClass; r2_key: string; mime: string; dek_id: string | null }[]>(
    `vault_documents?id=eq.${doc}&select=class,r2_key,mime,dek_id`,
  );
  if (!meta || !c.env.VAULT_BUCKET) return c.json({ error: "not_found" }, 404);
  if (meta.class === "sensitive" && !stepUpOk(user.token)) return c.json({ error: "step_up_required" }, 401);
  const obj = await c.env.VAULT_BUCKET.get(meta.r2_key);
  if (!obj) return c.json({ error: "not_found" }, 404);
  let out: Uint8Array = new Uint8Array(await obj.arrayBuffer());
  if (meta.class === "sensitive") {
    const key = meta.dek_id ? await dekById(c.env, meta.dek_id) : null;
    if (!key) return c.json({ error: "gone" }, 410);
    out = await open(key, out, meta.r2_key);
  }
  const logged = await rpcAs(c, user.token, "vault_log_access", {
    p_doc: doc,
    p_action: "download",
    p_ip_hash: await ipHash(c),
    p_ua: (c.req.header("User-Agent") ?? "").slice(0, 300),
  });
  if (!logged.ok) return c.json({ error: "audit_unavailable" }, 503); // no unaudited access
  return new Response(out as BodyInit, {
    headers: {
      "Content-Type": meta.mime,
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="document"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

vault.delete("/documents/:doc", async (c) => {
  const doc = c.req.param("doc");
  if (!UUID.test(doc)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const r = await rpcAs(c, user.token, "vault_request_delete", { p_doc: doc }).catch(() => null);
  if (!r) return c.json({ error: "upstream" }, 502);
  if (!r.ok) return c.json({ error: r.status >= 500 ? "upstream" : "forbidden" }, r.status >= 500 ? 502 : 403);
  return c.json({ status: "scheduled", undo_days: 7, purge_within_days: 30 }, 202);
});

/** Consent (DEC-21) via adapter; dev stub only until a vendor is approved. Recorded by service role after verify. */
vault.post("/students/:id/consent", async (c) => {
  const sid = c.req.param("id");
  if (!UUID.test(sid)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!(await userRpc<boolean>(c.env, user.token, "is_active_guardian", { p_student: sid })))
    return c.json({ error: "forbidden" }, 403);
  const v = await consentVerifier(c.env).verify({ guardianId: user.id, studentId: sid });
  if (!v.ok) return c.json({ error: "consent_not_verified", reason: v.reason }, 403);
  await serviceRest(c.env)("rpc/vault_record_consent", {
    method: "POST",
    body: JSON.stringify({ p_guardian: user.id, p_student: sid, p_method: v.method, p_ref: v.ref ?? null }),
  });
  return c.json({ status: "recorded", method: v.method }, 201);
});

/** Break-glass (DEC-27): thin pass-through; dual control, limits and audit are enforced in the DB. */
const passthrough =
  (fn: string, args: (c: C, body: Record<string, unknown>) => Record<string, unknown>) => async (c: C) => {
    const user = await getUser(c.env, c.req.header("Authorization"));
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const body = (await c.req.json<Record<string, unknown>>().catch(() => ({}))) ?? {};
    const r = await rpcAs(c, user.token, fn, args(c, body));
    return r.ok ? c.json({ ok: true, result: r.data }) : c.json({ error: "forbidden" }, 403);
  };
vault.post(
  "/break-glass",
  passthrough("vault_break_glass_request", (_c, b) => ({
    p_student: b.student_id,
    p_ticket: b.ticket_id,
    p_reason: b.reason,
    p_minutes: Math.min(Number(b.minutes) || 15, 30),
    p_include_sensitive: b.include_sensitive === true,
  })),
);
vault.post(
  "/break-glass/:id/approve",
  passthrough("vault_break_glass_approve", (c) => ({ p_id: c.req.param("id") })),
);
vault.post(
  "/break-glass/:id/consent",
  passthrough("vault_break_glass_guardian_consent", (c) => ({ p_id: c.req.param("id") })),
);
vault.post(
  "/break-glass/:id/end",
  passthrough("vault_break_glass_end", (c) => ({ p_id: c.req.param("id") })),
);

export const _test = { stepUpOk, lastAuthAt };
