import { RIVE_CONTRACT, type SparkleState } from "./states";

/**
 * Rive integration hooks (WBS 5.1, DEC-185). Library-agnostic so the production .riv can drop in
 * via @rive-app/react-canvas (or WebGL) without touching app code. The placeholder SVG stays the
 * fallback whenever the asset is missing, fails to load, or the user prefers reduced motion.
 */

/** App events that drive Sparkle's mood. Apps emit events, never states, so the mapping stays here. */
export const SPARKLE_EVENTS = {
  task_saved: { state: "excited", holdMs: 2500 },
  goal_hit: { state: "excited", holdMs: 3000 },
  ai_thinking: { state: "thoughtful", holdMs: 0 },
  ai_answered: { state: "helping", holdMs: 2000 },
  scan_review: { state: "helping", holdMs: 2000 },
  error: { state: "thoughtful", holdMs: 2000 },
  idle: { state: "idle", holdMs: 0 },
} as const satisfies Record<string, { state: SparkleState; holdMs: number }>;
export type SparkleEvent = keyof typeof SPARKLE_EVENTS;

/** Minimal surface of a Rive state-machine number input (matches @rive-app StateMachineInput). */
export interface RiveNumberInput {
  value: number;
}

/** Drive the Rive state machine input; unknown or missing inputs are ignored (never throws). */
export function applyRiveState(input: RiveNumberInput | null | undefined, state: SparkleState): boolean {
  if (!input) return false;
  const idx = RIVE_CONTRACT.stateIndex[state];
  if (input.value !== idx) input.value = idx;
  return true;
}

type Listener = (s: SparkleState) => void;

/** Tiny event bus: maps events to states with auto-revert to idle. One per page/app shell. */
export function createSparkleBus(
  schedule: (fn: () => void, ms: number) => unknown = setTimeout,
  clear: (h: unknown) => void = (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
) {
  let state: SparkleState = "idle";
  let timer: unknown = null;
  const listeners = new Set<Listener>();
  const set = (s: SparkleState) => {
    state = s;
    listeners.forEach((l) => {
      try {
        l(s);
      } catch {
        /* a broken listener must not crash the app (CR-0007) */
      }
    });
  };
  return {
    get state() {
      return state;
    },
    emit(event: SparkleEvent) {
      const rule = SPARKLE_EVENTS[event];
      if (!rule) return;
      if (timer !== null) clear(timer);
      timer = null;
      set(rule.state);
      if (rule.holdMs > 0)
        timer = schedule(() => {
          timer = null;
          set("idle");
        }, rule.holdMs);
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
export type SparkleBus = ReturnType<typeof createSparkleBus>;

/** Decide whether to render Rive or the SVG fallback. */
export function shouldUseRive(opts: { assetOk: boolean; reducedMotion: boolean; saveData?: boolean }): boolean {
  return opts.assetOk && !opts.reducedMotion && !opts.saveData;
}
