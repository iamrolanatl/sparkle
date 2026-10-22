/** Shapes and formatting for the Today view (WBS 4.1). Mirrors the API TodayDoc. */
export interface TodayItem {
  id: string;
  title: string;
  due_at: string | null;
  status: string | null;
  class_name: string | null;
}
export interface TodayDoc {
  generatedAt: string;
  overdue: TodayItem[];
  dueToday: TodayItem[];
  upcoming: TodayItem[];
  missingCount: number;
  headline: string;
}

/** "Thu 3:30 PM" in America/New_York; time omitted at 23:59 (all-day style dues). */
export function formatDue(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", ...o }).format(d);
  const time = fmt({ hour: "numeric", minute: "2-digit" });
  const day = fmt({ weekday: "short", month: "short", day: "numeric" });
  return time === "11:59 PM" ? day : `${day}, ${time}`;
}

export function isEmpty(doc: TodayDoc): boolean {
  return doc.overdue.length + doc.dueToday.length + doc.upcoming.length === 0;
}
