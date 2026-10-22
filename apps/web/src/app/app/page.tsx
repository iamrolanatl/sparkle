import { GlassPanel } from "@sparkle/ui";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DueSoonTasks } from "./tasks/due-soon";

export const dynamic = "force-dynamic";

export const metadata = { title: "Home", robots: { index: false } };

const CARDS = [
  { href: "/app/today", title: "Today", body: "What's due, overdue and coming up." },
  { href: "/app/tasks", title: "Tasks", body: "Type a task in plain words, review it, save it, check it off." },
  { href: "/app/family", title: "Family & helpers", body: "Add students and invite parents, helpers or the student." },
  { href: "/app/scan", title: "Scan", body: "Photograph a school paper; Sparkle reads it on your device." },
  { href: "/app/import", title: "Import", body: "Bring in assignments from a spreadsheet (CSV)." },
  { href: "/app/gpa", title: "GPA simulator", body: "Try what-if grades with exact GPA rules." },
  { href: "/app/study", title: "Study helper", body: "Coming soon: in safety testing.", off: true },
  { href: "/app/vault", title: "Document vault", body: "Coming soon: in security review.", off: true },
];

export default async function HomePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app");
  const { data } = await supabase.from("students").select("id, display_name").order("created_at").limit(50);
  const students = (data ?? []) as { id: string; display_name: string }[];
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <GlassPanel glow className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">{`Hi ${user.user_metadata?.full_name ?? "there"}!`}</h1>
        <p className="text-muted mt-2">
          {students.length
            ? `Following ${students.map((s) => s.display_name).join(", ")}.`
            : "Start by adding a student on the Family page."}
        </p>
        {!students.length ? (
          <Link
            href="/app/family"
            className="mt-4 inline-block rounded-full border border-[var(--spk-neon)] px-4 py-2 hover:shadow-[0_0_16px_var(--spk-neon)]"
          >
            Add a student →
          </Link>
        ) : null}
      </GlassPanel>
      {students[0] ? <DueSoonTasks studentId={students[0].id} /> : null}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Modules">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`rounded-2xl border border-[var(--spk-border)] bg-white/[0.03] p-4 transition-all hover:border-[var(--spk-neon)] hover:shadow-[0_0_18px_var(--spk-neon)] ${c.off ? "opacity-60" : ""}`}
          >
            <h2 className="font-semibold">{c.title}</h2>
            <p className="text-muted mt-1 text-sm">{c.body}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
