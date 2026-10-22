import { redirect } from "next/navigation";
import { NeonWindow } from "@sparkle/ui";
import { createClient } from "@/lib/supabase/server";
import { studyStatusAction } from "../tasks/actions";
import { StudyChat } from "./chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Study helper", robots: { index: false } };

/** Behind feature flag `study_helper` (default OFF, DEC-108). */
export default async function StudyPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/study");
  const status = await studyStatusAction();
  if (status.body.enabled !== true)
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <NeonWindow title="Study helper">
          <p className="text-lg font-semibold">Coming soon 🤖</p>
          <p className="text-muted mt-2 text-sm">
            Sparkle&apos;s study helper coaches students through homework without doing it for them. It stays switched
            off until child-safety testing and review are finished.
          </p>
        </NeonWindow>
      </main>
    );
  const { data } = await supabase.from("students").select("id, display_name").order("display_name").limit(50);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <StudyChat students={data ?? []} />
    </main>
  );
}
