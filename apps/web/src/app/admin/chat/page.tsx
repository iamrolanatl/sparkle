import Link from "next/link";
import { GlassPanel } from "@sparkle/ui";
import { adminDb } from "@/lib/admin";
import { setChatEnabled, setTicketStatus } from "../actions";

const isLive = (ts: string) => Date.now() - new Date(ts).getTime() < 5 * 60_000;

type Usage = { tokens: number; messages: number; errors: number; sessions: number };

export default async function ChatAdmin({ searchParams }: { searchParams: Promise<{ flagged?: string }> }) {
  const { flagged } = await searchParams;
  const db = adminDb();
  const [{ data: flag }, { data: usageRows }, sessionsQ, { data: tickets }] = await Promise.all([
    db.from("feature_flags").select("enabled, config").eq("key", "sales_chat").maybeSingle(),
    db.rpc("chat_usage_today"),
    (() => {
      let q = db
        .from("chat_sessions")
        .select("id, created_at, last_message_at, message_count, error_count, flagged, flag_reason, escalated, page")
        .order("last_message_at", { ascending: false })
        .limit(50);
      if (flagged) q = q.eq("flagged", true);
      return q;
    })(),
    db
      .from("support_tickets")
      .select("id, email, question, status, created_at, session_id")
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const usage = (usageRows as Usage[] | null)?.[0] ?? { tokens: 0, messages: 0, errors: 0, sessions: 0 };
  const budget = Number((flag?.config as Record<string, number> | undefined)?.daily_token_budget ?? 0);
  const errorRate = usage.messages ? Math.round((Number(usage.errors) / Number(usage.messages)) * 100) : 0;
  const live = (sessionsQ.data ?? []).filter((s) => isLive(s.last_message_at)).length;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-5">
        {[
          ["Live (5 min)", live],
          ["Sessions today", usage.sessions],
          ["Messages today", usage.messages],
          ["Tokens today", `${usage.tokens}${budget ? ` / ${budget}` : ""}`],
          ["Error rate", `${errorRate}%`],
        ].map(([k, v]) => (
          <GlassPanel key={String(k)} className="p-4">
            <p className="text-muted text-xs">{k}</p>
            <p className="text-xl font-semibold">{v}</p>
          </GlassPanel>
        ))}
      </div>
      <GlassPanel className="flex items-center gap-4 p-4">
        <p>
          Chat is <strong>{flag?.enabled ? "ON" : "OFF"}</strong> (kill switch)
        </p>
        <form action={setChatEnabled}>
          <input type="hidden" name="enabled" value={flag?.enabled ? "false" : "true"} />
          <button className="spk-glass spk-glow px-3 py-1.5 text-sm">
            {flag?.enabled ? "Turn chat off" : "Turn chat on"}
          </button>
        </form>
      </GlassPanel>
      <GlassPanel className="p-4">
        <div className="mb-2 flex items-center gap-3">
          <h2 className="font-semibold">Sessions</h2>
          <Link href="/admin/chat" className="text-xs underline">
            All
          </Link>
          <Link href="/admin/chat?flagged=1" className="text-xs underline">
            Flagged
          </Link>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th>Last activity</th>
              <th>Msgs</th>
              <th>Errors</th>
              <th>Flags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(sessionsQ.data ?? []).map((s) => (
              <tr key={s.id} className="border-t border-[var(--spk-border)]">
                <td>{new Date(s.last_message_at).toLocaleString()}</td>
                <td>{s.message_count}</td>
                <td>{s.error_count}</td>
                <td>
                  {s.flagged ? `⚑ ${s.flag_reason ?? ""}` : ""}
                  {s.escalated ? " ↗ human" : ""}
                </td>
                <td>
                  <Link className="underline" href={`/admin/chat/${s.id}`}>
                    Transcript
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
      <GlassPanel className="p-4">
        <h2 className="mb-2 font-semibold">Escalations / tickets</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {(tickets ?? []).map((t) => (
            <li key={t.id} className="border-t border-[var(--spk-border)] pt-2">
              <p>
                <strong>{t.email}</strong> · {new Date(t.created_at).toLocaleString()} · {t.status}
              </p>
              <p className="text-muted">{t.question}</p>
              <form action={setTicketStatus} className="mt-1 flex gap-2">
                <input type="hidden" name="id" value={t.id} />
                <button name="status" value="in_progress" className="underline">
                  In progress
                </button>
                <button name="status" value="closed" className="underline">
                  Close
                </button>
              </form>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}
