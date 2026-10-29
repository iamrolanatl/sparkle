/**
 * Sparkle — the secret-service pigeon. Pure inline SVG (no hooks), so it renders on the server and
 * in client components alike. Poses and motion are CSS-only (see pigeon.css) and switch off with
 * prefers-reduced-motion or the app's Motion toggle.
 */
export type Pose = "idle" | "celebrate" | "worried" | "sleepy" | "listening" | "thinking" | "flying" | "scan";

export function Pigeon({
  pose = "idle",
  size = 64,
  quip,
  className = "",
  label = "Sparkle, the agent pigeon",
}: {
  pose?: Pose;
  size?: number;
  quip?: string;
  className?: string;
  label?: string;
}) {
  const id = `pg-${pose}`;
  return (
    <span className={`pgn pg-${pose} ${className}`} data-pose={pose} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c9c6c0" />
            <stop offset="1" stopColor="#7f7b75" />
          </linearGradient>
          <linearGradient id={`${id}-n`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e8c477" />
            <stop offset=".55" stopColor="#a3b98c" />
            <stop offset="1" stopColor="#d9a094" />
          </linearGradient>
        </defs>
        <ellipse className="pg-shadow" cx="60" cy="113" rx="26" ry="3.5" fill="#000" opacity=".14" />
        <g className="pg-halo" fill="#5dffa5" opacity=".85">
          <text x="10" y="22" fontSize="11">
            A+
          </text>
          <rect x="96" y="12" width="12" height="11" rx="2" fill="none" stroke="#5dffa5" strokeWidth="1.6" />
          <path d="M98 16h8" stroke="#5dffa5" strokeWidth="1.4" />
          <path d="M14 50l3 3 6-7" fill="none" stroke="#5dffa5" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="pg-body">
          <g className="pg-wings">
            <path d="M34 70c-18-6-28-20-26-34 12 4 22 14 30 26z" fill="#5dffa5" opacity=".28" />
            <path d="M86 70c18-6 28-20 26-34-12 4-22 14-30 26z" fill="#5dffa5" opacity=".28" />
          </g>
          <path d="M30 78c0-22 14-36 32-36 16 0 28 12 28 30 0 18-14 30-32 30S30 96 30 78z" fill={`url(#${id}-b)`} />
          <path className="pg-sheen" d="M44 60c4-14 14-22 26-20 6 8 6 18 0 26-10 4-20 2-26-6z" fill={`url(#${id}-n)`} />
          <path
            className="pg-circuit"
            d="M40 82h8l4 4h8M44 90h6l3 3M74 78h-6l-3 4"
            stroke="#5dffa5"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
          />
          <g className="pg-satchel">
            <rect x="38" y="94" width="18" height="12" rx="2.5" fill="#5a4630" />
            <rect x="44" y="91" width="6" height="4" rx="1" fill="none" stroke="#5a4630" strokeWidth="1.5" />
            <circle cx="47" cy="100" r="1.4" fill="#ffb547" />
          </g>
          <path d="M55 108v6M67 108v6" stroke="#d9a35a" strokeWidth="3" strokeLinecap="round" />
          <g className="pg-head">
            <circle cx="66" cy="32" r="18" fill={`url(#${id}-b)`} />
            <path className="pg-beak" d="M82 33l12 4-12 3z" fill="#d9a35a" />
            <rect
              className="pg-visor"
              x="61"
              y="23"
              width="22"
              height="10"
              rx="4.5"
              fill="#0b1a12"
              opacity=".85"
              stroke="#5dffa5"
              strokeWidth="1.4"
            />
            <g className="pg-eye">
              <circle cx="74" cy="28" r="2.6" fill="#5dffa5" />
              <circle cx="75" cy="27" r=".9" fill="#eafff2" />
            </g>

            <path className="pg-beam" d="M83 28L118 14v30z" fill="#5dffa5" opacity="0" />
            <path className="pg-ear" d="M52 28q-5 4-3 10" stroke="#1d1b18" strokeWidth="2" fill="none" />
            <circle className="pg-ear" cx="49" cy="39" r="2.2" fill="#1d1b18" />
            <path className="pg-zz" d="M84 6h7l-7 7h7" stroke="#5dffa5" strokeWidth="1.8" fill="none" opacity="0" />
            <path className="pg-sweat" d="M54 18q-3 5 0 7q3-2 0-7z" fill="#cfd8cc" opacity="0" />
          </g>
        </g>
      </svg>
      {quip ? (
        <span className="pg-quip" role="note">
          {quip}
        </span>
      ) : null}
    </span>
  );
}

const QUIPS = [
  "Coo-ordinates locked. Your mission is ready.",
  "I've cracked tougher cases than algebra. Barely.",
  "Intel acquired. Also, did anyone drop a crumb?",
  "Agent tip: missions shrink when you start them.",
  "Visor calibrated. Grades scanned. Coo.",
  "I'd high-five you, but wings.",
];
/** Stable one-liner for the day (server-safe, no randomness between renders). */
export function quipOfDay(d = new Date()) {
  return QUIPS[(d.getUTCFullYear() * 400 + d.getUTCMonth() * 31 + d.getUTCDate()) % QUIPS.length]!;
}

/** Dual wording: agent speak by default, plain words when .sa[data-plain] is set. CSS-only swap. */
export function W({ a, p }: { a: React.ReactNode; p: React.ReactNode }) {
  return (
    <>
      <span className="w-a">{a}</span>
      <span className="w-p">{p}</span>
    </>
  );
}
