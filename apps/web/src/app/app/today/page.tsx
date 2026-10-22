import { NeonWindow } from "@sparkle/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DueSoonTasks } from "../tasks/due-soon";
import { formatDue, isEmpty, type TodayDoc, type TodayItem } from "@/lib/today-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today", robots: { index: false } };

const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

async function loadToday(studentId: string, token: string): Promise<TodayDoc | null> {
  try {
    const res = await fetch(`${API}/students/${encodeURIComponent(studentId)}/today`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok ? ((await res.json()) as TodayDoc) : null;
  } catch {
    return null; // Graceful degradation (NFR-38): page still renders.
  }
}

function Section({ title, items, tone }: { title: string; items: TodayItem[]; tone?: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-4">
      <h3 className={`font-semibold ${tone ?? ""}`}>{title}</h3>
      <ul className="mt-2 grid gap-2">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-white/5 px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{a.title}</span>
              {a.class_name ? <span className="text-muted"> · {a.class_name}</span> : null}
              {a.status === "missing" ? <span className="ml-2 text-rose-300">missing</span> : null}
            </span>
            <span className="text-muted">{formatDue(a.due_at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/today");
  const [{ data: students }, { data: sess }] = await Promise.all([
    supabase.from("students").select("id, display_name").order("created_at").limit(50),
    supabase.auth.getSession(),
  ]);
  const list = (students ?? []) as { id: string; display_name: string }[];
  const { s } = await searchParams;
  const current = list.find((x) => x.id === s) ?? list[0];
  const doc = current && sess.session ? await loadToday(current.id, sess.session.access_token) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <span className="text-muted text-sm">Student</span>
        <nav className="flex gap-3 text-sm">
          {list.map((x) => (
            <Link
              key={x.id}
              href={`/app/today?s=${x.id}`}
              className={x.id === current?.id ? "font-semibold underline" : "underline"}
            >
              {x.display_name}
            </Link>
          ))}
        </nav>
      </header>
      {!current ? (
        <NeonWindow title="Today">
          <p className="text-sm">
            No students yet.{" "}
            <Link href="/app/family" className="underline">
              Add one
            </Link>
            .
          </p>
        </NeonWindow>
      ) : !doc ? (
        <NeonWindow title="Today">
          <p className="text-sm" role="status">
            We couldn&apos;t load today&apos;s plan right now. Try again in a minute.
          </p>
        </NeonWindow>
      ) : (
        <NeonWindow title={`Today · ${current.display_name}`}>
          <p className="text-xl font-semibold">{doc.headline}</p>
          {doc.missingCount ? <p className="text-muted text-sm">{doc.missingCount} marked missing by school</p> : null}
          <Section title="Catch up" items={doc.overdue} tone="text-rose-300" />
          <Section title="Due today" items={doc.dueToday} tone="text-amber-200" />
          <Section title="Coming up (7 days)" items={doc.upcoming} />
          {isEmpty(doc) ? (
            <p className="mt-4 text-sm">
              Nothing scheduled.{" "}
              <Link href="/app/import" className="underline">
                Import assignments
              </Link>{" "}
              to get started.
            </p>
          ) : null}
        </NeonWindow>
      )}
      {current ? <DueSoonTasks studentId={current.id} /> : null}
      {current ? (
        <p className="text-sm">
          <Link href="/app/tasks" className="underline">
            Add or finish tasks →
          </Link>
        </p>
      ) : null}
    </main>
  );
}
