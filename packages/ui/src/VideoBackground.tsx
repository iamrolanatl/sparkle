"use client";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./hooks";
import { crossfadeStart, isLowPower, shouldUsePoster } from "./motion";

export interface VideoBackgroundProps {
  /** AV1 MP4/WebM source (preferred). */
  av1Src?: string;
  /** H.264 MP4 fallback source (required). */
  h264Src: string;
  /** Poster image; also the full fallback on Save-Data / low power / reduced motion / low FPS. */
  poster: string;
  /** Crossfade length in seconds (default 0.8). */
  fade?: number;
  className?: string;
}

type Nav = Navigator & {
  connection?: { saveData?: boolean };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
};

/**
 * Seamless looping background video (CR-0008): two <video> elements crossfade before the end so the
 * loop rewind is never visible. Muted + playsInline, lazy (preload none until visible), pauses when
 * off-screen or the tab is hidden, and falls back to the poster when motion/data/power should be saved.
 */
export function VideoBackground({ av1Src, h264Src, poster, fade = 0.8, className = "" }: VideoBackgroundProps) {
  const reduced = usePrefersReducedMotion();
  const [posterOnly, setPosterOnly] = useState(true); // SSR + first paint: poster only (fast LCP)
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const vids = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];

  // Decide poster vs video.
  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Nav;
    const decide = (lowPower: boolean) => {
      if (!cancelled)
        setPosterOnly(
          shouldUsePoster({ prefersReducedMotion: reduced, saveData: !!nav.connection?.saveData, lowPower }),
        );
    };
    decide(false);
    nav
      .getBattery?.()
      .then((b) => decide(isLowPower(b)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reduced]);

  // Lazy: only load/play when on screen.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play/pause on visibility and tab state.
  useEffect(() => {
    if (posterOnly) return;
    const sync = () => {
      const cur = vids[active]?.current;
      if (!cur) return;
      if (visible && document.visibilityState === "visible") cur.play().catch(() => setPosterOnly(true));
      else vids.forEach((v) => v.current?.pause());
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, posterOnly, active]);

  // Crossfade before the end.
  const onTime = (i: number) => () => {
    const v = vids[i]?.current;
    if (!v || i !== active) return;
    if (v.currentTime >= crossfadeStart(v.duration, fade)) {
      const next = vids[1 - i]?.current;
      if (!next) return;
      next.currentTime = 0;
      next.play().catch(() => {});
      setActive(1 - i);
      window.setTimeout(() => v.pause(), fade * 1000 + 50);
    }
  };

  return (
    <div ref={wrap} className={`spk-video-bg ${className}`.trim()} aria-hidden="true">
      <img src={poster} alt="" className="spk-video-layer" style={{ opacity: 1 }} decoding="async" />
      {!posterOnly && visible
        ? [0, 1].map((i) => (
            <video
              key={i}
              ref={vids[i]}
              className="spk-video-layer"
              style={{ opacity: i === active ? 1 : 0, transition: `opacity ${fade}s linear` }}
              muted
              playsInline
              preload={i === 0 ? "auto" : "metadata"}
              poster={poster}
              onTimeUpdate={onTime(i)}
              onError={() => setPosterOnly(true)}
              disablePictureInPicture
            >
              {av1Src ? <source src={av1Src} type='video/mp4; codecs="av01.0.05M.08"' /> : null}
              <source src={h264Src} type="video/mp4" />
            </video>
          ))
        : null}
    </div>
  );
}
