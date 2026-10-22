import { describe, expect, it } from "vitest";
import { averageFps, effectsAllowed, contrastRatio, tokens } from "./index";

describe("fps guard", () => {
  it("computes fps", () => expect(Math.round(averageFps([0, 20, 40, 60]))).toBe(50));
  it("disables under 30 fps", () =>
    expect(effectsAllowed({ prefersReducedMotion: false, saveData: false, measuredFps: 29 })).toBe(false));
  it("allows at 50 fps", () =>
    expect(effectsAllowed({ prefersReducedMotion: false, saveData: false, measuredFps: 50 })).toBe(true));
  it("respects reduced motion and save-data", () => {
    expect(effectsAllowed({ prefersReducedMotion: true, saveData: false, measuredFps: 60 })).toBe(false);
    expect(effectsAllowed({ prefersReducedMotion: false, saveData: true, measuredFps: 60 })).toBe(false);
  });
});

describe("contrast (NFR-11, WCAG AA >= 4.5)", () => {
  it("dark text", () => expect(contrastRatio(tokens.color.dark.text, tokens.color.dark.bg)).toBeGreaterThan(7));
  it("dark muted", () => expect(contrastRatio(tokens.color.dark.textMuted, tokens.color.dark.bg)).toBeGreaterThan(4.5));
  it("light text", () => expect(contrastRatio(tokens.color.light.text, tokens.color.light.bg)).toBeGreaterThan(7));
  it("light muted", () =>
    expect(contrastRatio(tokens.color.light.textMuted, tokens.color.light.bg)).toBeGreaterThan(4.5));
});
