"use client";
import { useEffect, useRef } from "react";

/** Space-battle backdrop for the Bridge hero. Canvas only; pauses offscreen / hidden tab; static frame when motion is off. */
export default function Battle() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const x = cv?.getContext("2d");
    if (!cv || !x) return;
    const still = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.querySelector(".sa")?.getAttribute("data-motion") === "off";
    const dpr = Math.min(2, devicePixelRatio || 1);
    let W = 0,
      H = 0,
      raf = 0,
      vis = true,
      t = 0;
    const rs = () => {
      W = cv.width = cv.offsetWidth * dpr;
      H = cv.height = cv.offsetHeight * dpr;
    };
    rs();
    const st = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() }));
    const sh = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random(),
      y: 0.15 + Math.random() * 0.55,
      s: 0.6 + Math.random(),
      v: 0.0004 + Math.random() * 0.0008,
      f: i % 3 ? 0 : 1,
    }));
    let bolts: { x: number; y: number; tx: number; ty: number; k: number; c: string }[] = [];
    const ship = (px: number, py: number, s: number, f: number) => {
      x.save();
      x.translate(px, py);
      x.scale(s * dpr, s * dpr);
      x.fillStyle = f ? "#2a0f0c" : "#0f1e12";
      x.strokeStyle = f ? "#ff4a3d" : "#5dff8a";
      x.lineWidth = 1;
      x.beginPath();
      if (f) {
        x.moveTo(-14, 0);
        x.lineTo(10, -7);
        x.lineTo(6, 0);
        x.lineTo(10, 7);
      } else {
        x.moveTo(16, 0);
        x.lineTo(-10, -8);
        x.lineTo(-6, 0);
        x.lineTo(-10, 8);
      }
      x.closePath();
      x.fill();
      x.stroke();
      x.fillStyle = "#ffb000";
      x.fillRect(f ? 8 : -13, -1.5, 4, 3);
      x.restore();
    };
    const frame = (move: boolean) => {
      t++;
      x.fillStyle = "#000";
      x.fillRect(0, 0, W, H);
      const g = x.createRadialGradient(W * 0.85, H * 0.3, 0, W * 0.85, H * 0.3, H * 0.9);
      g.addColorStop(0, "#3a2200");
      g.addColorStop(0.4, "#100a00");
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      x.fillStyle = "#1a1208";
      x.beginPath();
      x.arc(W * 0.85, H * 1.1, H * 0.6, 0, 7);
      x.fill();
      x.strokeStyle = "rgba(255,176,0,.33)";
      x.lineWidth = 2;
      x.stroke();
      for (const s of st) {
        if (move) s.x = (s.x - s.z * 0.0006 + 1) % 1;
        x.fillStyle = `rgba(243,234,216,${0.3 + s.z * 0.7})`;
        x.fillRect(s.x * W, s.y * H, s.z * 2 + 0.5, s.z * 2 + 0.5);
      }
      for (const s of sh) {
        if (move) {
          s.x += s.f ? -s.v : s.v;
          if (s.x > 1.1) s.x = -0.1;
          if (s.x < -0.1) s.x = 1.1;
          if (Math.random() < 0.008) {
            const o = sh.find((q) => q.f !== s.f);
            if (o)
              bolts.push({ x: s.x * W, y: s.y * H, tx: o.x * W, ty: o.y * H, k: 0, c: s.f ? "#ff4a3d" : "#5dff8a" });
          }
        }
        ship(s.x * W, s.y * H + Math.sin(t / 40 + s.s * 9) * 4, s.s, s.f);
      }
      bolts = bolts.filter((b) => (b.k += 0.04) < 1);
      for (const b of bolts) {
        x.strokeStyle = b.c;
        x.lineWidth = 2 * dpr;
        x.beginPath();
        const px = b.x + (b.tx - b.x) * b.k,
          py = b.y + (b.ty - b.y) * b.k;
        x.moveTo(px, py);
        x.lineTo(px - (b.tx - b.x) * 0.08, py - (b.ty - b.y) * 0.08);
        x.stroke();
      }
    };
    const loop = () => {
      cancelAnimationFrame(raf);
      if (still() || !vis || document.hidden) return frame(false);
      frame(true);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      vis = !!e?.isIntersecting;
      loop();
    });
    io.observe(cv);
    const wake = () => loop();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("sparkle-prefs", wake);
    const onRs = () => {
      rs();
      frame(false);
    };
    window.addEventListener("resize", onRs);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("sparkle-prefs", wake);
      window.removeEventListener("resize", onRs);
    };
  }, []);
  return <canvas ref={ref} className="sh-battle" aria-hidden="true" data-testid="battle" />;
}
