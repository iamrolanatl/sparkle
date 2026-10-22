import { FPS_DISABLE_BELOW } from "./tokens";

/** Average FPS from a list of frame timestamps (ms). */
export function averageFps(timestamps: number[]): number {
  if (timestamps.length < 2) return Infinity;
  const span = timestamps[timestamps.length - 1]! - timestamps[0]!;
  return span <= 0 ? Infinity : ((timestamps.length - 1) * 1000) / span;
}

export interface EffectsEnv {
  prefersReducedMotion: boolean;
  saveData: boolean;
  measuredFps: number;
}

/** Decide whether decorative effects may run (handoff §2, NFR-02). */
export function effectsAllowed(env: EffectsEnv, threshold = FPS_DISABLE_BELOW): boolean {
  if (env.prefersReducedMotion || env.saveData) return false;
  return env.measuredFps >= threshold;
}
