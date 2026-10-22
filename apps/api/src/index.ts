import { VERSION } from "./version";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chat, type ChatEnv } from "./chat/route";
import { students, type StudentsEnv } from "./students/route";
import { idempotency, observe } from "./lib/middleware";
import { resilientFetch } from "./lib/resilience";
import { crashSink, toCrashEvent } from "./lib/report";

export interface Env extends ChatEnv, StudentsEnv {
  APP_ENV?: string;
  ALLOWED_ORIGINS?: string;
  SCANS_BUCKET?: R2Bucket;
  VAULT_BUCKET?: R2Bucket; // FR-24; gated by feature flag vault_enabled (default false)
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SENTRY_DSN?: string; // optional secret (SA-17); crash reporting is a no-op without it
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", observe);

app.use("*", async (c, next) => {
  const allowed = (c.env?.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim());
  return cors({
    origin: (o) => (allowed.includes(o) ? o : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
    maxAge: 600,
  })(c, next);
});

/** Liveness/health: never exposes secret values. `?deep=1` also probes Supabase (2 s timeout) for synthetics. */
app.get("/health", async (c) => {
  const configured = Boolean(c.env?.SUPABASE_URL && c.env?.SUPABASE_SECRET_KEY);
  const checks: Record<string, boolean | number> = { supabaseConfigured: configured };
  if (c.req.query("deep") === "1" && configured) {
    const t0 = Date.now();
    try {
      const f = resilientFetch(fetch, { timeoutMs: 2000, retries: 0 });
      const r = await f(`${c.env.SUPABASE_URL}/auth/v1/health`, { headers: { apikey: c.env.SUPABASE_SECRET_KEY! } });
      checks.supabaseReachable = r.ok;
    } catch {
      checks.supabaseReachable = false;
    }
    checks.supabaseMs = Date.now() - t0;
  }
  const ok = checks.supabaseReachable !== false;
  c.header("Cache-Control", "no-store");
  return c.json(
    {
      status: ok ? "ok" : "degraded",
      service: "sparkle-api",
      version: VERSION,
      env: c.env?.APP_ENV ?? "unknown",
      checks,
      time: new Date().toISOString(),
    },
    ok ? 200 : 503,
  );
});

app.use("/chat/handoff", idempotency());
app.route("/chat", chat);
app.use("/students/:id/import", idempotency());
app.route("/students", students);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error(JSON.stringify({ level: "error", msg: err.message }));
  // DEC-184: pluggable crash reporting; no-op without SENTRY_DSN (SA-17). Never blocks the response.
  const sink = crashSink(c.env);
  if (sink) {
    const ev = toCrashEvent(
      err,
      { path: c.req.path, method: c.req.method, requestId: c.res.headers.get("X-Request-Id") ?? undefined },
      c.env?.APP_ENV ?? "unknown",
    );
    try {
      c.executionCtx.waitUntil(sink(ev));
    } catch {
      void sink(ev);
    }
  }
  return c.json({ error: "internal_error" }, 500);
});

export default app;
