import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { generateInviteCode, hashInviteCode, isRelationship } from "./invite-code";

describe("invite codes", () => {
  it("formats XXXX-XXXX-XXXX with no ambiguous characters", () => {
    for (let i = 0; i < 200; i++)
      expect(generateInviteCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });
  it("is unique across many draws", () => {
    const s = new Set(Array.from({ length: 2000 }, () => generateInviteCode()));
    expect(s.size).toBe(2000);
  });
  it("hash matches the SQL normalisation sha256(upper(trim(code)))", async () => {
    const want = createHash("sha256").update("GMA-A").digest("hex");
    expect(await hashInviteCode("  gma-a ")).toBe(want);
  });
  it("validates relationships", () => {
    expect(isRelationship("grandparent")).toBe(true);
    expect(isRelationship("boss")).toBe(false);
  });
});
