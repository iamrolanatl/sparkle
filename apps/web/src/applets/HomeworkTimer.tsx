"use client";
import { useEffect, useState } from "react";

/** Focus timer applet (25-minute default). Pure client state; no data leaves the device. */
export default function HomeworkTimer({ minutes = 25 }: { minutes?: number }) {
  const [left, setLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="p-4">
      <p className="text-3xl font-semibold tabular-nums" aria-live="polite">
        {mm}:{ss}
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="underline" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          className="underline"
          onClick={() => {
            setRunning(false);
            setLeft(minutes * 60);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
