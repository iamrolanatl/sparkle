import "../app/app-shell.css";
import "../app/agent.css";
import "@/components/agent/pigeon.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { signOut } from "../login/actions";
import { SparkleBg, ThemeToggle } from "../app/chrome";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const jar = await cookies();
  const saved = jar.get("sparkle-theme")?.value;
  const theme = saved === "light" ? "light" : "dark";
  return (
    <div className="sa ag" data-theme={theme}>
      <SparkleBg />
      <div className="ag-class" aria-hidden="true">
        TOP SECRET // SPARKLE // ADMIN
      </div>
      <div className="sa-main">
        <div className="ag-top">
          <Link href="/app/today">← Back to app</Link>
          <span style={{ flex: 1 }} title={user.email ?? ""} />
          <ThemeToggle initial={theme} hasCookie={saved === "light" || saved === "dark"} />
          <form action={signOut}>
            <button className="out" style={{ background: "none", border: 0, cursor: "pointer" }}>
              Sign out
            </button>
          </form>
        </div>
        <div className="page stack">
          <div>
            <h1>Admin</h1>
            <div className="sub">Command center · all actions are audited</div>
          </div>
          <p role="note" className="panel note">
            Minimum slice. Before launch: company SSO + hardware MFA, JIT elevation.
          </p>
          <nav className="tabs" aria-label="Admin sections" style={{ margin: 0 }}>
            <Link className="tab" href="/admin">
              Overview
            </Link>
            <Link className="tab" href="/admin/chat">
              Sales &amp; Support Chat
            </Link>
            <Link className="tab" href="/admin/privacy">
              Privacy requests
            </Link>
            <Link className="tab" href="/admin/sync">
              Sync health
            </Link>
          </nav>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
