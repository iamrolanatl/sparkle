import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gpaOf, loadClasses, loadStudents, pickStudent } from "@/lib/classes/load";
import { daysUntil, dueText } from "@/lib/classes/due";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today", robots: { index: false } };

const TZ = "America/New_York";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/today");
  const { s } = await searchParams;
  const students = await loadStudents(supabase);
  const me = pickStudent(students, user.id, s);
  const now = new Date();
  const hour = Number(now.toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }));
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLine = now.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" });
  if (!me)
    return (
      <div className="page">
        <h1>{hello}</h1>
        <div className="sub">{dateLine}</div>
        <div className="panel empty" style={{ marginTop: 20 }}>
          No student yet.{" "}
          <Link href="/app/family" style={{ textDecoration: "underline" }}>
            Add a student
          </Link>{" "}
          to see grades, tasks and classes here.
        </div>
      </div>
    );
  const [classes, tasksRes, attRes] = await Promise.all([
    loadClasses(supabase, me.id),
    supabase
      .from("tasks")
      .select("id, title, due_at, priority")
      .eq("student_id", me.id)
      .is("done_at", null)
      .order("due_at", { nullsFirst: false })
      .limit(100),
    supabase
      .from("attendance_events")
      .select("day, code, excused, course_name")
      .eq("student_id", me.id)
      .order("day", { ascending: false })
      .limit(500),
  ]);
  const att = (attRes.data ?? []) as {
    day: string;
    code: string;
    excused: boolean | null;
    course_name: string | null;
  }[];
  const absentDays = new Set(att.filter((a) => /absent/i.test(a.code)).map((a) => a.day)).size;
  const tardies = att.filter((a) => /tardy/i.test(a.code)).length;
  const unexcused = new Set(att.filter((a) => a.excused === false).map((a) => a.day)).size;
  type Row = { id: string; title: string; due: string | null; cls: string; color: string; chip: string };
  const rows: Row[] = [
    ...classes.flatMap((c) =>
      c.upcoming.map((a) => ({
        id: a.id,
        title: a.title,
        due: a.due_at,
        cls: c.name,
        color: c.color,
        chip: a.category ?? "Assignment",
      })),
    ),
    ...((tasksRes.data ?? []) as { id: string; title: string; due_at: string | null; priority: string }[]).map((t) => ({
      id: t.id,
      title: t.title,
      due: t.due_at,
      cls: "Personal · added by you",
      color: "#e8edf3",
      chip: t.priority === "high" ? "Priority" : "Personal",
    })),
  ]
    .filter((r) => r.due && daysUntil(r.due, now) >= 0 && daysUntil(r.due, now) <= 7)
    .sort((a, b) => Date.parse(a.due!) - Date.parse(b.due!));
  const tomorrow = rows.filter((r) => daysUntil(r.due!, now) === 1).length;
  const gpa = gpaOf(classes);
  const summative = rows.filter((r) => /summative|test|quiz|project/i.test(r.chip)).length;
  const first =
    me.profile_id === user.id
      ? me.display_name.split(" ")[0]
      : ((user.user_metadata?.full_name as string) ?? "").split(" ")[0];
  return (
    <div className="page">
      <h1>{`${hello}${first ? `, ${first}` : ""}`}</h1>
      <div className="sub">
        {dateLine}
        {rows.length
          ? ` · ${tomorrow ? `${tomorrow} thing${tomorrow > 1 ? "s" : ""} due tomorrow` : `${rows.length} due this week`}`
          : " · Nothing due this week"}
      </div>
      <div className="grid s4" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 20 }}>
        <div className="panel stat">
          <div className="l">Unweighted GPA</div>
          <div className="v">{gpa ? gpa.unweighted.toFixed(2) : "—"}</div>
          <div className="d" style={gpa ? undefined : { color: "var(--mut)" }}>
            {gpa ? `${gpa.credits} graded classes` : "No grades yet"}
          </div>
        </div>
        <div className="panel stat">
          <div className="l">Weighted GPA</div>
          <div className="v">{gpa ? gpa.weighted.toFixed(2) : "—"}</div>
          <div className="d" style={gpa ? undefined : { color: "var(--mut)" }}>
            {gpa ? "Honors/Advanced +0.5" : "No grades yet"}
          </div>
        </div>
        <div className="panel stat">
          <div className="l">Due this week</div>
          <div className="v">{rows.length}</div>
          <div className="d" style={{ color: summative ? "var(--warn)" : "var(--mut)" }}>
            {summative ? `${summative} summative` : "No tests or quizzes"}
          </div>
        </div>
        <div className="panel stat">
          <div className="l">Attendance</div>
          <div className="v">{att.length ? absentDays : "—"}</div>
          <div className="d" style={{ color: unexcused ? "var(--warn)" : "var(--mut)" }}>
            {att.length ? (
              <Link href="/app/attendance" style={{ textDecoration: "underline" }}>
                {`day${absentDays === 1 ? "" : "s"} absent · ${tardies} tard${tardies === 1 ? "y" : "ies"}${unexcused ? ` · ${unexcused} unexcused` : ""}`}
              </Link>
            ) : (
              "Not synced yet"
            )}
          </div>
        </div>
      </div>
      <div className="grid s2" style={{ gridTemplateColumns: "1.3fr 1fr", marginTop: 14 }}>
        <div className="panel">
          <div className="ph">
            Due soon <span>Next 7 days</span>
          </div>
          {rows.length ? (
            rows.slice(0, 6).map((r) => (
              <div className="row" key={r.id}>
                <span className="dot" style={{ background: r.color }} />
                <div style={{ minWidth: 0 }}>
                  <div>{r.title}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)" }}>{r.cls}</div>
                </div>
                <span className="chip">{r.chip}</span>
                <span className={`due ${daysUntil(r.due!, now) <= 1 ? "h" : ""}`}>{dueText(r.due, now)}</span>
              </div>
            ))
          ) : (
            <div className="empty">
              Nothing due in the next 7 days.{" "}
              <Link href="/app/tasks" style={{ textDecoration: "underline" }}>
                Add a task
              </Link>{" "}
              or{" "}
              <Link href="/app/import" style={{ textDecoration: "underline" }}>
                import assignments
              </Link>
              .
            </div>
          )}
        </div>
        <div className="panel">
          <div className="ph">
            Grades snapshot <span>To date</span>
          </div>
          {classes.length ? (
            classes.map((c) => (
              <Link href={`/app/classes?open=${c.id}`} className="row" key={c.id}>
                <span className="dot" style={{ background: c.color }} />
                <span style={{ width: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.name}
                </span>
                <div className="bar">
                  <i style={{ width: `${Math.min(c.pct ?? 0, 100)}%`, background: c.color }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--mut)", width: 44, textAlign: "right" }}>
                  {c.pct != null ? c.pct.toFixed(1) : "—"}
                </span>
                <span className="gl">{c.letter ?? ""}</span>
              </Link>
            ))
          ) : (
            <div className="empty">No classes yet. They appear here after an import or school sync.</div>
          )}
          <div style={{ padding: "6px 16px 14px", fontSize: 12, color: "var(--dim)" }}>
            GPA trend appears after a few weeks of grade history.
          </div>
        </div>
      </div>
    </div>
  );
}
