import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/env";
import { loadStudents, pickStudent } from "@/lib/classes/load";
import { listAction, suggestionsAction } from "./actions";
import { ShoppingList, type ListData, type Suggestion } from "./list";
import "../list-vault.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shopping list", robots: { index: false } };

export default async function ListPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const supabase = await createClient();
  const user = (await supabase?.auth.getUser())?.data.user;
  if (!supabase || !user) redirect("/login?next=/app/list");
  const { s } = await searchParams;
  const students = await loadStudents(supabase);
  const me = pickStudent(students, user.id, s);
  if (!me)
    return (
      <div className="page">
        <h1>Shopping list</h1>
        <div className="panel empty" style={{ marginTop: 16 }}>
          Add a student in Family first.
        </div>
      </div>
    );
  const [{ data: cls }, list, sug] = await Promise.all([
    supabase.from("classes").select("name").eq("student_id", me.id).limit(20),
    listAction(me.id),
    suggestionsAction(me.id),
  ]);
  const env = supabaseEnv();
  return (
    <div className="page">
      <ShoppingList
        sid={me.id}
        student={me.display_name}
        initial={list.status === 200 ? (list.body as unknown as ListData) : null}
        suggestions={(sug.body.suggestions as Suggestion[] | undefined) ?? []}
        classes={(cls ?? []).map((c) => c.name as string)}
        rt={env ? { url: env.url, key: env.key } : null}
      />
    </div>
  );
}
