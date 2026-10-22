"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = {
  today: "M3 12l9-8 9 8v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z",
  tasks: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9",
  classes: "M4 19V5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zm0 0a2 2 0 002 2h13",
  gpa: "M12 20V10M18 20V4M6 20v-4",
  scan: "M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2zM8 12h8M12 8v8",
  family: "M16 11a4 4 0 10-8 0M4 21a8 8 0 0116 0",
  import: "M12 3v12m0 0l-4-4m4 4l4-4M4 21h16",
  study: "M12 3l9 5-9 5-9-5zM5 10v5c0 2 3 4 7 4s7-2 7-4v-5",
  vault: "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4",
  admin: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
};
const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const MAIN = [
  { href: "/app/today", label: "Today", icon: I.today },
  { href: "/app/tasks", label: "Tasks", icon: I.tasks },
  { href: "/app/classes", label: "Grades & Classes", icon: I.classes },
  { href: "/app/gpa", label: "GPA Simulator", icon: I.gpa },
  { href: "/app/scan", label: "Scan Homework", icon: I.scan },
];
const MORE = [
  { href: "/app/family", label: "Family & helpers", icon: I.family },
  { href: "/app/import", label: "Import (CSV)", icon: I.import },
  { href: "/app/study", label: "Study helper", icon: I.study, k: "Soon" },
  { href: "/app/vault", label: "Vault", icon: I.vault, k: "Soon" },
];
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
        <i />
        SPARKLE
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
    { href: "/app/gpa", label: "GPA", g: "∿" },
    { href: "/app/more", label: "More", g: "⋯" },
  ];
  return (
    <nav className="mtab" aria-label="Tabs">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={active(path, t.href) ? "on" : ""}>
          <span aria-hidden="true">{t.g}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export { MORE };
