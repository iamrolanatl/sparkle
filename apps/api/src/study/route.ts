/** Study helper (Phase 2/3 AI, DEC-108). Behind feature flag `study_helper` (missing row = OFF). */
import { Hono } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import { serviceRest } from "../lib/supa";
import { CRISIS_REPLY } from "../chat/guard";
import { ageBand, guardedComplete, type Completer } from "../tasks/safety";

export interface StudyEnv extends AuthEnv {
  /** Injected once the tiered router (PR #20) merges; until then the helper reports unavailable. */
  STUDY_ROUTER?: Completer;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function studyHelperEnabled(env: AuthEnv): Promise<boolean> {
  try {
    const rows = await serviceRest(env)<{ enabled: boolean }[]>("feature_flags?key=eq.study_helper&select=enabled");
    return rows?.[0]?.enabled === true;
  } catch {
    return false; // fail closed
  }
}

export const study = new Hono<{ Bindings: StudyEnv }>();

study.get("/status", async (c) => c.json({ enabled: await studyHelperEnabled(c.env) }));

study.post("/:id", async (c) => {
  const id = c.req.param("id");
  if (!UUID.test(id)) return c.json({ error: "bad_request" }, 400);
  if (!(await studyHelperEnabled(c.env))) return c.json({ error: "disabled" }, 404);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  // ai_chat is a limitable scope (DEC-06): a limited guardian is refused here.
  if (!(await userRpc<boolean>(c.env, user.token, "can_view_student", { p_student: id, p_scope: "ai_chat" })))
    return c.json({ error: "forbidden" }, 403);
  const b = (await c.req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof b?.text === "string" ? b.text.trim() : "";
  if (!text || text.length > 1000) return c.json({ error: "bad_request" }, 400);
  const age = await userRpc<number>(c.env, user.token, "student_age", { p_student: id });
  const band = ageBand(age);
  const router = c.env.STUDY_ROUTER;
  const res = router
    ? await guardedComplete(router, text, band)
    : await guardedComplete({ complete: async () => Promise.reject(new Error("router_pending")) }, text, band);
  if (res.kind === "crisis") {
    console.warn(JSON.stringify({ level: "warn", msg: "safety_flag", kind: "crisis", route: "study" }));
    return c.json({ safety: "crisis", message: CRISIS_REPLY });
  }
  if (res.kind === "blocked")
    return c.json({ safety: "blocked", reason: res.reason }, res.reason === "unavailable" ? 503 : 422);
  return c.json({ safety: "ok", reply: res.text, mode: res.mode, ai: true });
});
