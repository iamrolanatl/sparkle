export type Reminder = {
  taskId: string;
  title: string;
  kind: "overdue" | "due_today" | "evening_before" | "high_priority_soon";
};
type T = { id: string; title: string; due_at: string | null; priority: string };
export type DueSoonBody = { overdue: T[]; overdueCount: number; dueToday: T[]; dueSoon: T[]; reminders: Reminder[] };

/** Friendly, age-neutral reminder copy (DEC-107). */
export function reminderText(r: Reminder): string {
  switch (r.kind) {
    case "overdue":
      return `⏰ Catch up: ${r.title}`;
    case "due_today":
      return `📌 Due today: ${r.title}`;
    case "evening_before":
      return `🌙 Due tomorrow — get set tonight: ${r.title}`;
    default:
      return `⚡ Important and coming up: ${r.title}`;
  }
}

/** Collapsed backlog line, so old overdue items never bury today. */
export function backlogText(overdueCount: number, shown: number): string | null {
  const rest = overdueCount - shown;
  return rest > 0 ? `+${rest} older overdue task${rest > 1 ? "s" : ""}` : null;
}
