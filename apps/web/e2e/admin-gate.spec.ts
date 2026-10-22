import { test as anon, expect as anonExpect } from "@playwright/test";
import { test, expect } from "./fixtures/auth";

// #67: the admin console must not be discoverable.
anon("anonymous visitor gets 404 on /admin/sync", async ({ page }) => {
  const res = await page.goto("/admin/sync");
  anonExpect(res?.status()).toBe(404);
});

test("signed-in non-admin parent gets 404 on /admin/sync", async ({ page, signedIn }) => {
  void signedIn;
  const res = await page.goto("/admin/sync");
  expect(res?.status()).toBe(404);
});
