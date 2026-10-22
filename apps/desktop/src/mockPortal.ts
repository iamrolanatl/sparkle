import type { PageLike, PortalCredential, SyncBatch } from "./types";

type Extract = Pick<SyncBatch, "classes" | "assignments">;

/**
 * Adapter for the synthetic mock portal fixture ONLY (DEC-161). Real portals (e.g. StudentVue) are
 * not built until their terms of use are reviewed (WBS 3.2 gate, R-05/D-06, SA-D1).
 */
export async function scrapeMockPortal(page: PageLike, url: string, cred: PortalCredential): Promise<Extract> {
  await page.goto(url);
  await page.fill("#login [name=username]", cred.username);
  await page.fill("#login [name=password]", cred.password);
  await page.click("#login button");
  const classes = await page.$$eval("[data-class]", (els) =>
    els.map((e) => ({
      externalId: e.getAttribute("data-class") ?? "",
      name: e.getAttribute("data-name") ?? "",
      teacher: e.getAttribute("data-teacher"),
      period: e.getAttribute("data-period"),
    })),
  );
  const raw = await page.$$eval("[data-assignment]", (els) =>
    els.map((e) => ({
      externalId: e.getAttribute("data-assignment") ?? "",
      classExternalId: e.getAttribute("data-class-ref"),
      title: e.getAttribute("data-title") ?? "",
      dueAt: e.getAttribute("data-due"),
      status: e.getAttribute("data-status"),
      score: e.getAttribute("data-score"),
      maxScore: e.getAttribute("data-max"),
    })),
  );
  const n = (v: string | null) => (v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  return { classes, assignments: raw.map((a) => ({ ...a, score: n(a.score), maxScore: n(a.maxScore) })) };
}
