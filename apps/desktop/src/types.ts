/** Mirrors apps/api/src/ingest/schema.ts SyncBatch (TDD §8.7). */
export interface SyncBatch {
  studentId: string;
  source: "mock-portal";
  runKey: string;
  capturedAt: string;
  classes: { externalId: string; name: string; teacher: string | null; period: string | null }[];
  assignments: {
    externalId: string;
    classExternalId: string | null;
    title: string;
    dueAt: string | null;
    status: string | null;
    score: number | null;
    maxScore: number | null;
  }[];
}

/** Minimal slice of Playwright's Page used by adapters (keeps core testable without a browser). */
export interface PageLike {
  goto(url: string): Promise<unknown>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  $$eval<R>(selector: string, fn: (els: Element[]) => R): Promise<R>;
}

export interface PortalCredential {
  username: string;
  password: string;
}
