/** Pure helpers for interactive effects (CR-0008). Kept DOM-free so they are unit-testable. */

/** True only for a real mouse/pen pointer — touch never triggers hover effects. */
export function isFinePointer(pointerType: string | undefined): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}

/** Clamp helper. */
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Magnetic offset toward the pointer, capped at `max` px. (px,py) are pointer coords relative to the element box. */
export function magneticOffset(px: number, py: number, w: number, h: number, max = 6): { x: number; y: number } {
  if (w <= 0 || h <= 0) return { x: 0, y: 0 };
  const nx = clamp((px - w / 2) / (w / 2), -1, 1);
  const ny = clamp((py - h / 2) / (h / 2), -1, 1);
  return { x: +(nx * max).toFixed(2), y: +(ny * max).toFixed(2) };
}

/** Gentle tilt (degrees) from pointer position, capped at `max`. */
export function tiltAngles(
  px: number,
  py: number,
  w: number,
  h: number,
  max = 4,
): { rotateX: number; rotateY: number } {
  const { x, y } = magneticOffset(px, py, w, h, max);
  return { rotateX: -y, rotateY: x };
}

export interface MediaEnv {
  prefersReducedMotion: boolean;
  saveData: boolean;
  lowPower: boolean;
  measuredFps?: number;
}

/** VideoBackground shows only its poster when any of these hold. */
export function shouldUsePoster(env: MediaEnv, fpsFloor = 30): boolean {
  return (
    env.prefersReducedMotion ||
    env.saveData ||
    env.lowPower ||
    (env.measuredFps !== undefined && env.measuredFps < fpsFloor)
  );
}

/** Battery heuristic: low power if < 20 % and not charging. */
export function isLowPower(battery: { level: number; charging: boolean } | undefined): boolean {
  return !!battery && !battery.charging && battery.level < 0.2;
}

/** Time (s) at which to start the crossfade to the other <video>, so the rewind is never visible. */
export function crossfadeStart(duration: number, fade = 0.8): number {
  if (!Number.isFinite(duration) || duration <= 0) return Infinity;
  return Math.max(0, duration - Math.min(fade, duration / 2));
}
