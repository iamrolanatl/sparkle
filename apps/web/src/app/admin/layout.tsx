import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <p role="note" className="mb-4 rounded-lg border border-amber-400/60 p-2 text-xs">
        Admin command center (minimum slice). TODO before launch: company SSO + hardware MFA, JIT elevation. All actions are audited.
      </p>
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <span className="font-semibold tracking-widest">◆ SPARKLE ADMIN</span>
        <nav className="flex gap-4 text-sm"><Link href="/admin">Overview</Link><Link href="/admin/chat">Sales &amp; Support Chat</Link><Link href="/admin/privacy">Privacy requests</Link></nav>
        <span className="text-muted ml-auto text-xs">{user.email}</span>
      </header>
      {children}
    </div>
  );
}
