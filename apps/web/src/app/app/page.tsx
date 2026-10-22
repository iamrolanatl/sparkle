import { GlassPanel } from "@sparkle/ui";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "../login/actions";
import { StateDemo } from "./StateDemo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Today", robots: { index: false } };

export default async function TodayPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/login?next=/app");
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-8 sm:py-14">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-wide">Sparkle</span>
        <form action={signOut}>
          <button className="text-muted text-sm underline">Sign out</button>
        </form>
      </header>
      <GlassPanel glow className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">{`Hi ${user.user_metadata?.full_name ?? "there"}!`}</h1>
        <p className="text-muted mt-2">See what's due, or set up your family and helpers.</p>
        <Link href="/app/today" className="mt-4 mr-6 inline-block underline">
          Today →
        </Link>
        <Link href="/app/family" className="mt-4 inline-block underline">
          Family &amp; helpers →
        </Link>
        <Link href="/app/import" className="mt-4 ml-6 inline-block underline">
          Import assignments (CSV) →
        </Link>
      </GlassPanel>
      <GlassPanel className="p-6">
        <StateDemo />
      </GlassPanel>
    </main>
  );
}
