import Link from "next/link";
import { MAIN, MORE } from "../nav";

export const metadata = { title: "More", robots: { index: false } };

export default function MorePage() {
  return (
    <div className="page">
      <h1>More</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        {[...MAIN.slice(3), ...MORE].map((l) => (
          <Link key={l.href} href={l.href} className="row">
            {l.label}
            <span className="due">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
