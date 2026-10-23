"use server";
import { createClient } from "@/lib/supabase/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const UUID = /^[0-9a-f-]{36}$/i;
type R = { status: number; body: Record<string, unknown> };

async function call(path: string, init: RequestInit = {}): Promise<R> {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const token = user ? (await supabase!.auth.getSession()).data.session?.access_token : null;
  if (!token || !API) return { status: 401, body: { error: "unauthorized" } };
  try {
    const r = await fetch(`${API}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return { status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { status: 503, body: { error: "unavailable" } };
  }
}
const bad: R = { status: 400, body: { error: "bad_request" } };

export async function listAction(sid: string) {
  return UUID.test(sid) ? call(`/students/${sid}/list`) : bad;
}
export async function suggestionsAction(sid: string) {
  return UUID.test(sid) ? call(`/students/${sid}/list/suggestions`) : bad;
}
export async function addItemAction(sid: string, item: Record<string, unknown>) {
  if (!UUID.test(sid)) return bad;
  return call(`/students/${sid}/list/items`, { method: "POST", body: JSON.stringify(item) });
}
export async function updateItemAction(sid: string, id: string, patch: Record<string, unknown>) {
  if (!UUID.test(sid) || !UUID.test(id)) return bad;
  return call(`/students/${sid}/list/items/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export async function deleteItemAction(sid: string, id: string) {
  if (!UUID.test(sid) || !UUID.test(id)) return bad;
  return call(`/students/${sid}/list/items/${id}`, { method: "DELETE" });
}

/* Household-id keyed list API (owners + shared members). */
const ok = (...ids: string[]) => ids.every((x) => UUID.test(x));
export async function hhListAction(hh: string) {
  return ok(hh) ? call(`/lists/${hh}`) : bad;
}
export async function sharedListsAction() {
  return call(`/lists/shared`);
}
export async function hhAddAction(hh: string, item: Record<string, unknown>) {
  return ok(hh) ? call(`/lists/${hh}/items`, { method: "POST", body: JSON.stringify(item) }) : bad;
}
export async function hhUpdateAction(hh: string, id: string, patch: Record<string, unknown>) {
  return ok(hh, id) ? call(`/lists/${hh}/items/${id}`, { method: "PATCH", body: JSON.stringify(patch) }) : bad;
}
export async function hhDeleteAction(hh: string, id: string) {
  return ok(hh, id) ? call(`/lists/${hh}/items/${id}`, { method: "DELETE" }) : bad;
}
export async function clearDoneAction(hh: string) {
  return ok(hh) ? call(`/lists/${hh}/clear-done`, { method: "POST" }) : bad;
}
export async function inviteAction(hh: string, email: string, role: "viewer" | "editor") {
  return ok(hh) ? call(`/lists/${hh}/shares`, { method: "POST", body: JSON.stringify({ email, role }) }) : bad;
}
export async function revokeShareAction(hh: string, share: string) {
  return ok(hh, share) ? call(`/lists/${hh}/shares/${share}`, { method: "DELETE" }) : bad;
}
export async function acceptInviteAction(token: string): Promise<R> {
  return /^[0-9a-f]{64}$/.test(token)
    ? call(`/lists/accept`, { method: "POST", body: JSON.stringify({ token }) })
    : { status: 404, body: { error: "invalid_invite" } };
}
