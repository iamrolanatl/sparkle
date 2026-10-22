"use client";
import { useEffect, useState } from "react";
import { averageFps, effectsAllowed } from "./fps";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function saveDataEnabled(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(c?.saveData);
}

/**
 * Samples frame rate for `sampleMs` and returns whether effects should stay on.
 * Once disabled for low FPS it stays off for the session (no flapping).
 */
export function useEffectsGuard(sampleMs = 2000): boolean {
  const reduced = usePrefersReducedMotion();
  const [fpsOk, setFpsOk] = useState(true);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let frames: number[] = [];
    let windowStart = performance.now();
    const tick = (t: number) => {
      frames.push(t);
      if (t - windowStart >= sampleMs) {
        const ok = effectsAllowed({
          prefersReducedMotion: false,
          saveData: saveDataEnabled(),
          measuredFps: averageFps(frames),
        });
        if (!ok) {
          setFpsOk(false);
          return;
        }
        frames = [t];
        windowStart = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, sampleMs]);
  return !reduced && fpsOk;
}
