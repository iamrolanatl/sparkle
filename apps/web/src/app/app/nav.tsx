"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "./chrome";
import { I, MAIN, MORE } from "./links";

const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TITLES: Record<string, string> = Object.fromEntries(
  [...MAIN, ...MORE, { href: "/admin", label: "Admin" }].map((l) => [l.href, l.label]),
);

const active = (path: string | null, href: string) => !!path && (path === href || path.startsWith(href + "/"));

export function SideNav({
  isAdmin,
  taskCount,
  classes,
  who,
}: {
  isAdmin: boolean;
  taskCount: number | null;
  classes: { id: string; name: string; color: string; letter: string | null }[];
  who: { name: string; sub: string };
}) {
  const path = usePathname();
  const more = isAdmin ? [...MORE, { href: "/admin", label: "Admin", icon: I.admin }] : MORE;
  return (
    <aside aria-label="App">
      <Link href="/app/today" className="logo">
        <Bot />
        Sparkle
      </Link>
      {MAIN.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`nv ${active(path, l.href) ? "on" : ""}`}
          aria-current={active(path, l.href) ? "page" : undefined}
        >
          <Ico d={l.icon} />
          {l.label}
          {l.href === "/app/tasks" && taskCount ? <span className="k">{taskCount}</span> : null}
        </Link>
      ))}
      {classes.length ? <div className="sec">Classes</div> : null}
      {classes.map((c) => (
        <Link key={c.id} href={`/app/classes?open=${c.id}`} className="nv">
          <span className="dot" style={{ background: c.color }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.name.replace(" Design & Modeling", "")}
          </span>
          <span className="k">{c.letter ?? ""}</span>
        </Link>
      ))}
      <div className="sec">More</div>
      {more.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`nv ${active(path, l.href) ? "on" : ""}`}
          aria-current={active(path, l.href) ? "page" : undefined}
        >
          <Ico d={l.icon} />
          {l.label}
          {"k" in l && l.k ? <span className="k">{l.k}</span> : null}
        </Link>
      ))}
      <div className="me">
        <div className="av">{who.name.slice(0, 1).toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13 }}>{who.name}</div>
          <div style={{ fontSize: 11, color: "var(--dim)" }}>{who.sub}</div>
        </div>
      </div>
    </aside>
  );
}

export function Crumb({ who }: { who: string }) {
  const path = usePathname() ?? "";
  const key = Object.keys(TITLES).find((h) => active(path, h));
  return (
    <div className="crumb">
      {who} / <b>{key ? TITLES[key] : "Home"}</b>
    </div>
  );
}

export function MobileTabs() {
  const path = usePathname();
  const tabs = [
    { href: "/app/today", label: "Today", g: "◎" },
    { href: "/app/tasks", label: "Tasks", g: "✓" },
    { href: "/app/classes", label: "Classes", g: "▤" },
    { href: "/app/more", label: "More", g: "⋯" },
  ];
  return (
    <nav className="mtab" aria-label="Tabs">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={active(path, t.href) ? "on" : ""}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
