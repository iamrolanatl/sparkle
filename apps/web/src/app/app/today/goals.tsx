import { W } from "@/components/agent/Pigeon";
import type { SupabaseClient } from "@supabase/supabase-js";
import { goalProgress } from "@/lib/ship/derive";
import { addGoal, archiveGoal } from "./goals-actions";

type Goal = { id: string; class_id: string | null; target_pct: number; by_date: string; reward: string | null };

/** Shared goals: guardian sets them, student sees them as missions. Progress from real class grades only. */
export async function Goals({
  sb,
  studentId,
  first,
  classes,
}: {
  sb: SupabaseClient;
  studentId: string;
  first: string;
  classes: { id: string; name: string; pct: number | null }[];
}) {
  const [{ data }, { data: g }] = await Promise.all([
    sb
      .from("family_goals")
      .select("id, class_id, target_pct, by_date, reward")
      .eq("student_id", studentId)
      .is("archived_at", null)
      .order("by_date")
      .limit(10),
    sb.rpc("is_active_guardian", { p_student: studentId }),
  ]);
  const guardian = g === true;
  const goals = (data ?? []) as Goal[];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="panel sh-card sh-goals" data-testid="goals">
      <div className="sh-l">
        <W a="Joint missions · goals & rewards" p="Family goals" />
      </div>
      {goals.length ? (
        goals.map((g) => {
          const c = classes.find((k) => k.id === g.class_id);
          const p = goalProgress(c?.pct ?? null, Number(g.target_pct), g.by_date, today);
          return (
            <div className="li" key={g.id} style={{ display: "grid", gap: 4, padding: "8px 0" }}>
              <div>
                <b>
                  {c?.name ?? "Class"} to {Number(g.target_pct)}%
                </b>{" "}
                by {g.by_date}
                {g.reward ? ` · Reward: ${g.reward}` : ""}
              </div>
              <div className="bar" aria-label={`progress ${Math.round(p.ratio * 100)}%`}>
                <i
                  style={{
                    width: `${Math.round(p.ratio * 100)}%`,
                    background: p.met ? "var(--ok, #39ff88)" : "var(--warn, #ffb000)",
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: "var(--mut)" }}>
                {p.now == null
                  ? "No grade synced yet for this class."
                  : p.met
                    ? `Goal met: now ${p.now}%.`
                    : `Now ${p.now}%, ${p.gap} points to go, ${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"} left.`}
              </div>
              {guardian ? (
                <form action={archiveGoal}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className="btn ghost" type="submit" style={{ fontSize: 12, marginTop: 4 }}>
                    Close goal
                  </button>
                </form>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="empty" style={{ fontSize: 13 }}>
          {guardian ? `No goals yet. Set one for ${first} below.` : "No family goals yet. Ask your parent to set one."}
        </div>
      )}
      {guardian && classes.length ? (
        <form
          action={addGoal}
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}
          data-testid="goal-form"
        >
          <input type="hidden" name="student_id" value={studentId} />
          <label>
            Class{" "}
            <select name="class_id" required>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.pct != null ? ` (${c.pct}%)` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target %{" "}
            <input name="target_pct" type="number" min={1} max={100} defaultValue={80} required style={{ width: 64 }} />
          </label>
          <label>
            By <input name="by_date" type="date" required />
          </label>
          <label>
            Reward <input name="reward" maxLength={200} placeholder="e.g. Pizza night" />
          </label>
          <button className="btn" type="submit">
            Set goal
          </button>
        </form>
      ) : null}
    </div>
  );
}
