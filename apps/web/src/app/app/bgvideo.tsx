"use client";
import { useEffect, useRef } from "react";

/**
 * Galaxy fly-through background. The poster (8 KB WebP) paints instantly; the video is attached only
 * after the page has loaded and the browser is idle, and never when the user prefers reduced motion,
 * has Save-Data on, or has switched Motion off. The loop is mathematically periodic (see
 * apps/web/scripts/genbg-galaxy.py), so the restart is invisible.
 */
const SOURCES: [string, string][] = [
  ["/media/bg/bg.webm", "video/webm"],
  ["/media/bg/bg.mp4", "video/mp4"],
];

export function SparkleBg() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const sa = document.querySelector(".sa");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const allowed = () => !rm.matches && !saveData && sa?.getAttribute("data-motion") !== "off";
    let loaded = false;
    const sync = () => {
      if (allowed()) {
        if (!loaded) {
          loaded = true;
          for (const [src, type] of SOURCES) {
            const s = document.createElement("source");
            s.src = src;
            s.type = type;
            v.appendChild(s);
          }
          v.load();
        }
        v.play().catch(() => {});
      } else if (loaded) v.pause();
    };
    const onPlaying = () => v.classList.add("on");
    v.addEventListener("playing", onPlaying);
    let idle = 0;
    const start = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback;
      idle = ric ? ric(sync, { timeout: 2000 }) : window.setTimeout(sync, 300);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    rm.addEventListener("change", sync);
    const mo = sa ? new MutationObserver(sync) : null;
    if (sa && mo) mo.observe(sa, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(idle);
      rm.removeEventListener("change", sync);
      mo?.disconnect();
      v.removeEventListener("playing", onPlaying);
    };
  }, []);
  return (
    <>
      <img
        className="bgp"
        src="/media/bg/bg-poster.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="low"
      />
      <video
        ref={ref}
        className="bgv"
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        data-testid="bg-video"
      />
    </>
  );
}
