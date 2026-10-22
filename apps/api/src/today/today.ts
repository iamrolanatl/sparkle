/** Today document (WBS 3.4): precomputed summary of what matters next. Pure; cached in KV by the route. */
export interface AssignmentLite {
  id: string;
  title: string;
  due_at: string | null;
  status: string | null;
  class_name: string | null;
}

export interface TodayDoc {
  generatedAt: string;
  overdue: AssignmentLite[];
  dueToday: AssignmentLite[];
  upcoming: AssignmentLite[];
  missingCount: number;
  headline: string;
}

const DONE = new Set(["submitted", "graded", "excused"]);

/** Day key in America/New_York so "today" matches the family's school day. */
export function etDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function computeToday(items: AssignmentLite[], now: Date, horizonDays = 7): TodayDoc {
  const today = etDay(now);
  const horizon = now.getTime() + horizonDays * 86_400_000;
  const open = items.filter((a) => !DONE.has(a.status ?? ""));
  const byDue = (a: AssignmentLite, b: AssignmentLite) => (a.due_at ?? "9").localeCompare(b.due_at ?? "9");
  const overdue = open
    .filter((a) => a.due_at && Date.parse(a.due_at) < now.getTime() && etDay(new Date(a.due_at)) !== today)
    .sort(byDue);
  const dueToday = open.filter((a) => a.due_at && etDay(new Date(a.due_at)) === today).sort(byDue);
  const upcoming = open
    .filter((a) => a.due_at && etDay(new Date(a.due_at)) > today && Date.parse(a.due_at) <= horizon)
    .sort(byDue)
    .slice(0, 20);
  const missingCount = items.filter((a) => a.status === "missing").length;
  const headline =
    overdue.length > 0
      ? `${overdue.length} thing${overdue.length > 1 ? "s" : ""} to catch up on`
      : dueToday.length > 0
        ? `${dueToday.length} due today`
        : upcoming.length > 0
          ? "You're on track — next up is coming"
          : "All clear";
  return { generatedAt: now.toISOString(), overdue: overdue.slice(0, 20), dueToday, upcoming, missingCount, headline };
}
