import { describe, expect, it } from "vitest";
import { safetyMessage } from "./safety-message";
describe("safetyMessage contract with API #40", () => {
  it("crisis always shows 988", () => {
    expect(safetyMessage({ safety: "crisis", message: "Call or text 988 now" })).toBe("Call or text 988 now");
    expect(safetyMessage({ safety: "crisis" })).toMatch(/988/);
    expect(safetyMessage({ safety: "crisis", message: "undefined" })).toMatch(/988/);
  });
  it("blocked and ok", () => {
    expect(safetyMessage({ safety: "blocked" })).toMatch(/can't add/);
    expect(safetyMessage({ safety: "ok" })).toBeNull();
  });
});
