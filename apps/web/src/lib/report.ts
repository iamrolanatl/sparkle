"use client";
import { reportError, setErrorReporter } from "@sparkle/ui";

/**
 * Crash reporter (DEC-54): sends a minimal Sentry envelope when NEXT_PUBLIC_SENTRY_DSN is set (free tier),
 * otherwise logs. PII-scrubbed: no user ids, emails, cookies or query strings.
 */
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

function scrub(s: string): string {
  return s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]").replace(/\?[^\s"']*/g, "");
}

export function envelopeUrl(dsn: string): string | null {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(dsn);
  return m ? `https://${m[2]}/api/${m[3]}/envelope/?sentry_key=${m[1]}&sentry_version=7` : null;
}

export function installReporter(): void {
  const url = DSN ? envelopeUrl(DSN) : null;
  setErrorReporter((error, context) => {
    const err = error instanceof Error ? error : new Error(String(error));
    if (!url) {
      console.error("[sparkle]", err, context ?? {});
      return;
    }
    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? "dev",
      request: { url: scrub(location.origin + location.pathname) },
      tags: { boundary: String(context?.boundary ?? "global") },
      exception: { values: [{ type: err.name, value: scrub(err.message), stacktrace: undefined }] },
    };
    const body = `${JSON.stringify({ event_id: event.event_id })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
    if (!navigator.sendBeacon?.(url, body)) fetch(url, { method: "POST", body, keepalive: true }).catch(() => {});
  });
  window.addEventListener("error", (e) => reportError(e.error ?? e.message, { boundary: "window" }));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason, { boundary: "promise" }));
}
