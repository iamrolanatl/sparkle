import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeGpa, letterFor } from "@/lib/gpa";
import { CLASS_COLORS } from "./resources";
import { classGuidance, classItems, postUpcoming, type BoardPost, type Guidance, type PostAction } from "./guidance";

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
export type Feed = {
  id: string;
  kind: "post" | "email";
  title: string;
  who: string | null;
  at: string | null;
  url: string | null;
  body: string | null;
  unread?: boolean;
};
export type Resource = { id: string; kind: string; provider: string | null; title: string; url: string };
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
  missing: Assignment[];
  feed: Feed[];
  resources: Resource[];
  section: string | null;
  synced_at: string | null;
  guidance: Guidance;
  /** recent class-board posts not yet opened by this user (ids, for the read receipt) */
  unreadPostIds: string[];
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

/** Students this user can act for now: their own record, or ones with an ACTIVE guardian link (revoked links hide the student). */
export async function loadStudents(sb: SupabaseClient, knownUid?: string) {
  const [{ data }, { data: links }, uid] = await Promise.all([
    sb.from("students").select("id, display_name, profile_id").order("created_at").limit(50),
    sb.from("student_guardians").select("student_id, guardian_profile_id, status").limit(200),
    knownUid ? Promise.resolve(knownUid) : sb.auth.getUser().then((r) => r.data.user?.id),
  ]);
  const active = new Set(
    (links ?? []).filter((l) => l.status === "active" && l.guardian_profile_id === uid).map((l) => l.student_id),
  );
  const revoked = new Set(
    (links ?? []).filter((l) => l.status !== "active" && l.guardian_profile_id === uid).map((l) => l.student_id),
  );
  return ((data ?? []) as { id: string; display_name: string; profile_id: string | null }[]).filter(
    (s) => s.profile_id === uid || active.has(s.id) || !revoked.has(s.id),
  );
}

export async function loadClasses(sb: SupabaseClient, studentId: string): Promise<ClassView[]> {
  const nowIso = new Date().toISOString();
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const [cls, units, cats, asg, grades, mats, missing, posts, msgs, res, acts, reads, me] = await Promise.all([
    sb
      .from("classes")
      .select("id, name, teacher, room, period, syllabus_url, ebook_url, created_at, pct, section_no, synced_at")
      .eq("student_id", studentId)
      .order("period", { nullsFirst: false })
      .order("created_at")
      .limit(30),
    sb
      .from("units")
      .select("id, class_id, title, topics, week_label, is_current, created_at, source")
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
    sb
      .from("assignments")
      .select("id, class_id, title, due_at, status, category")
      .eq("student_id", studentId)
      .eq("is_missing", true)
      .order("due_at", { ascending: false })
      .limit(100),
    sb
      .from("posts")
      .select("id, class_id, title, author, posted_at, url, body, source")
      .eq("student_id", studentId)
      .not("class_id", "is", null)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(200),
    sb
      .from("messages")
      .select("id, class_id, subject, sender, received_at, snippet")
      .eq("student_id", studentId)
      .not("class_id", "is", null)
      .order("received_at", { ascending: false, nullsFirst: false })
      .limit(200),
    sb
      .from("resources")
      .select("id, class_id, kind, provider, title, url")
      .eq("student_id", studentId)
      .order("created_at")
      .limit(500),
    sb
      .from("post_actions")
      .select("id, post_id, class_id, kind, text, due_at, done_at, method")
      .eq("student_id", studentId)
      .gte("created_at", since)
      .limit(600),
    sb.from("post_reads").select("post_id").eq("student_id", studentId).limit(2000),
    sb.auth.getUser(),
  ]);
  const readSet = new Set(((reads.data ?? []) as { post_id: string }[]).map((r) => r.post_id));
  const canRead = !!me.data.user;
  const fresh = Date.now() - 14 * 86_400_000;
  const board: BoardPost[] = ((posts.data ?? []) as Record<string, string | null>[])
    .filter((p) => p.source === "ctls-learn")
    .map((p) => ({
      id: p.id!,
      class_id: p.class_id ?? null,
      title: p.title ?? "Post",
      url: p.url ?? null,
      posted_at: p.posted_at ?? null,
      read: !canRead || readSet.has(p.id!) || Date.parse(p.posted_at ?? "0") < fresh,
    }));
  return ((cls.data ?? []) as Record<string, unknown>[]).map((c, i) => {
    const id = c.id as string;
    const u = (units.data ?? []).filter((x) => x.class_id === id);
    const unit = u.find((x) => x.is_current && x.source !== "inferred") ?? u.find((x) => x.is_current) ?? u[0] ?? null;
    const categories = (cats.data ?? [])
      .filter((x) => x.class_id === id)
      .map((x) => ({ name: x.name, weight: Number(x.weight), score: x.score == null ? null : Number(x.score) }));
    const synced = c.pct == null ? null : Number(c.pct);
    const computed = classPercent(
      categories,
      (grades.data ?? [])
        .filter((g) => g.class_id === id)
        .map((g) => ({
          score: g.score == null ? null : Number(g.score),
          max_score: g.max_score == null ? null : Number(g.max_score),
        })),
    );
    const pct = synced ?? (c.synced_at ? null : computed);
    const feed: Feed[] = [
      ...(posts.data ?? [])
        .filter((x) => x.class_id === id)
        .map((x) => ({
          id: x.id,
          kind: "post" as const,
          title: x.title,
          who: x.author,
          at: x.posted_at,
          url: x.url,
          body: x.body,
          unread: board.some((b) => b.id === x.id && !b.read),
        })),
      ...(msgs.data ?? [])
        .filter((x) => x.class_id === id)
        .map((x) => ({
          id: x.id,
          kind: "email" as const,
          title: x.subject,
          who: x.sender,
          at: x.received_at,
          url: null,
          body: x.snippet,
        })),
    ]
      .sort((a, b) => Date.parse(b.at ?? "0") - Date.parse(a.at ?? "0"))
      .slice(0, 6);
    const myBoard = board.filter((b) => b.class_id === id);
    const items = classItems(
      ((acts.data ?? []) as PostAction[]).filter((a) => a.class_id === id),
      myBoard,
    );
    const unreadPostIds = myBoard.filter((b) => !b.read).map((b) => b.id);
    const missingList = ((missing.data ?? []) as Assignment[]).filter((a) => a.class_id === id);
    const unitView = unit ? { title: unit.title as string } : null;
    // Dated items from teacher class-board posts join Upcoming (and so Today due-soon + Tasks), unless the
    // portal already lists the same work.
    const realUpcoming = ((asg.data ?? []) as Assignment[]).filter((a) => a.class_id === id);
    const fromPosts: Assignment[] = postUpcoming(
      ((acts.data ?? []) as PostAction[]).filter((a) => a.class_id === id),
      realUpcoming,
    ).map((a) => ({ ...a, class_id: id }));
    return {
      guidance: classGuidance({ pct, missing: missingList, unit: unitView }, items, unreadPostIds.length),
      unreadPostIds,
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
      upcoming: [...realUpcoming, ...fromPosts].sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!)),
      pct,
      letter: pct == null ? null : letterFor(Math.min(pct, 110)).letter,
      materials: ((mats.data ?? []) as (Material & { class_id: string })[]).filter((m) => m.class_id === id),
      missing: ((missing.data ?? []) as Assignment[]).filter((a) => a.class_id === id),
      feed,
      resources: ((res.data ?? []) as (Resource & { class_id: string })[]).filter((r) => r.class_id === id),
      section: (c.section_no as string) ?? null,
      synced_at: (c.synced_at as string) ?? null,
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
