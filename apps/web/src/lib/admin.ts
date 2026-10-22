import "server-only";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin gate (FR-20). Requires app_metadata.role === "admin" (set server-side only; users cannot edit app_metadata).
 * TODO before public launch: company SSO + hardware MFA (FR-12), JIT elevation.
 * Non-admins get a 404 so the console is not discoverable.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || user.app_metadata?.role !== "admin") notFound();
  return user;
}

/** Service-role client — only call after requireAdmin(). Never import into client components. */
export function adminDb() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Admin DB not configured");
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function audit(actor: string, action: string, reason?: string) {
  await adminDb().from("admin_audit_log").insert({ actor, action, reason });
}
