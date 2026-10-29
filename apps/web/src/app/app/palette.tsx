"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL } from "./nav-data";
import { applyPref, cue } from "./agent-shell";

type Act = { t: string; s: "Go to" | "Case file" | "Action" | "Ask"; run: () => void; k?: string };

export default function Palette({
  onClose,
  go,
  classes,
  signOut,
}: {
  onClose: () => void;
  go: (h: string) => void;
  classes: { id: string; name: string }[];
  signOut: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  const plain = typeof document !== "undefined" && document.querySelector(".sa")?.hasAttribute("data-plain");
  useEffect(() => inp.current?.focus(), []);
  const base = useMemo<Act[]>(() => {
    const sa = document.querySelector<HTMLElement>(".sa");
    const flip = (k: "dark" | "motion" | "plain") => () => {
      const cur =
        k === "dark"
          ? sa?.dataset.theme !== "light"
          : k === "motion"
            ? sa?.dataset.motion !== "off"
            : !!sa?.hasAttribute("data-plain");
      applyPref(k, !cur);
    };
    return [
      ...ALL.map((l, i) => ({
        t: plain ? l.p : `${l.a} · ${l.p}`,
        s: "Go to" as const,
        run: () => go(l.href),
        k: i < 4 ? String(i + 1) : undefined,
      })),
      ...classes.map((c) => ({ t: c.name, s: "Case file" as const, run: () => go(`/app/classes?open=${c.id}`) })),
      { t: plain ? "Add a task" : "New mission (add a task)", s: "Action", run: () => go("/app/tasks#new") },
      { t: "Toggle dark mode", s: "Action", run: flip("dark") },
      { t: "Toggle motion & effects", s: "Action", run: flip("motion") },
      { t: "Toggle plain wording", s: "Action", run: flip("plain") },
      {
        t: "Toggle sound cues",
        s: "Action",
        run: () => applyPref("sound", localStorage.getItem("sparkle-sound") !== "on"),
      },
      {
        t: "Toggle haptics",
        s: "Action",
        run: () => applyPref("haptics", localStorage.getItem("sparkle-haptics") !== "on"),
      },
      { t: "Draft attendance note", s: "Action", run: () => go("/app/attendance") },
      {
        t: "Sign out",
        s: "Action",
        run: () => document.querySelector<HTMLFormElement>("#ag-signout")?.requestSubmit(),
      },
    ];
  }, [classes, go, plain]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const words = n.split(/\s+/).filter(Boolean);
    const r = base.filter((a) => words.every((w) => a.t.toLowerCase().includes(w)));
    const out: Act[] = [];
    const m = /^add (.+)/.exec(n);
    if (m)
      out.push({
        t: `Add “${m[1]}” to the shopping list`,
        s: "Action",
        run: () => go(`/app/list?add=${encodeURIComponent(m[1]!)}`),
      });
    out.push(...r);
    if (n)
      out.push({
        t: `Ask Sparkle: “${q.trim()}”`,
        s: "Ask",
        run: () => go(`/app/study?q=${encodeURIComponent(q.trim())}`),
      });
    return out;
  }, [q, base, go]);
  const pick = (a?: Act) => {
    if (!a) return;
    cue("ok");
    onClose();
    a.run();
  };
  let last = "";
  return (
    <div
      className="ag-pal"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="palette"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ag-pal-box">
        <div className="ag-pal-in">
          <span aria-hidden="true">&gt;_</span>
          <input
            ref={inp}
            value={q}
            placeholder={plain ? "Go to, do, or ask anything…" : "Query the network: go, do, or ask…"}
            aria-label="Command"
            aria-controls="ag-res"
            aria-activedescendant={`ag-o${sel}`}
            data-testid="palette-input"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => (s + 1) % Math.max(1, list.length));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => (s - 1 + list.length) % Math.max(1, list.length));
              } else if (e.key === "Enter") pick(list[sel]);
              else if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <ul id="ag-res" role="listbox">
          {list.slice(0, 40).map((a, i) => {
            const head = a.s !== last ? (last = a.s) : null;
            return (
              <li key={i} role="presentation">
                {head ? <div className="ag-sec">{head}</div> : null}
                <div
                  id={`ag-o${i}`}
                  role="option"
                  aria-selected={i === sel}
                  className={i === sel ? "sel" : ""}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => pick(a)}
                >
                  {a.t}
                  {a.k ? <kbd>{a.k}</kbd> : null}
                </div>
              </li>
            );
          })}
          {!list.length ? <li className="ag-sec">No match. Type a question to ask Sparkle.</li> : null}
        </ul>
        <div className="ag-pal-f">
          <kbd>↑↓</kbd> move <kbd>↵</kbd> open <kbd>Esc</kbd> close · <kbd>1–4</kbd> dock <kbd>M</kbd> more <kbd>/</kbd>{" "}
          search
        </div>
        <form id="ag-signout" action={signOut} hidden />
      </div>
    </div>
  );
}
