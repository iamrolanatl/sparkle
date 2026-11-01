import { describe, expect, it } from "vitest";
import { fuelStreak, nightlyPlan, rankOf, shieldOf, whatIf } from "./derive";

describe("ship derive", () => {
  it("shields", () => {
    expect(shieldOf({ id: "a", name: "M", pct: 70, missing: 1 }).level).toBe("warn");
    expect(shieldOf({ id: "a", name: "M", pct: 65, missing: 0 }).level).toBe("bad");
    expect(shieldOf({ id: "a", name: "M", pct: null, missing: 0 }).level).toBe("none");
  });
  it("streak", () => {
    const now = new Date("2026-10-31T20:00:00-04:00");
    expect(
      fuelStreak(["2026-10-31T10:00:00-04:00", "2026-10-30T10:00:00-04:00", "2026-10-28T10:00:00-04:00"], now),
    ).toBe(2);
    expect(fuelStreak(["2026-10-30T10:00:00-04:00"], now)).toBe(1);
    expect(fuelStreak([], now)).toBe(0);
  });
  it("rank", () => {
    expect(rankOf(0, 0, 0).rank).toBe("Cadet");
    expect(rankOf(10, 0, 0).level).toBe(3);
  });
  it("what-if", () => {
    const cats = [
      { name: "Tests", weight: 60, score: 60 },
      { name: "Classwork", weight: 40, score: 85 },
    ];
    expect(whatIf(cats, "Tests", 85)).toBe(85);
    expect(whatIf([{ name: "x", weight: 0, score: 50 }], "x", 90)).toBeNull();
  });
  it("plan ≤ 30 min, missing first", () => {
    const now = new Date("2026-10-29T18:00:00Z");
    const p = nightlyPlan(
      [
        { title: "Unit 2 test", cls: "Math", due: "2026-10-30T12:00:00Z", kind: "test" },
        { title: "TKO", cls: "Math", due: "2026-10-09T12:00:00Z", kind: "missing" },
        { title: "Project", cls: "ELA", due: "2026-11-02T12:00:00Z", kind: "due" },
      ],
      now,
    );
    expect(p[0]!.text).toMatch(/TKO/);
    expect(p.reduce((a, s) => a + s.min, 0)).toBeLessThanOrEqual(30);
  });
});
