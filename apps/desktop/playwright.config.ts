import { defineConfig } from "@playwright/test";

/** Real-browser run of the sync agent against the synthetic mock portal (DEC-161). No network targets. */
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { browserName: "chromium", headless: true },
});
