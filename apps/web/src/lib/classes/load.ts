import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeGpa, letterFor } from "@/lib/gpa";
import { CLASS_COLORS } from "./resources";

export type Category = { name: string; weight: number; score: number | null };
export type Assignment = {
  id: string;
  title: string;
  due_at: string | null;
  status: string | null;
  category: string | null;
  class_id: string | null;
};
export type Material = {
  id: string;
  kind: "file" | "link";
  name: string;
  url: string | null;
  storage_path: string | null;
  unit_id: string | null;
};
export type ClassView = {
  id: string;
  name: string;
  teacher: string | null;
  room: string | null;
  period: string | null;
  color: string;
  syllabus_url: string | null;
  ebook_url: string | null;
  unit: { id: string; title: string; topics: string[]; week_label: string | null } | null;
  categories: Category[];
  upcoming: Assignment[];
  pct: number | null;
  letter: string | null;
  materials: Material[];
};

/** Weighted category average when categories have scores; else mean of recorded grades. */
export function classPercent(
  cats: Category[],
  grades: { score: number | null; max_score: number | null }[],
): number | null {
  const scored = cats.filter((c) => c.score != null && c.weight > 0);
  const w = scored.reduce((a, c) => a + c.weight, 0);
  if (w > 0) return Math.round((scored.reduce((a, c) => a + c.weight * c.score!, 0) / w) * 10) / 10;
  const g = grades.filter((x) => x.score != null && x.max_score);
  if (!g.length) return null;
  return Math.round((g.reduce((a, x) => a + (x.score! / x.max_score!) * 100, 0) / g.length) * 10) / 10;
}

export async function loadStudents(sb: SupabaseClient) {
  const { data } = await sb.from("students").select("id, display_name, profile_id").order("created_at").limit(50);
  return (data ?? []) as { id: string; display_name: string; profile_id: string | null }[];
}

export async function loadClasses(sb: SupabaseClient, studentId: string): Promise<ClassView[]> {
  const nowIso = new Date().toISOString();
  const [cls, units, cats, asg, grades, mats] = await Promise.all([
    sb
      .from("classes")
      .select("id, name, teacher, room, period, syllabus_url, ebook_url, created_at")
      .eq("student_id", studentId)
      .order("period", { nullsFirst: false })
      .order("created_at")
      .limit(30),
    sb
      .from("units")
      .select("id, class_id, title, topics, week_label, is_current, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("class_categories")
      .select("class_id, name, weight, score")
      .eq("student_id", studentId)
      .order("weight", { ascending: false })
      .limit(200),
    sb
      .from("assignments")
      .select("id, class_id, title, due_at, status, category")
      .eq("student_id", studentId)
      .gte("due_at", nowIso)
      .order("due_at")
      .limit(300),
    sb.from("grades").select("class_id, score, max_score").eq("student_id", studentId).limit(1000),
    sb
      .from("class_materials")
      .select("id, class_id, unit_id, kind, name, url, storage_path")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  return ((cls.data ?? []) as Record<string, unknown>[]).map((c, i) => {
    const id = c.id as string;
    const u = (units.data ?? []).filter((x) => x.class_id === id);
    const unit = u.find((x) => x.is_current) ?? u[0] ?? null;
    const categories = (cats.data ?? [])
      .filter((x) => x.class_id === id)
      .map((x) => ({ name: x.name, weight: Number(x.weight), score: x.score == null ? null : Number(x.score) }));
    const pct = classPercent(
      categories,
      (grades.data ?? [])
        .filter((g) => g.class_id === id)
        .map((g) => ({
          score: g.score == null ? null : Number(g.score),
          max_score: g.max_score == null ? null : Number(g.max_score),
        })),
    );
    return {
      id,
      name: c.name as string,
      teacher: (c.teacher as string) ?? null,
      room: (c.room as string) ?? null,
      period: (c.period as string) ?? null,
      color: CLASS_COLORS[i % CLASS_COLORS.length]!,
      syllabus_url: (c.syllabus_url as string) ?? null,
      ebook_url: (c.ebook_url as string) ?? null,
      unit: unit
        ? { id: unit.id, title: unit.title, topics: unit.topics ?? [], week_label: unit.week_label ?? null }
        : null,
      categories,
      upcoming: ((asg.data ?? []) as Assignment[]).filter((a) => a.class_id === id),
      pct,
      letter: pct == null ? null : letterFor(Math.min(pct, 110)).letter,
      materials: ((mats.data ?? []) as (Material & { class_id: string })[]).filter((m) => m.class_id === id),
    };
  });
}

export function gpaOf(classes: ClassView[]) {
  const graded = classes.filter((c) => c.pct != null);
  if (!graded.length) return null;
  return computeGpa(
    graded.map((c) => ({
      name: c.name,
      grade: Math.min(c.pct!, 110),
      credits: 1,
      level: /advanced|honors|\bap\b|gifted/i.test(c.name) ? "honors" : "standard",
    })),
  );
}

/** Pick the student this signed-in user is: their own record if they are a student, else the first (or ?s=). */
export function pickStudent<T extends { id: string; profile_id: string | null }>(
  list: T[],
  userId: string,
  s?: string,
) {
  return list.find((x) => x.id === s) ?? list.find((x) => x.profile_id === userId) ?? list[0] ?? null;
}

/** Assignments due in the last 30 days that are still open or marked missing (for the Overdue tab). */
export async function loadLate(sb: SupabaseClient, studentId: string): Promise<Assignment[]> {
  const now = Date.now();
  const { data } = await sb
    .from("assignments")
    .select("id, class_id, title, due_at, status, category")
    .eq("student_id", studentId)
    .lt("due_at", new Date(now).toISOString())
    .gte("due_at", new Date(now - 30 * 86_400_000).toISOString())
    .in("status", ["assigned", "missing"])
    .order("due_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Assignment[];
}
