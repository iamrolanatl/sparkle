"use client";
import Link from "@/components/IntentLink";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MAIN, MORE } from "./links";

const MKEY = "sparkle-motion";
const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.querySelector(".sa")?.getAttribute("data-motion") === "off";

/** One set of global listeners: magnetic buttons (.mag), 3D tilt (.tilt), parallax ([data-par]). */
export function Fx() {
  useEffect(() => {
    try {
      if (localStorage.getItem(MKEY) === "off") document.querySelector(".sa")?.setAttribute("data-motion", "off");
    } catch {}
    let raf = 0;
    let mraf = 0;
    let last: PointerEvent | null = null;
    const fine = window.matchMedia("(pointer: fine)").matches;
    // Resting (untransformed) centers of magnetic buttons, cached; invalidated on scroll/resize/DOM change.
    let mags: { m: HTMLElement; cx: number; cy: number; hw: number; hh: number }[] | null = null;
    const measure = () =>
      (mags = [...document.querySelectorAll<HTMLElement>(".mag")].map((m) => {
        const r = m.getBoundingClientRect();
        const ox = Number(m.dataset.mx ?? 0);
        const oy = Number(m.dataset.my ?? 0);
        return { m, cx: r.left - ox + r.width / 2, cy: r.top - oy + r.height / 2, hw: r.width / 2, hh: r.height / 2 };
      }));
    const invalidate = () => (mags = null);
    const mo = new MutationObserver(invalidate);
    mo.observe(document.body, { childList: true, subtree: true });
    // One rAF per frame for tilt + magnet: all reads first, then writes (no layout thrash).
    const frame = () => {
      mraf = 0;
      const e = last;
      if (!e || reduced()) return;
      const list = mags ?? measure();
      const t = e.target as HTMLElement | null;
      const c = t?.closest?.(".tilt") as HTMLElement | null;
      const cr = c && !c.classList.contains("max") ? c.getBoundingClientRect() : null;
      for (const { m, cx, cy, hw, hh } of list) {
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const near = Math.abs(dx) < hw + 36 && Math.abs(dy) < hh + 36;
        const tx = near ? dx * 0.22 : 0;
        const ty = near ? dy * 0.3 : 0;
        if (tx === Number(m.dataset.mx ?? 0) && ty === Number(m.dataset.my ?? 0)) continue;
        m.dataset.mx = String(tx);
        m.dataset.my = String(ty);
        m.style.transform = near ? `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)` : "";
      }
      document.querySelectorAll<HTMLElement>(".tilt[data-on]").forEach((b) => {
        if (b !== c) {
          b.style.transform = "";
          b.removeAttribute("data-on");
        }
      });
      if (c && cr) {
        const x = (e.clientX - cr.left) / cr.width - 0.5;
        const y = (e.clientY - cr.top) / cr.height - 0.5;
        c.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateZ(0)`;
        c.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(0)}%`);
        c.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(0)}%`);
        c.setAttribute("data-on", "");
      }
    };
    const move = (e: PointerEvent) => {
      if (!fine) return;
      last = e;
      if (!mraf) mraf = requestAnimationFrame(frame);
    };
    const hide = () => document.querySelector(".sa")?.toggleAttribute("data-hidden", document.hidden);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("resize", invalidate, { passive: true });
    const scroll = () => {
      cancelAnimationFrame(raf);
      invalidate();
      raf = requestAnimationFrame(() => {
        const off = reduced();
        const y = window.scrollY;
        document.querySelectorAll<HTMLElement>("[data-par]").forEach((el) => {
          el.style.transform = off ? "" : `translate3d(0, ${(y * Number(el.dataset.par)).toFixed(1)}px, 0)`;
        });
        document.querySelector(".sa")?.toggleAttribute("data-scrolled", y > 8);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    scroll();
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", invalidate);
      document.removeEventListener("visibilitychange", hide);
      mo.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mraf);
    };
  }, []);
  return null;
}

function Toggle({ label, on, set, id }: { label: string; on: boolean; set: (v: boolean) => void; id: string }) {
  return (
    <label className="sw" data-testid={id}>
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

/** Hamburger menu: full nav + toggles. Used on mobile and as compact nav on desktop. */
export function Hamburger({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [motion, setMotion] = useState(true);
  const path = usePathname();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const setTheme = (v: boolean) => {
    setDark(v);
    const want = v ? "dark" : "light";
    if (document.querySelector(".sa")?.getAttribute("data-theme") !== want)
      (document.querySelector('[data-testid="theme-toggle"]') as HTMLButtonElement | null)?.click();
  };
  const setMo = (v: boolean) => {
    setMotion(v);
    const sa = document.querySelector(".sa");
    if (v) sa?.removeAttribute("data-motion");
    else sa?.setAttribute("data-motion", "off");
    try {
      localStorage.setItem(MKEY, v ? "on" : "off");
    } catch {}
    document.querySelectorAll<HTMLElement>(".tilt,.mag,[data-par]").forEach((el) => (el.style.transform = ""));
  };
  const links = [...MAIN, ...MORE, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])];
  return (
    <>
      <button
        type="button"
        className={`burger ${open ? "x" : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        data-testid="burger"
        onClick={() => {
          const sa = document.querySelector(".sa");
          setDark(sa?.getAttribute("data-theme") === "dark");
          setMotion(sa?.getAttribute("data-motion") !== "off");
          setOpen((o) => !o);
        }}
      >
        <i />
        <i />
        <i />
      </button>
      {open ? (
        <div className="drawer-wrap" onClick={() => setOpen(false)}>
          <nav className="drawer" aria-label="Menu" data-testid="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dh">
              Menu <span aria-hidden="true">✦</span>
            </div>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={path?.startsWith(l.href) ? "on" : ""}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="dh" style={{ marginTop: 14 }}>
              Settings
            </div>
            <Toggle id="tg-dark" label="Dark mode" on={dark} set={setTheme} />
            <Toggle id="tg-motion" label="Motion & 3D effects" on={motion} set={setMo} />
          </nav>
        </div>
      ) : null}
    </>
  );
}
