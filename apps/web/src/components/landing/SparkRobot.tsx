"use client";
import { useEffect, useRef } from "react";

/** "Spark" robot from the approved dark mockup (DEC-dark-theme). Eyes follow the pointer, blink, float,
 * head tilt, hover squint and click bounce. Honors prefers-reduced-motion (no float/bounce/blink). */
export function SparkRobot() {
  const cardRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const svg = svgRef.current;
    if (!card || !svg) return;
    const q = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
    const qa = (sel: string) => Array.from(svg.querySelectorAll<SVGElement>(sel));
    const head = q<SVGGElement>('[data-r="head"]');
    const all = q<SVGGElement>('[data-r="all"]');
    const eyes = q<SVGGElement>('[data-r="eyes"]');
    const shadow = q<SVGEllipseElement>('[data-r="shadow"]');
    const armL = q<SVGRectElement>('[data-r="armL"]');
    const armR = q<SVGRectElement>('[data-r="armR"]');
    const squints = qa('[data-r="squint"]');
    const ballGlow = q<SVGCircleElement>('[data-r="ballGlow"]');
    const smile = q<SVGPathElement>('[data-r="smile"]');
    const balls = qa(".spk-ball");
    const hls = qa(".spk-hl");

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rm = mq.matches;
    const onMq = () => (rm = mq.matches);
    mq.addEventListener("change", onMq);

    let mx = 0,
      my = 0,
      cx = 0,
      cy = 0,
      hover = false,
      wave = 0,
      raf = 0;
    let blinkT: number | undefined;
    const t0 = performance.now();

    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      mx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width));
      my = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.4)) / r.height));
    };
    const setSquint = (v: number) => {
      squints.forEach((s) => (s.style.opacity = String(v)));
      eyes.style.opacity = String(1 - v);
      ballGlow.setAttribute("opacity", v ? "0.7" : "0.35");
      smile.setAttribute("d", v ? "M182 184 Q200 202 218 184" : "M186 186 Q200 197 214 186");
    };
    const onEnter = () => {
      hover = true;
      setSquint(1);
    };
    const onLeave = () => {
      hover = false;
      setSquint(0);
    };
    const onClick = () => {
      wave = performance.now();
    };

    const blink = () => {
      if (!hover && !rm) {
        balls.forEach((b) => b.setAttribute("ry", "2"));
        hls.forEach((h) => (h.style.opacity = "0"));
        window.setTimeout(() => {
          balls.forEach((b) => b.setAttribute("ry", "19"));
          hls.forEach((h) => (h.style.opacity = ""));
        }, 120);
      }
      blinkT = window.setTimeout(blink, 2500 + Math.random() * 3500);
    };
    blinkT = window.setTimeout(blink, 2000);

    const loop = (now: number) => {
      cx += (mx - cx) * 0.08;
      cy += (my - cy) * 0.08;
      const t = (now - t0) / 1000;
      const bob = rm ? 0 : Math.sin(t * 1.6) * 6;
      let jump = 0,
        arm = 0;
      const w = (now - wave) / 1000;
      if (wave && w < 1) {
        jump = rm ? 0 : -Math.sin(w * Math.PI) * 18;
        arm = Math.sin(w * Math.PI * 4) * 35;
      }
      all.setAttribute("transform", `translate(0 ${bob + jump})`);
      head.setAttribute("transform", `translate(${cx * 6} ${cy * 4}) rotate(${cx * 8} 200 160)`);
      eyes.setAttribute("transform", `translate(${cx * 9} ${cy * 7})`);
      armR.style.transform = `rotate(${-arm}deg)`;
      armL.style.transform = `rotate(${arm * 0.4}deg)`;
      shadow.setAttribute("rx", String(70 + (bob + jump) * 1.2));
      shadow.style.opacity = hover ? "1" : "0.8";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("pointermove", onMove, { passive: true });
    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointerleave", onLeave);
    card.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(blinkT);
      mq.removeEventListener("change", onMq);
      window.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      card.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <button ref={cardRef} type="button" className="spk-bot-card" aria-label="Spark, your study buddy. Click to say hi.">
      <svg ref={svgRef} className="spk-bot" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="sb-white" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".6" stopColor="#eef1f6" />
            <stop offset="1" stopColor="#c9d0db" />
          </linearGradient>
          <linearGradient id="sb-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7ff3e6" />
            <stop offset=".5" stopColor="#ffffff" stopOpacity=".2" />
            <stop offset="1" stopColor="#ff8fd8" />
          </linearGradient>
          <radialGradient id="sb-visor" cx=".45" cy=".3" r=".9">
            <stop offset="0" stopColor="#1b2540" />
            <stop offset=".7" stopColor="#0a0f1e" />
            <stop offset="1" stopColor="#05070e" />
          </radialGradient>
          <radialGradient id="sb-eye" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#bfe9ff" />
            <stop offset=".35" stopColor="#3aa9ff" />
            <stop offset=".8" stopColor="#1665e8" />
            <stop offset="1" stopColor="#0b3aa8" />
          </radialGradient>
          <radialGradient id="sb-eglow">
            <stop offset="0" stopColor="#3aa9ff" stopOpacity=".7" />
            <stop offset="1" stopColor="#3aa9ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sb-teal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2fd6b5" />
            <stop offset="1" stopColor="#7ff3dd" />
          </linearGradient>
          <linearGradient id="sb-purp" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b88cff" />
            <stop offset="1" stopColor="#7d55e6" />
          </linearGradient>
          <radialGradient id="sb-mint" cx=".35" cy=".35">
            <stop offset="0" stopColor="#eafff6" />
            <stop offset=".5" stopColor="#7ff0c4" />
            <stop offset="1" stopColor="#2fbf8f" />
          </radialGradient>
          <radialGradient id="sb-shad">
            <stop offset="0" stopColor="#2fe0c0" stopOpacity=".55" />
            <stop offset="1" stopColor="#2fe0c0" stopOpacity="0" />
          </radialGradient>
          <filter id="sb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="sb-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity=".45" />
          </filter>
          <clipPath id="sb-vclip">
            <rect x="122" y="104" width="156" height="98" rx="44" />
          </clipPath>
        </defs>
        <ellipse data-r="shadow" className="spk-fb" cx="200" cy="352" rx="70" ry="10" fill="url(#sb-shad)" />
        <g data-r="all">
          <g>
            <rect
              data-r="armL"
              className="spk-fb"
              x="110"
              y="262"
              width="26"
              height="54"
              rx="13"
              fill="url(#sb-white)"
              stroke="url(#sb-rim)"
              strokeWidth="1.5"
              filter="url(#sb-soft)"
            />
            <rect
              data-r="armR"
              className="spk-fb"
              x="264"
              y="262"
              width="26"
              height="54"
              rx="13"
              fill="url(#sb-white)"
              stroke="url(#sb-rim)"
              strokeWidth="1.5"
              filter="url(#sb-soft)"
            />
            <rect
              x="144"
              y="252"
              width="112"
              height="76"
              rx="34"
              fill="url(#sb-white)"
              stroke="url(#sb-rim)"
              strokeWidth="1.5"
              filter="url(#sb-soft)"
            />
            <ellipse cx="180" cy="266" rx="24" ry="6" fill="#fff" opacity=".8" />
            <circle cx="200" cy="290" r="17" fill="#0d1424" />
            <circle cx="200" cy="290" r="11" fill="none" stroke="#2fd6c5" strokeWidth="3" opacity=".9" />
            <circle cx="200" cy="290" r="5" fill="#0a0f1a" />
          </g>
          <g data-r="head">
            <line x1="200" y1="70" x2="200" y2="48" stroke="#c9d0db" strokeWidth="4" strokeLinecap="round" />
            <circle data-r="ballGlow" cx="200" cy="44" r="14" fill="#7ff0c4" opacity=".35" filter="url(#sb-glow)" />
            <circle cx="200" cy="44" r="9" fill="url(#sb-mint)" />
            <rect x="84" y="128" width="22" height="54" rx="8" fill="url(#sb-teal)" />
            <rect x="294" y="128" width="22" height="54" rx="8" fill="url(#sb-purp)" />
            <rect
              x="100"
              y="70"
              width="200"
              height="164"
              rx="58"
              fill="url(#sb-white)"
              stroke="url(#sb-rim)"
              strokeWidth="3"
              filter="url(#sb-soft)"
            />
            <path
              d="M140 82 Q200 72 262 84"
              stroke="#fff"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              opacity=".9"
            />
            <rect x="122" y="104" width="156" height="98" rx="44" fill="url(#sb-visor)" />
            <g clipPath="url(#sb-vclip)">
              <path d="M130 120 Q160 100 220 106 L150 150 Z" fill="#fff" opacity=".06" />
              <g data-r="eyes">
                {[166, 234].map((x) => (
                  <g key={x}>
                    <circle cx={x} cy="148" r="26" fill="url(#sb-eglow)" />
                    <ellipse className="spk-ball" cx={x} cy="148" rx="19" ry="19" fill="url(#sb-eye)" />
                    <circle className="spk-hl" cx={x - 7} cy="140" r="6" fill="#fff" opacity=".95" />
                    <circle className="spk-hl" cx={x + 7} cy="155" r="2.5" fill="#fff" opacity=".7" />
                  </g>
                ))}
              </g>
              <path
                data-r="squint"
                d="M150 152 Q166 134 182 152"
                stroke="#5cc0ff"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                opacity="0"
              />
              <path
                data-r="squint"
                d="M218 152 Q234 134 250 152"
                stroke="#5cc0ff"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                opacity="0"
              />
            </g>
            <ellipse cx="140" cy="210" rx="13" ry="7" fill="#ff8fb8" opacity=".75" />
            <ellipse cx="260" cy="210" rx="13" ry="7" fill="#ff8fb8" opacity=".75" />
            <path
              data-r="smile"
              d="M186 186 Q200 197 214 186"
              stroke="#5ef0e0"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>
      </svg>
      <span className="spk-bot-tag">
        <b>Spark</b> · your study buddy
      </span>
    </button>
  );
}
