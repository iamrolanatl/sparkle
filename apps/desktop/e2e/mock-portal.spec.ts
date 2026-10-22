import { expect, test, type Page } from "@playwright/test";
import { runSync } from "../src/sync";
import { InsecureMemoryCredentialStore, InsecureMemorySyncState } from "../src/testing/insecureMemory";
import type { PageLike, SyncBatch } from "../src/types";

const SID = "10000000-0000-0000-0000-00000000000a";
const PORTAL = new URL("../fixtures/mock-portal/index.html", import.meta.url).href;

/** Hard network wall: anything that isn't the local fixture is aborted, so a regression fails loudly. */
test.beforeEach(async ({ context }) => {
  await context.route("**/*", (r) => (r.request().url().startsWith("file:") ? r.continue() : r.abort()));
});

const setup = async (password: string) => {
  const creds = new InsecureMemoryCredentialStore();
  const state = new InsecureMemorySyncState();
  await creds.set(SID, { username: "demo-family", password });
  return { creds, state };
};
const asPage = (p: Page) => p as unknown as PageLike;

test("agent signs in to the mock portal in a real browser and uploads a clean batch", async ({ page }) => {
  const blocked: string[] = [];
  page.on("requestfailed", (r) => blocked.push(r.url()));
  const { creds, state } = await setup("fixture-only-pw");
  let sent: SyncBatch | null = null;
  const r = await runSync({
    studentId: SID,
    portalUrl: PORTAL,
    page: asPage(page),
    creds,
    state,
    upload: async (_sid, batch) => {
      sent = batch;
      return { status: 202, body: { ok: true, queued: true } };
    },
  });
  expect(r).toEqual({ ok: true, assignments: 3, queued: true });
  expect(sent!.classes.map((c) => c.name)).toEqual(["Algebra I", "Biology"]);
  expect(sent!.assignments.find((a) => a.externalId === "a3")).toMatchObject({ score: 18, maxScore: 20 });
  const wire = JSON.stringify(sent);
  expect(wire).not.toContain("fixture-only-pw");
  expect(wire).not.toContain("demo-family");
  expect(blocked).toEqual([]);
});

test("wrong password → bad_credentials, nothing uploaded, next run paused", async ({ page }) => {
  const { creds, state } = await setup("");
  const upload = async () => {
    throw new Error("upload must not be called");
  };
  const calls: unknown[] = [];
  const spy: typeof upload = async () => {
    calls.push(1);
    return upload();
  };
  const base = { studentId: SID, portalUrl: PORTAL, page: asPage(page), creds, state, upload: spy };
  expect(await runSync(base)).toEqual({ ok: false, error: "bad_credentials" });
  await expect(page.locator("#error")).toBeVisible();
  expect(calls).toHaveLength(0);
  expect(await runSync(base)).toEqual({ ok: false, error: "paused_bad_credentials" });
});

test("refuses to type credentials when the configured portal is not the fixture", async ({ page }) => {
  const { creds, state } = await setup("fixture-only-pw");
  const r = await runSync({
    studentId: SID,
    portalUrl: "https://evil.example/login",
    page: asPage(page),
    creds,
    state,
    upload: async () => ({ status: 202, body: {} }),
  });
  expect(r).toEqual({ ok: false, error: "portal_origin_mismatch" });
  expect(page.url()).toBe("about:blank");
});
