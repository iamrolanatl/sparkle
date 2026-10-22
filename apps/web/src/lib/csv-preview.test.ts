import { describe, expect, it } from "vitest";
import { IMPORT_HEADER, preflightCsv } from "./csv-preview";

describe("preflightCsv", () => {
  it("accepts the template", () => {
    expect(preflightCsv(`${IMPORT_HEADER}\nMath,Ms. A,1,HW 1,2026-10-22,assigned,,10\n`)).toEqual({
      ok: true,
      rows: 1,
    });
  });
  it("strips BOM and blank lines", () => {
    expect(preflightCsv(`\uFEFF${IMPORT_HEADER}\n\nMath,,,HW,,,,\n\n`)).toEqual({ ok: true, rows: 1 });
  });
  it("rejects empty and missing columns", () => {
    expect(preflightCsv("class\n").ok).toBe(false);
    expect(preflightCsv("teacher,due\nx,y").ok).toBe(false);
  });
  it("rejects too many rows", () => {
    expect(preflightCsv(IMPORT_HEADER + "\nM,,,H,,,,".repeat(2001)).ok).toBe(false);
  });
});
