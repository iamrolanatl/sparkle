"use server";
import { revalidatePath } from "next/cache";
import { adminDb, audit, requireAdmin } from "@/lib/admin";

export async function setChatEnabled(form: FormData) {
  const user = await requireAdmin();
  const enabled = form.get("enabled") === "true";
  await adminDb().from("feature_flags").update({ enabled, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", "sales_chat");
  await audit(user.id, enabled ? "sales_chat_enabled" : "sales_chat_disabled");
  revalidatePath("/admin/chat");
}

export async function setTicketStatus(form: FormData) {
  const user = await requireAdmin();
  const id = String(form.get("id")), status = String(form.get("status"));
  if (!["open", "in_progress", "closed"].includes(status)) return;
  await adminDb().from("support_tickets").update({ status, closed_at: status === "closed" ? new Date().toISOString() : null }).eq("id", id);
  await audit(user.id, `ticket_${status}`, id);
  revalidatePath("/admin/chat");
}

export async function setPrivacyStatus(form: FormData) {
  const user = await requireAdmin();
  const id = String(form.get("id")), status = String(form.get("status"));
  if (!["received", "verifying", "completed", "denied"].includes(status)) return;
  await adminDb().from("privacy_requests").update({ status, resolved_at: ["completed", "denied"].includes(status) ? new Date().toISOString() : null }).eq("id", id);
  await audit(user.id, `privacy_request_${status}`, id);
  revalidatePath("/admin/privacy");
}
