"use client";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "./hooks";
import { isFinePointer, magneticOffset, tiltAngles } from "./motion";

/** Cursor-following glow: sets --spk-mx/--spk-my on the element; CSS draws the glow (.spk-cursor-glow). */
export function useCursorGlow<T extends HTMLElement>() {
  const reduced = usePrefersReducedMotion();
  const frame = useRef(0);
  const onPointerMove = useCallback(
    (e: PointerEvent<T>) => {
      if (reduced || !isFinePointer(e.pointerType)) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty("--spk-mx", `${x}px`);
        el.style.setProperty("--spk-my", `${y}px`);
      });
    },
    [reduced],
  );
  return { onPointerMove, className: reduced ? "" : "spk-cursor-glow" };
}

export function CursorGlow({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  const glow = useCursorGlow<HTMLDivElement>();
  return <div {...rest} className={`${glow.className} ${className}`.trim()} onPointerMove={glow.onPointerMove} />;
}

type MotionSafeButton = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
>;

/** Button that drifts up to 6 px toward the cursor. Off for touch and reduced motion. */
export function MagneticButton({ className = "", children, ...rest }: MotionSafeButton) {
  const reduced = usePrefersReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (reduced || !isFinePointer(e.pointerType)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const o = magneticOffset(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    x.set(o.x);
    y.set(o.y);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.button
      {...rest}
      className={`spk-magnetic ${className}`.trim()}
      style={reduced ? undefined : { x, y }}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      {children}
    </motion.button>
  );
}

type MotionSafeDiv = Omit<HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd">;

/** Card with a gentle (≤ 4°) 3-D tilt on hover. Off for touch and reduced motion. */
export function TiltCard({ className = "", children, ...rest }: MotionSafeDiv) {
  const reduced = usePrefersReducedMotion();
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || !isFinePointer(e.pointerType)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const a = tiltAngles(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    rx.set(a.rotateX);
    ry.set(a.rotateY);
  };
  const leave = () => {
    rx.set(0);
    ry.set(0);
  };
  return (
    <motion.div
      {...rest}
      className={`spk-tilt ${className}`.trim()}
      style={reduced ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      {children}
    </motion.div>
  );
}
