import type { MiddlewareHandler } from "hono";

/** Request id + structured access log + security headers (NFR-44). */
export const observe: MiddlewareHandler = async (c, next) => {
  const id = c.req.header("cf-ray") ?? crypto.randomUUID();
  const t0 = Date.now();
  c.header("X-Request-Id", id);
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  const ms = Date.now() - t0;
  const status = c.res.status;
  if (status >= 500 || ms > 1000)
    console.log(
      JSON.stringify({
        level: status >= 500 ? "error" : "warn",
        id,
        method: c.req.method,
        path: c.req.path,
        status,
        ms,
      }),
    );
};

/**
 * Idempotency for POSTs (NFR-42): a repeated `Idempotency-Key` within 24 h replays the first response
 * instead of re-executing. Uses the Workers Cache API (free); streaming (SSE) responses are not cached.
 */
export function idempotency(cache?: Cache): MiddlewareHandler {
  return async (c, next) => {
    const key = c.req.header("Idempotency-Key");
    const store = cache ?? (globalThis as { caches?: { default?: Cache } }).caches?.default;
    if (c.req.method !== "POST" || !key || !store) return next();
    if (!/^[\w-]{8,128}$/.test(key)) return c.json({ error: "bad_idempotency_key" }, 400);
    const cacheKey = new Request(`https://idempotency.internal${c.req.path}/${key}`);
    const hit = await store.match(cacheKey);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set("Idempotent-Replayed", "true");
      return res;
    }
    await next();
    const ct = c.res.headers.get("content-type") ?? "";
    if (c.res.status < 500 && !ct.includes("text/event-stream")) {
      const copy = c.res.clone();
      const res = new Response(copy.body, copy);
      res.headers.set("Cache-Control", "max-age=86400");
      await store.put(cacheKey, res);
    }
  };
}
