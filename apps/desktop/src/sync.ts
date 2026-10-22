import type { CredentialStore } from "./credentials";
import { scrapeMockPortal } from "./mockPortal";
import type { PageLike, SyncBatch } from "./types";

type ErrorClass = "no_credentials" | "portal_unreachable" | "upload_rejected" | "rate_limited" | "unknown";
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One sync run (FR-11). Errors are classified and redacted: no credentials or page content in results. */
export async function runSync(opts: {
  studentId: string;
  portalUrl: string;
  page: PageLike;
  creds: CredentialStore;
  upload: Uploader;
  now?: () => Date;
  backoffMs?: number;
}): Promise<SyncResult> {
  const cred = await opts.creds.get(opts.studentId);
  if (!cred) return { ok: false, error: "no_credentials" };
  let extract;
  try {
    extract = await scrapeMockPortal(opts.page, opts.portalUrl, cred);
  } catch {
    return { ok: false, error: "portal_unreachable" };
  }
  const capturedAt = (opts.now ?? (() => new Date()))().toISOString();
  const runKey = `${opts.studentId.slice(0, 8)}-${capturedAt.replace(/\D/g, "")}`;
  const batch: SyncBatch = { studentId: opts.studentId, source: "mock-portal", runKey, capturedAt, ...extract };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await opts.upload(opts.studentId, batch, runKey);
      if (r.status === 429) return { ok: false, error: "rate_limited" };
      if (r.status >= 400 && r.status < 500) return { ok: false, error: "upload_rejected" };
      if (r.status < 300) return { ok: true, assignments: batch.assignments.length, queued: r.status === 202 };
    } catch {
      /* network: retry */
    }
    await sleep((opts.backoffMs ?? 1000) * 2 ** attempt);
  }
  return { ok: false, error: "unknown" };
}

/** Next scheduled run at 03:00 / 11:00 / 19:00 device-local time (FR-11, DEC-165). */
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
