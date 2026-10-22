"use client";
import type { ReactNode } from "react";
import { useCursorGlow, TiltCard } from "./interactive";

export interface AppletCardProps {
  title: string;
  icon?: ReactNode;
  badge?: string;
  children?: ReactNode;
  className?: string;
}

/** Modular "applet" card (DEC-79): neon glass edge, window dots, cursor glow and a gentle tilt on hover. */
export function AppletCard({ title, icon, badge, children, className = "" }: AppletCardProps) {
  const glow = useCursorGlow<HTMLDivElement>();
  return (
    <TiltCard className="h-full">
      <div
        className={`spk-glass-edge spk-applet-card ${glow.className} ${className}`.trim()}
        onPointerMove={glow.onPointerMove}
      >
        <div className="flex items-center justify-between">
          <span className="spk-applet-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {badge ? (
            <span className="rounded-full border border-violet-300/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-200">
              {badge}
            </span>
          ) : null}
        </div>
        {icon ? (
          <span aria-hidden="true" className="spk-icon-orb text-neon mt-4 text-lg">
            {icon}
          </span>
        ) : null}
        <h3 className="mt-3 font-semibold">{title}</h3>
        {children ? <div className="text-muted mt-2 text-sm">{children}</div> : null}
      </div>
    </TiltCard>
  );
}
