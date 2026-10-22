import { NeonWindow } from "@sparkle/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import assignments", robots: { index: false } };

export default async function ImportPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/import");
  const { data } = await supabase.from("students").select("id, display_name").order("created_at").limit(50);
  const students = (data ?? []).map((s) => ({ id: s.id as string, name: s.display_name as string }));
  return (
    <div className="page stack" style={{ maxWidth: 820 }}>
      <div>
        <h1>Import assignments</h1>
        <div className="sub">Paste in a spreadsheet export (CSV)</div>
      </div>
      <NeonWindow title="Upload a CSV">
        <p className="text-muted mb-4 text-sm">
          Until school sync is available, you can paste in a spreadsheet export. Re-importing the same file updates rows
          instead of duplicating them.
        </p>
        {students.length ? (
          <UploadForm students={students} />
        ) : (
          <p className="text-sm">
            Add a student on the{" "}
            <Link href="/app/family" className="underline">
              family page
            </Link>{" "}
            first.
          </p>
        )}
      </NeonWindow>
    </div>
  );
}
