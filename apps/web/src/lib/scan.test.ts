import { describe, expect, it } from "vitest";
import { SENSITIVE, errorMessage, fitWithin, toOcrResult } from "./scan";

describe("scan helpers (FR-23)", () => {
  it("downscales but never upscales", () => {
    expect(fitWithin(4000, 3000)).toEqual({ w: 2000, h: 1500 });
    expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 });
  });
  it("builds an on-device OcrResult with 0..1 confidence", () => {
    expect(toOcrResult("hi", 87.4)).toEqual({ engine: "on_device", text: "hi", confidence: 0.874, language: "eng" });
    expect(toOcrResult("x", NaN).confidence).toBe(0);
    expect(toOcrResult("x", 140).confidence).toBe(1);
  });
  it("flags sensitive docs for the vault", () => {
    expect(SENSITIVE.test("Section 504 accommodation plan")).toBe(true);
    expect(SENSITIVE.test("Field trip permission slip")).toBe(false);
  });
  it("maps API errors to friendly text", () => {
    expect(errorMessage("too_large")).toMatch(/10 MB/);
    expect(errorMessage("weird")).toMatch(/went wrong/);
  });
});
