import { describe, expect, it } from "vitest";
import { validatePortalBatch } from "./portal";

const sid = "276351b4-58e7-4215-89a4-e9bd18c590e4";
const base = { studentId: sid, runKey: "run-1", capturedAt: "2026-10-22T15:00:00Z", sources: ["studentvue"] };

describe("validatePortalBatch", () => {
  it("accepts a delta batch and drops unkeyed rows", () => {
    const { batch } = validatePortalBatch(
      {
        ...base,
        classes: [{ key: "sec:1448", name: "Math 7 Q2" }, { name: "no key" }],
        attendance: [{ externalId: "sv:1", day: "2026-10-21" }],
      },
      sid,
    );
    expect(batch?.classes).toHaveLength(1);
    expect(batch?.attendance).toHaveLength(1);
  });
  it("rejects credential-shaped keys anywhere", () => {
    expect(validatePortalBatch({ ...base, posts: [{ externalId: "x", sessionCookie: "a" }] }, sid).error).toMatch(
      /not allowed/,
    );
  });
  it("rejects unknown sources and mismatched student", () => {
    expect(validatePortalBatch({ ...base, sources: ["canvas"] }, sid).error).toBeTruthy();
    expect(validatePortalBatch(base, "00000000-0000-0000-0000-000000000000").error).toBeTruthy();
  });
});
