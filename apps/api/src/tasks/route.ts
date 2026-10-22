/** FR-21 tasks API (WBS Phase 2). Parse -> review -> save. All reads/writes run as the caller so RLS decides. */
import { Hono } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import { resilientFetch } from "../lib/resilience";
import { parseTask, type ClassRef } from "./parse";
import { ageBand, screenTaskInput } from "./safety";
import { CRISIS_REPLY } from "../chat/guard";
import { dueSoon, type TaskLite } from "./due";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIORITIES = new Set(["low", "normal", "high"]);

export const tasks = new Hono<{ Bindings: AuthEnv }>();

function userRest(env: AuthEnv, token: string) {
  const f = resilientFetch(fetch, { timeoutMs: 4000 });
  return async <T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> => {
    const r = await f(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY ?? "",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    });
    const t = await r.text();
    return { ok: r.ok, status: r.status, data: (t ? JSON.parse(t) : null) as T };
  };
}

async function authorizeWrite(c: Parameters<typeof authorize>[0]) {
  const a = await authorize(c);
  if ("error" in a) return a;
  const can = await userRpc<boolean>(c.env, a.user.token, "can_write_tasks", { p_student: a.id });
  return can ? a : { error: 403 as const };
}
const MIN_DUE = -86_400_000; // now - 1 day
const MAX_DUE = 2 * 366 * 86_400_000; // now + ~2 years

async function authorize(c: {
  env: AuthEnv;
  req: { param: (k: string) => string; header: (k: string) => string | undefined };
}) {
  const id = c.req.param("id");
  if (!UUID.test(id)) return { error: 400 as const };
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return { error: 401 as const };
  const can = await userRpc<boolean>(c.env, user.token, "can_view_student", { p_student: id, p_scope: "assignments" });
  if (!can) return { error: 403 as const };
  return { id, user };
}
const ERR = { 400: "bad_request", 401: "unauthorized", 403: "forbidden" } as const;

/** Preview only: never saves (FR-21 review step). */
tasks.post("/:id/tasks/parse", async (c) => {
  const a = await authorize(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const body = (await c.req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim() || text.length > 500) return c.json({ error: "bad_request" }, 400);
  const rest = userRest(c.env, a.user.token);
  const [age, cls] = await Promise.all([
    userRpc<number>(c.env, a.user.token, "student_age", { p_student: a.id }),
    rest<ClassRef[]>(`classes?student_id=eq.${a.id}&select=id,name&limit=50`),
  ]);
  const v = screenTaskInput(text, ageBand(age));
  if (v.kind === "crisis") {
    console.warn(JSON.stringify({ level: "warn", msg: "safety_flag", kind: "crisis", route: "tasks.parse" }));
    return c.json({ safety: "crisis", message: CRISIS_REPLY }, 200);
  }
  if (v.kind === "blocked") return c.json({ safety: "blocked", reason: v.reason }, 422);
  const parsed = parseTask(v.text, new Date(), cls.ok ? cls.data : []);
  // Tier-1 AI fallback (via router, PR #20) is only offered when confidence < 0.6; UI still requires confirm.
  return c.json({ safety: "ok", parsed, aiSuggested: parsed.confidence < 0.6 });
});

/** Save a reviewed task. Requires confirmed=true from the review UI. */
tasks.post("/:id/tasks", async (c) => {
  const a = await authorizeWrite(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (b.confirmed !== true) return c.json({ error: "review_required" }, 422);
  if (!title || title.length > 120) return c.json({ error: "bad_request" }, 400);
  const dueMs = typeof b.dueAt === "string" ? Date.parse(b.dueAt) : NaN;
  const delta = dueMs - Date.now();
  const dueAt =
    b.dueAt == null ? null : delta >= MIN_DUE && delta <= MAX_DUE ? new Date(dueMs).toISOString() : undefined;
  const priority = typeof b.priority === "string" && PRIORITIES.has(b.priority) ? b.priority : "normal";
  const classId =
    b.classId == null ? null : typeof b.classId === "string" && UUID.test(b.classId) ? b.classId : undefined;
  if (dueAt === undefined || classId === undefined) return c.json({ error: "bad_request" }, 400);
  const age = await userRpc<number>(c.env, a.user.token, "student_age", { p_student: a.id });
  const v = screenTaskInput(title, ageBand(age));
  if (v.kind === "crisis") {
    console.warn(JSON.stringify({ level: "warn", msg: "safety_flag", kind: "crisis", route: "tasks.save" })); // no content logged
    return c.json({ safety: "crisis", message: CRISIS_REPLY }, 200);
  }
  if (v.kind === "blocked") return c.json({ safety: "blocked", reason: v.reason }, 422);
  const r = await userRest(c.env, a.user.token)<unknown[]>("tasks", {
    method: "POST",
    body: JSON.stringify({
      student_id: a.id,
      title: v.text,
      due_at: dueAt,
      priority,
      class_id: classId,
      source_text: typeof b.sourceText === "string" ? b.sourceText.slice(0, 500) : null,
    }),
  });
  if (!r.ok) return c.json({ error: r.status === 403 ? "forbidden" : "save_failed" }, r.status === 403 ? 403 : 502);
  return c.json({ task: r.data[0] }, 201);
});

tasks.get("/:id/tasks", async (c) => {
  const a = await authorize(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const r = await userRest(
    c.env,
    a.user.token,
  )<unknown[]>(
    `tasks?student_id=eq.${a.id}&done_at=is.null&select=id,title,due_at,priority,class_id,created_at&order=due_at.asc.nullslast&limit=100`,
  );
  if (!r.ok) return c.json({ error: "load_failed" }, 502);
  c.header("Cache-Control", "private, no-store");
  return c.json({ tasks: r.data });
});

/** Due-soon + reminders for the Today view (DEC-107). Read-only; anyone who can view assignments. */
tasks.get("/:id/tasks/due-soon", async (c) => {
  const a = await authorize(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const until = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const r = await userRest(
    c.env,
    a.user.token,
  )<TaskLite[]>(
    `tasks?student_id=eq.${a.id}&done_at=is.null&due_at=lte.${encodeURIComponent(until)}&select=id,title,due_at,priority&order=due_at.asc&limit=200`,
  );
  if (!r.ok) return c.json({ error: "load_failed" }, 502);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(dueSoon(r.data, new Date()));
});
