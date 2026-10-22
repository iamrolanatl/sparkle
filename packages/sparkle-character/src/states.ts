export const SPARKLE_STATES = ["idle", "excited", "thoughtful", "helping"] as const;
export type SparkleState = (typeof SPARKLE_STATES)[number];

/** Per-state pose/expression parameters used by the placeholder SVG (and later mapped to Rive inputs). */
export interface Pose {
  eye: "open" | "wide" | "half" | "focus";
  mouth: "smile" | "grin" | "flat" | "open";
  armL: number;
  armR: number;
  bob: number;
  label: string;
}

export const POSES: Record<SparkleState, Pose> = {
  idle: { eye: "open", mouth: "smile", armL: 10, armR: -10, bob: 3, label: "Sparkle is relaxing" },
  excited: { eye: "wide", mouth: "grin", armL: 140, armR: -140, bob: 8, label: "Sparkle is excited" },
  thoughtful: { eye: "half", mouth: "flat", armL: 10, armR: -120, bob: 1, label: "Sparkle is thinking" },
  helping: { eye: "focus", mouth: "open", armL: 10, armR: -70, bob: 2, label: "Sparkle is helping" },
};

/** Rive state-machine contract (integration point). Asset and names TBD with the animator. */
export const RIVE_CONTRACT = {
  src: "/sparkle/sparkle.riv",
  stateMachine: "SparkleSM",
  input: "state",
  stateIndex: { idle: 0, excited: 1, thoughtful: 2, helping: 3 },
} as const;

export function isSparkleState(v: unknown): v is SparkleState {
  return typeof v === "string" && (SPARKLE_STATES as readonly string[]).includes(v);
}
