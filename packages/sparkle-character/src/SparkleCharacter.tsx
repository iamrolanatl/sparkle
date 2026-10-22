"use client";
import { motion, useReducedMotion } from "framer-motion";
import { POSES, type SparkleState } from "./states";

export interface SparkleCharacterProps {
  state?: SparkleState;
  size?: number;
  /**
   * Rive integration point. When the production .riv asset exists, pass a renderer
   * (e.g. built on @rive-app/react-canvas using RIVE_CONTRACT). Placeholder SVG is used otherwise.
   */
  riveRenderer?: (props: { state: SparkleState; size: number }) => React.ReactNode;
}

const EYES = { open: 5, wide: 7, half: 2.5, focus: 4 } as const;

/** Placeholder full-body Sparkle robot (head, torso, arms, legs). */
export function SparkleCharacter({ state = "idle", size = 160, riveRenderer }: SparkleCharacterProps) {
  const reduce = useReducedMotion();
  if (riveRenderer) return <>{riveRenderer({ state, size })}</>;
  const p = POSES[state];
  const eyeR = EYES[p.eye];
  const mouth = {
    smile: "M42 52 Q50 58 58 52",
    grin: "M40 50 Q50 62 60 50 Z",
    flat: "M43 54 L57 54",
    open: "M45 52 Q50 58 55 52 Q50 55 45 52",
  }[p.mouth];
  return (
    <motion.svg
      role="img"
      aria-label={p.label}
      data-state={state}
      width={size}
      height={size * 1.6}
      viewBox="0 0 100 160"
      animate={reduce ? undefined : { y: [0, -p.bob, 0] }}
      transition={{ duration: state === "excited" ? 0.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="spk-body" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e0f7fa" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      <line x1="50" y1="14" x2="50" y2="22" stroke="#22d3ee" strokeWidth="2" />
      <circle cx="50" cy="12" r="3" fill="#22d3ee" />
      <rect x="25" y="22" width="50" height="42" rx="16" fill="url(#spk-body)" stroke="#22d3ee" strokeWidth="1.5" />
      <rect x="32" y="32" width="36" height="24" rx="10" fill="#0b1220" />
      <ellipse cx="42" cy="42" rx="4" ry={eyeR} fill="#22d3ee" />
      <ellipse cx="58" cy="42" rx="4" ry={eyeR} fill="#22d3ee" />
      <path
        d={mouth}
        stroke="#2dd4bf"
        strokeWidth="2"
        fill={p.mouth === "grin" ? "#2dd4bf" : "none"}
        strokeLinecap="round"
      />
      <rect x="30" y="68" width="40" height="44" rx="12" fill="url(#spk-body)" stroke="#22d3ee" strokeWidth="1.5" />
      <circle cx="50" cy="88" r="5" fill="#22d3ee" opacity={state === "helping" ? 1 : 0.6} />
      <g transform={`rotate(${p.armL} 30 74)`}>
        <rect x="16" y="72" width="14" height="6" rx="3" fill="#7dd3fc" />
      </g>
      <g transform={`rotate(${p.armR} 70 74)`}>
        <rect x="70" y="72" width="14" height="6" rx="3" fill="#7dd3fc" />
      </g>
      <rect x="36" y="112" width="9" height="30" rx="4" fill="#7dd3fc" />
      <rect x="55" y="112" width="9" height="30" rx="4" fill="#7dd3fc" />
      <rect x="32" y="140" width="15" height="7" rx="3" fill="#22d3ee" />
      <rect x="53" y="140" width="15" height="7" rx="3" fill="#22d3ee" />
    </motion.svg>
  );
}
