/** FR-21 → FR-02: due-soon surfacing + in-app reminders for tasks (DEC-107). Pure. */
import { etDay } from "../today/today";

export interface TaskLite {
  id: string;
  title: string;
  due_at: string | null;
  priority: "low" | "normal" | "high" | string;
}
export interface DueSoonDoc {
  overdue: TaskLite[];
  dueToday: TaskLite[];
  dueSoon: TaskLite[]; // next 48 h, after today
  reminders: {
    taskId: string;
    title: string;
    kind: "overdue" | "due_today" | "evening_before" | "high_priority_soon";
  }[];
}

const RANK = { high: 0, normal: 1, low: 2 } as Record<string, number>;
const byUrgency = (a: TaskLite, b: TaskLite) =>
  (a.due_at ?? "9").localeCompare(b.due_at ?? "9") || (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1);

/** NY hour of day for `now`. */
function etHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(d),
  );
}

export function dueSoon(tasks: TaskLite[], now: Date, windowHours = 48): DueSoonDoc {
  const today = etDay(now);
  const t = now.getTime();
  const tomorrow = etDay(new Date(t + 86_400_000));
  const dated = tasks.filter((x) => x.due_at && !isNaN(Date.parse(x.due_at)));
  const overdue = dated
    .filter((x) => Date.parse(x.due_at!) < t && etDay(new Date(x.due_at!)) !== today)
    .sort(byUrgency);
  const dueToday = dated.filter((x) => etDay(new Date(x.due_at!)) === today).sort(byUrgency);
  const dueSoonList = dated
    .filter((x) => etDay(new Date(x.due_at!)) > today && Date.parse(x.due_at!) <= t + windowHours * 3_600_000)
    .sort(byUrgency);
  const reminders: DueSoonDoc["reminders"] = [];
  for (const x of overdue) reminders.push({ taskId: x.id, title: x.title, kind: "overdue" });
  for (const x of dueToday) reminders.push({ taskId: x.id, title: x.title, kind: "due_today" });
  const evening = etHour(now) >= 16;
  for (const x of dueSoonList) {
    if (evening && etDay(new Date(x.due_at!)) === tomorrow)
      reminders.push({ taskId: x.id, title: x.title, kind: "evening_before" });
    else if (x.priority === "high") reminders.push({ taskId: x.id, title: x.title, kind: "high_priority_soon" });
  }
  return {
    overdue: overdue.slice(0, 20),
    dueToday: dueToday.slice(0, 20),
    dueSoon: dueSoonList.slice(0, 20),
    reminders: reminders.slice(0, 10),
  };
}
