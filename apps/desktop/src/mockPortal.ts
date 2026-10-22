import type { PageLike, PortalCredential, SyncBatch } from "./types";

type Extract = Pick<SyncBatch, "classes" | "assignments">;

/** Distinct, content-free failure codes thrown by adapters. */
export class PortalError extends Error {
  constructor(readonly code: "portal_origin_mismatch" | "bad_credentials" | "payload_too_large") {
    super(code);
  }
}

/** Client-side bounds (fail fast; the server validates again). Match apps/api ingest limits. */
const LIMITS = { classes: 50, assignments: 500, id: 128, name: 120, title: 200, teacher: 120, period: 20 };

/**
 * Origin pin (DEC-168): the mock adapter may only type credentials into the bundled fixture (file:)
 * or a localhost dev server. Checked AFTER navigation (redirects) and BEFORE any fill.
 */
export function isAllowedMockOrigin(href: string): boolean {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  if (u.protocol === "file:") return u.pathname.endsWith("/fixtures/mock-portal/index.html");
  return (
    (u.protocol === "http:" || u.protocol === "https:") && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
  );
}

const cut = (v: string | null, n: number) => (v === null ? null : v.slice(0, n));

/**
 * Adapter for the synthetic mock portal fixture ONLY (DEC-161). Real portals (e.g. StudentVue) are
 * not built until their terms of use are reviewed (SOP-12 step 2, SA-D1).
 */
export async function scrapeMockPortal(page: PageLike, url: string, cred: PortalCredential): Promise<Extract> {
  if (!isAllowedMockOrigin(url)) throw new PortalError("portal_origin_mismatch");
  await page.goto(url);
  if (!isAllowedMockOrigin(page.url())) throw new PortalError("portal_origin_mismatch");
  await page.fill("#login [name=username]", cred.username);
  await page.fill("#login [name=password]", cred.password);
  await page.click("#login button");
  await page.waitForSelector("#classes:not([hidden]), #error:not([hidden])", { timeout: 15_000, state: "attached" });
  if (await page.$$eval("#error:not([hidden])", (els) => els.length > 0)) throw new PortalError("bad_credentials");
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
  if (classes.length > LIMITS.classes || raw.length > LIMITS.assignments) throw new PortalError("payload_too_large");
  const n = (v: string | null) => (v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  return {
    classes: classes.map((c) => ({
      externalId: c.externalId.slice(0, LIMITS.id),
      name: c.name.slice(0, LIMITS.name),
      teacher: cut(c.teacher, LIMITS.teacher),
      period: cut(c.period, LIMITS.period),
    })),
    assignments: raw.map((a) => ({
      externalId: a.externalId.slice(0, LIMITS.id),
      classExternalId: cut(a.classExternalId, LIMITS.id),
      title: a.title.slice(0, LIMITS.title),
      dueAt: cut(a.dueAt, 40),
      status: cut(a.status, 20),
      score: n(a.score),
      maxScore: n(a.maxScore),
    })),
  };
}
