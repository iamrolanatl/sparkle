import { GlassPanel } from "@sparkle/ui/GlassPanel";
import { adminDb } from "@/lib/admin";
import { setPrivacyStatus } from "../actions";

export default async function PrivacyQueue() {
  const { data } = await adminDb()
    .from("privacy_requests")
    .select("id, request_type, email, gpc_signal, state_of_residence, status, created_at, details")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <GlassPanel className="p-4">
      <h2 className="mb-3 font-semibold">Privacy requests</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {(data ?? []).map((r) => (
          <li key={r.id} className="border-t border-[var(--spk-border)] pt-2">
            <p>
              <strong>{r.request_type}</strong> · {r.email} · {r.gpc_signal ? "GPC · " : ""}
              {r.state_of_residence ?? ""} · {new Date(r.created_at).toLocaleString()} · <em>{r.status}</em>
            </p>
            {r.details && <p className="text-muted">{r.details}</p>}
            <form action={setPrivacyStatus} className="mt-1 flex gap-3">
              <input type="hidden" name="id" value={r.id} />
              {["verifying", "completed", "denied"].map((s) => (
                <button key={s} name="status" value={s} className="underline">
                  {s}
                </button>
              ))}
            </form>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
