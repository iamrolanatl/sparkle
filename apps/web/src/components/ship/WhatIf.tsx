"use client";
import { useState } from "react";
import { whatIf, type Cat } from "@/lib/ship/derive";

export type WhatIfClass = { id: string; name: string; pct: number | null; cats: Cat[] };

/** What-if grade calculator on real class categories. Nothing is saved. */
export default function WhatIf({ classes }: { classes: WhatIfClass[] }) {
  const [ci, setCi] = useState(0);
  const c = classes[ci];
  const known = c?.cats.filter((k) => k.weight > 0) ?? [];
  const [cat, setCat] = useState(known[0]?.name ?? "");
  const [score, setScore] = useState(85);
  if (!c) return <div className="empty">No classes with grades yet.</div>;
  const cn = known.find((k) => k.name === cat) ? cat : (known[0]?.name ?? "");
  const r = cn ? whatIf(c.cats, cn, score) : null;
  return (
    <div className="sh-whatif" data-testid="whatif">
      <div className="sh-wf-row">
        <label>
          Class
          <select value={ci} onChange={(e) => setCi(Number(e.target.value))}>
            {classes.map((k, i) => (
              <option key={k.id} value={i}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        {known.length ? (
          <label>
            Category
            <select value={cn} onChange={(e) => setCat(e.target.value)}>
              {known.map((k) => (
                <option key={k.name} value={k.name}>
                  {k.name} ({k.weight}%)
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Average becomes <b>{score}%</b>
          <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} />
        </label>
      </div>
      {known.length ? (
        <p className="sh-wf-out" aria-live="polite">
          {c.name}: {c.pct != null ? `${Math.round(c.pct)}%` : "no grade yet"} →{" "}
          <b>{r != null ? `${r.toFixed(1)}%` : "—"}</b>
          <small>
            {" "}
            if your {cn} average becomes {score}%. Uses the teacher's category weights.
          </small>
        </p>
      ) : (
        <p className="sh-wf-out">
          Category weights for {c.name} aren't known yet, so I can't project the class grade exactly. Import or sync the
          gradebook to unlock this.
        </p>
      )}
    </div>
  );
}
