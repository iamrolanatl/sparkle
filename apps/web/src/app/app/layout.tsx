import "./app-shell.css";
import "./effects.css";
import { createClient } from "@/lib/supabase/server";
import { loadClasses, loadStudents, pickStudent } from "@/lib/classes/load";
import { signOut } from "../login/actions";
import { cookies } from "next/headers";
import { SparkleBg, ThemeToggle } from "./chrome";
import { Crumb, MobileTabs, SideNav } from "./nav";
import { Fx, Hamburger } from "./fx";

/** Signed-in shell (approved mockup sparkle-classes): sidebar, top bar, pinned mobile tab bar. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return <>{children}</>;
  const students = await loadStudents(supabase);
  const me = pickStudent(students, user.id);
  const classes = me ? await loadClasses(supabase, me.id) : [];
  const { count } = me
    ? await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("student_id", me.id)
        .is("done_at", null)
    : { count: null };
  const name = me && me.profile_id === user.id ? me.display_name : ((user.user_metadata?.full_name as string) ?? "You");
  const sub = me ? (me.profile_id === user.id ? "Student" : `Following ${me.display_name}`) : "No student yet";
  const saved = (await cookies()).get("sparkle-theme")?.value;
  const theme = saved === "dark" ? "dark" : "light";
  return (
    <div className="sa" data-theme={theme}>
      <SparkleBg />
      <Fx />
      <SideNav
        isAdmin={user.app_metadata?.role === "admin"}
        taskCount={count ?? null}
        classes={classes.map((c) => ({ id: c.id, name: c.name, color: c.color, letter: c.letter }))}
        who={{ name, sub }}
      />
      <div className="sa-main">
        <div className="top">
          <Hamburger isAdmin={user.app_metadata?.role === "admin"} />
          <Crumb who={me?.display_name ?? name} />
          <a className="pill askbtn mag" href="/app/study">
            Ask Sparkle
          </a>
          <ThemeToggle initial={theme} hasCookie={saved === "light" || saved === "dark"} />
          <form action={signOut}>
            <button className="out" style={{ background: "none", border: 0, cursor: "pointer" }}>
              Sign out
            </button>
          </form>
        </div>
        {children}
      </div>
      <MobileTabs />
    </div>
  );
}
