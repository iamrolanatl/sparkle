"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const APP_LINKS = [
  { href: "/app", label: "Home" },
  { href: "/app/today", label: "Today" },
  { href: "/app/tasks", label: "Tasks" },
  { href: "/app/family", label: "Family" },
  { href: "/app/scan", label: "Scan" },
  { href: "/app/import", label: "Import" },
  { href: "/app/gpa", label: "GPA" },
  { href: "/app/study", label: "Study helper" },
  { href: "/app/vault", label: "Vault" },
] as const;

/** Signed-in app navigation (every post-login screen reachable in one click). */
export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links = isAdmin ? [...APP_LINKS, { href: "/admin", label: "Admin" }] : APP_LINKS;
  return (
    <nav aria-label="App" className="-mx-1 flex gap-1 overflow-x-auto pb-1 text-sm">
      {links.map((l) => {
        const active = l.href === "/app" ? path === "/app" : path?.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
              active
                ? "border border-[var(--spk-neon)] text-white shadow-[0_0_12px_var(--spk-neon)]"
                : "text-muted border border-transparent hover:border-[var(--spk-border)] hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
