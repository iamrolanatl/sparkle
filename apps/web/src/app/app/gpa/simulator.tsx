"use client";
import { useState } from "react";
import { NeonWindow } from "@sparkle/ui/NeonWindow";
import { computeGpa, type Course, type Level } from "@/lib/gpa";

const LEVELS: Level[] = ["standard", "honors", "ap", "ib", "dual"];
const cell = "rounded-lg border border-[var(--spk-border)] bg-transparent px-2 py-1";

/** Client-side what-if calculator (FR-06). Nothing is stored or sent. */
export function GpaSimulator() {
  const [rows, setRows] = useState<Course[]>([
    { name: "Math", grade: 88, credits: 1, level: "standard" },
    { name: "English", grade: 92, credits: 1, level: "honors" },
  ]);
  let result: ReturnType<typeof computeGpa> | null = null;
  let error = "";
  try {
    result = computeGpa(rows.filter((r) => r.name.trim()));
  } catch (e) {
    error = e instanceof Error ? e.message : "Check the numbers";
  }
  const set = (i: number, patch: Partial<Course>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <NeonWindow title="What-if grades">
      <p className="text-muted text-sm">Try “what if” grades. Sparkle calculates GPA with fixed rules — never AI.</p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Class</th>
            <th>Grade</th>
            <th>Credits</th>
            <th>Level</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <input
                  aria-label="Class name"
                  className={cell}
                  value={r.name}
                  onChange={(e) => set(i, { name: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label="Grade"
                  type="number"
                  min={0}
                  max={100}
                  className={`${cell} w-20`}
                  value={r.grade}
                  onChange={(e) => set(i, { grade: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  aria-label="Credits"
                  type="number"
                  step={0.5}
                  min={0.5}
                  className={`${cell} w-20`}
                  value={r.credits}
                  onChange={(e) => set(i, { credits: Number(e.target.value) })}
                />
              </td>
              <td>
                <select
                  aria-label="Level"
                  className={cell}
                  value={r.level}
                  onChange={(e) => set(i, { level: e.target.value as Level })}
                >
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  type="button"
                  className="underline"
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="mt-3 underline"
        onClick={() => setRows((rs) => [...rs, { name: "", grade: 90, credits: 1, level: "standard" }])}
      >
        Add class
      </button>
      <div className="mt-4" aria-live="polite" data-testid="gpa-result">
        {result ? (
          <p className="text-xl">
            Unweighted <strong>{result.unweighted.toFixed(2)}</strong> · Weighted{" "}
            <strong>{result.weighted.toFixed(2)}</strong> · {result.credits} credits
          </p>
        ) : (
          <p role="alert">{error}</p>
        )}
      </div>
    </NeonWindow>
  );
}
