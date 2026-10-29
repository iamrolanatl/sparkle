"use client";
import { useEffect } from "react";
import { NeonWindow } from "@sparkle/ui/NeonWindow";
import { reportError } from "@sparkle/ui/report";

/** Route-level boundary (NFR-41): the rest of the app keeps working. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error, { boundary: "route", digest: error.digest }), [error]);
  return (
    <main className="mx-auto max-w-lg p-8">
      <NeonWindow title="Hmm">
        <p>This part of Sparkle hit a snag. Your data is safe.</p>
        <button type="button" className="mt-4 underline" onClick={reset}>
          Try again
        </button>
      </NeonWindow>
    </main>
  );
}
