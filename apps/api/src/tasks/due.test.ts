import { describe, expect, it } from "vitest";
import { dueSoon } from "./due";

const T = (id: string, due: string | null, priority = "normal") => ({ id, title: id, due_at: due, priority });
describe("dueSoon (DEC-107)", () => {
  const list = [
    T("late", "2026-10-20T15:00:00Z"),
    T("today", "2026-10-22T03:00:00Z"), // Oct 21 11 PM ET
    T("tomorrow", "2026-10-22T20:00:00Z"),
    T("hi2d", "2026-10-23T14:00:00Z", "high"),
    T("far", "2026-11-20T20:00:00Z"),
    T("nodate", null),
    T("bad", "nope"),
  ];
  it("buckets by ET day and window", () => {
    const d = dueSoon(list, new Date("2026-10-21T16:00:00Z")); // noon ET
    expect(d.overdue.map((x) => x.id)).toEqual(["late"]);
    expect(d.dueToday.map((x) => x.id)).toEqual(["today"]);
    expect(d.dueSoon.map((x) => x.id)).toEqual(["tomorrow", "hi2d"]);
    expect(d.reminders.map((r) => r.kind)).toEqual(["overdue", "due_today", "high_priority_soon"]);
  });
  it("evening-before reminder after 4 PM ET", () => {
    const d = dueSoon(list, new Date("2026-10-21T21:00:00Z")); // 5 PM ET
    expect(d.reminders.find((r) => r.taskId === "tomorrow")?.kind).toBe("evening_before");
  });
  it("empty is fine", () => expect(dueSoon([], new Date()).reminders).toEqual([]));
});
