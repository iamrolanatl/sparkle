"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 10 * 1024 * 1024;
const TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
export type MatResult = { ok: boolean; error?: string };

async function ctx(form: FormData) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const studentId = String(form.get("student_id") ?? "");
  const classId = String(form.get("class_id") ?? "");
  const unitRaw = String(form.get("unit_id") ?? "");
  if (!supabase || !user || !UUID.test(studentId) || !UUID.test(classId)) return null;
  return { supabase, user, studentId, classId, unitId: UUID.test(unitRaw) ? unitRaw : null };
}

/** Save a link for this class/unit. RLS (class_materials_insert) decides who may write. */
export async function addMaterialLink(_: MatResult | null, form: FormData): Promise<MatResult> {
  const c = await ctx(form);
  if (!c) return { ok: false, error: "Please sign in again." };
  let url = String(form.get("url") ?? "").trim();
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) throw new Error();
  } catch {
    return { ok: false, error: "That link doesn't look right." };
  }
  const name = (String(form.get("name") ?? "").trim() || url.replace(/^https?:\/\//, "")).slice(0, 200);
  const { error } = await c.supabase.from("class_materials").insert({
    student_id: c.studentId,
    class_id: c.classId,
    unit_id: c.unitId,
    kind: "link",
    name,
    url: url.slice(0, 2000),
    created_by: c.user.id,
  });
  if (error) return { ok: false, error: "Couldn't save that link." };
  revalidatePath("/app/classes");
  return { ok: true };
}

/** Upload a handout to the private `materials` bucket, then record it. */
export async function uploadMaterial(_: MatResult | null, form: FormData): Promise<MatResult> {
  const c = await ctx(form);
  if (!c) return { ok: false, error: "Please sign in again." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pick a file first." };
  if (file.size > MAX) return { ok: false, error: "Files can be up to 10 MB." };
  if (!TYPES.has(file.type)) return { ok: false, error: "Use a PDF, photo, Word/PowerPoint or text file." };
  const safe = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120) || "file";
  const path = `${c.studentId}/${c.classId}/${crypto.randomUUID()}-${safe}`;
  const up = await c.supabase.storage.from("materials").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { ok: false, error: "Upload failed. Please try again." };
  const { error } = await c.supabase.from("class_materials").insert({
    student_id: c.studentId,
    class_id: c.classId,
    unit_id: c.unitId,
    kind: "file",
    name: safe,
    storage_path: path,
    created_by: c.user.id,
  });
  if (error) {
    await c.supabase.storage.from("materials").remove([path]);
    return { ok: false, error: "Couldn't save that file." };
  }
  revalidatePath("/app/classes");
  return { ok: true };
}

export async function deleteMaterial(form: FormData) {
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  if (!supabase || !UUID.test(id)) return;
  const { data } = await supabase.from("class_materials").delete().eq("id", id).select("storage_path");
  const p = data?.[0]?.storage_path as string | undefined;
  if (p) await supabase.storage.from("materials").remove([p]);
  revalidatePath("/app/classes");
}

/** Read receipts for class-board posts (unread badge). RLS: own rows only, and only for students you can see. */
export async function markPostsRead(studentId: string, postIds: string[]): Promise<MatResult> {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const ids = [...new Set(postIds)].filter((x) => UUID.test(x)).slice(0, 200);
  if (!supabase || !user || !UUID.test(studentId)) return { ok: false, error: "Please sign in again." };
  if (!ids.length) return { ok: true };
  const { error } = await supabase.from("post_reads").upsert(
    ids.map((post_id) => ({ post_id, student_id: studentId, user_id: user.id })),
    { onConflict: "post_id,user_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/app/classes");
  revalidatePath("/app/today");
  return { ok: true };
}

/** Tick a teacher-post action item done (or undo). Only done_at is writable (column grant + RLS). */
export async function setActionDone(actionId: string, done: boolean): Promise<MatResult> {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user || !UUID.test(actionId)) return { ok: false, error: "Please sign in again." };
  const { error } = await supabase
    .from("post_actions")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", actionId);
  if (error) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/app/classes");
  revalidatePath("/app/today");
  return { ok: true };
}
