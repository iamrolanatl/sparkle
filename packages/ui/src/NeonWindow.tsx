import type { HTMLAttributes } from "react";

export interface NeonWindowProps extends HTMLAttributes<HTMLDivElement> {
  /** Accessible title shown in the window header (optional). */
  title?: string;
}

/** Subtle glowing neon glass "window": frosted pane with a soft animated border glow (CSS only). */
export function NeonWindow({ title, className = "", children, ...rest }: NeonWindowProps) {
  return (
    <div className={`spk-glass spk-glass-edge spk-neon-window ${className}`.trim()} {...rest}>
      {title ? <div className="spk-neon-window-title">{title}</div> : null}
      {children}
    </div>
  );
}
