"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export type ImportResult = { ok: true; imported: number; classes: number } | { ok: false; error: string };

/** Forwards the CSV to the API with the user's session token; the API re-checks guardian/self via RLS RPCs. */
export async function importCsv(_: ImportResult | null, form: FormData): Promise<ImportResult> {
  const supabase = await createClient();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session) return { ok: false, error: "Please sign in again." };
  const studentId = String(form.get("student_id") ?? "");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a CSV file." };
  if (file.size > 1_000_000) return { ok: false, error: "File is larger than 1 MB." };
  try {
    const res = await fetch(`${API}/students/${encodeURIComponent(studentId)}/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "text/csv" },
      body: await file.text(),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      imported?: number;
      classes?: number;
      details?: string[];
    };
    if (res.ok) {
      revalidatePath("/app");
      return { ok: true, imported: body.imported ?? 0, classes: body.classes ?? 0 };
    }
    if (res.status === 422) {
      const first = body.details?.[0];
      return { ok: false, error: first ? `The file has problems. ${first}` : "The file has problems." };
    }
    if (res.status === 403) return { ok: false, error: "You can only import for students you're a guardian of." };
    return { ok: false, error: "Import failed. Please try again in a minute." };
  } catch {
    return { ok: false, error: "Couldn't reach Sparkle. Please try again." };
  }
}
