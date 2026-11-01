import type { SupabaseClient } from "@supabase/supabase-js";
import { fuelStreak, rankOf } from "./derive";
import { loadClasses } from "@/lib/classes/load";

/** Effort stats from completed tasks (last 60 days). RLS scopes rows to the family. */
export async function shipStats(sb: SupabaseClient, sid: string, pcts: (number | null)[], now = new Date()) {
  const since = new Date(now.getTime() - 60 * 864e5).toISOString();
  const { data } = await sb
    .from("tasks")
    .select("done_at")
    .eq("student_id", sid)
    .gte("done_at", since)
    .order("done_at", { ascending: false })
    .limit(500);
  const done = ((data ?? []) as { done_at: string | null }[]).map((r) => r.done_at).filter(Boolean) as string[];
  const streak = fuelStreak(done, now);
  return { done: done.length, streak, ...rankOf(done.length, pcts.filter((p) => p != null && p >= 90).length, streak) };
}

/** Same stats with class percents loaded too, so Crew and Bridge always agree. */
export async function shipStatsFull(sb: SupabaseClient, sid: string, now = new Date()) {
  const cs = await loadClasses(sb, sid);
  return shipStats(
    sb,
    sid,
    cs.map((c) => c.pct),
    now,
  );
}
