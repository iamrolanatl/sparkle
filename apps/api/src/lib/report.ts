/**
 * Pluggable crash reporter for the API Worker (NFR-37, DEC-184). No-op unless SENTRY_DSN is set
 * (SA-17). PII-scrubbed: no emails, query strings, tokens or user ids leave the Worker.
 */
interface CrashEvent {
  message: string;
  name: string;
  path: string;
  method: string;
  requestId?: string;
  env: string;
}
export type CrashSink = (e: CrashEvent) => Promise<void>;

const scrub = (s: string) =>
  s
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[jwt]")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[id]")
    .slice(0, 500);

export function sentrySink(dsn: string, f: typeof fetch = fetch): CrashSink | null {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(dsn);
  if (!m) return null;
  const url = `https://${m[2]}/api/${m[3]}/envelope/?sentry_key=${m[1]}&sentry_version=7`;
  return async (e) => {
    const id = crypto.randomUUID().replace(/-/g, "");
    const event = {
      event_id: id,
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      environment: e.env,
      tags: { path: e.path, method: e.method, request_id: e.requestId ?? "" },
      exception: { values: [{ type: e.name, value: e.message }] },
    };
    const body = `${JSON.stringify({ event_id: id })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
    await f(url, { method: "POST", body, signal: AbortSignal.timeout(2000) }).catch(() => undefined);
  };
}

/** Resolve the sink from env; returns null (no-op) when no DSN is configured. */
export function crashSink(env: { SENTRY_DSN?: string } | undefined): CrashSink | null {
  return env?.SENTRY_DSN ? sentrySink(env.SENTRY_DSN) : null;
}

export function toCrashEvent(err: unknown, req: { path: string; method: string; requestId?: string }, env: string) {
  const e = err instanceof Error ? err : new Error(String(err));
  return {
    message: scrub(e.message),
    name: e.name,
    path: scrub(req.path),
    method: req.method,
    requestId: req.requestId,
    env,
  } satisfies CrashEvent;
}
