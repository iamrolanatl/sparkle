"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RedeemResult = { ok: true } | { ok: false; error: string } | null;

export async function redeem(_: RedeemResult, form: FormData): Promise<RedeemResult> {
  const code = String(form.get("code") ?? "").trim();
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect(`/login?next=${encodeURIComponent(`/invite?code=${code}`)}`);
  if (code.length < 4 || code.length > 64) return { ok: false, error: "That code isn't valid." };
  const { data, error } = await supabase.rpc("redeem_invitation", { p_code: code });
  if (error) {
    const msg = /too many/i.test(error.message)
      ? "Too many tries. Please wait 15 minutes."
      : "That code is invalid or expired.";
    return { ok: false, error: msg };
  }
  if (!data) return { ok: false, error: "That code is invalid or expired." };
  redirect("/app");
}
