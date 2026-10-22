"use client";
import { useState } from "react";

/** Seamless star-sparkle background (loop is crossfaded in genbg.py so the rewind is invisible). */
export function SparkleBg() {
  return (
    <>
      <video
        className="bgv"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/media/bg/bg-poster.jpg"
        aria-hidden="true"
      >
        <source src="/media/bg/bg.webm" type="video/webm" />
        <source src="/media/bg/bg.mp4" type="video/mp4" />
      </video>
      <img className="bgp" src="/media/bg/bg-poster.jpg" alt="" aria-hidden="true" />
    </>
  );
}

/** Light is the default; the choice is saved in localStorage and a cookie (so the server renders it with no flash). */
export function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [t, setT] = useState(initial);
  const apply = (n: "light" | "dark") => {
    setT(n);
    document.querySelector(".sa")?.setAttribute("data-theme", n);
    try {
      localStorage.setItem("sparkle-theme", n);
    } catch {}
    document.cookie = `sparkle-theme=${n}; path=/; max-age=31536000; samesite=lax`;
  };
  const flip = () => apply(t === "dark" ? "light" : "dark");
  return (
    <button type="button" className="ghost tgl" onClick={flip} aria-pressed={t === "dark"} data-testid="theme-toggle">
      {t === "dark" ? "☀ Light" : "◐ Dark"}
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
