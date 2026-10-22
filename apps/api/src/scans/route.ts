/** FR-23 OCR scanning routes. Uploads -> R2 sparkle-scans (private) -> queue -> review -> save. */
import { Hono } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import { serviceRest } from "../lib/supa";
import { processScan, SENSITIVE, type PipelineDeps, type ScanJob, type ScanRow } from "./pipeline";
import { parseOcrResult } from "./ocr-contract";
import { redact } from "./redact";
import { extractFields, type ExtractedFields } from "./extract";

export interface ScansEnv extends AuthEnv {
  SCANS_BUCKET?: R2Bucket;
  SCAN_QUEUE?: Queue<ScanJob>; // optional: falls back to in-request processing (waitUntil) when unbound
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** DEC-06/123: the student, or an active guardian whose 'resources' scope is not limited. Helpers excluded. */
async function canAct(env: ScansEnv, token: string, studentId: string) {
  const [self, guardian, scope] = await Promise.all([
    userRpc<boolean>(env, token, "is_student_self", { p_student: studentId }),
    userRpc<boolean>(env, token, "is_active_guardian", { p_student: studentId }),
    userRpc<boolean>(env, token, "can_view_student", { p_student: studentId, p_scope: "resources" }),
  ]);
  return Boolean(self || (guardian && scope));
}

function pipelineDeps(env: ScansEnv): PipelineDeps {
  const rest = serviceRest(env);
  return {
    getScan: async (id) =>
      (await rest<ScanRow[]>(`scans?id=eq.${id}&select=id,status,attempts,client_text,content_type`))[0] ?? null,
    update: async (id, from, patch) => {
      const rows = await rest<unknown[]>(`scans?id=eq.${id}&status=in.(${from.join(",")})`, {
        method: "PATCH",
        body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
      });
      return Array.isArray(rows) && rows.length > 0;
    },
    deleteObject: async (key) => {
      await env.SCANS_BUCKET?.delete(key);
    },
  };
}

/** Queue consumer (bind SCAN_QUEUE consumer to this). Retries via msg.retry(); idempotent per scan. */
export async function scanQueue(batch: MessageBatch<ScanJob>, env: ScansEnv) {
  const deps = pipelineDeps(env);
  for (const m of batch.messages) {
    try {
      const r = await processScan(m.body, deps);
      if (r === "retry") m.retry({ delaySeconds: 30 * m.attempts });
      else m.ack();
    } catch (e) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "scan_queue_error",
          err: e instanceof Error ? e.message.slice(0, 200) : "error",
          attempts: m.attempts,
        }),
      );
      m.retry({ delaySeconds: 60 }); // bounded by the queue's max_retries + DLQ
    }
  }
}

export const scans = new Hono<{ Bindings: ScansEnv }>();

/** Upload: multipart `file` (image) + `ocr` (OcrResult JSON from on-device OCR, #54). Same bytes = same scan. */
scans.post("/students/:id/scans", async (c) => {
  const id = c.req.param("id");
  if (!UUID.test(id)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!(await canAct(c.env, user.token, id))) return c.json({ error: "forbidden" }, 403);
  if (!c.env.SCANS_BUCKET) return c.json({ error: "unavailable" }, 503);
  if (Number(c.req.header("Content-Length") ?? 0) > MAX_BYTES + 400_000) return c.json({ error: "too_large" }, 413);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return c.json({ error: "file_required" }, 400);
  if (!TYPES.has(file.type)) return c.json({ error: "unsupported_type" }, 415);
  if (file.size > MAX_BYTES) return c.json({ error: "too_large" }, 413);
  // DEC-127: on-device OCR only. Server never OCRs, so the image is never sent to an AI model.
  const ocr = parseOcrResult(form?.get("ocr"));
  if (!ocr || ocr.engine !== "on_device" || !ocr.text.trim()) return c.json({ error: "on_device_ocr_required" }, 422);
  // Server re-redacts; client redaction is never trusted (ASVS V5).
  const clientText = redact(ocr.text).text;
  // DEC-124: sensitive docs go to the vault (FR-24) with the same OcrResult, not here.
  if (form?.get("sensitive") === "true" || SENSITIVE.test(clientText))
    return c.json({ error: "sensitive_use_vault", hint: "Save IEP/504/health documents in the vault." }, 422);

  const bytes = await file.arrayBuffer();
  const sha = hex(await crypto.subtle.digest("SHA-256", bytes));
  const key = `scans/${id}/${sha}`;
  const rest = serviceRest(c.env);
  const [existing] = await rest<{ id: string; status: string }[]>(
    `scans?student_id=eq.${id}&sha256=eq.${sha}&select=id,status`,
  );
  if (existing) return c.json({ id: existing.id, status: existing.status, duplicate: true });
  // Row first, then object: a failed put removes the row, so no orphaned R2 objects.
  const rows = await rest<{ id: string; status: string }[]>("scans?on_conflict=student_id,sha256", {
    method: "POST",
    prefer: "return=representation,resolution=ignore-duplicates",
    body: JSON.stringify({
      student_id: id,
      uploaded_by: user.id,
      r2_key: key,
      sha256: sha,
      content_type: file.type,
      size_bytes: file.size,
      client_text: clientText,
      ocr_engine: ocr.engine,
      ocr_confidence: ocr.confidence,
      status: "queued",
    }),
  });
  const row = rows[0];
  if (!row) return c.json({ status: "queued", duplicate: true }, 200);
  try {
    await c.env.SCANS_BUCKET.put(key, bytes, {
      httpMetadata: { contentType: file.type },
      customMetadata: { student: id, uploader: user.id },
    });
  } catch (e) {
    await rest(`scans?id=eq.${row.id}`, { method: "DELETE", prefer: "return=minimal" }).catch(() => undefined);
    throw e;
  }
  const job = { scanId: row.id, key };
  if (c.env.SCAN_QUEUE) await c.env.SCAN_QUEUE.send(job);
  else c.executionCtx.waitUntil(processScan(job, pipelineDeps(c.env)).catch(() => undefined));
  return c.json({ id: row.id, status: "queued" }, 202);
});

/** Read a scan (status, redacted text, suggested fields) through RLS as the caller. */
scans.get("/scans/:sid", async (c) => {
  const sid = c.req.param("sid");
  if (!UUID.test(sid)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const r = await fetch(
    `${c.env.SUPABASE_URL}/rest/v1/scans?id=eq.${sid}&select=id,student_id,status,ocr_text,fields,confirmed_fields,redactions,error,created_at`,
    { headers: { apikey: c.env.SUPABASE_PUBLISHABLE_KEY ?? "", Authorization: `Bearer ${user.token}` } },
  );
  const [row] = r.ok ? ((await r.json()) as unknown[]) : [];
  if (!row) return c.json({ error: "not_found" }, 404);
  c.header("Cache-Control", "no-store");
  return c.json(row);
});

/** Human review gate: nothing becomes a saved record until the user confirms (or edits) fields. */
export function sanitizeConfirmed(input: unknown): ExtractedFields | null {
  if (!input || typeof input !== "object") return null;
  const f = input as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? redact(v.slice(0, 200)).text : null);
  const base = extractFields("");
  const kinds = ["permission_slip", "report_card", "schedule", "notice", "other"];
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  return {
    ...base,
    kind: (kinds.includes(f.kind as string) ? f.kind : "other") as ExtractedFields["kind"],
    title: s(f.title),
    school: s(f.school),
    studentName: s(f.studentName),
    dates: Array.isArray(f.dates)
      ? f.dates
          .map(date)
          .filter((x): x is string => !!x)
          .slice(0, 20)
      : [],
    dueDate: date(f.dueDate),
    amounts: Array.isArray(f.amounts)
      ? f.amounts
          .map(s)
          .filter((x): x is string => !!x)
          .slice(0, 20)
      : [],
    signatureRequired: f.signatureRequired === true,
  };
}

scans.post("/scans/:sid/:action{confirm|discard}", async (c) => {
  const sid = c.req.param("sid");
  const action = c.req.param("action");
  if (!UUID.test(sid)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const rest = serviceRest(c.env);
  const [row] = await rest<{ id: string; student_id: string; status: string; r2_key: string }[]>(
    `scans?id=eq.${sid}&select=id,student_id,status,r2_key`,
  );
  if (!row || !(await canAct(c.env, user.token, row.student_id))) return c.json({ error: "not_found" }, 404);
  if (action === "discard") {
    await rest(`scans?id=eq.${sid}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "discarded",
        ocr_text: null,
        fields: null,
        client_text: null,
        updated_at: new Date().toISOString(),
      }),
    });
    await c.env.SCANS_BUCKET?.delete(row.r2_key);
    return c.json({ id: sid, status: "discarded" });
  }
  if (row.status === "saved") return c.json({ id: sid, status: "saved" }); // idempotent
  if (row.status !== "review") return c.json({ error: "not_ready", status: row.status }, 409);
  const fields = sanitizeConfirmed(await c.req.json().catch(() => null));
  if (!fields) return c.json({ error: "invalid_fields" }, 422);
  await rest(`scans?id=eq.${sid}&status=eq.review`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "saved",
      confirmed_fields: fields,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  return c.json({ id: sid, status: "saved", fields });
});

/** DEC-126: purge unsaved scans older than 30 days (R2 original first, then the row). Run daily from cron. */
export async function purgeScans(env: ScansEnv, limit = 500): Promise<number> {
  const rest = serviceRest(env);
  const due = await rest<{ id: string; r2_key: string }[]>("rpc/scans_due_for_purge", {
    method: "POST",
    body: JSON.stringify({ p_limit: limit }),
  });
  if (!due?.length) return 0;
  await env.SCANS_BUCKET?.delete(due.map((d) => d.r2_key));
  await rest(`scans?id=in.(${due.map((d) => d.id).join(",")})&status=neq.saved`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  console.log(JSON.stringify({ level: "info", msg: "scans_purged", n: due.length }));
  return due.length;
}
