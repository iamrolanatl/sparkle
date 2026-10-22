"use client";
import { useState } from "react";
import { SPARKLE_STATES, SparkleCharacter, type SparkleState } from "@sparkle/character";

/** Phase 0 showcase of the character states (dev aid; replaced by real Today view in Phase 2). */
export function StateDemo() {
  const [state, setState] = useState<SparkleState>("idle");
  return (
    <div className="flex flex-col items-center gap-4">
      <SparkleCharacter state={state} size={120} />
      <div role="radiogroup" aria-label="Sparkle state" className="flex flex-wrap justify-center gap-2">
        {SPARKLE_STATES.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={s === state}
            onClick={() => setState(s)}
            className={`spk-glass px-3 py-1.5 text-sm capitalize ${s === state ? "spk-glow" : ""}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
