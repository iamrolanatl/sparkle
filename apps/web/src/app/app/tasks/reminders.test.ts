import { describe, expect, it } from "vitest";
import { reminderText } from "./reminders";
describe("reminderText", () => {
  it("covers every kind", () => {
    expect(reminderText({ taskId: "1", title: "Lab", kind: "overdue" })).toBe("⏰ Catch up: Lab");
    expect(reminderText({ taskId: "1", title: "Lab", kind: "due_today" })).toMatch(/Due today/);
    expect(reminderText({ taskId: "1", title: "Lab", kind: "evening_before" })).toMatch(/tomorrow/);
    expect(reminderText({ taskId: "1", title: "Lab", kind: "high_priority_soon" })).toMatch(/Important/);
  });
});
