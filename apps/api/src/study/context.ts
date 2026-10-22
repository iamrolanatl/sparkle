/** Ground Ask Sparkle in the student's own data, read AS THE USER (RLS applies). Titles only, no free-text bodies. */
import type { AuthEnv } from "../auth/user";
import { resilientFetch } from "../lib/resilience";
import { sanitizeTitle } from "../ai/router";

export interface Source {
  id: string;
  title: string;
}
type Row = Record<string, unknown>;

export async function loadContext(
  env: AuthEnv,
  token: string,
  student: string,
  now = new Date(),
  f: typeof fetch = resilientFetch(fetch, { timeoutMs: 3000 }),
): Promise<{ summary: string; sources: Source[] }> {
  const get = async (path: string): Promise<Row[]> => {
    try {
      const r = await f(`${env.SUPABASE_URL}/rest/v1/${path}`, {
        headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY ?? "", Authorization: `Bearer ${token}` },
      });
      return r.ok ? ((await r.json()) as Row[]) : [];
    } catch {
      return [];
    }
  };
  const s = `student_id=eq.${student}`;
  const from = now.toISOString();
  const to = new Date(now.getTime() + 14 * 864e5).toISOString();
  const [classes, grades, units, work, actions] = await Promise.all([
    get(`classes?${s}&select=id,name,teacher&limit=12`),
    get(`grade_snapshots?${s}&select=class_id,pct,mark,missing_count,captured_on&order=captured_on.desc&limit=40`),
    get(`units?${s}&is_current=eq.true&select=class_id,title&limit=12`),
    get(`assignments?${s}&due_at=gte.${from}&due_at=lte.${to}&select=id,class_id,title,due_at&order=due_at&limit=15`),
    get(`post_actions?${s}&done_at=is.null&select=id,class_id,kind,text,due_at&order=due_at.asc.nullslast&limit=10`),
  ]);
  const name = new Map(classes.map((c) => [String(c.id), sanitizeTitle(String(c.name ?? "Class"))]));
  const latest = new Map<string, Row>();
  for (const g of grades) if (!latest.has(String(g.class_id))) latest.set(String(g.class_id), g);
  const unit = new Map(units.map((u) => [String(u.class_id), sanitizeTitle(String(u.title))]));
  const day = (d: unknown) => (d ? new Date(String(d)).toDateString().slice(0, 10) : "no date");
  const sources: Source[] = [];
  const lines: string[] = ["Classes:"];
  for (const c of classes) {
    const id = String(c.id);
    const g = latest.get(id);
    const grade = g
      ? ` grade ${g.pct ?? g.mark ?? "?"}${Number(g.missing_count) > 0 ? `, ${g.missing_count} missing` : ""}`
      : "";
    lines.push(`- ${name.get(id)}${grade}${unit.has(id) ? `; current unit: ${unit.get(id)}` : ""}`);
    sources.push({ id: `class:${id}`, title: name.get(id)! });
  }
  if (work.length) lines.push("Due in the next 2 weeks:");
  for (const w of work) {
    lines.push(`- ${sanitizeTitle(String(w.title))} (${name.get(String(w.class_id)) ?? "class"}) due ${day(w.due_at)}`);
    sources.push({ id: `assignment:${w.id}`, title: sanitizeTitle(String(w.title)) });
  }
  if (actions.length) lines.push("Open items from teacher posts:");
  for (const a of actions) {
    lines.push(
      `- [${a.kind}] ${sanitizeTitle(String(a.text))} (${name.get(String(a.class_id)) ?? "class"}${a.due_at ? `, ${day(a.due_at)}` : ""})`,
    );
    sources.push({ id: `post_action:${a.id}`, title: sanitizeTitle(String(a.text)) });
  }
  return { summary: lines.join("\n").slice(0, 3500), sources: sources.slice(0, 30) };
}

/** Suggested prompts from real data (classes / teacher posts), no AI call. */
export function suggestions(summary: string): string[] {
  const out = ["What's due this week?"];
  const unit = /current unit: ([^\n]+)/.exec(summary);
  if (unit) out.push(`Quiz me on ${unit[1]!.slice(0, 40)}`);
  if (/Open items from teacher posts/.test(summary)) out.push("What did my teachers post that I should know?");
  out.push("Help me make a study plan");
  return out.slice(0, 4);
}
