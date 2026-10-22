/** Study helper (Phase 2/3 AI, DEC-108). Behind feature flag `study_helper` (missing row = OFF). */
import { Hono } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import { serviceRest } from "../lib/supa";
import { CRISIS_REPLY } from "../chat/guard";
import { ageBand, guardedComplete, type Completer } from "../tasks/safety";
import { allow, type RateLimitBinding } from "../chat/ratelimit";
import type { AiEnv } from "../ai/env";
import { askHandler } from "./ask";

export interface StudyEnv extends AuthEnv, AiEnv {
  /** Injected once the tiered router (PR #20) merges; until then the helper reports unavailable. */
  STUDY_ROUTER?: Completer;
  STUDY_RATE_LIMIT?: RateLimitBinding;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FLAG_TTL_MS = 60_000;
let flagCache: { at: number; on: boolean } | null = null;
/** Isolate-cached for 60 s (NFR-35). Fails closed. */
async function studyHelperEnabled(env: AuthEnv, now = Date.now()): Promise<boolean> {
  if (flagCache && now - flagCache.at < FLAG_TTL_MS) return flagCache.on;
  let on = false;
  try {
    const rows = await serviceRest(env)<{ enabled: boolean }[]>("feature_flags?key=eq.study_helper&select=enabled");
    on = rows?.[0]?.enabled === true;
  } catch {
    on = false;
  }
  flagCache = { at: now, on };
  return on;
}
export function _resetStudyFlagCache() {
  flagCache = null;
}
const MAX_BODY = 4096;

export const study = new Hono<{ Bindings: StudyEnv }>();

study.get("/status", async (c) => c.json({ enabled: await studyHelperEnabled(c.env) }));

study.post("/:id/ask", (c) => askHandler(c, (e) => studyHelperEnabled(e)));

study.post("/:id", async (c) => {
  const id = c.req.param("id");
  if (!UUID.test(id)) return c.json({ error: "bad_request" }, 400);
  if (!(await studyHelperEnabled(c.env))) return c.json({ error: "disabled" }, 404);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  // DEC-109: only the student converses with the study helper (helpers/guardians cannot act as the student).
  if (!(await userRpc<boolean>(c.env, user.token, "is_student_self", { p_student: id })))
    return c.json({ error: "forbidden" }, 403);
  // Per-user limit so one client loop cannot drain the shared AI budget.
  if (!(await allow(`study:${user.id}`, c.env.STUDY_RATE_LIMIT, 20, 60 * 60_000)))
    return c.json({ error: "rate_limited" }, 429);
  if (Number(c.req.header("Content-Length") ?? 0) > MAX_BODY) return c.json({ error: "too_large" }, 413);
  const raw = await c.req.text();
  if (raw.length > MAX_BODY) return c.json({ error: "too_large" }, 413);
  let b: { text?: unknown } | null = null;
  try {
    b = JSON.parse(raw) as { text?: unknown };
  } catch {
    b = null;
  }
  const text = typeof b?.text === "string" ? b.text.trim() : "";
  if (!text || text.length > 1000) return c.json({ error: "bad_request" }, 400);
  const age = await userRpc<number>(c.env, user.token, "student_age", { p_student: id });
  const band = ageBand(age);
  const router = c.env.STUDY_ROUTER;
  // budgetKey = student id: the #20 router enforces per-user daily AI budgets with it.
  const res = router
    ? await guardedComplete(router, text, band, id)
    : await guardedComplete({ complete: async () => Promise.reject(new Error("router_pending")) }, text, band);
  if (res.kind === "crisis") {
    console.warn(JSON.stringify({ level: "warn", msg: "safety_flag", kind: "crisis", route: "study" }));
    // FR-14: content-free flag into the admin safety queue (same table as chat flags). DEC-110.
    await serviceRest(c.env)("chat_sessions", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ page: "study-helper", flagged: true, flag_reason: "crisis" }),
    }).catch(() => undefined);
    return c.json({ safety: "crisis", message: CRISIS_REPLY });
  }
  if (res.kind === "blocked")
    return c.json({ safety: "blocked", reason: res.reason }, res.reason === "unavailable" ? 503 : 422);
  return c.json({ safety: "ok", reply: res.text, mode: res.mode, ai: true });
});
