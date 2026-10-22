import { Hono } from "hono";
import { cors } from "hono/cors";
import { chat, type ChatEnv } from "./chat/route";

export interface Env extends ChatEnv {
  APP_ENV?: string;
  ALLOWED_ORIGINS?: string;
  SCANS_BUCKET?: R2Bucket;
  VAULT_BUCKET?: R2Bucket; // FR-24; gated by feature flag vault_enabled (default false)
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
}

export const VERSION = "0.1.0";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const allowed = (c.env?.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim());
  return cors({ origin: (o) => (allowed.includes(o) ? o : null), allowMethods: ["GET", "POST", "OPTIONS"] })(c, next);
});

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

app.route("/chat", chat);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error(JSON.stringify({ level: "error", msg: err.message }));
  return c.json({ error: "internal_error" }, 500);
});

export default app;
