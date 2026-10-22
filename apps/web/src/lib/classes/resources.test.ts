import { describe, expect, it } from "vitest";
import { practiceLinks, subjectOf } from "./resources";

describe("practice links", () => {
  it("maps subjects and searches topics", () => {
    expect(subjectOf("Math 7 Advanced")).toBe("math");
    expect(subjectOf("Language Arts 7")).toBe("ela");
    expect(subjectOf("Social Studies 7")).toBe("ss");
    const l = practiceLinks("Science 7", ["Cell organelles"], null);
    expect(l.map((x) => x.name)).toEqual(["Gizmos", "BrainPOP", "Khan Academy", "Quizlet"]);
    expect(l[0]!.href).toContain("Cell%20organelles");
    expect(practiceLinks("Art", [], null)).toEqual([]);
  });
});
