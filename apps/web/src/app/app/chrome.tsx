"use client";
import { useEffect } from "react";
import { Pigeon, type Pose } from "@/components/agent/Pigeon";

export { SparkleBg } from "./bgvideo";

const KEY = "sparkle-theme";
type Theme = "light" | "dark";
function save(n: Theme) {
  document.querySelector(".sa")?.setAttribute("data-theme", n);
  try {
    localStorage.setItem(KEY, n);
  } catch {}
  document.cookie = `${KEY}=${n}; path=/; max-age=31536000; samesite=lax; secure`;
}

/**
 * Light is the default. The choice lives in a cookie (server renders it, no flash) and localStorage.
 * On load they are reconciled: a saved cookie wins and is mirrored to localStorage; if the cookie was
 * cleared but localStorage still has a choice, that choice is restored and the cookie is rewritten.
 * The label is driven by CSS from [data-theme], so no React state can drift from the DOM.
 */
export function ThemeToggle({ initial, hasCookie }: { initial: Theme; hasCookie: boolean }) {
  useEffect(() => {
    let ls: string | null = null;
    try {
      ls = localStorage.getItem(KEY);
    } catch {}
    if (hasCookie) {
      if (ls !== initial) save(initial);
    } else if (ls === "light" || ls === "dark") save(ls);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && (e.newValue === "light" || e.newValue === "dark")) save(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [initial, hasCookie]);
  const flip = () => {
    const cur = document.querySelector(".sa")?.getAttribute("data-theme");
    save(cur === "dark" ? "light" : "dark");
  };
  return (
    <button type="button" className="ghost tgl" onClick={flip} data-testid="theme-toggle" aria-label="Toggle dark mode">
      <span className="tl-dark">◐ Dark</span>
      <span className="tl-light">☀ Light</span>
    </button>
  );
}

/** Small sparkle burst from a checkbox when a task is completed. */
export function burst(el: HTMLElement | null) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let n = 0; n < 6; n++) {
    const b = document.createElement("span");
    b.className = "burst";
    b.textContent = "✦";
    const a = (n * Math.PI) / 3;
    b.style.setProperty("--dx", `${Math.cos(a) * 18}px`);
    b.style.setProperty("--dy", `${Math.sin(a) * 18}px`);
    el.appendChild(b);
    setTimeout(() => b.remove(), 900);
  }
}

/** Legacy name kept for existing imports: Sparkle is now the agent pigeon. */
export function Bot({ size = 30, pose }: { size?: number; pose?: Pose }) {
  return <Pigeon size={size} pose={pose} />;
}
