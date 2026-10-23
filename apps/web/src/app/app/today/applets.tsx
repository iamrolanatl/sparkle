"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export type AppletClass = {
  id: string;
  name: string;
  teacher: string | null;
  color: string;
  pct: number | null;
  letter: string | null;
  room: string | null;
  unit: string | null;
  tasks: { id: string; title: string; when: string; chip: string }[];
  post: { title: string; body: string | null; who: string | null } | null;
};
type St = "open" | "min" | "closed";

/** Each class as a window: minimize to dock, maximize to fill the view, close (restore via dock/Add applet). */
export function Applets({ classes, uid }: { classes: AppletClass[]; uid: string }) {
  const key = `sparkle-applets:${uid}`;
  const [st, setSt] = useState<Record<string, St>>({});
  const [max, setMax] = useState<string | null>(null);
  const [add, setAdd] = useState(false);
  useEffect(() => {
    let saved: Record<string, St> = {};
    try {
      saved = JSON.parse(localStorage.getItem(key) ?? "{}");
    } catch {}
    queueMicrotask(() => setSt(saved));
  }, [key]);
  const put = (id: string, v: St) => {
    setSt((p) => {
      const n = { ...p, [id]: v };
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {}
      return n;
    });
    if (v !== "open" && max === id) setMax(null);
  };
  useEffect(() => {
    if (!max) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMax(null);
    window.addEventListener("keydown", k);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.documentElement.style.overflow = "";
    };
  }, [max]);
  const s = (id: string) => st[id] ?? "open";
  const open = classes.filter((c) => s(c.id) === "open");
  const mins = classes.filter((c) => s(c.id) === "min");
  const closed = classes.filter((c) => s(c.id) === "closed");
  return (
    <section className="applets" aria-label="Class applets">
      <div className="ap-head">
        <h2>Your classes</h2>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="ghost mag"
            data-testid="add-applet"
            aria-expanded={add}
            onClick={() => setAdd((a) => !a)}
          >
            + Add applet
          </button>
          {add ? (
            <div className="ap-menu" role="menu" data-testid="add-menu">
              {closed.length ? (
                closed.map((c) => (
                  <button
                    key={c.id}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      put(c.id, "open");
                      setAdd(false);
                    }}
                  >
                    <span className="dot" style={{ background: c.color }} /> {c.name}
                  </button>
                ))
              ) : (
                <div className="ap-none">All classes are showing</div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <div className="ap-grid">
        {open.map((c) => (
          <article
            key={c.id}
            className={`applet tilt ${max === c.id ? "max" : ""}`}
            data-testid="applet"
            data-name={c.name}
            aria-label={c.name}
            style={{ ["--acc" as string]: c.color }}
          >
            <header className="ap-bar">
              <span className="dot" style={{ background: c.color }} />
              <b className="ap-t">{c.name}</b>
              <span className="ap-ctl">
                <button type="button" aria-label={`Minimize ${c.name}`} data-act="min" onClick={() => put(c.id, "min")}>
                  <svg viewBox="0 0 12 12">
                    <path d="M2 9h8" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={max === c.id ? `Restore ${c.name}` : `Maximize ${c.name}`}
                  data-act="max"
                  onClick={() => setMax(max === c.id ? null : c.id)}
                >
                  <svg viewBox="0 0 12 12">
                    <rect x="2" y="2" width="8" height="8" rx="1.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={`Close ${c.name}`}
                  data-act="close"
                  onClick={() => put(c.id, "closed")}
                >
                  <svg viewBox="0 0 12 12">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              </span>
            </header>
            <div className="ap-body">
              <div className="ap-grade">
                <div>
                  <div className="ap-pct">{c.pct != null ? `${c.pct.toFixed(1)}%` : "—"}</div>
                  <div className="ap-sub">
                    {[c.teacher, c.room].filter(Boolean).join(" · ") || "Teacher not synced"}
                  </div>
                </div>
                {c.letter ? <b className="badge">{c.letter}</b> : null}
              </div>
              <div className="ap-meter">
                <i style={{ width: `${Math.min(100, c.pct ?? 0)}%` }} />
              </div>
              {c.unit ? <div className="ap-unit">{c.unit}</div> : null}
              <h4>Upcoming</h4>
              {c.tasks.length ? (
                c.tasks.slice(0, max === c.id ? 12 : 3).map((t) => (
                  <div className="ap-row" key={t.id}>
                    <span className="grow">{t.title}</span>
                    <span className="chip">{t.chip}</span>
                    <span className="ap-when">{t.when}</span>
                  </div>
                ))
              ) : (
                <div className="ap-sub">Nothing coming up.</div>
              )}
              <h4>From the teacher</h4>
              {c.post ? (
                <div className="ap-post">
                  <b>{c.post.title}</b>
                  {c.post.body ? <p>{c.post.body.slice(0, max === c.id ? 600 : 140)}</p> : null}
                </div>
              ) : (
                <div className="ap-sub">No posts yet.</div>
              )}
              <Link className="pill mag ap-open" href={`/app/classes?open=${c.id}`}>
                Open class
              </Link>
            </div>
          </article>
        ))}
        {!open.length ? <div className="panel empty">All applets are minimized or closed.</div> : null}
      </div>
      {max ? <div className="ap-scrim" onClick={() => setMax(null)} /> : null}
      {mins.length ? (
        <div className="dock" data-testid="dock" aria-label="Minimized applets">
          {mins.map((c) => (
            <button key={c.id} type="button" className="dock-chip mag" onClick={() => put(c.id, "open")}>
              <span className="dot" style={{ background: c.color }} />
              {c.name}
              {c.letter ? <b>{c.letter}</b> : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** Tasteful CSS-3D star: stacked layers give it thickness; rotates slowly, stops for reduced motion. */
export function Star3D() {
  const layers = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="star3d" aria-hidden="true">
      <div className="st-spin">
        {layers.map((i) => (
          <svg
            key={i}
            viewBox="0 0 100 100"
            style={{ transform: `translateZ(${(i - 3.5) * 1.6}px)` }}
            className={i === 7 || i === 0 ? "face" : ""}
          >
            <path d="M50 4 L61 39 L96 50 L61 61 L50 96 L39 61 L4 50 L39 39 Z" />
          </svg>
        ))}
      </div>
      <span className="st-glow" />
    </div>
  );
}
