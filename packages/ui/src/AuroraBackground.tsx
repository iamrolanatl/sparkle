"use client";
import { motion } from "framer-motion";
import { useEffectsGuard } from "./hooks";

/** Subtle animated aurora. Static gradient when reduced-motion, save-data, or FPS < 30. */
export function AuroraBackground() {
  const animate = useEffectsGuard();
  return (
    <div aria-hidden className="spk-aurora spk-space" data-animated={animate}>
      {animate &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={`spk-aurora-blob spk-aurora-blob-${i}`}
            animate={{ x: ["-10%", "10%", "-10%"], y: ["-5%", "8%", "-5%"], opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 18 + i * 6, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
    </div>
  );
}
