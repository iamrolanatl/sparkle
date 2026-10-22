import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadStudents, pickStudent } from "@/lib/classes/load";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance", robots: { index: false } };

type Ev = {
  id: string;
  day: string;
  period: string | null;
  course_name: string | null;
  code: string;
  reason: string | null;
  excused: boolean | null;
};

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/attendance");
  const { s } = await searchParams;
  const me = pickStudent(await loadStudents(supabase), user.id, s);
  const [evRes, sessRes] = me
    ? await Promise.all([
        supabase
          .from("attendance_events")
          .select("id, day, period, course_name, code, reason, excused")
          .eq("student_id", me.id)
          .order("day", { ascending: false })
          .limit(500),
        supabase.from("portal_sessions").select("source, status, checked_at, last_ok_at").eq("student_id", me.id),
      ])
    : [{ data: [] }, { data: [] }];
  const ev = (evRes.data ?? []) as Ev[];
  const days = [...new Set(ev.map((e) => e.day))];
  const absent = new Set(ev.filter((e) => /absent/i.test(e.code)).map((e) => e.day)).size;
  const tardy = ev.filter((e) => /tardy/i.test(e.code)).length;
  const unexcused = new Set(ev.filter((e) => e.excused === false).map((e) => e.day));
  const sync = ((sessRes.data ?? []) as { source: string; status: string; last_ok_at: string | null }[]).find(
    (x) => x.source === "studentvue",
  );
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00-04:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    });
  return (
    <div className="page">
      <h1>Attendance</h1>
      <div className="sub">
        {me?.display_name ?? ""} · from StudentVUE
        {sync?.last_ok_at
          ? ` · synced ${new Date(sync.last_ok_at).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET`
          : ""}
      </div>
      <div className="grid s4" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 20 }}>
        <div className="panel stat">
          <div className="l">Days absent</div>
          <div className="v">{absent}</div>
          <div className="d" style={{ color: "var(--mut)" }}>
            This school year
          </div>
        </div>
        <div className="panel stat">
          <div className="l">Tardies</div>
          <div className="v">{tardy}</div>
          <div className="d" style={{ color: "var(--mut)" }}>
            Class periods
          </div>
        </div>
        <div className="panel stat">
          <div className="l">Unexcused days</div>
          <div className="v">{unexcused.size}</div>
          <div className="d" style={{ color: unexcused.size ? "var(--warn)" : "var(--mut)" }}>
            {unexcused.size ? "A parent note may be needed" : "All clear"}
          </div>
        </div>
        <div className="panel stat">
          <div className="l">Days with records</div>
          <div className="v">{days.length}</div>
          <div className="d" style={{ color: "var(--mut)" }}>
            Absent, tardy or activity
          </div>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 14 }}>
        <div className="ph">
          Records <span>Newest first</span>
        </div>
        {!me ? (
          <div className="empty">
            No student yet.{" "}
            <Link href="/app/family" style={{ textDecoration: "underline" }}>
              Add a student
            </Link>
            .
          </div>
        ) : ev.length ? (
          ev.map((e) => (
            <div className="row" key={e.id}>
              <span
                className="dot"
                style={{
                  background: /absent/i.test(e.code) ? "var(--warn)" : /tardy/i.test(e.code) ? "#fbbf24" : "#7dd3fc",
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div>{e.course_name ?? "School day"}</div>
                <div style={{ fontSize: 12, color: "var(--dim)" }}>{e.reason ?? ""}</div>
              </div>
              <span className="chip">{e.code}</span>
              <span className="due">{fmt(e.day)}</span>
            </div>
          ))
        ) : (
          <div className="empty">No attendance records yet. They appear after the school sync runs.</div>
        )}
      </div>
    </div>
  );
}
