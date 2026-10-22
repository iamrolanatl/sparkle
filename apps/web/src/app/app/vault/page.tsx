import { redirect } from "next/navigation";
import { NeonWindow } from "@sparkle/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Document vault", robots: { index: false } };

/** Vault stays OFF (vault_enabled=false) until security + legal review. Clear disabled state, no dead controls. */
export default async function VaultPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/vault");
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <NeonWindow title="Document vault">
        <p className="text-lg font-semibold">Coming soon 🔒</p>
        <p className="text-muted mt-2 text-sm">
          A private, encrypted place for report cards, IEPs and medical forms. It stays switched off until its security
          and legal reviews are finished, so nothing can be uploaded here yet.
        </p>
      </NeonWindow>
    </main>
  );
}
