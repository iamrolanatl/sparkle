import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildClasses, rawFromBundle, type ClassRaw } from "./load";

const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
const recent = new Date(Date.now() - 86_400_000).toISOString();
const bundle = {
  classes: [
    {
      id: "c1",
      name: "Math",
      teacher: "Hyden",
      room: "101",
      period: "6",
      syllabus_url: null,
      ebook_url: null,
      created_at: recent,
      pct: 70,
      section_no: "3",
      synced_at: recent,
    },
    {
      id: "c2",
      name: "Science",
      teacher: "Sullivan",
      room: null,
      period: "3",
      syllabus_url: null,
      ebook_url: null,
      created_at: recent,
      pct: null,
      section_no: null,
      synced_at: null,
    },
  ],
  units: [
    {
      id: "u1",
      class_id: "c1",
      title: "Inequalities",
      topics: ["one-step"],
      week_label: "Wk 12",
      is_current: true,
      created_at: recent,
      source: "ctls",
    },
  ],
  categories: [
    { class_id: "c2", name: "Tests", weight: 60, score: 90 },
    { class_id: "c2", name: "HW", weight: 40, score: 80 },
  ],
  upcoming: [
    { id: "a1", class_id: "c1", title: "Study guide", due_at: future, status: "assigned", category: "Formative" },
  ],
  grades: [],
  materials: [
    { id: "m1", class_id: "c1", unit_id: "u1", kind: "link", name: "Notes", url: "https://x", storage_path: null },
  ],
  missing: [{ id: "a2", class_id: "c1", title: "TKO", due_at: recent, status: "missing", category: null }],
  posts: [
    {
      id: "p1",
      class_id: "c1",
      title: "Test Friday",
      author: "Hyden",
      posted_at: recent,
      url: null,
      body: "b",
      source: "ctls-learn",
    },
  ],
  messages: [{ id: "e1", class_id: "c2", subject: "Hi", sender: "Sullivan", received_at: recent, snippet: "s" }],
  resources: [{ id: "r1", class_id: "c2", kind: "video", provider: "yt", title: "Cells", url: "https://y" }],
  actions: [],
  reads: ["p1"],
  tasks_open: [{ id: "t1", title: "Pack", due_at: null, priority: "high" }],
  tasks_done: [recent, null],
  attendance: [{ day: "2026-10-21", code: "Tardy", excused: false, course_name: null }],
};

describe("today_bundle loader", () => {
  it("maps the RPC payload to the same view as the per-table rows", () => {
    const raw = rawFromBundle(bundle);
    const legacy: ClassRaw = {
      cls: bundle.classes,
      units: bundle.units,
      cats: bundle.categories,
      asg: bundle.upcoming,
      grades: bundle.grades,
      mats: bundle.materials,
      missing: bundle.missing,
      posts: bundle.posts,
      msgs: bundle.messages,
      res: bundle.resources,
      acts: bundle.actions,
      reads: bundle.reads,
    };
    expect(buildClasses(raw, true)).toEqual(buildClasses(legacy, true));
    expect(raw.extra?.tasksDone).toEqual([recent]);
    expect(raw.extra?.tasksOpen).toHaveLength(1);
    expect(raw.extra?.attendance).toHaveLength(1);
  });
  it("builds per-class data (grades, assignments, posts, resources)", () => {
    const [math, sci] = buildClasses(rawFromBundle(bundle), true);
    expect(math!.pct).toBe(70);
    expect(math!.unit?.title).toBe("Inequalities");
    expect(math!.upcoming.map((a) => a.id)).toEqual(["a1"]);
    expect(math!.missing.map((a) => a.id)).toEqual(["a2"]);
    expect(math!.feed.map((f) => f.id)).toEqual(["p1"]);
    expect(math!.unreadPostIds).toEqual([]);
    expect(sci!.pct).toBe(86);
    expect(sci!.resources.map((r) => r.id)).toEqual(["r1"]);
    expect(sci!.feed[0]!.kind).toBe("email");
  });
  it("tolerates null / missing arrays", () => {
    expect(buildClasses(rawFromBundle({ classes: null }), false)).toEqual([]);
  });
});
