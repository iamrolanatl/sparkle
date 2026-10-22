import { describe, expect, it } from "vitest";
import { applyRiveState, createSparkleBus, shouldUseRive } from "./rive";

describe("Rive hooks (DEC-185)", () => {
  it("maps states to the Rive contract input and tolerates a missing input", () => {
    const input = { value: 0 };
    expect(applyRiveState(input, "thoughtful")).toBe(true);
    expect(input.value).toBe(2);
    expect(applyRiveState(null, "idle")).toBe(false);
  });
  it("bus maps events to states and reverts to idle after the hold", () => {
    const pending: (() => void)[] = [];
    const bus = createSparkleBus(
      (fn) => pending.push(fn),
      () => {},
    );
    const seen: string[] = [];
    bus.subscribe((s) => seen.push(s));
    bus.subscribe(() => {
      throw new Error("bad listener");
    });
    bus.emit("task_saved");
    expect(bus.state).toBe("excited");
    pending.shift()!();
    expect(bus.state).toBe("idle");
    bus.emit("ai_thinking");
    expect(pending).toHaveLength(0);
    expect(seen).toEqual(["excited", "idle", "thoughtful"]);
  });
  it("falls back to SVG on reduced motion, save-data or a missing asset", () => {
    expect(shouldUseRive({ assetOk: true, reducedMotion: false })).toBe(true);
    expect(shouldUseRive({ assetOk: true, reducedMotion: true })).toBe(false);
    expect(shouldUseRive({ assetOk: false, reducedMotion: false })).toBe(false);
    expect(shouldUseRive({ assetOk: true, reducedMotion: false, saveData: true })).toBe(false);
  });
});
