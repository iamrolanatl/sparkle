import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskComposer } from "./composer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tasks", robots: { index: false } };

export default async function TasksPage() {
  const supabase = await createClient();
  const user = (await supabase?.auth.getUser())?.data.user;
  if (!supabase || !user) redirect("/login?next=/app/tasks");
  const { data } = await supabase.from("students").select("id, display_name").order("display_name").limit(50);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <TaskComposer students={data ?? []} />
    </main>
  );
}
