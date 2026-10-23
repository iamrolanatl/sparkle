import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/env";
import { loadStudents, pickStudent } from "@/lib/classes/load";
import { hhListAction, listAction, sharedListsAction, suggestionsAction } from "./actions";
import { ShoppingList, type ListData, type Suggestion } from "./list";
import "../list-vault.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shopping list", robots: { index: false } };

export default async function ListPage({ searchParams }: { searchParams: Promise<{ s?: string; l?: string }> }) {
  const supabase = await createClient();
  const user = (await supabase?.auth.getUser())?.data.user;
  if (!supabase || !user) redirect("/login?next=/app/list");
  const { s, l } = await searchParams;
  const [students, shared] = await Promise.all([loadStudents(supabase), sharedListsAction()]);
  const sharedLists = (shared.body.lists as { household_id: string; role: string; owner_name: string }[]) ?? [];
  const me = pickStudent(students, user.id, s);
  const pickShared = sharedLists.find((x) => x.household_id === l) ?? (!me ? sharedLists[0] : undefined);
  const env0 = supabaseEnv();
  const switcher =
    sharedLists.length && (me || sharedLists.length > 1) ? (
      <nav className="lv-seg" aria-label="Lists" style={{ marginBottom: 12 }}>
        {me ? (
          <a href="/app/list" className={pickShared ? "" : "on"}>
            {me.display_name}&apos;s family
          </a>
        ) : null}
        {sharedLists.map((x) => (
          <a
            key={x.household_id}
            href={`/app/list?l=${x.household_id}`}
            className={pickShared?.household_id === x.household_id ? "on" : ""}
          >
            {x.owner_name}&apos;s list
          </a>
        ))}
      </nav>
    ) : null;
  if (pickShared) {
    const list = await hhListAction(pickShared.household_id);
    return (
      <div className="page">
        {switcher}
        <ShoppingList
          key={pickShared.household_id}
          sid={null}
          student=""
          owner={pickShared.owner_name}
          initial={list.status === 200 ? (list.body as unknown as ListData) : null}
          suggestions={[]}
          classes={[]}
          rt={env0 ? { url: env0.url, key: env0.key } : null}
        />
      </div>
    );
  }
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
      {switcher}
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
