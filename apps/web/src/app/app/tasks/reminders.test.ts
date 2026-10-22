import { describe, expect, it } from "vitest";
import { backlogText, reminderText } from "./reminders";
describe("reminderText", () => {
  it("covers every kind", () => {
    expect(reminderText({ taskId: "1", title: "Lab", kind: "overdue" })).toBe("⏰ Catch up: Lab");
    expect(reminderText({ taskId: "1", title: "Lab", kind: "due_today" })).toMatch(/Due today/);
    expect(reminderText({ taskId: "1", title: "Lab", kind: "evening_before" })).toMatch(/tomorrow/);
    expect(reminderText({ taskId: "1", title: "Lab", kind: "high_priority_soon" })).toMatch(/Important/);
  });
});
describe("backlogText", () => {
  it("collapses older overdue", () => {
    expect(backlogText(251, 3)).toBe("+248 older overdue tasks");
    expect(backlogText(4, 3)).toBe("+1 older overdue task");
    expect(backlogText(3, 3)).toBeNull();
  });
});
