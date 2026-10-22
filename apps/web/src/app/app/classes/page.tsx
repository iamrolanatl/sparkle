import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gpaOf, loadClasses, loadStudents, pickStudent } from "@/lib/classes/load";
import { ClassList } from "./class-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grades & Classes", robots: { index: false } };

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ s?: string; open?: string }> }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/classes");
  const { s, open } = await searchParams;
  const me = pickStudent(await loadStudents(supabase), user.id, s);
  const classes = me ? await loadClasses(supabase, me.id) : [];
  // Short-lived signed links for uploaded files (private bucket).
  const paths = classes.flatMap((c) => c.materials.filter((m) => m.storage_path).map((m) => m.storage_path!));
  const signed = paths.length
    ? ((await supabase.storage.from("materials").createSignedUrls(paths, 3600)).data ?? [])
    : [];
  const urlOf = Object.fromEntries(signed.filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl]));
  const gpa = gpaOf(classes);
  const graded = classes.filter((c) => c.pct != null);
  const best = graded.length ? graded.reduce((a, b) => (b.pct! > a.pct! ? b : a)) : null;
  const upcoming = classes.reduce((a, c) => a + c.upcoming.length, 0);
  return (
    <div className="page">
      <div className="grid s4" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
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
          <div className="l">Top class</div>
          <div className="v" style={{ fontSize: 20, marginTop: 10 }}>
            {best ? best.name.replace(" Design & Modeling", "") : "—"}
          </div>
          <div className="d" style={best ? undefined : { color: "var(--mut)" }}>
            {best ? `${best.pct!.toFixed(1)}% · ${best.letter}` : "No grades yet"}
          </div>
        </div>
        <div className="panel stat">
          <div className="l">Upcoming</div>
          <div className="v">{upcoming}</div>
          <div className="d" style={{ color: "var(--mut)" }}>
            across {classes.length} classes
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1>Classes</h1>
        <span style={{ color: "var(--dim)", fontSize: 12 }}>Click a class to expand</span>
      </div>
      {!me ? (
        <div className="panel empty">
          No student yet.{" "}
          <Link href="/app/family" style={{ textDecoration: "underline" }}>
            Add a student
          </Link>{" "}
          first.
        </div>
      ) : !classes.length ? (
        <div className="panel empty">
          No classes yet. They appear after you{" "}
          <Link href="/app/import" style={{ textDecoration: "underline" }}>
            import assignments
          </Link>{" "}
          or school sync runs.
        </div>
      ) : (
        <ClassList studentId={me.id} classes={classes} openId={open ?? null} fileUrls={urlOf} />
      )}
    </div>
  );
}
