import { describe, expect, it } from "vitest";
import { computeGpa, gradeNeeded, letterFor, simulate } from "./gpa";

describe("GPA engine (FR-06)", () => {
  it("maps grades to letters with half-up rounding", () => {
    expect(letterFor(89.5).letter).toBe("A");
    expect(letterFor(89.4).letter).toBe("B");
    expect(letterFor(69.6).letter).toBe("C");
    expect(letterFor(50).letter).toBe("F");
    expect(() => letterFor(-1)).toThrow();
  });
  it("credit-weights unweighted and weighted GPA", () => {
    const r = computeGpa([
      { name: "AP Bio", grade: 92, credits: 1, level: "ap" },
      { name: "Honors Lit", grade: 85, credits: 1, level: "honors" },
      { name: "PE", grade: 75, credits: 0.5 },
    ]);
    expect(r.unweighted).toBe(3.2); // (4+3+1)/2.5
    expect(r.weighted).toBe(3.8); // (5+3.5+1)/2.5
    expect(r.credits).toBe(2.5);
  });
  it("never adds a weight bonus to an F", () => {
    expect(computeGpa([{ name: "AP Calc", grade: 60, credits: 1, level: "ap" }]).weighted).toBe(0);
  });
  it("is exact for repeating decimals", () => {
    expect(computeGpa([1, 2, 3].map((i) => ({ name: `c${i}`, grade: i === 1 ? 95 : 85, credits: 1 }))).unweighted).toBe(
      3.333,
    );
  });
  it("simulates replacing a course", () => {
    const s = simulate(
      [
        { name: "Math", grade: 78, credits: 1 },
        { name: "Art", grade: 95, credits: 1 },
      ],
      [{ name: "Math", grade: 88, credits: 1 }],
    );
    expect(s.before.unweighted).toBe(3);
    expect(s.after.unweighted).toBe(3.5);
    expect(s.deltaUnweighted).toBe(0.5);
  });
  it("finds the grade needed for a target", () => {
    expect(gradeNeeded([{ name: "A", grade: 95, credits: 1 }], { name: "B", credits: 1 }, 3.5)).toBe(80);
    expect(gradeNeeded([{ name: "A", grade: 60, credits: 1 }], { name: "B", credits: 1 }, 4)).toBeNull();
  });
  it("rejects zero credits", () => expect(() => computeGpa([{ name: "x", grade: 90, credits: 0 }])).toThrow());
});
