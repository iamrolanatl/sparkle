"use client";
import Link from "@/components/IntentLink";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pigeon, W } from "@/components/agent/Pigeon";
import { ALL, PRIMARY, SECONDARY, isActive, type NavItem } from "./nav-data";

const Palette = dynamic(() => import("./palette"), { ssr: false });

/* ---------- prefs (cookie for SSR-visible ones, localStorage for the rest) ---------- */
const sa = () => document.querySelector<HTMLElement>(".sa");
const setCookie = (k: string, v: string) =>
  (document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax; secure`);
const ls = (k: string, v?: string) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {}
  return null;
};
export type Prefs = { dark: boolean; motion: boolean; plain: boolean; sound: boolean; haptics: boolean };
function readPrefs(): Prefs {
  const el = sa();
  return {
    dark: el?.dataset.theme !== "light",
    motion: el?.dataset.motion !== "off",
    plain: el?.hasAttribute("data-plain") ?? false,
    sound: ls("sparkle-sound") === "on",
    haptics: ls("sparkle-haptics") === "on",
  };
}
export function applyPref(k: keyof Prefs, v: boolean) {
  const el = sa();
  if (!el) return;
  if (k === "dark") {
    el.dataset.theme = v ? "dark" : "light";
    setCookie("sparkle-theme", v ? "dark" : "light");
    ls("sparkle-theme", v ? "dark" : "light");
  } else if (k === "motion") {
    if (v) el.removeAttribute("data-motion");
    else el.setAttribute("data-motion", "off");
    ls("sparkle-motion", v ? "on" : "off");
  } else if (k === "plain") {
    el.toggleAttribute("data-plain", v);
    setCookie("sparkle-plain", v ? "1" : "0");
  } else ls(`sparkle-${k}`, v ? "on" : "off");
  window.dispatchEvent(new Event("sparkle-prefs"));
}
export function usePrefs(): [Prefs, (k: keyof Prefs, v: boolean) => void] {
  const [p, setP] = useState<Prefs>({ dark: true, motion: true, plain: false, sound: false, haptics: false });
  useEffect(() => {
    const r = () => setP(readPrefs());
    r();
    window.addEventListener("sparkle-prefs", r);
    return () => window.removeEventListener("sparkle-prefs", r);
  }, []);
  return [p, applyPref];
}

/* ---------- tiny synthesized cues (opt-in) ---------- */
let ac: AudioContext | null = null;
export function cue(kind: "tap" | "open" | "ok" = "tap") {
  if (ls("sparkle-haptics") === "on") navigator.vibrate?.(kind === "ok" ? [8, 40, 8] : 6);
  if (ls("sparkle-sound") !== "on") return;
  try {
    ac ??= new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = kind === "ok" ? 880 : kind === "open" ? 520 : 660;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.13);
  } catch {}
}

export function Ico({ d, s = 20 }: { d: string; s?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={s}
      height={s}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function Switch({
  id,
  label,
  hint,
  on,
  set,
}: {
  id: string;
  label: React.ReactNode;
  hint?: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <label className="ag-sw" data-testid={id}>
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

export type ShellProps = {
  name: string;
  students: { id: string; name: string }[];
  current: string | null;
  isAdmin: boolean;
  taskCount: number | null;
  classes: { id: string; name: string; letter: string | null; pct: number | null }[];
  signOut: () => Promise<void>;
};

/* ---------- top bar ---------- */
export function TopBar(props: ShellProps) {
  const [menu, setMenu] = useState<"" | "who" | "me">("");
  const [online, setOnline] = useState(true);
  const [prefs, set] = usePrefs();
  const [clock, setClock] = useState("");
  useEffect(() => {
    const t = () => {
      const d = new Date();
      setClock(`${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}Z`);
    };
    t();
    const i = setInterval(t, 30000);
    const on = () => setOnline(navigator.onLine);
    on();
    addEventListener("online", on);
    addEventListener("offline", on);
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest(".ag-menu,.ag-who,.ag-me") && setMenu("");
    addEventListener("click", close);
    return () => {
      clearInterval(i);
      removeEventListener("online", on);
      removeEventListener("offline", on);
      removeEventListener("click", close);
    };
  }, []);
  return (
    <header className="ag-top" data-testid="topbar">
      <button
        type="button"
        className="ag-who"
        aria-haspopup="menu"
        aria-expanded={menu === "who"}
        onClick={() => setMenu(menu === "who" ? "" : "who")}
        data-testid="student-switch"
      >
        <span className="ag-av">{props.name.slice(0, 1).toUpperCase()}</span>
        <span className="ag-nm">
          <small>
            <W a="Agent" p="Student" />
          </small>
          {props.name}
        </span>
        <span aria-hidden="true" className="ag-chev">
          ▾
        </span>
      </button>
      {menu === "who" ? (
        <div className="ag-menu" role="menu">
          <div className="ag-mh">
            <W a="Switch agent" p="Switch student" />
          </div>
          {props.students.map((s) => (
            <Link
              key={s.id}
              role="menuitem"
              href={`/app/today?s=${s.id}`}
              className={s.id === props.current ? "on" : ""}
              onClick={() => setMenu("")}
            >
              {s.name}
            </Link>
          ))}
          <Link role="menuitem" href="/app/family" onClick={() => setMenu("")}>
            + <W a="Recruit agent" p="Add student" />
          </Link>
        </div>
      ) : null}
      <button
        type="button"
        className="ag-search"
        data-testid="search-pill"
        onClick={() => window.dispatchEvent(new Event("sparkle-palette"))}
      >
        <Ico d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3" s={16} />
        <span className="ag-ph">
          <W a="Search intel or ask Sparkle" p="Search or ask Sparkle" />
        </span>
        <kbd>Ctrl K</kbd>
      </button>
      <span className={`ag-led ${online ? "" : "off"}`} title={online ? "Connected" : "Offline"} data-testid="sync-led">
        <i aria-hidden="true" />
        <b>{online ? <W a="Uplink secure" p="Online" /> : "Offline"}</b>
        <time suppressHydrationWarning>{clock}</time>
      </span>
      <button
        type="button"
        className="ag-me"
        aria-haspopup="menu"
        aria-expanded={menu === "me"}
        aria-label="Profile and settings"
        onClick={() => setMenu(menu === "me" ? "" : "me")}
        data-testid="profile"
      >
        <Ico d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" s={18} />
      </button>
      {menu === "me" ? (
        <div className="ag-menu right" role="menu" data-testid="profile-menu">
          <div className="ag-mh">{props.name}</div>
          <Switch id="tg-dark" label="Dark mode" on={prefs.dark} set={(v) => set("dark", v)} />
          <Switch id="tg-motion" label="Motion & effects" on={prefs.motion} set={(v) => set("motion", v)} />
          <Switch id="tg-plain" label="Plain wording" on={prefs.plain} set={(v) => set("plain", v)} />
          <Link href="/app/more" onClick={() => setMenu("")} role="menuitem">
            <W a="Agent settings" p="Settings" />
          </Link>
          {props.isAdmin ? (
            <Link href="/admin" role="menuitem">
              Admin
            </Link>
          ) : null}
          <form action={props.signOut}>
            <button type="submit" role="menuitem" data-testid="sign-out">
              <W a="Sign out (end shift)" p="Sign out" />
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}

/* ---------- dock + quick actions + More sheet + palette + boot + shortcuts ---------- */
type QA = { label: React.ReactNode; href: string };
export function Dock(props: ShellProps) {
  const path = usePathname();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [pal, setPal] = useState(false);
  const [quick, setQuick] = useState<{ i: number; x: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressed = useRef(false);
  const QUICK: QA[][] = [
    [
      { label: <W a="Daily briefing" p="Today" />, href: "/app/today" },
      { label: <W a="Check-ins" p="Attendance" />, href: "/app/attendance" },
    ],
    [
      { label: <W a="New mission" p="Add a task" />, href: "/app/tasks#new" },
      { label: <W a="All missions" p="All tasks" />, href: "/app/tasks" },
    ],
    [
      ...props.classes.slice(0, 5).map((c) => ({
        label: (
          <>
            {c.name} <b className="ag-q-n">{c.pct != null ? `${Math.round(c.pct)}%` : (c.letter ?? "—")}</b>
          </>
        ),
        href: `/app/classes?open=${c.id}`,
      })),
      { label: <W a="GPA simulator" p="GPA simulator" />, href: "/app/gpa" },
    ],
    [
      { label: <W a="Open secure line" p="Ask Sparkle" />, href: "/app/study" },
      { label: <W a="Scan a document" p="Scan homework" />, href: "/app/scan" },
    ],
  ];
  const go = useCallback(
    (href: string) => {
      setSheet(false);
      setQuick(null);
      cue("tap");
      router.push(href);
    },
    [router],
  );
  useEffect(() => {
    const openPal = () => {
      cue("open");
      setPal(true);
    };
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPal((p) => !p);
        return;
      }
      if (e.key === "Escape") {
        setSheet(false);
        setQuick(null);
        return;
      }
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setPal(true);
      } else if (e.key >= "1" && e.key <= "4") go(PRIMARY[Number(e.key) - 1]!.href);
      else if (e.key === "5" || e.key === "m") setSheet((s) => !s);
    };
    window.addEventListener("sparkle-palette", openPal);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("sparkle-palette", openPal);
      window.removeEventListener("keydown", key);
    };
  }, [go]);
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setSheet(false);
    setQuick(null);
  }
  const showQuick = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setQuick({ i, x: r.left + r.width / 2 });
    cue("open");
  };
  const groups = ["School", "Home", "Account"].map((g) => [g, SECONDARY.filter((s) => s.group === g)] as const);
  const moreOn = sheet || SECONDARY.some((s) => isActive(path, s.href));
  return (
    <>
      <nav className="ag-dock" aria-label="Main" data-testid="nav-dock">
        {PRIMARY.map((l, i) => {
          const on = isActive(path, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={on ? "on" : ""}
              aria-current={on ? "page" : undefined}
              data-testid={`dock-${l.p.toLowerCase()}`}
              onPointerDown={(e) => {
                longPressed.current = false;
                const el = e.currentTarget;
                timer.current = setTimeout(() => {
                  longPressed.current = true;
                  showQuick(i, el);
                }, 450);
              }}
              onPointerUp={() => clearTimeout(timer.current)}
              onPointerLeave={() => clearTimeout(timer.current)}
              onContextMenu={(e) => {
                e.preventDefault();
                showQuick(i, e.currentTarget);
              }}
              onClick={(e) => {
                if (longPressed.current) {
                  e.preventDefault();
                  longPressed.current = false;
                } else cue("tap");
              }}
            >
              {i === 3 ? <Pigeon size={26} label="" className="ag-dock-pg" /> : <Ico d={l.icon} />}
              <span className="ag-lb">
                <W a={l.a} p={l.p} />
              </span>
              {i === 1 && props.taskCount ? <em className="ag-badge">{props.taskCount}</em> : null}
            </Link>
          );
        })}
        <button
          type="button"
          className={moreOn ? "on" : ""}
          aria-expanded={sheet}
          aria-controls="ag-sheet"
          data-testid="dock-more"
          onClick={() => {
            cue("open");
            setSheet((s) => !s);
          }}
        >
          <Ico d="M5 12h.01M12 12h.01M19 12h.01" />
          <span className="ag-lb">More</span>
        </button>
      </nav>
      {quick ? (
        <div className="ag-quick" role="menu" style={{ left: quick.x }} data-testid="quick-actions">
          <div className="ag-mh">
            <W a={PRIMARY[quick.i]!.a} p={PRIMARY[quick.i]!.p} />
          </div>
          {QUICK[quick.i]!.map((q, j) => (
            <button key={j} type="button" role="menuitem" onClick={() => go(q.href)}>
              {q.label}
            </button>
          ))}
        </div>
      ) : null}
      {quick ? <div className="ag-scrim clear" onClick={() => setQuick(null)} /> : null}
      <div className={`ag-scrim ${sheet ? "open" : ""}`} onClick={() => setSheet(false)} aria-hidden="true" />
      <section
        id="ag-sheet"
        className={`ag-sheet ${sheet ? "open" : ""}`}
        role="dialog"
        aria-modal={sheet}
        aria-label="More"
        data-testid="more-sheet"
        inert={!sheet}
      >
        <div className="ag-grab" aria-hidden="true" />
        <div className="ag-sh-h">
          <h2>
            <W a="Field kit" p="More" />
          </h2>
          <span className="ag-file">FILE 07-ELI</span>
        </div>
        {groups.map(([g, items]) => (
          <div key={g}>
            <h3>{g}</h3>
            <div className="ag-tiles">
              {items.map((l: NavItem) => (
                <button
                  key={l.href}
                  type="button"
                  className={`ag-tile ${isActive(path, l.href) ? "on" : ""}`}
                  onClick={() => go(l.href)}
                >
                  <Ico d={l.icon} s={22} />
                  <b>
                    <W a={l.a} p={l.p} />
                  </b>
                  {l.k ? <em>{l.k}</em> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
        <SheetToggles />
      </section>
      {pal ? <Palette onClose={() => setPal(false)} go={go} classes={props.classes} signOut={props.signOut} /> : null}
    </>
  );
}

function SheetToggles() {
  const [p, set] = usePrefs();
  return (
    <div className="ag-sheet-tg">
      <h3>Settings</h3>
      <Switch
        id="sh-plain"
        label="Plain wording"
        hint="Use everyday words instead of agent speak"
        on={p.plain}
        set={(v) => set("plain", v)}
      />
      <Switch id="sh-dark" label="Dark mode" on={p.dark} set={(v) => set("dark", v)} />
      <Switch id="sh-motion" label="Motion & effects" on={p.motion} set={(v) => set("motion", v)} />
    </div>
  );
}

/** Terminal-style boot: once per browser session, ~1s, click/any key skips, never blocks rendering. */
export function Boot() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    document.cookie = "sparkle-booted=1; path=/; samesite=lax; secure";
    const t = setTimeout(() => setOn(false), 1300);
    const skip = () => setOn(false);
    addEventListener("keydown", skip, { once: true });
    return () => {
      clearTimeout(t);
      removeEventListener("keydown", skip);
    };
  }, []);
  if (!on) return null;
  return (
    <div className="ag-boot" onClick={() => setOn(false)} data-testid="boot" role="status" aria-live="polite">
      <div className="ag-boot-in">
        <Pigeon size={56} pose="scan" label="" />
        <pre>
          {
            "> SPARKLE OPS // v4\n> verifying clearance ........ OK\n> decrypting daily briefing .. OK\n> welcome back, agent."
          }
        </pre>
        <button type="button" className="ag-skip">
          Skip ›
        </button>
      </div>
    </div>
  );
}

/** Pigeon fly-by, occasionally (max once per session, motion on, ~20s after load). */
export function Flyby() {
  const [fly, setFly] = useState(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem("sparkle-flyby")) return;
    } catch {}
    const t = setTimeout(() => {
      if (sa()?.dataset.motion === "off") return;
      try {
        sessionStorage.setItem("sparkle-flyby", "1");
      } catch {}
      setFly(true);
      setTimeout(() => setFly(false), 6000);
    }, 20000);
    return () => clearTimeout(t);
  }, []);
  return fly ? (
    <div className="ag-flyby" aria-hidden="true">
      <Pigeon size={54} pose="flying" label="" />
    </div>
  ) : null;
}

export { ALL };
