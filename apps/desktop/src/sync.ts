import type { CredentialStore, SyncStateStore } from "./credentials";
import { PortalError, scrapeMockPortal } from "./mockPortal";
import type { PageLike, SyncBatch } from "./types";

/** Content-free result codes (no credentials, page content or server bodies). */
type ErrorClass =
  | "no_credentials"
  | "paused_bad_credentials"
  | "portal_origin_mismatch"
  | "bad_credentials"
  | "payload_too_large"
  | "portal_unreachable"
  | "session_expired" // 401/403 → prompt the family to sign in to Sparkle again
  | "upload_rejected" // 400/413/422 or 3xx → a bug report, not retried
  | "rate_limited"
  | "unconfirmed" // server said "duplicate" → we can't prove THIS run landed; never shown as green
  | "timeout"
  | "unknown";
export type SyncResult = { ok: true; assignments: number; queued: boolean } | { ok: false; error: ErrorClass };

export interface Uploader {
  (studentId: string, batch: SyncBatch, idempotencyKey: string): Promise<{ status: number; body: unknown }>;
}

/** Upload to the Sparkle API with the user's own Supabase session (never a portal credential). */
export function httpUploader(
  apiBase: string,
  getAccessToken: () => Promise<string>,
  f: typeof fetch = fetch,
): Uploader {
  return async (sid, batch, key) => {
    const r = await f(`${apiBase}/ingest/${sid}/batch`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(batch),
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
}

const RUN_BUDGET_MS = 90_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Full-jitter backoff so 1M agents waking at 03:00 don't retry in lock-step. */
export const jitter = (base: number, attempt: number, rand = Math.random) => Math.round(rand() * base * 2 ** attempt);

class Timeout extends Error {}

/**
 * One sync run (FR-11). Status mapping: 2xx = success (202 queued, 200/204 written inline → queued:false);
 * 200 {duplicate:true} = unconfirmed; 401/403 = session_expired; 429 = rate_limited; other 3xx/4xx =
 * upload_rejected; 5xx/network = retried (3 tries, jittered). Whole run is capped at RUN_BUDGET_MS.
 */
export async function runSync(opts: {
  studentId: string;
  portalUrl: string;
  page: PageLike;
  creds: CredentialStore;
  state: SyncStateStore;
  upload: Uploader;
  now?: () => Date;
  backoffMs?: number;
  budgetMs?: number;
  runId?: string;
}): Promise<SyncResult> {
  if ((await opts.state.pausedReason(opts.studentId)) === "bad_credentials")
    return { ok: false, error: "paused_bad_credentials" };
  const cred = await opts.creds.get(opts.studentId);
  if (!cred) return { ok: false, error: "no_credentials" };
  let timer: ReturnType<typeof setTimeout> | null = null;
  const deadline = new Promise<never>(
    (_, rej) => (timer = setTimeout(() => rej(new Timeout()), opts.budgetMs ?? RUN_BUDGET_MS)),
  );
  try {
    return await Promise.race([run(opts, cred), deadline]);
  } catch (e) {
    if (e instanceof Timeout) return { ok: false, error: "timeout" };
    throw e;
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

async function run(
  opts: Parameters<typeof runSync>[0],
  cred: NonNullable<Awaited<ReturnType<CredentialStore["get"]>>>,
): Promise<SyncResult> {
  let extract;
  try {
    extract = await scrapeMockPortal(opts.page, opts.portalUrl, cred);
  } catch (e) {
    if (e instanceof PortalError) {
      if (e.code === "bad_credentials") await opts.state.pause(opts.studentId, "bad_credentials");
      return { ok: false, error: e.code };
    }
    return { ok: false, error: "portal_unreachable" };
  }
  const capturedAt = (opts.now ?? (() => new Date()))().toISOString();
  // One random id per run, reused across retries (no cross-student collision possible).
  const runKey = opts.runId ?? crypto.randomUUID();
  const batch: SyncBatch = { studentId: opts.studentId, source: "mock-portal", runKey, capturedAt, ...extract };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await opts.upload(opts.studentId, batch, runKey);
      if (r.status >= 200 && r.status < 300) {
        if ((r.body as { duplicate?: boolean } | null)?.duplicate) return { ok: false, error: "unconfirmed" };
        return { ok: true, assignments: batch.assignments.length, queued: r.status === 202 };
      }
      if (r.status === 401 || r.status === 403) return { ok: false, error: "session_expired" };
      if (r.status === 429) return { ok: false, error: "rate_limited" };
      if (r.status < 500) return { ok: false, error: "upload_rejected" };
    } catch {
      /* network: retry */
    }
    await sleep(jitter(opts.backoffMs ?? 1000, attempt));
  }
  return { ok: false, error: "unknown" };
}

/** Next scheduled run at 03:00 / 11:00 / 19:00 device-local time (FR-11, DEC-165 accepted). */
export function nextRun(from: Date, hours = [3, 11, 19]): Date {
  for (let d = 0; d < 2; d++)
    for (const h of hours) {
      const t = new Date(from);
      t.setDate(t.getDate() + d);
      t.setHours(h, 0, 0, 0);
      if (t > from) return t;
    }
  throw new Error("unreachable");
}
