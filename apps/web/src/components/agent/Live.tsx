"use client";
import { useEffect, useState } from "react";

/** Redaction bar: hidden until tapped/clicked/Enter, then "declassified". */
export function Redact({ children, label = "Reveal" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className="ag-redact"
      data-open={open ? "" : undefined}
      aria-label={open ? undefined : label}
      aria-pressed={open}
      onClick={() => setOpen((o) => !o)}
      data-testid="redact"
    >
      {children}
    </button>
  );
}

/** Mission countdown: "T-1d 04h" style, refreshes each minute. */
export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    const i = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, []);
  if (now == null) return <span className="ag-count">T-—</span>;
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className="ag-count">OVERDUE</span>;
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  return (
    <span className="ag-count" data-testid="countdown">
      T-{d ? `${d}d ` : ""}
      {String(h).padStart(2, "0")}h {String(mm).padStart(2, "0")}m
    </span>
  );
}
