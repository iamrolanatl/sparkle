"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, hashInviteCode, isRelationship } from "@/lib/invite-code";
import { isValidEmail } from "@/lib/site";

async function authed() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/family");
  return { supabase, user };
}

export type ActionResult = { ok: true; code?: string } | { ok: false; error: string };

export async function addStudent(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const name = String(form.get("display_name") ?? "").trim();
  const birth = String(form.get("birth_date") ?? "").trim() || null;
  if (name.length < 1 || name.length > 60) return { ok: false, error: "Enter a name (1–60 characters)." };
  if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return { ok: false, error: "Birth date must be YYYY-MM-DD." };
  const { error } = await supabase
    .from("students")
    .insert({ display_name: name, birth_date: birth, created_by: user.id });
  if (error) return { ok: false, error: "Could not add the student. Please try again." };
  revalidatePath("/app/family");
  return { ok: true };
}

export async function createInvitation(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const studentId = String(form.get("student_id") ?? "");
  const role = form.get("role") === "student" ? "student" : "helper";
  const relationship = form.get("relationship");
  const label =
    String(form.get("relationship_label") ?? "")
      .trim()
      .slice(0, 60) || null;
  const email =
    String(form.get("email") ?? "")
      .trim()
      .toLowerCase() || null;
  if (role === "helper" && !isRelationship(relationship)) return { ok: false, error: "Pick a relationship." };
  if (email && !isValidEmail(email)) return { ok: false, error: "That email doesn't look right." };
  const code = generateInviteCode();
  const { error } = await supabase.from("invitations").insert({
    student_id: studentId,
    role,
    relationship: role === "helper" ? relationship : null,
    relationship_label: label,
    email,
    code_hash: await hashInviteCode(code),
    invited_by: user.id,
  });
  if (error) return { ok: false, error: "Could not create the invitation." };
  revalidatePath("/app/family");
  return { ok: true, code };
}

export async function revokeInvitation(form: FormData) {
  const { supabase } = await authed();
  await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", String(form.get("id")));
  revalidatePath("/app/family");
}

export async function revokeShare(form: FormData) {
  const { supabase } = await authed();
  await supabase
    .from("shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", String(form.get("id")));
  revalidatePath("/app/family");
}

export async function approveInvitation(form: FormData) {
  const { supabase } = await authed();
  await supabase.rpc("approve_invitation", { p_invitation: String(form.get("id")) });
  revalidatePath("/app/family");
}
