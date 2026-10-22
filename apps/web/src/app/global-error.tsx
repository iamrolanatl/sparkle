"use client";
import { useEffect } from "react";

/** Last-resort boundary when the root layout itself fails (NFR-41). Plain HTML: no dependencies that could fail. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error("[sparkle] global", error.digest ?? error.message), [error]);
  return (
    <html lang="en">
      <body style={{ background: "#05080f", color: "#f8fafc", fontFamily: "system-ui", padding: "2rem" }}>
        <h1>Sparkle needs a quick refresh</h1>
        <p>Something went wrong loading the page. Your data is safe.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem" }}>
          Reload
        </button>
      </body>
    </html>
  );
}
