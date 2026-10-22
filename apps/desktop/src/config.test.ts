import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apiBase, cspFor } from "./config";

describe("build config", () => {
  it("committed tauri.conf.json CSP matches the dev API base the uploader uses", () => {
    const conf = JSON.parse(readFileSync(join(__dirname, "../src-tauri/tauri.conf.json"), "utf8"));
    expect(conf.app.security.csp).toBe(cspFor("dev"));
    expect(conf.app.security.csp).toContain(apiBase("dev"));
    expect(conf.bundle.active).toBe(false);
  });
});
