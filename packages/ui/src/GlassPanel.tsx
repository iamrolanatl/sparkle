import type { HTMLAttributes } from "react";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the neon glow border. */
  glow?: boolean;
}

/** Frosted glass pane with a subtle neon border. */
export function GlassPanel({ glow, className = "", ...rest }: GlassPanelProps) {
  return <div className={`spk-glass ${glow ? "spk-glow" : ""} ${className}`.trim()} {...rest} />;
}
