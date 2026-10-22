import { describe, expect, it } from "vitest";
import { daysUntil, dueText } from "./due";

describe("due text (ET calendar days)", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  it("labels relative days", () => {
    expect(dueText("2026-10-23T03:59:00Z", now)).toBe("Today"); // 11:59 PM ET Oct 22
    expect(dueText("2026-10-24T03:59:00Z", now)).toBe("Tomorrow");
    expect(dueText("2026-10-27T03:59:00Z", now)).toBe("In 4 days · Oct 26");
    expect(daysUntil("2026-10-21T15:00:00Z", now)).toBe(-1);
    expect(dueText(null, now)).toBe("No date");
  });
});
