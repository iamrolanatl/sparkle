import { describe, expect, it } from "vitest";
import { safeNext } from "./env";

describe("safeNext", () => {
  it("keeps relative paths", () => expect(safeNext("/classes")).toBe("/classes"));
  it("blocks open redirects", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
