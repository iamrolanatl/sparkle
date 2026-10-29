"use client";
import { useEffect } from "react";

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

export function Bot({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect x="14" y="6" width="5" height="12" rx="2" fill="#a78bfa" />
      <circle cx="16.5" cy="6" r="4" fill="#2dd4bf" />
      <rect x="2" y="24" width="8" height="18" rx="4" fill="#2dd4bf" />
      <rect x="54" y="24" width="8" height="18" rx="4" fill="#a78bfa" />
      <rect x="8" y="14" width="48" height="42" rx="18" fill="#fff" stroke="#d9d9e0" />
      <rect x="14" y="22" width="36" height="20" rx="10" fill="#15151c" />
      <circle cx="24" cy="32" r="4" fill="#38bdf8" />
      <circle cx="40" cy="32" r="4" fill="#38bdf8" />
      <circle cx="17" cy="48" r="3" fill="#f9a8d4" />
      <circle cx="47" cy="48" r="3" fill="#f9a8d4" />
    </svg>
  );
}
