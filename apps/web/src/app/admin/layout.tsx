import "../app/app-shell.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { signOut } from "../login/actions";
import { SparkleBg, ThemeToggle } from "../app/chrome";
import { Crumb, MobileTabs, SideNav } from "../app/nav";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const jar = await cookies();
  const saved = jar.get("sparkle-theme")?.value;
  const theme = saved === "dark" ? "dark" : "light";
  return (
    <div className="sa" data-theme={theme}>
      <SparkleBg />
      <SideNav isAdmin taskCount={null} classes={[]} who={{ name: "Admin", sub: user.email ?? "" }} />
      <div className="sa-main">
        <div className="top">
          <Crumb who="Sparkle" />
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
      <MobileTabs />
    </div>
  );
}
