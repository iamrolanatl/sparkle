import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  APP_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
}

export const VERSION = "0.1.0";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: (o) => o ?? "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

/** Liveness/health: never exposes secret values, only whether config is present. */
app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "sparkle-api",
    version: VERSION,
    env: c.env?.APP_ENV ?? "unknown",
    checks: { supabaseConfigured: Boolean(c.env?.SUPABASE_URL && c.env?.SUPABASE_SECRET_KEY) },
    time: new Date().toISOString(),
  }),
);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error(JSON.stringify({ level: "error", msg: err.message }));
  return c.json({ error: "internal_error" }, 500);
});

export default app;
