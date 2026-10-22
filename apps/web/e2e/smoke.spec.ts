import { expect, test } from "@playwright/test";

test("landing renders without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("legal pages load", async ({ page }) => {
  for (const p of ["/privacy", "/terms", "/cookies", "/accessibility", "/do-not-sell"]) {
    const r = await page.goto(p);
    expect(r?.status(), p).toBe(200);
  }
});

test("a crashing applet is isolated (NFR-41)", async ({ page }) => {
  await page.goto("/design");
  await expect(page.getByText("Crash demo is resting right now.")).toBeVisible();
  await expect(page.locator('[data-applet="homework-timer"]').getByText("25:00")).toBeVisible();
  await expect(page.getByText("Neon glass window")).toBeVisible();
});

test("reduced motion shows the video poster only", async ({ page }) => {
  await page.goto("/design");
  const hero = page.getByTestId("video-hero");
  await expect(hero.locator("img")).toHaveAttribute("src", "/media/aurora-poster.jpg");
  await expect(hero.locator("video")).toHaveCount(0);
});

test("motion enabled plays two crossfade videos", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto("/design");
  await expect(page.getByTestId("video-hero").locator("video")).toHaveCount(2);
  await ctx.close();
});
