import { GlassPanel } from "@sparkle/ui";
import { adminDb } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Run = {
  status: string;
  source: string;
  error_class: string | null;
  started_at: string;
  finished_at: string | null;
};

function since24h() {
  return new Date(Date.now() - 86_400_000).toISOString();
}

/** Basic sync health (WBS 3.5): last 24 h of sync runs by source and status. No student-identifying data shown. */
export default async function SyncHealth() {
  const { data } = await adminDb()
    .from("sync_runs")
    .select("status, source, error_class, started_at, finished_at")
    .gte("started_at", since24h())
    .order("started_at", { ascending: false })
    .limit(1000);
  const runs = (data ?? []) as Run[];
  const bySource = new Map<string, { ok: number; error: number; running: number; p95ms: number[] }>();
  const errors = new Map<string, number>();
  for (const r of runs) {
    const s = bySource.get(r.source) ?? { ok: 0, error: 0, running: 0, p95ms: [] };
    if (r.status === "ok") s.ok++;
    else if (r.status === "error") s.error++;
    else s.running++;
    if (r.finished_at) s.p95ms.push(Date.parse(r.finished_at) - Date.parse(r.started_at));
    bySource.set(r.source, s);
    if (r.error_class) errors.set(r.error_class, (errors.get(r.error_class) ?? 0) + 1);
  }
  const p95 = (xs: number[]) =>
    xs.length ? xs.sort((a, b) => a - b)[Math.floor(xs.length * 0.95) - (xs.length > 1 ? 1 : 0)]! : 0;
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Sync health (last 24 h)</h1>
      <GlassPanel className="overflow-x-auto p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>Source</th>
              <th>OK</th>
              <th>Errors</th>
              <th>Running</th>
              <th>Success rate</th>
              <th>p95 duration</th>
            </tr>
          </thead>
          <tbody>
            {[...bySource.entries()].map(([src, s]) => (
              <tr key={src}>
                <td>{src}</td>
                <td>{s.ok}</td>
                <td>{s.error}</td>
                <td>{s.running}</td>
                <td>{s.ok + s.error ? `${Math.round((100 * s.ok) / (s.ok + s.error))}%` : "—"}</td>
                <td>{s.p95ms.length ? `${(p95(s.p95ms) / 1000).toFixed(1)} s` : "—"}</td>
              </tr>
            ))}
            {bySource.size === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  No sync runs in the last 24 hours.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </GlassPanel>
      {errors.size ? (
        <GlassPanel className="p-5">
          <h2 className="font-semibold">Error classes</h2>
          <ul className="mt-2 text-sm">
            {[...errors.entries()].map(([k, n]) => (
              <li key={k}>
                {k}: {n}
              </li>
            ))}
          </ul>
        </GlassPanel>
      ) : null}
    </div>
  );
}
