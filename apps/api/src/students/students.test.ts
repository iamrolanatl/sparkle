import { describe, expect, it, vi, afterEach } from "vitest";
import { parseCsv, validateImport } from "../import/csv";
import { computeToday, etDay } from "../today/today";
import app from "../index";

const SID = "10000000-0000-0000-0000-00000000000a";

describe("CSV import validation (WBS 3.3)", () => {
  it("parses quotes and commas", () => {
    expect(parseCsv('a,b\n"x, y","he said ""hi"""\n')).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"'],
    ]);
  });
  it("accepts a valid file and rejects bad rows with line numbers", () => {
    const ok = validateImport("class,assignment,due,status\nMath,Worksheet 3,2026-10-22,assigned\n");
    expect(ok.errors).toEqual([]);
    expect(ok.rows[0]!.dueAt).toBe("2026-10-23T03:59:00.000Z");
    const bad = validateImport("class,assignment,due,status\nMath,,2026-10-22,x\nSci,Lab,notadate,\n");
    expect(bad.errors).toEqual(["Line 2: class and assignment are required.", 'Line 3: bad due date "notadate".']);
  });
  it("requires the core columns", () => {
    expect(validateImport("foo,bar\n1,2").errors).toEqual(['Missing column "class".', 'Missing column "assignment".']);
  });
});

describe("Today document (WBS 3.4)", () => {
  const now = new Date("2026-10-22T15:00:00Z"); // 11 AM ET
  const items = [
    { id: "1", title: "Late essay", due_at: "2026-10-20T03:59:00Z", status: "missing", class_name: "ELA" },
    { id: "2", title: "Quiz", due_at: "2026-10-22T20:00:00Z", status: "assigned", class_name: "Math" },
    { id: "3", title: "Project", due_at: "2026-10-25T20:00:00Z", status: null, class_name: "Sci" },
    { id: "4", title: "Done", due_at: "2026-10-22T20:00:00Z", status: "submitted", class_name: "Math" },
    { id: "5", title: "Far", due_at: "2026-12-25T20:00:00Z", status: null, class_name: "Sci" },
  ];
  it("buckets by ET school day and skips finished work", () => {
    const d = computeToday(items, now);
    expect(d.overdue.map((a) => a.id)).toEqual(["1"]);
    expect(d.dueToday.map((a) => a.id)).toEqual(["2"]);
    expect(d.upcoming.map((a) => a.id)).toEqual(["3"]);
    expect(d.missingCount).toBe(1);
    expect(d.headline).toBe("1 thing to catch up on");
  });
  it("uses New York days", () => expect(etDay(new Date("2026-10-23T02:00:00Z"))).toBe("2026-10-22"));
});

describe("student routes auth", () => {
  afterEach(() => vi.unstubAllGlobals());
  const env = { SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "sk", SUPABASE_PUBLISHABLE_KEY: "pk" };
  it("401 without a token", async () => {
    const r = await app.request(`/students/${SID}/today`, {}, env);
    expect(r.status).toBe(401);
  });
  it("403 when RLS says no", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/auth/v1/user") ? Response.json({ id: "u1" }) : Response.json(false),
      ),
    );
    const r = await app.request(`/students/${SID}/today`, { headers: { Authorization: "Bearer t" } }, env);
    expect(r.status).toBe(403);
  });
  it("400 on a non-uuid id", async () => {
    const r = await app.request(`/students/abc/today`, { headers: { Authorization: "Bearer t" } }, env);
    expect(r.status).toBe(400);
  });
});
