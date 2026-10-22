/** Same-origin streaming proxy to the API's /study-helper/:id/ask (keeps the access token server-side). */
import { createClient } from "@/lib/supabase/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const UUID = /^[0-9a-f-]{36}$/i;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sid = new URL(req.url).searchParams.get("student") ?? "";
  if (!UUID.test(sid)) return Response.json({ error: "bad_request" }, { status: 400 });
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const token = user ? (await supabase!.auth.getSession()).data.session?.access_token : null;
  if (!token || !API) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.text()).slice(0, 8192);
  try {
    const r = await fetch(`${API}/study-helper/${sid}/ask`, {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
    });
    return new Response(r.body, {
      status: r.status,
      headers: {
        "Content-Type": r.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
