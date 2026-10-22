import { test, expect } from "./fixtures/auth";

test("signed-in parent reaches the app, not the login page", async ({ page, signedIn }) => {
  void signedIn;
  await page.goto("/app");
  await expect(page).not.toHaveURL(/\/login/);
});
