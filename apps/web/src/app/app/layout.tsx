import "./app-shell.css";
import "./effects.css";
import "@/components/agent/pigeon.css";
import "./agent.css";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getClasses, getSb, getStudents, getUser } from "@/lib/req";
import { pickStudent } from "@/lib/classes/load";
import { signOut } from "../login/actions";
import { SparkleBg } from "./chrome";
import { Fx } from "./fx";
import { Boot, Dock, Flyby, TopBar, type ShellProps } from "./agent-shell";

/** Dock data (classes for quick actions, open-mission badge); streamed so the shell paints first. */
async function DockData({ base, sid }: { base: ShellProps; sid: string | null }) {
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
    <Dock
      {...base}
      taskCount={count ?? null}
      classes={classes.map((c) => ({ id: c.id, name: c.name, pct: c.pct, letter: c.letter }))}
    />
  );
}

/** Signed-in shell: ops-center theme, compact top bar, floating dock, More sheet, command palette. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [supabase, user, jar] = await Promise.all([getSb(), getUser(), cookies()]);
  if (!supabase || !user) return <>{children}</>;
  const students = await getStudents();
  const me = pickStudent(students, user.id);
  const name = me ? me.display_name : ((user.user_metadata?.full_name as string) ?? "You");
  const theme = jar.get("sparkle-theme")?.value === "light" ? "light" : "dark";
  const plain = jar.get("sparkle-plain")?.value === "1";
  const base: ShellProps = {
    name,
    students: students.map((s) => ({ id: s.id, name: s.display_name })),
    current: me?.id ?? null,
    isAdmin: user.app_metadata?.role === "admin",
    taskCount: null,
    classes: [],
    signOut,
  };
  return (
    <div className="sa ag" data-theme={theme} data-plain={plain ? "" : undefined}>
      <SparkleBg />
      <div className="ag-tex" aria-hidden="true" />
      <div className="ag-class" aria-hidden="true">
        TOP SECRET // SPARKLE // EYES ONLY
      </div>
      <Fx />
      <div className="sa-main">
        <TopBar {...base} />
        {children}
      </div>
      <Suspense fallback={<Dock {...base} />}>
        <DockData base={base} sid={me?.id ?? null} />
      </Suspense>
      {jar.get("sparkle-booted") ? null : <Boot />}
      <Flyby />
    </div>
  );
}
