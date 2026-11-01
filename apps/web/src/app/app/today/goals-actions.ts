"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guardian sets a goal. RLS (fg_insert) only lets an active guardian write. */
export async function addGoal(form: FormData) {
  const sb = await createClient();
  const sid = String(form.get("student_id") ?? "");
  const cid = String(form.get("class_id") ?? "");
  const target = Number(form.get("target_pct"));
  const by = String(form.get("by_date") ?? "");
  const reward = String(form.get("reward") ?? "")
    .trim()
    .slice(0, 200);
  if (!sb || !UUID.test(sid) || !UUID.test(cid) || !(target > 0 && target <= 100) || !/^\d{4}-\d{2}-\d{2}$/.test(by))
    return;
  await sb
    .from("family_goals")
    .insert({ student_id: sid, class_id: cid, target_pct: target, by_date: by, reward: reward || null });
  revalidatePath("/app/today");
}

export async function archiveGoal(form: FormData) {
  const sb = await createClient();
  const id = String(form.get("id") ?? "");
  if (!sb || !UUID.test(id)) return;
  await sb.from("family_goals").update({ archived_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/app/today");
}
