import { NeonWindow } from "@sparkle/ui/NeonWindow";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/env";
import { Scanner } from "./scanner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan a school document", robots: { index: false } };

/** FR-23: snap or upload a school handout; text is read on this device, then reviewed before saving. */
export default async function ScanPage() {
  const supabase = await createClient();
  const env = supabaseEnv();
  if (!supabase || !env) redirect("/login?next=/app/scan");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/scan");
  const { data: students } = await supabase.from("students").select("id, display_name").order("created_at").limit(50);
  return (
    <div className="page stack" style={{ maxWidth: 900 }}>
      <div>
        <h1>Scan homework</h1>
        <div className="sub">Snap or upload a school handout · read on your device</div>
      </div>
      <NeonWindow title="Your document">
        <p className="mb-4 text-sm opacity-80">
          Take a photo or upload one. Sparkle reads the text right here on your device, hides Social Security and bank
          numbers, and shows you what it found. Nothing is saved until you confirm.
        </p>
        <Scanner
          students={(students ?? []) as { id: string; display_name: string }[]}
          supabaseUrl={env.url}
          supabaseKey={env.key}
        />
      </NeonWindow>
    </div>
  );
}
