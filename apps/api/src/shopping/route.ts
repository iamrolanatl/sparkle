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
  const [items, members, shares] = await Promise.all([
    a.db<unknown[]>(
      `shopping_items?household_id=eq.${a.hh}&select=${COLS}&order=done.asc,position.asc,created_at.asc&limit=500`,
    ),
    a.db<unknown[]>(`rpc/shopping_members`, { method: "POST", body: JSON.stringify({ p_household: a.hh }) }),
    a.db<unknown[]>(
      `list_shares?household_id=eq.${a.hh}&status=neq.revoked&select=id,email,role,status,member_profile_id,created_at,expires_at&order=created_at.asc`,
    ),
  ]);
  if (!items.ok) return c.json({ error: "unavailable" }, 503);
  return c.json({
    household: a.hh,
    me: a.user.id,
    role: "owner",
    items: items.data,
    members: members.ok ? members.data : [],
    shares: shares.ok ? shares.data : [],
  });
});

shopping.post("/:id/list/items", async (c) => {
  const a = await household(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = clean(b?.text, 160);
  const title = clean(b?.title, 120);
  if (!text && !title) return c.json({ error: "bad_request" }, 400);
  // Student's real class names (RLS-scoped via caller's token); display label only, no class_id link.
  const cr = text ? await a.db<{ name: string }[]>(`classes?student_id=eq.${a.id}&select=name&limit=30`) : null;
  const classes = cr?.ok ? cr.data.map((x) => x.name).filter(Boolean) : [];
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

/* ---------- Household-id keyed list API (owners + shared members). RLS + list_role() decide access. ---------- */
export const lists = new Hono<{ Bindings: AuthEnv }>();
type Role = "owner" | "editor" | "viewer";
async function listCtx(c: {
  env: AuthEnv;
  req: { param: (k: string) => string; header: (k: string) => string | undefined };
}) {
  const hh = c.req.param("hh");
  if (!UUID.test(hh)) return { error: 400 as const };
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return { error: 401 as const };
  const role = await userRpc<Role | null>(c.env, user.token, "list_role", { p_household: hh });
  if (!role) return { error: 403 as const };
  return { hh, role, user, db: rest(c.env, user.token) };
}
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

lists.get("/shared", async (c) => {
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const r = await rest(c.env, user.token)<unknown[]>(`rpc/my_shared_lists`, { method: "POST", body: "{}" });
  return c.json({ lists: r.ok ? r.data : [] });
});

lists.post("/accept", async (c) => {
  const user = await getUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const b = (await c.req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof b?.token === "string" && /^[0-9a-f]{64}$/.test(b.token) ? b.token : null;
  if (!token) return c.json({ error: "invalid_invite" }, 400);
  const r = await rest(c.env, user.token)<string | { message?: string }>(`rpc/accept_list_invite`, {
    method: "POST",
    body: JSON.stringify({ p_token: token }),
  });
  if (r.ok) return c.json({ household: r.data });
  const msg = typeof r.data === "object" && r.data ? (r.data.message ?? "") : "";
  const code = /email mismatch/.test(msg)
    ? "email_mismatch"
    : /already owner/.test(msg)
      ? "already_owner"
      : "invalid_invite";
  return c.json({ error: code }, code === "invalid_invite" ? 404 : 403);
});

lists.get("/:hh", async (c) => {
  const a = await listCtx(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const [items, members, shares] = await Promise.all([
    a.db<unknown[]>(
      `shopping_items?household_id=eq.${a.hh}&select=${COLS}&order=done.asc,position.asc,created_at.asc&limit=500`,
    ),
    a.db<unknown[]>(`rpc/shopping_members`, { method: "POST", body: JSON.stringify({ p_household: a.hh }) }),
    a.role === "owner"
      ? a.db<unknown[]>(
          `list_shares?household_id=eq.${a.hh}&status=neq.revoked&select=id,email,role,status,member_profile_id,created_at,expires_at&order=created_at.asc`,
        )
      : Promise.resolve({ ok: true, status: 200, data: [] as unknown[] }),
  ]);
  if (!items.ok) return c.json({ error: "unavailable" }, 503);
  return c.json({
    household: a.hh,
    me: a.user.id,
    role: a.role,
    items: items.data,
    members: members.ok ? members.data : [],
    shares: shares.ok ? shares.data : [],
  });
});

lists.post("/:hh/items", async (c) => {
  const a = await listCtx(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  if (a.role === "viewer") return c.json({ error: "forbidden" }, 403);
  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = clean(b?.text, 160);
  const title = clean(b?.title, 120);
  if (!text && !title) return c.json({ error: "bad_request" }, 400);
  const classes = Array.isArray(b?.classes)
    ? (b.classes as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 30)
    : [];
  const p = text ? parseItem(text, classes) : null;
  const row = {
    household_id: a.hh,
    created_by: a.user.id,
    title: title ?? p!.title,
    quantity: num(b?.quantity) ?? p?.quantity ?? 1,
    category: b?.category === "school" || b?.category === "household" ? b.category : (p?.category ?? "household"),
    class_label: clean(b?.class_label, 60) ?? p?.classLabel ?? null,
    notes: clean(b?.notes, 280),
    source: b?.source === "teacher_post" ? "teacher_post" : "manual",
  };
  const r = await a.db<unknown[]>(`shopping_items?select=${COLS}`, { method: "POST", body: JSON.stringify(row) });
  if (!r.ok) return c.json({ error: r.status === 403 ? "forbidden" : "bad_request" }, r.status === 403 ? 403 : 400);
  return c.json({ item: r.data[0] }, 201);
});

lists.patch("/:hh/items/:item", async (c) => {
  const a = await listCtx(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const item = c.req.param("item");
  if (!UUID.test(item) || a.role === "viewer") return c.json({ error: "forbidden" }, 403);
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

lists.delete("/:hh/items/:item", async (c) => {
  const a = await listCtx(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const item = c.req.param("item");
  if (!UUID.test(item) || a.role === "viewer") return c.json({ error: "forbidden" }, 403);
  const r = await a.db<unknown[]>(`shopping_items?id=eq.${item}&household_id=eq.${a.hh}&select=id`, {
    method: "DELETE",
  });
  if (!r.ok) return c.json({ error: "unavailable" }, 503);
  return r.data.length ? c.body(null, 204) : c.json({ error: "not_found" }, 404);
});

/** Bulk "clear checked items". */
lists.post("/:hh/clear-done", async (c) => {
  const a = await listCtx(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  if (a.role === "viewer") return c.json({ error: "forbidden" }, 403);
  const r = await a.db<unknown[]>(`shopping_items?household_id=eq.${a.hh}&done=is.true&select=id`, {
    method: "DELETE",
  });
  if (!r.ok) return c.json({ error: "unavailable" }, 503);
  return c.json({ deleted: r.data.length });
});

/** Owner invites by email. No email is sent: the response carries a one-time token for an in-app link. */
lists.post("/:hh/shares", async (c) => {
  const a = await listCtx(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  if (a.role !== "owner") return c.json({ error: "forbidden" }, 403);
  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) return c.json({ error: "bad_email" }, 400);
  const role = b?.role === "viewer" ? "viewer" : "editor";
  const r = await a.db<{ share_id: string; token: string | null }[]>(`rpc/create_list_invite`, {
    method: "POST",
    body: JSON.stringify({ p_household: a.hh, p_email: email, p_role: role }),
  });
  if (!r.ok || !r.data?.[0]) return c.json({ error: "bad_request" }, 400);
  return c.json({ share: r.data[0].share_id, token: r.data[0].token }, 201);
});

lists.delete("/:hh/shares/:share", async (c) => {
  const a = await listCtx(c);
  if ("error" in a) return c.json({ error: ERR[a.error!] }, a.error!);
  const share = c.req.param("share");
  if (!UUID.test(share)) return c.json({ error: "bad_request" }, 400);
  const r = await a.db<boolean>(`rpc/revoke_list_share`, { method: "POST", body: JSON.stringify({ p_share: share }) });
  if (!r.ok) return c.json({ error: "unavailable" }, 503);
  return r.data ? c.body(null, 204) : c.json({ error: "not_found" }, 404);
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
