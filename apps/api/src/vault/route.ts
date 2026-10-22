import { Hono, type Context, type Next } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import { serviceRest } from "../lib/supa";
import { Store } from "../chat/store";
import { newWrappedDek, unwrapDek, seal, open, sha256Hex } from "./crypto";
import { minimize } from "./minimize";
import { suggestClass, validateOcrForClass, type OcrResult, type VaultClass } from "./ocr";

export interface VaultEnv extends AuthEnv {
  VAULT_BUCKET?: R2Bucket;
  VAULT_KEK?: string; // Workers secret (base64, 32 bytes) — never logged
  APP_ENV?: string;
}
type C = Context<{ Bindings: VaultEnv }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_BYTES = 25 * 1024 * 1024;
const STEP_UP_SECONDS = 15 * 60;

export const vault = new Hono<{ Bindings: VaultEnv }>();

/** Kill switch (DEC-36/37): fail CLOSED — vault is off unless flag row says enabled. */
export async function vaultFlag(c: C, next: Next) {
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

function jwtIat(token: string): number {
  try {
    const p = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { iat?: number };
    return p.iat ?? 0;
  } catch {
    return 0;
  }
}
const stepUpOk = (token: string, now = Date.now() / 1000) => now - jwtIat(token) <= STEP_UP_SECONDS;

async function ipHash(c: C) {
  const ip = c.req.header("CF-Connecting-IP") ?? "";
  return ip ? (await sha256Hex(new TextEncoder().encode(`vault:${ip}`))).slice(0, 32) : null;
}

async function audit(c: C, token: string, student: string, doc: string | null, action: string) {
  await userRpc(c.env, token, "vault_log", {
    p_student: student,
    p_doc: doc,
    p_action: action,
    p_ip_hash: await ipHash(c),
    p_ua: (c.req.header("User-Agent") ?? "").slice(0, 300),
  });
}

async function householdDek(c: C, studentHousehold: string | null, create: boolean) {
  if (!c.env.VAULT_KEK) throw new Error("vault key not configured");
  const rest = serviceRest(c.env);
  const hh = studentHousehold;
  if (!hh) throw new Error("household required for sensitive documents");
  const rows = await rest<{ id: string; wrapped_dek: string }[]>(
    `household_keys?household_id=eq.${hh}&shredded_at=is.null&select=id,wrapped_dek&order=created_at.desc&limit=1`,
  );
  if (rows[0]) return { id: rows[0].id, key: await unwrapDek(c.env.VAULT_KEK, hexToBytes(rows[0].wrapped_dek)) };
  if (!create) throw new Error("no key");
  const wrapped = await newWrappedDek(c.env.VAULT_KEK);
  const [row] = await rest<{ id: string }[]>("household_keys", {
    method: "POST",
    body: JSON.stringify({ household_id: hh, wrapped_dek: `\\x${bytesToHex(wrapped)}`, kek_version: 1 }),
  });
  return { id: row!.id, key: await unwrapDek(c.env.VAULT_KEK, wrapped) };
}

export const bytesToHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
export function hexToBytes(h: string): Uint8Array {
  const s = h.startsWith("\\x") ? h.slice(2) : h;
  return Uint8Array.from(s.match(/../g) ?? [], (x) => parseInt(x, 16));
}

interface UploadBody {
  class?: VaultClass;
  title: string;
  mime: string;
  household_id?: string;
  file_base64: string;
  ocr?: OcrResult;
  tags?: string[];
  confirm_school_form?: boolean;
  sample: boolean;
}

/** Upload (guardian or student; sensitive guardian-only enforced again in DB). Sample data only (DEC-37/144). */
vault.post("/students/:id/documents", async (c) => {
  const sid = c.req.param("id");
  if (!UUID.test(sid)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const b = await c.req.json<UploadBody>().catch(() => null);
  if (!b || typeof b.title !== "string" || !b.title.trim() || b.title.length > 200 || !MIMES.has(b.mime))
    return c.json({ error: "bad_request" }, 400);
  if (b.sample !== true) return c.json({ error: "sample_data_only" }, 403);
  const bytes = Uint8Array.from(atob(b.file_base64 ?? ""), (ch) => ch.charCodeAt(0));
  if (!bytes.length || bytes.length > MAX_BYTES) return c.json({ error: "bad_size" }, 413);

  const mini = b.ocr ? minimize(b.ocr.text) : null;
  const cls: VaultClass = b.class ?? (b.ocr ? suggestClass(b.ocr.text) : "standard");
  if (b.ocr) {
    const bad = validateOcrForClass(b.ocr, cls);
    if (bad) return c.json({ error: bad }, 422);
  }
  if (mini?.warnings.length && !b.confirm_school_form)
    return c.json({ error: "confirm_school_form_required", warnings: mini.warnings }, 409);
  // NOTE: image-level redaction is done client-side before upload (Team B pipeline); server redacts OCR text.

  const docKey = crypto.randomUUID();
  const r2Key = `v1/${sid}/${docKey}`;
  let body: Uint8Array = bytes;
  let ocrEnc: string | null = null;
  let dekId: string | null = null;
  if (cls === "sensitive") {
    const dek = await householdDek(c, b.household_id && UUID.test(b.household_id) ? b.household_id : null, true);
    dekId = dek.id;
    body = await seal(dek.key, bytes, r2Key);
    if (mini) ocrEnc = `\\x${bytesToHex(await seal(dek.key, mini.text, `${r2Key}#ocr`))}`;
  }
  if (!c.env.VAULT_BUCKET) return c.json({ error: "storage_unavailable" }, 503);
  await c.env.VAULT_BUCKET.put(r2Key, body, {
    httpMetadata: { contentType: cls === "sensitive" ? "application/octet-stream" : b.mime },
    customMetadata: { class: cls, sample: "true" },
  });
  const id = await userRpc<string>(c.env, user.token, "vault_insert_document", {
    p_student: sid,
    p_class: cls,
    p_title: b.title.trim(),
    p_r2_key: r2Key,
    p_sha256: await sha256Hex(bytes),
    p_size: bytes.length,
    p_mime: b.mime,
    p_ocr_text: cls === "sensitive" ? null : (mini?.text ?? null),
    p_ocr_text_enc: ocrEnc,
    p_tags: (b.tags ?? []).slice(0, 20).map((t) => String(t).slice(0, 40)),
    p_dek: dekId,
    p_household: b.household_id ?? null,
    p_is_sample: true,
  });
  if (!id) {
    await c.env.VAULT_BUCKET.delete(r2Key); // DB refused (RLS/consent) → no orphan object
    return c.json({ error: "forbidden" }, 403);
  }
  return c.json({ id, class: cls, redactions: mini?.redactions ?? [] }, 201);
});

/** List / OCR search (RLS applies: request runs as the user). */
vault.get("/students/:id/documents", async (c) => {
  const sid = c.req.param("id");
  if (!UUID.test(sid)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const q = (c.req.query("q") ?? "").slice(0, 100);
  const tag = (c.req.query("tag") ?? "").slice(0, 40);
  let path = `vault_documents?student_id=eq.${sid}&deleted_at=is.null&select=id,class,title,mime,received_on,tags,created_at&order=created_at.desc&limit=50`;
  if (q) path += `&ocr_tsv=wfts(english).${encodeURIComponent(q)}`;
  if (tag) path += `&tags=cs.${encodeURIComponent(`{${tag.replace(/[{},"]/g, "")}}`)}`;
  const r = await fetch(`${c.env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: c.env.SUPABASE_PUBLISHABLE_KEY ?? "", Authorization: `Bearer ${user.token}` },
  });
  if (!r.ok) return c.json({ error: "upstream" }, 502);
  c.header("Cache-Control", "private, no-store");
  return c.json({ documents: await r.json() });
});

/** Download via authenticated Worker proxy (DEC-25/146). Sensitive: step-up ≤ 15 min, decrypted in Worker. */
vault.get("/documents/:doc/content", async (c) => {
  const doc = c.req.param("doc");
  if (!UUID.test(doc)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const allowed = await userRpc<boolean>(c.env, user.token, "can_view_vault_doc", { p_doc: doc });
  if (!allowed) return c.json({ error: "not_found" }, 404);
  const [meta] = await serviceRest(c.env)<
    {
      student_id: string;
      class: VaultClass;
      r2_key: string;
      mime: string;
      title: string;
      household_id: string | null;
    }[]
  >(`vault_documents?id=eq.${doc}&select=student_id,class,r2_key,mime,title,household_id`);
  if (!meta || !c.env.VAULT_BUCKET) return c.json({ error: "not_found" }, 404);
  if (meta.class === "sensitive" && !stepUpOk(user.token)) return c.json({ error: "step_up_required" }, 401);
  const obj = await c.env.VAULT_BUCKET.get(meta.r2_key);
  if (!obj) return c.json({ error: "not_found" }, 404);
  let out: Uint8Array = new Uint8Array(await obj.arrayBuffer());
  if (meta.class === "sensitive")
    out = await open((await householdDek(c, meta.household_id, false)).key, out, meta.r2_key);
  await audit(c, user.token, meta.student_id, doc, "download");
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
  const r = await fetch(`${c.env.SUPABASE_URL}/rest/v1/rpc/vault_request_delete`, {
    method: "POST",
    headers: {
      apikey: c.env.SUPABASE_PUBLISHABLE_KEY ?? "",
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_doc: doc }),
  });
  if (!r.ok) return c.json({ error: "forbidden" }, 403);
  return c.json({ status: "scheduled", undo_days: 7, purge_within_days: 30 }, 202);
});

/** Scheduled purge (DEC-28): hard-delete rows due, then R2 objects. Called from the cron handler. */
export async function purgeDue(env: VaultEnv): Promise<number> {
  if (!env.VAULT_BUCKET) return 0;
  const keys = await serviceRest(env)<{ r2_key: string }[]>("rpc/vault_purge_due", { method: "POST", body: "{}" });
  for (let i = 0; i < keys.length; i += 1000)
    await env.VAULT_BUCKET.delete(keys.slice(i, i + 1000).map((k) => k.r2_key));
  return keys.length;
}

export const _test = { stepUpOk, jwtIat };
