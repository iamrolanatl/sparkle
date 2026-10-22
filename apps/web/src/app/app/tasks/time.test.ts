import { describe, expect, it } from "vitest";
import { fromLocalInput, toLocalInput } from "./time";
describe("ET datetime-local round trip", () => {
  it("EDT and EST", () => {
    expect(fromLocalInput("2026-10-23T23:59")).toBe("2026-10-24T03:59:00.000Z");
    expect(fromLocalInput("2026-11-05T09:00")).toBe("2026-11-05T14:00:00.000Z");
    expect(toLocalInput("2026-10-24T03:59:00.000Z")).toBe("2026-10-23T23:59");
    expect(fromLocalInput("bad")).toBeNull();
    expect(toLocalInput(null)).toBe("");
  });
});
