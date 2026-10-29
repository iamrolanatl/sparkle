import { redirect } from "next/navigation";
import { getClasses, getSb, getStudents, getUser } from "@/lib/req";
import { loadLate, pickStudent } from "@/lib/classes/load";
import { TaskComposer, type SchoolItem } from "./composer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tasks", robots: { index: false } };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const supabase = await getSb();
  const user = await getUser();
  if (!supabase || !user) redirect("/login?next=/app/tasks");
  const { s } = await searchParams;
  const students = await getStudents();
  const me = pickStudent(students, user.id, s);
  const [classes, late] = me ? await Promise.all([getClasses(me.id), loadLate(supabase, me.id)]) : [[], []];
  const color = new Map(classes.map((c) => [c.id, { name: c.name, color: c.color }]));
  const school: SchoolItem[] = [
    ...classes.flatMap((c) => c.upcoming),
    ...((late ?? []) as (typeof classes)[number]["upcoming"]),
  ].map((a) => ({
    id: a.id,
    title: a.title,
    due_at: a.due_at,
    category: a.category,
    status: a.status,
    className: color.get(a.class_id ?? "")?.name ?? "Class",
    color: color.get(a.class_id ?? "")?.color ?? "#94a3b8",
  }));
  return (
    <div className="page">
      <TaskComposer
        students={students.map((x) => ({ id: x.id, display_name: x.display_name }))}
        initial={me?.id ?? ""}
        school={school}
      />
    </div>
  );
}
