// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Applet,
  crossfadeStart,
  defineApplet,
  ErrorBoundary,
  isFinePointer,
  isLowPower,
  magneticOffset,
  setErrorReporter,
  shouldUsePoster,
  tiltAngles,
  VideoBackground,
} from "./index";
import { __resetApplets } from "./applets";

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => __resetApplets());

describe("motion helpers", () => {
  it("touch never counts as hover", () => {
    expect(isFinePointer("touch")).toBe(false);
    expect(isFinePointer("mouse")).toBe(true);
  });
  it("magnetic offset is capped at 6px", () => {
    expect(magneticOffset(1000, 1000, 100, 40)).toEqual({ x: 6, y: 6 });
    expect(magneticOffset(50, 20, 100, 40)).toEqual({ x: 0, y: 0 });
  });
  it("tilt is capped at 4 degrees", () => {
    const a = tiltAngles(0, 0, 100, 100);
    expect(Math.abs(a.rotateX)).toBeLessThanOrEqual(4);
    expect(Math.abs(a.rotateY)).toBeLessThanOrEqual(4);
  });
  it("crossfade starts before the end", () => {
    expect(crossfadeStart(10, 0.8)).toBeCloseTo(9.2);
    expect(crossfadeStart(1, 0.8)).toBeCloseTo(0.5);
    expect(crossfadeStart(NaN)).toBe(Infinity);
  });
  it("poster fallback on reduced motion / save-data / low power / low fps", () => {
    const base = { prefersReducedMotion: false, saveData: false, lowPower: false };
    expect(shouldUsePoster(base)).toBe(false);
    expect(shouldUsePoster({ ...base, prefersReducedMotion: true })).toBe(true);
    expect(shouldUsePoster({ ...base, saveData: true })).toBe(true);
    expect(shouldUsePoster({ ...base, lowPower: true })).toBe(true);
    expect(shouldUsePoster({ ...base, measuredFps: 24 })).toBe(true);
    expect(isLowPower({ level: 0.1, charging: false })).toBe(true);
    expect(isLowPower({ level: 0.1, charging: true })).toBe(false);
  });
});

describe("ErrorBoundary + Applets (NFR-41)", () => {
  it("contains a crashing child and reports it", () => {
    const sink = vi.fn();
    setErrorReporter(sink);
    const Boom = () => {
      throw new Error("boom");
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <ErrorBoundary name="t">
          <Boom />
        </ErrorBoundary>
        <p>still here</p>
      </div>,
    );
    expect(screen.getByText("still here")).toBeTruthy();
    expect(sink).toHaveBeenCalled();
  });

  it("one failing applet does not break its sibling", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = defineApplet({
      id: "bad",
      title: "Bad",
      load: async () => ({
        default: () => {
          throw new Error("x");
        },
      }),
    });
    const good = defineApplet({ id: "good", title: "Timer", load: async () => ({ default: () => <p>timer ok</p> }) });
    await act(async () => {
      render(
        <>
          <Applet def={bad} />
          <Applet def={good} />
        </>,
      );
    });
    expect(await screen.findByText("timer ok")).toBeTruthy();
    expect(await screen.findByText(/Bad is resting/)).toBeTruthy();
  });

  it("rejects duplicate applet ids", () => {
    defineApplet({ id: "a", title: "A", load: async () => ({ default: () => null }) });
    expect(() => defineApplet({ id: "a", title: "A", load: async () => ({ default: () => null }) })).toThrow();
  });
});

describe("VideoBackground", () => {
  it("renders poster only under reduced motion", () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { container } = render(<VideoBackground h264Src="/v.mp4" poster="/p.jpg" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/p.jpg");
    expect(container.querySelector("video")).toBeNull();
  });
});
