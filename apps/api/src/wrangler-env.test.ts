import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Regression: dev /health reported env "production" because the top-level [vars] said so.
describe("wrangler.toml APP_ENV", () => {
  it("top-level (dev) worker reports APP_ENV=dev", () => {
    const toml = readFileSync(join(__dirname, "..", "wrangler.toml"), "utf8");
    const top = toml.split(/^\[env\./m)[0]!;
    expect(top).toMatch(/^APP_ENV = "dev"/m);
    expect(top).not.toMatch(/^APP_ENV = "production"/m);
  });
});
