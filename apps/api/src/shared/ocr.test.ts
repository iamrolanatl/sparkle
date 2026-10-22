import { describe, expect, it } from "vitest";
import { isSensitiveText, suggestClass, validateOcrResult } from "./ocr";

const ok = { engine: "on_device", text: "Field trip Friday", confidence: 0.9 };

describe("shared OCR contract", () => {
  it("flags sensitive terms from both teams' lists", () => {
    for (const t of ["Annual IEP review", "Section 504 plan", "psychoeducational evaluation", "suspension notice"])
      expect(isSensitiveText(t)).toBe(true);
    expect(isSensitiveText("Math worksheet 4.2")).toBe(false);
  });
  it("suggests classes", () => {
    expect(suggestClass("Report card Q1")).toBe("academic");
    expect(suggestClass("Immunization record")).toBe("sensitive");
    expect(suggestClass("Picture day")).toBe("standard");
  });
  it("validates untrusted input", () => {
    expect(validateOcrResult(ok)).toBeNull();
    expect(validateOcrResult(null)).toBe("bad_ocr");
    expect(validateOcrResult({ ...ok, engine: "cloud" })).toBe("bad_engine");
    expect(validateOcrResult({ ...ok, confidence: 2 })).toBe("bad_confidence");
    expect(validateOcrResult({ ...ok, text: "x".repeat(200_001) })).toBe("ocr_text_too_large");
  });
  it("sensitive content must be OCR'd on device (DEC-31), by class or by text", () => {
    expect(validateOcrResult({ ...ok, engine: "workers_ai" }, "sensitive")).toBe("sensitive_requires_on_device_ocr");
    expect(validateOcrResult({ ...ok, engine: "workers_ai", text: "IEP meeting" })).toBe(
      "sensitive_requires_on_device_ocr",
    );
    expect(validateOcrResult({ ...ok, engine: "workers_ai" }, "standard")).toBeNull();
  });
});
