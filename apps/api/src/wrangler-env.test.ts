import { describe, expect, it } from "vitest";

// Regression: dev /health reported env "production" because the top-level [vars] said so.
// node:fs is loaded dynamically: the Worker tsconfig has no Node types (tests run under Node in vitest).
const nodeFs = "node:fs";

describe("wrangler.toml APP_ENV", () => {
  it("top-level (dev) worker reports APP_ENV=dev", async () => {
    const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
      readFileSync: (p: string, enc: "utf8") => string;
    };
    const toml = readFileSync("wrangler.toml", "utf8"); // vitest cwd = apps/api;
    const top = toml.split(/^\[env\./m)[0]!;
    expect(top).toMatch(/^APP_ENV = "dev"/m);
    expect(top).not.toMatch(/^APP_ENV = "production"/m);
  });
});
