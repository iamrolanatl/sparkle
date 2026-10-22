import { describe, expect, it } from "vitest";
import { POSES, RIVE_CONTRACT, SPARKLE_STATES, isSparkleState } from "./states";

describe("sparkle states", () => {
  it("has the four handoff states", () => expect([...SPARKLE_STATES]).toEqual(["idle", "excited", "thoughtful", "helping"]));
  it("every state has a pose and Rive index", () => {
    for (const s of SPARKLE_STATES) { expect(POSES[s].label).toBeTruthy(); expect(RIVE_CONTRACT.stateIndex[s]).toBeTypeOf("number"); }
  });
  it("guards", () => { expect(isSparkleState("helping")).toBe(true); expect(isSparkleState("angry")).toBe(false); });
});
