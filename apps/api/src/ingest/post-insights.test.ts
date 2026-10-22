import { describe, expect, it } from "vitest";
import { checkAiItems, grounded, keepItems, mergeActions, parseDue, ruleActions } from "./post-insights";

const ref = new Date("2026-10-19T12:00:00Z");
describe("teacher post summaries", () => {
  it("parses due dates relative to the post", () => {
    expect(parseDue("due October 25 at 11:59", ref)?.slice(0, 10)).toBe("2026-10-26");
    expect(parseDue("due Sunday, Oct. 18", new Date("2026-10-12T12:00:00Z"))?.slice(0, 10)).toBe("2026-10-19");
    expect(parseDue("nothing here", ref)).toBeNull();
  });
  it("extracts homework and quizzes with rules", () => {
    const a = ruleActions("Week 11 Oct 19 - 23", "HW: Weekly Questions (due October 25 at 11:59)\nQuiz Friday", ref);
    expect(a.map((x) => x.kind)).toEqual(["due", "assessment"]);
    expect(a[0]!.dueAt).not.toBeNull();
  });
  it("drops ungrounded, unsafe and off-schema AI items", () => {
    const body = "Bring your calculator on Thursday. Unit test on equations Friday.";
    const raw = JSON.stringify([
      { kind: "bring", text: "Bring your calculator Thursday", due: "Thursday" },
      { kind: "assessment", text: "Study for the history essay", due: "" },
      { kind: "hack", text: "Bring calculator", due: "" },
    ]);
    const out = checkAiItems(`Sure! ${raw}`, "Reminders", body, ref);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe("bring");
    expect(checkAiItems("not json", "t", body, ref)).toEqual([]);
  });
  it("grounding and merge", () => {
    expect(grounded("Finish Delta Math", "Delta Math (due Oct 25)")).toBe(true);
    expect(grounded("Read chapter nine", "Delta Math")).toBe(false);
    const m = mergeActions(
      [{ kind: "due", text: "Delta Math (due Oct 25)", dueAt: "2026-10-26T03:59:00.000Z", method: "rules" }],
      [{ kind: "due", text: "Finish Delta Math", dueAt: null, method: "ai" }],
    );
    expect(m).toHaveLength(1);
    expect(m[0]!.dueAt).toBe("2026-10-26T03:59:00.000Z");
  });
  it("quality gate drops noise", () => {
    const k = (kind: "todo" | "bring" | "assessment", text: string) => ({
      kind,
      text,
      dueAt: null,
      method: "ai" as const,
    });
    const out = keepItems([
      k("todo", "Equations"),
      k("todo", "Equations"),
      k("todo", "Homework: None assigned"),
      k("bring", "Answer KEY- Study Guide"),
      k("bring", "Bring your calculator"),
      k("assessment", "Quiz"),
      k("todo", "Finish Delta Math"),
      k("todo", "Finish Delta Math"),
    ]);
    expect(out.map((a) => a.text)).toEqual(["Bring your calculator", "Quiz", "Finish Delta Math"]);
  });
});
