import "./app-shell.css";
import "./effects.css";
import { Suspense } from "react";
import { getClasses, getSb, getStudents, getUser } from "@/lib/req";
import { pickStudent } from "@/lib/classes/load";
import { signOut } from "../login/actions";
import { cookies } from "next/headers";
import { SparkleBg, ThemeToggle } from "./chrome";
import { Crumb, MobileTabs, SideNav } from "./nav";
import { Fx, Hamburger } from "./fx";

/** Signed-in shell (approved mockup sparkle-classes): sidebar, top bar, pinned mobile tab bar. */
type Who = { name: string; sub: string };

/** Sidebar with class list + open-task count; streamed so the shell paints before these queries finish. */
async function NavData({ isAdmin, who, sid }: { isAdmin: boolean; who: Who; sid: string | null }) {
  const sb = await getSb();
  const [classes, count] =
    sb && sid
      ? await Promise.all([
          getClasses(sid),
          sb
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("student_id", sid)
            .is("done_at", null)
            .then((r) => r.count),
        ])
      : [[], null];
  return (
    <SideNav
      isAdmin={isAdmin}
      taskCount={count ?? null}
      classes={classes.map((c) => ({ id: c.id, name: c.name, color: c.color, letter: c.letter }))}
      who={who}
    />
  );
}

/** Signed-in shell (approved mockup sparkle-classes): sidebar, top bar, pinned mobile tab bar. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [supabase, user, jar] = await Promise.all([getSb(), getUser(), cookies()]);
  if (!supabase || !user) return <>{children}</>;
  const students = await getStudents();
  const me = pickStudent(students, user.id);
  const name = me && me.profile_id === user.id ? me.display_name : ((user.user_metadata?.full_name as string) ?? "You");
  const sub = me ? (me.profile_id === user.id ? "Student" : `Following ${me.display_name}`) : "No student yet";
  const saved = jar.get("sparkle-theme")?.value;
  const theme = saved === "dark" ? "dark" : "light";
  const isAdmin = user.app_metadata?.role === "admin";
  const who = { name, sub };
  return (
    <div className="sa" data-theme={theme}>
      <SparkleBg />
      <Fx />
      <Suspense fallback={<SideNav isAdmin={isAdmin} taskCount={null} classes={[]} who={who} />}>
        <NavData isAdmin={isAdmin} who={who} sid={me?.id ?? null} />
      </Suspense>
      <div className="sa-main">
        <div className="top">
          <Hamburger isAdmin={isAdmin} />
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
