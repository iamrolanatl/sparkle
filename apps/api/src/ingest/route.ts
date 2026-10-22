import { Hono } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import type { Admit, CoordOp } from "./coordinator";
import { validateBatch } from "./schema";
import { writeBatch, type IngestJob } from "./writer";

export interface IngestEnv extends AuthEnv {
  TODAY_CACHE?: KVNamespace;
  /** Optional until Workers Paid is approved (SA-D2); falls back to inline processing. */
  INGEST_QUEUE?: Queue<IngestJob>;
  SYNC_COORDINATOR?: DurableObjectNamespace;
}

const MAX_BODY_BYTES = 2_000_000;
const DO_TIMEOUT_MS = 1500;

class CoordinatorUnavailable extends Error {}

/**
 * Talk to the per-student SyncCoordinator with a hard timeout (CR-0007).
 * Fails CLOSED (503 + Retry-After) on reserve: the agent retries, and Postgres is protected at peaks (DEC-167).
 * commit/release failures are logged only: the write already succeeded/failed and is idempotent.
 */
async function coord(env: IngestEnv, studentId: string, op: CoordOp, runKey: string): Promise<Admit> {
  if (!env.SYNC_COORDINATOR) return { ok: true }; // dev/CI without the DO binding (DEC-164)
  const stub = env.SYNC_COORDINATOR.get(env.SYNC_COORDINATOR.idFromName(studentId));
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const r = await Promise.race([
      stub.fetch("https://do/coord", { method: "POST", body: JSON.stringify({ op, runKey }) }),
      new Promise<never>((_, rej) => (timer = setTimeout(() => rej(new Error("do_timeout")), DO_TIMEOUT_MS))),
    ]);
    if (!r.ok) throw new Error(`do_status_${r.status}`);
    return (await r.json()) as Admit;
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "coordinator_unavailable", op, err: (e as Error).message }));
    if (op === "reserve") throw new CoordinatorUnavailable();
    return { ok: true };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/** Read at most `max` bytes; returns null if the body is larger (no full buffering of oversize bodies). */
async function readCapped(req: Request, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) {
    buf.set(c, o);
    o += c.byteLength;
  }
  return new TextDecoder().decode(buf);
}

export const ingest = new Hono<{ Bindings: IngestEnv }>();

/** Desktop agent upload (WBS 3.2). Caller = guardian or the student (their own Supabase token). */
ingest.post("/:id/batch", async (c) => {
  const declared = Number(c.req.header("Content-Length") ?? "0");
  if (declared > MAX_BODY_BYTES) return c.json({ error: "too_large" }, 413);
  const id = c.req.param("id");
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const [guardian, self] = await Promise.all([
    userRpc<boolean>(c.env, user.token, "is_active_guardian", { p_student: id }),
    userRpc<boolean>(c.env, user.token, "is_student_self", { p_student: id }),
  ]);
  if (!guardian && !self) return c.json({ error: "forbidden" }, 403);
  const raw = await readCapped(c.req.raw, MAX_BODY_BYTES);
  if (raw === null) return c.json({ error: "too_large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return c.json({ error: "bad_json" }, 400);
  }
  const { batch, errors } = validateBatch(body, id);
  if (!batch) return c.json({ error: "invalid_batch", details: errors }, 422);
  const job: IngestJob = { batch, enteredBy: self ? "student" : "guardian" };

  let a: Admit;
  try {
    a = await coord(c.env, id, "reserve", batch.runKey);
  } catch {
    c.header("Retry-After", "30");
    return c.json({ error: "coordinator_unavailable" }, 503);
  }
  if (!a.ok) {
    if (a.reason === "duplicate") return c.json({ ok: true, duplicate: true }, 200);
    c.header("Retry-After", String(a.retryAfterS ?? 300));
    return c.json({ error: a.reason }, 429);
  }
  try {
    if (c.env.INGEST_QUEUE) {
      await c.env.INGEST_QUEUE.send(job, { contentType: "json" });
      await coord(c.env, id, "commit", batch.runKey); // durable in the queue; consumer writes idempotently
      return c.json({ ok: true, queued: true }, 202);
    }
    const res = await writeBatch(c.env, job);
    await coord(c.env, id, "commit", batch.runKey);
    return c.json({ ok: true, queued: false, ...res });
  } catch (e) {
    await coord(c.env, id, "release", batch.runKey); // retry with the same runKey must re-run, not "duplicate"
    throw e;
  }
});

/**
 * Queue consumer for `sparkle-ingest`: retries with backoff; poison messages go to the DLQ after
 * max_retries. Registered in apps/api/src/queues.ts once the Integration dispatcher (#55) lands.
 */
export async function ingestQueue(mb: MessageBatch<IngestJob>, env: IngestEnv): Promise<void> {
  for (const m of mb.messages) {
    try {
      await writeBatch(env, m.body);
      m.ack();
    } catch (e) {
      console.error(
        JSON.stringify({ level: "error", msg: "ingest_failed", attempts: m.attempts, err: (e as Error).message }),
      );
      m.retry({ delaySeconds: Math.min(300, 2 ** m.attempts * 5) });
    }
  }
}
