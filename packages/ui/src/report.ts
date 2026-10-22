/** Pluggable crash reporter (DEC-54). Apps register a Sentry-compatible sink; default logs to console. */
export type ErrorReporter = (error: unknown, context?: Record<string, unknown>) => void;

let reporter: ErrorReporter = (error, context) => {
  console.error("[sparkle]", error, context ?? {});
};

export function setErrorReporter(fn: ErrorReporter): void {
  reporter = fn;
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  try {
    reporter(error, context);
  } catch {
    /* a reporter must never crash the app */
  }
}
