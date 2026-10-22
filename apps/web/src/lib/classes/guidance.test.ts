import { describe, expect, it } from "vitest";
import { classGuidance, classItems, dontMiss, type BoardPost, type PostAction } from "./guidance";

const now = Date.parse("2026-10-22T16:00:00Z");
const posts: BoardPost[] = [
  { id: "p1", class_id: "c1", title: "Week 11", url: "https://x/1", posted_at: "2026-10-19T12:00:00Z", read: false },
  { id: "p2", class_id: "c1", title: "Old", url: null, posted_at: "2026-09-01T12:00:00Z", read: true },
];
const a = (id: string, kind: PostAction["kind"], text: string, due: string | null, post = "p1"): PostAction => ({
  id,
  post_id: post,
  class_id: "c1",
  kind,
  text,
  due_at: due,
  done_at: null,
  method: "ai",
});
describe("guidance", () => {
  it("keeps relevant open items, flags near-due, drops old", () => {
    const items = classItems(
      [
        a("1", "due", "Delta Math due Oct 25", "2026-10-26T03:59:00Z"),
        a("2", "assessment", "Quiz Friday", null),
        a("3", "todo", "Old thing", null, "p2"),
        a("4", "due", "Weekly Questions", "2026-10-23T03:59:00Z"),
      ],
      posts,
      now,
    );
    expect(items.map((i) => i.id)).toEqual(["4", "1", "2"]);
    expect(items[0]!.flagged).toBe(true);
    const g = classGuidance({ pct: 75, missing: [{ title: "HW 3" }], unit: { title: "Equations" } }, items, 1, now);
    expect(g.lines[0]).toMatch(/missing/);
    expect(g.lines.join(" ")).toMatch(/Quiz Friday/);
    const dm = dontMiss([{ id: "c1", name: "Math", color: "#fff", missing: [{ title: "HW 3" }], guidance: g }], now);
    expect(dm[0]!.kind).toBe("missing");
    expect(dm.map((d) => d.key)).toContain("1");
  });
});
