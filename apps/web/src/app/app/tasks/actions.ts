"use server";
import { createClient } from "@/lib/supabase/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const UUID = /^[0-9a-f-]{36}$/i;

async function call(path: string, init: RequestInit = {}, extra: Record<string, string> = {}) {
  const supabase = await createClient();
  // Verify the user with the auth server first (Supabase guidance), then read the token to forward.
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const token = user ? (await supabase!.auth.getSession()).data.session?.access_token : null;
  if (!token || !API) return { status: 401, body: { error: "unauthorized" } as Record<string, unknown> };
  try {
    const r = await fetch(`${API}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra },
    });
    return { status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { status: 503, body: { error: "unavailable" } as Record<string, unknown> };
  }
}

export async function parseTaskAction(studentId: string, text: string) {
  if (!UUID.test(studentId)) return { status: 400, body: { error: "bad_request" } };
  return call(`/students/${studentId}/tasks/parse`, {
    method: "POST",
    body: JSON.stringify({ text: text.slice(0, 500) }),
  });
}

export async function saveTaskAction(
  studentId: string,
  t: { title: string; dueAt: string | null; priority: string; classId: string | null },
  confirmed: boolean,
  idempotencyKey: string,
) {
  if (!UUID.test(studentId) || !/^[\w-]{8,128}$/.test(idempotencyKey))
    return { status: 400, body: { error: "bad_request" } };
  // `confirmed` is forwarded as given; the API rejects anything but true (DEC-106: UX control, not a security boundary).
  return call(
    `/students/${studentId}/tasks`,
    { method: "POST", body: JSON.stringify({ ...t, confirmed }) },
    { "Idempotency-Key": idempotencyKey },
  );
}

export async function listTasksAction(studentId: string) {
  if (!UUID.test(studentId)) return { status: 400, body: { error: "bad_request" } };
  return call(`/students/${studentId}/tasks`);
}
