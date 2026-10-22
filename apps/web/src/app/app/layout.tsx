import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { AppNav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return (
    <div className="min-h-dvh">
      {user ? (
        <header className="sticky top-0 z-20 border-b border-[var(--spk-border)] bg-black/60 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/app" className="text-lg font-semibold tracking-wide">
                Sparkle
              </Link>
              <form action={signOut}>
                <button className="text-muted text-sm hover:text-white">Sign out</button>
              </form>
            </div>
            <AppNav isAdmin={user.app_metadata?.role === "admin"} />
          </div>
        </header>
      ) : null}
      {children}
    </div>
  );
}
