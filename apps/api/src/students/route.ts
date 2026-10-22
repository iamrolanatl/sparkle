import { Hono } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import { keyOf, validateImport } from "../import/csv";
import { serviceRest } from "../lib/supa";
import { computeToday, type AssignmentLite } from "../today/today";

export interface StudentsEnv extends AuthEnv {
  TODAY_CACHE?: KVNamespace;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TODAY_TTL = 300;

export const students = new Hono<{ Bindings: StudentsEnv }>();

/** Manual import (WBS 3.3): guardians or the student themself; validated CSV; idempotent upserts. */
students.post("/:id/import", async (c) => {
  const id = c.req.param("id");
  if (!UUID.test(id)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const [guardian, self] = await Promise.all([
    userRpc<boolean>(c.env, user.token, "is_active_guardian", { p_student: id }),
    userRpc<boolean>(c.env, user.token, "is_student_self", { p_student: id }),
  ]);
  if (!guardian && !self) return c.json({ error: "forbidden" }, 403);

  const text = await c.req.text();
  const { rows, errors } = validateImport(text);
  if (errors.length) return c.json({ error: "invalid_csv", details: errors.slice(0, 20) }, 422);

  const rest = serviceRest(c.env);
  const [run] = await rest<{ id: string }[]>("sync_runs", {
    method: "POST",
    body: JSON.stringify({ student_id: id, source: "manual", status: "running", rows_in: rows.length }),
  });
  try {
    const classMap = new Map<
      string,
      {
        student_id: string;
        external_key: string;
        name: string;
        teacher: string | null;
        period: string | null;
        source: string;
      }
    >();
    for (const r of rows) {
      const k = await keyOf(r.className);
      if (!classMap.has(k))
        classMap.set(k, {
          student_id: id,
          external_key: k,
          name: r.className,
          teacher: r.teacher,
          period: r.period,
          source: "manual",
        });
    }
    const classes = await rest<{ id: string; external_key: string }[]>("classes?on_conflict=student_id,external_key", {
      method: "POST",
      prefer: "return=representation,resolution=merge-duplicates",
      body: JSON.stringify([...classMap.values()]),
    });
    const classId = new Map(classes.map((x) => [x.external_key, x.id]));
    const assignments = [];
    for (const r of rows) {
      assignments.push({
        student_id: id,
        class_id: classId.get(await keyOf(r.className)) ?? null,
        external_key: await keyOf(r.className, r.title, r.dueAt),
        title: r.title,
        due_at: r.dueAt,
        status: r.status,
        points_possible: r.maxScore,
      });
    }
    // Chunked to keep each request small (NFR-42).
    for (let i = 0; i < assignments.length; i += 500) {
      await rest("assignments?on_conflict=student_id,external_key", {
        method: "POST",
        prefer: "return=minimal,resolution=merge-duplicates",
        body: JSON.stringify(assignments.slice(i, i + 500)),
      });
    }
    await rest(`sync_runs?id=eq.${run!.id}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ status: "ok", rows_ok: rows.length, finished_at: new Date().toISOString() }),
    });
    await c.env.TODAY_CACHE?.delete(`today:${id}`);
    return c.json({ ok: true, imported: rows.length, classes: classMap.size });
  } catch (e) {
    await rest(`sync_runs?id=eq.${run!.id}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ status: "error", error_class: "import_write", finished_at: new Date().toISOString() }),
    }).catch(() => {});
    throw e;
  }
});

/** Today document (WBS 3.4): KV-cached 5 min, invalidated on import. Anyone with 'assignments' scope. */
students.get("/:id/today", async (c) => {
  const id = c.req.param("id");
  if (!UUID.test(id)) return c.json({ error: "bad_request" }, 400);
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const allowed = await userRpc<boolean>(c.env, user.token, "can_view_student", {
    p_student: id,
    p_scope: "assignments",
  });
  if (!allowed) return c.json({ error: "forbidden" }, 403);
  c.header("Cache-Control", "private, no-store");
  const cached = await c.env.TODAY_CACHE?.get(`today:${id}`, "json");
  if (cached) return c.json({ ...(cached as object), cache: "hit" });
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const rows = await serviceRest(c.env)<(AssignmentLite & { classes: { name: string } | null })[]>(
    `assignments?student_id=eq.${id}&or=(due_at.gte.${since},due_at.is.null)&select=id,title,due_at,status,classes(name)&order=due_at.asc&limit=500`,
  );
  const doc = computeToday(
    rows.map((r) => ({
      id: r.id,
      title: r.title,
      due_at: r.due_at,
      status: r.status,
      class_name: r.classes?.name ?? null,
    })),
    new Date(),
  );
  await c.env.TODAY_CACHE?.put(`today:${id}`, JSON.stringify(doc), { expirationTtl: TODAY_TTL });
  return c.json({ ...doc, cache: "miss" });
});
