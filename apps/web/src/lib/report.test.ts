import { describe, expect, it } from "vitest";
import { envelopeUrl } from "./report";

describe("crash reporter", () => {
  it("builds the Sentry envelope URL from a DSN", () => {
    expect(envelopeUrl("https://abc123@o1.ingest.sentry.io/42")).toBe(
      "https://o1.ingest.sentry.io/api/42/envelope/?sentry_key=abc123&sentry_version=7",
    );
    expect(envelopeUrl("nonsense")).toBeNull();
  });
});
