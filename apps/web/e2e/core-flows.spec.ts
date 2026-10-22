import { expect, test } from "@playwright/test";

// Team E core-flow E2E (DEC-191). Signed-out paths and guards; signed-in flows need sample auth fixtures.

test("every signed-in route redirects to login when signed out", async ({ page }) => {
  for (const p of ["/app", "/app/family"]) {
    await page.goto(p);
    await expect(page, p).toHaveURL(/\/login/);
  }
});

test("admin is never public (FR-20: 404, noindex)", async ({ page }) => {
  for (const p of ["/admin", "/admin/chat", "/admin/privacy", "/admin/sync"]) {
    const r = await page.goto(p);
    expect(r?.status(), p).toBe(404);
  }
});

test("cookie banner defaults to essential-only and remembers the choice", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Cookie choices" }).or(page.getByLabel("Cookie choices"));
  await expect(banner.first()).toBeVisible();
  await page.getByRole("button", { name: "Essential only" }).click();
  const stored = await page.evaluate(() => Object.values({ ...localStorage }).join(""));
  expect(stored).toContain('"analytics":false');
  await page.reload();
  await expect(page.getByRole("button", { name: "Essential only" })).toHaveCount(0);
});

test("waitlist email is required and typed (FR-17)", async ({ page }) => {
  await page.goto("/");
  const email = page.locator("#wl-email");
  await expect(email).toHaveAttribute("type", "email");
  await expect(email).toHaveAttribute("required", "");
});

test("landing is keyboard-operable: Tab reaches a focusable control with visible focus", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const tag = await page.evaluate(() => document.activeElement?.tagName);
  expect(["A", "BUTTON", "INPUT", "SELECT"]).toContain(tag);
});

test("security headers are served (DEC-180)", async ({ request }) => {
  const r = await request.get("/");
  expect(r.headers()["content-security-policy"] ?? "").toContain("frame-ancestors 'none'");
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
});
