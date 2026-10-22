import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadStudents, pickStudent } from "@/lib/classes/load";
import { VaultView } from "./vault";
import "../list-vault.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vault", robots: { index: false } };

/**
 * FR-24 Vault — sample-data preview only. vault_enabled stays false (DEC-37/144): no real documents are
 * uploaded, stored or read here until launch gate LG-01..14 (incl. privacy counsel) is met.
 */
export default async function VaultPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/vault");
  const me = pickStudent(await loadStudents(supabase), user.id);
  const first = (n: string | null | undefined) => (n ?? "").split(" ")[0] || "";
  return (
    <div className="page">
      <VaultView
        student={first(me?.display_name) || "Student"}
        viewer={first(user.user_metadata?.full_name as string) || "You"}
      />
    </div>
  );
}
