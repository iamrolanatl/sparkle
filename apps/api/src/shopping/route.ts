/** FR-08 shared shopping list. Every read/write runs as the caller so RLS decides (household membership). */
import { Hono } from "hono";
import { getUser, userRpc, type AuthEnv } from "../auth/user";
import { resilientFetch } from "../lib/resilience";
import { parseItem } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS =
  "id,title,quantity,done,category,class_label,notes,assigned_to,created_by,done_by,done_at,source,position,created_at,updated_at";
export const shopping = new Hono<{ Bindings: AuthEnv }>();

function rest(env: AuthEnv, token: string) {
  const f = resilientFetch(fetch, { timeoutMs: 4000 });
  return async <T>(path: string, init: RequestInit = {}) => {
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

async function household(c: {
  env: AuthEnv;
  req: { param: (k: string) => string; header: (k: string) => string | undefined };
}) {
  const id = c.req.param("id");
  if (!UUID.test(id)) return { error: 400 as const };
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return { error: 401 as const };
  const hh = await userRpc<string>(c.env, user.token, "household_for_student", { p_student: id });
  if (!hh) return { error: 403 as const };
  return { id, hh, user, db: rest(c.env, user.token) };
}
const ERR = { 400: "bad_request", 401: "unauthorized", 403: "forbidden", 404: "not_found" } as const;

function clean(v: unknown, max: number) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) || null : null;
}
const num = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 999 ? v : null);

shopping.get("/:id/list", async (c) => {
  const a = await household(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const [items, members] = await Promise.all([
    a.db<unknown[]>(
      `shopping_items?household_id=eq.${a.hh}&select=${COLS}&order=done.asc,position.asc,created_at.asc&limit=500`,
    ),
    a.db<unknown[]>(`rpc/shopping_members`, { method: "POST", body: JSON.stringify({ p_household: a.hh }) }),
  ]);
  if (!items.ok) return c.json({ error: "unavailable" }, 503);
  return c.json({ household: a.hh, me: a.user.id, items: items.data, members: members.ok ? members.data : [] });
});

shopping.post("/:id/list/items", async (c) => {
  const a = await household(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = clean(b?.text, 160);
  const title = clean(b?.title, 120);
  if (!text && !title) return c.json({ error: "bad_request" }, 400);
  const classes = Array.isArray(b?.classes)
    ? (b!.classes as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 20)
    : [];
  const p = text ? parseItem(text, classes) : null;
  const source = b?.source === "teacher_post" ? "teacher_post" : "manual";
  const row = {
    household_id: a.hh,
    created_by: a.user.id,
    title: title ?? p!.title,
    quantity: num(b?.quantity) ?? p?.quantity ?? 1,
    category: b?.category === "school" || b?.category === "household" ? b.category : (p?.category ?? "household"),
    class_label: clean(b?.class_label, 60) ?? p?.classLabel ?? null,
    notes: clean(b?.notes, 280),
    source,
  };
  const r = await a.db<unknown[]>(`shopping_items?select=${COLS}`, { method: "POST", body: JSON.stringify(row) });
  if (!r.ok) return c.json({ error: r.status === 403 ? "forbidden" : "bad_request" }, r.status === 403 ? 403 : 400);
  return c.json({ item: r.data[0] }, 201);
});

shopping.patch("/:id/list/items/:item", async (c) => {
  const a = await household(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const item = c.req.param("item");
  if (!UUID.test(item)) return c.json({ error: "bad_request" }, 400);
  const b = ((await c.req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if ("title" in b) patch.title = clean(b.title, 120);
  if ("quantity" in b) patch.quantity = num(b.quantity);
  if ("notes" in b) patch.notes = clean(b.notes, 280);
  if ("class_label" in b) patch.class_label = clean(b.class_label, 60);
  if ("category" in b) patch.category = b.category === "school" ? "school" : "household";
  if ("done" in b) patch.done = b.done === true;
  if ("assigned_to" in b)
    patch.assigned_to = typeof b.assigned_to === "string" && UUID.test(b.assigned_to) ? b.assigned_to : null;
  if (patch.title === null || patch.quantity === null || !Object.keys(patch).length)
    return c.json({ error: "bad_request" }, 400);
  const r = await a.db<unknown[]>(`shopping_items?id=eq.${item}&household_id=eq.${a.hh}&select=${COLS}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!r.ok) return c.json({ error: "bad_request" }, 400);
  if (!r.data.length) return c.json({ error: "not_found" }, 404);
  return c.json({ item: r.data[0] });
});

shopping.delete("/:id/list/items/:item", async (c) => {
  const a = await household(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const item = c.req.param("item");
  if (!UUID.test(item)) return c.json({ error: "bad_request" }, 400);
  const r = await a.db<unknown[]>(`shopping_items?id=eq.${item}&household_id=eq.${a.hh}&select=id`, {
    method: "DELETE",
  });
  if (!r.ok) return c.json({ error: "unavailable" }, 503);
  return r.data.length ? c.body(null, 204) : c.json({ error: "not_found" }, 404);
});

/** Supply mentions from teacher class-board posts ("bring" actions). Suggest only; added on tap. */
shopping.get("/:id/list/suggestions", async (c) => {
  const a = await household(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const since = new Date(Date.now() - 21 * 86_400_000).toISOString();
  const [acts, items] = await Promise.all([
    a.db<{ id: string; text: string; due_at: string | null; classes: { name: string } | null }[]>(
      `post_actions?student_id=eq.${a.id}&kind=eq.bring&done_at=is.null&created_at=gte.${since}&select=id,text,due_at,classes(name)&order=created_at.desc&limit=20`,
    ),
    a.db<{ title: string }[]>(`shopping_items?household_id=eq.${a.hh}&select=title&limit=500`),
  ]);
  if (!acts.ok) return c.json({ suggestions: [] });
  const have = new Set((items.data ?? []).map((i) => i.title.toLowerCase()));
  const seen = new Set<string>();
  const suggestions = acts.data
    .map((x) => {
      const title = supplyTitle(x.text);
      return title
        ? { id: x.id, title, className: x.classes?.name ?? null, due_at: x.due_at, detail: x.text.slice(0, 120) }
        : null;
    })
    .filter(
      (s): s is NonNullable<typeof s> =>
        !!s &&
        !have.has(s.title.toLowerCase()) &&
        !seen.has(s.title.toLowerCase()) &&
        !!seen.add(s.title.toLowerCase()),
    )
    .slice(0, 6);
  return c.json({ suggestions });
});

/** "Bring a calculator Friday" -> "Calculator". Returns null when no concrete item is named. */
export function supplyTitle(text: string): string | null {
  const m =
    /\b(?:bring|need|needs|buy|get|supply|supplies:?)\s+(?:your\s+|a\s+|an\s+|the\s+|some\s+)?([a-z0-9][a-z0-9 ,'-]{2,50}?)(?=\s+(?:to|for|on|by|tomorrow|today|this|next|monday|tuesday|wednesday|thursday|friday|every|each)\b|[.!;\n]|$)/i.exec(
      text,
    );
  if (!m) return null;
  const t = m[1]!.trim().replace(/[,'-]+$/, "");
  if (/^(it|them|this|that|work|homework|questions?|your(self)?|attention|.*\bsigned\b.*)$/i.test(t)) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
