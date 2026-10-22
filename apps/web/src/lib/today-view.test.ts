import { describe, expect, it } from "vitest";
import { formatDue, isEmpty } from "./today-view";

describe("today view", () => {
  it("formats due in ET, hiding 11:59 PM", () => {
    expect(formatDue("2026-10-22T19:30:00Z")).toBe("Thu, Oct 22, 3:30 PM");
    expect(formatDue("2026-10-23T03:59:00Z")).toBe("Thu, Oct 22");
    expect(formatDue(null)).toBe("No due date");
  });
  it("detects empty docs", () => {
    const base = { generatedAt: "", overdue: [], dueToday: [], upcoming: [], missingCount: 0, headline: "All clear" };
    expect(isEmpty(base)).toBe(true);
    expect(
      isEmpty({ ...base, upcoming: [{ id: "1", title: "a", due_at: null, status: null, class_name: null }] }),
    ).toBe(false);
  });
});
