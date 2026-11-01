/** Pure spaceship-HUD derivations from real class/task data. No storage, no AI. */
export type Cat = { name: string; weight: number; score: number | null };
export type ShieldClass = { id: string; name: string; pct: number | null; missing: number };
export type Shield = { id: string; name: string; pct: number | null; level: "ok" | "warn" | "bad" | "none" };

export const shieldOf = (c: ShieldClass): Shield => ({
  id: c.id,
  name: c.name,
  pct: c.pct,
  level: c.pct == null ? "none" : c.pct < 70 || c.missing > 1 ? "bad" : c.pct < 80 || c.missing ? "warn" : "ok",
});

/** Consecutive days (ending today or yesterday, in tz) with at least one completed task. */
export function fuelStreak(doneAt: string[], now: Date, tz = "America/New_York"): number {
  const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: tz });
  const days = new Set(doneAt.map((s) => key(new Date(s))));
  let n = 0;
  const d = new Date(now);
  if (!days.has(key(d))) d.setTime(d.getTime() - 864e5);
  while (days.has(key(d))) {
    n++;
    d.setTime(d.getTime() - 864e5);
  }
  return n;
}

const RANKS = ["Cadet", "Ensign", "Lieutenant", "Commander", "Captain", "Admiral"] as const;
/** XP only for real work: 20 per completed task (last 60 days), 15 per class at/above 90%, 5 per streak day. */
export function rankOf(tasksDone: number, classesAbove90: number, streak: number) {
  const xp = tasksDone * 20 + classesAbove90 * 15 + streak * 5;
  const lvl = Math.min(RANKS.length - 1, Math.floor(Math.sqrt(xp / 50)));
  const floor = lvl * lvl * 50;
  const next = (lvl + 1) * (lvl + 1) * 50;
  return {
    xp,
    rank: RANKS[lvl]!,
    level: lvl + 1,
    progress: lvl === RANKS.length - 1 ? 1 : (xp - floor) / (next - floor),
    next,
  };
}

/** Class % if one category's average becomes `score`. Returns null when weights are unknown. */
export function whatIf(cats: Cat[], name: string, score: number): number | null {
  const known = cats.filter((c) => c.weight > 0);
  if (!known.length) return null;
  const rows = known.map((c) => ({ w: c.weight, s: c.name === name ? score : c.score }));
  const used = rows.filter((r) => r.s != null);
  const tw = used.reduce((a, r) => a + r.w, 0);
  return tw ? used.reduce((a, r) => a + r.w * (r.s as number), 0) / tw : null;
}

export type PlanItem = { title: string; cls: string; due: string; kind: "test" | "due" | "missing" };
export type PlanStep = { min: number; text: string; cls: string };
const isTest = (s: string) => /test|quiz|exam|summative|assessment/i.test(s);

/** Tonight's 15–30 min study plan from real upcoming items: missing first, then nearest tests, then due work. */
export function nightlyPlan(items: PlanItem[], now: Date): PlanStep[] {
  const days = (d: string) => Math.max(0, Math.ceil((Date.parse(d) - now.getTime()) / 864e5));
  const steps: PlanStep[] = [];
  let left = 30;
  const add = (min: number, text: string, cls: string) => {
    const m = Math.min(min, left);
    if (m >= 5) {
      steps.push({ min: m, text, cls });
      left -= m;
    }
  };
  for (const i of items.filter((i) => i.kind === "missing").slice(0, 1))
    add(10, `Finish and turn in: ${i.title}`, i.cls);
  for (const i of items
    .filter((i) => i.kind === "test" || isTest(i.title))
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))
    .slice(0, 2)) {
    const d = days(i.due);
    add(
      d <= 1 ? 15 : 10,
      d <= 1
        ? `Final review for ${i.title}: redo 5 practice problems`
        : `Spaced review for ${i.title} (${d} days out): 10 min of practice`,
      i.cls,
    );
  }
  for (const i of items
    .filter((i) => i.kind === "due" && !isTest(i.title))
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))
    .slice(0, 2))
    add(10, `Work on: ${i.title}`, i.cls);
  return steps;
}

export type RecoveryInput = {
  cls: string;
  teacher: string | null;
  pct: number | null;
  missing: { title: string; due: string | null }[];
  student: string;
  unit?: string | null;
};
export type Recovery = { steps: string[]; ask: string[]; subject: string; email: string };

/** One-tap recovery mission for missing work or a falling grade. Text only: nothing is sent. */
export function recoveryPlan(r: RecoveryInput): Recovery {
  const steps: string[] = [];
  const items = r.missing.slice(0, 5);
  for (const m of items)
    steps.push(`Finish and turn in "${m.title}"${m.due ? ` (was due ${m.due.slice(0, 10)})` : ""}.`);
  if (r.pct != null && r.pct < 80)
    steps.push(
      `Review ${r.unit ? `"${r.unit}"` : "the current unit"} for 15 minutes tonight and redo 5 practice problems.`,
    );
  steps.push("Check the grade again after the teacher updates the gradebook.");
  const ask = [
    items.length
      ? "Can late work still be turned in, and is there a deadline?"
      : "Is there anything I can redo or make up?",
    "Is there a retake or test-correction option?",
    "When is a good time for extra help?",
  ];
  const last = (r.teacher ?? "").trim().split(/\s+/).pop();
  const hi = last
    ? `Hello ${/^(mr|ms|mrs|dr)\.?$/i.test(r.teacher!.split(/\s+/)[0]!) ? r.teacher : `${last}`},`
    : "Hello,";
  const list = items.length
    ? `\n\nI'm working on getting caught up on:\n${items.map((m) => `- ${m.title}`).join("\n")}`
    : "";
  const email = `${hi}\n\nThis is ${r.student}. I want to bring my grade up in ${r.cls}.${list}\n\n${ask.map((q) => `- ${q}`).join("\n")}\n\nThank you for your help.\n${r.student}`;
  return { steps, ask, subject: `${r.student}: catching up in ${r.cls}`, email };
}

/** Goal progress from the real current class %. ratio is 0..1 toward target. */
export function goalProgress(now: number | null, target: number, by: string, today: string) {
  const daysLeft = Math.max(0, Math.round((Date.parse(by) - Date.parse(today)) / 864e5));
  if (now == null) return { now: null, ratio: 0, met: false, gap: null, daysLeft };
  return {
    now,
    ratio: Math.max(0, Math.min(1, now / target)),
    met: now >= target,
    gap: Math.round((target - now) * 10) / 10,
    daysLeft,
  };
}
