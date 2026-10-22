import Link from "next/link";
import { MAIN, MORE } from "../links";

export const metadata = { title: "More", robots: { index: false } };

const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} />
  </svg>
);

export default function MorePage() {
  return (
    <div className="page">
      <h1>More</h1>
      <div className="sub">Everything else in Sparkle</div>
      <div className="panel" style={{ marginTop: 20 }}>
        {[...MAIN.slice(3), ...MORE].map((l) => (
          <Link key={l.href} href={l.href} className="row">
            <span className="cav" style={{ background: "var(--soft)", color: "var(--fg)" }}>
              <Ico d={l.icon} />
            </span>
            <div style={{ minWidth: 0, flex: 1, fontWeight: 600 }}>{l.label}</div>
            {"k" in l && l.k ? <span className="chip">{String(l.k)}</span> : null}
            <span className="due">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
