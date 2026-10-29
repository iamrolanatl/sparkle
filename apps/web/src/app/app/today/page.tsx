import Link from "@/components/IntentLink";
import { redirect } from "next/navigation";
import { getClasses, getSb, getStudents, getUser } from "@/lib/req";
import { gpaOf, pickStudent } from "@/lib/classes/load";
import { daysUntil, dueText } from "@/lib/classes/due";
import { dontMiss } from "@/lib/classes/guidance";
import { Bot } from "../chrome";
import { Applets } from "./applets";
import { toApplets } from "@/lib/classes/applets";

const KIND: Record<string, string> = { missing: "Missing", assessment: "Test/quiz", bring: "Bring", due: "Due" };
const initials = (n: string) =>
  n
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
function Av({ name, color }: { name: string; color: string }) {
  const light = color.toLowerCase() === "#e8edf3";
  return (
    <span
      className="cav"
      style={{ background: light ? "var(--pill)" : color, color: light ? "var(--pillt)" : "#fff" }}
      aria-hidden="true"
    >
      {initials(name.startsWith("Personal") ? "Me" : name)}
    </span>
  );
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Today", robots: { index: false } };

const TZ = "America/New_York";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const supabase = await getSb();
  const user = await getUser();
  if (!supabase || !user) redirect("/login?next=/app/today");
  const { s } = await searchParams;
  const students = await getStudents();
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
    getClasses(me.id),
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
  const miss = dontMiss(classes);
  const newPosts = classes.reduce((a, c) => a + c.guidance.unread, 0);
  const tomorrow = rows.filter((r) => daysUntil(r.due!, now) === 1).length;
  const gpa = gpaOf(classes);
  const summative = rows.filter((r) => /summative|test|quiz|project/i.test(r.chip)).length;
  const nextUp = rows[0];
  const first =
    me.profile_id === user.id
      ? me.display_name.split(" ")[0]
      : ((user.user_metadata?.full_name as string) ?? "").split(" ")[0];
  const tip = miss[0]
    ? `Start with this from ${miss[0].className}: ${miss[0].text}`
    : nextUp
      ? `Start with ${nextUp.title}. It's due ${dueText(nextUp.due, now).toLowerCase()}.`
      : "You're all caught up. Nice work!";
  const applets = toApplets(classes, now);
  return (
    <div className="page">
      <section className="hero" data-testid="hero">
        <div className="hero-bg" data-par="0.18" aria-hidden="true">
          <i style={{ left: "12%", top: "22%" }}>✦</i>
          <i style={{ left: "58%", top: "12%" }}>✧</i>
          <i style={{ left: "84%", top: "64%" }}>✦</i>
          <i style={{ left: "34%", top: "78%" }}>·</i>
        </div>
        <div className="hero-copy" data-par="-0.06">
          <div className="eyebrow">{dateLine}</div>
          <h1>{`${hello}${first ? `, ${first}` : ""}`}</h1>
          <div className="sub">
            {rows.length
              ? `${tomorrow ? `${tomorrow} thing${tomorrow > 1 ? "s" : ""} due tomorrow` : `${rows.length} due this week`}`
              : "Nothing due this week"}
            {gpa ? ` · GPA ${gpa.unweighted.toFixed(2)}` : ""}
            {newPosts ? ` · ${newPosts} new teacher post${newPosts > 1 ? "s" : ""}` : ""}
          </div>
          {nextUp ? (
            <div className="hero-next">
              <span className="eyebrow">Next up</span>
              <b>{nextUp.title}</b>
              <small>
                {nextUp.cls} · {dueText(nextUp.due, now)}
              </small>
            </div>
          ) : null}
          <div className="hero-cta">
            <Link className="pill mag" href={rows[0] ? "/app/tasks" : "/app/classes"}>
              Start studying
            </Link>
            <Link className="ghost mag" href="/app/study">
              Ask Sparkle ✦
            </Link>
          </div>
        </div>
      </section>
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
      <Applets classes={applets} uid={user.id} />
      <div className="grid s2" style={{ gridTemplateColumns: "1.4fr 1fr", marginTop: 16, alignItems: "start" }}>
        <div className="grid">
          <div className="panel dm">
            <div className="ph">
              <span style={{ color: "var(--fg)", fontSize: 15, fontWeight: 600 }}>
                Don’t miss · from your teachers
                <span className="spk" aria-hidden="true">
                  ✦
                </span>
              </span>
              <span>{newPosts ? <b className="nb">{newPosts} new</b> : null}</span>
            </div>
            {miss.length ? (
              miss.map((d) => (
                <div className="row" key={d.key}>
                  <Av name={d.className} color={d.color} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {d.text}
                      {d.flagged && d.kind !== "missing" ? <b className="flag">Not done yet</b> : null}
                    </div>
                    <small>
                      <Link href={`/app/classes?open=${d.classId}`} style={{ textDecoration: "underline" }}>
                        {d.className}
                      </Link>
                      {d.postTitle ? (
                        <>
                          {" · from "}
                          {d.url ? (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: "underline" }}
                            >
                              “{d.postTitle}”
                            </a>
                          ) : (
                            <>“{d.postTitle}”</>
                          )}
                        </>
                      ) : null}
                    </small>
                  </div>
                  <span className="chip">{KIND[d.kind] ?? "To do"}</span>
                  <span className={`due ${d.flagged ? "h" : ""}`}>{d.when ?? ""}</span>
                </div>
              ))
            ) : (
              <div className="empty">You’re all caught up on class-board posts.</div>
            )}
          </div>
          <div className="panel">
            <div className="ph">
              Up next <span>Next 7 days</span>
            </div>
            {rows.length ? (
              rows.slice(0, 6).map((r) => (
                <div className="row" key={r.id}>
                  <Av name={r.cls} color={r.color} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 13, color: "var(--mut)" }}>
                      {r.cls} · {r.chip}
                    </div>
                  </div>
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
        </div>
        <div className="grid">
          <div className="panel">
            <div className="mascot">
              <Bot size={48} />
              <div>
                <div style={{ fontWeight: 600 }}>{first ? `Hi ${first}!` : "Hi!"}</div>
                <div style={{ fontSize: 13, color: "var(--mut)" }}>{tip}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 20px 20px" }}>
              <Link className="pill" href={rows[0] ? "/app/tasks" : "/app/classes"}>
                Start studying
              </Link>
              <Link className="ghost" href="/app/study">
                Ask Sparkle ✦
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
