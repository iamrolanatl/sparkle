import { expect, test } from "@playwright/test";

// Hide the cookie banner so it doesn't cover the screenshot.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "spk-consent-v1",
      JSON.stringify({ essential: true, analytics: false, gpc: false, at: "2026-01-01T00:00:00Z" }),
    ),
  );
});

// Visual regression (CR-0008, DEC-56). Baselines are taken from the CI (ubuntu-latest) run artifacts, not local machines,
// so font rasterization matches. To update: download the e2e-artifacts *-actual.png files and replace the snapshots.
test("design showcase", async ({ page }) => {
  await page.goto("/design");
  await page.getByText("25:00").waitFor();
  await expect(page).toHaveScreenshot("design.png", { fullPage: true });
});

test("landing hero", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("landing.png");
});
