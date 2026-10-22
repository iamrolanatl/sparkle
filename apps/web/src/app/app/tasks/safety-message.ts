/** Always show 988 resources for a crisis, even if the API omits the message (FR-14). */
export const CRISIS_FALLBACK =
  "I'm an AI, and I care about your safety. Please talk to a trusted adult right now. In the US you can call or text 988 (Suicide & Crisis Lifeline) any time, or call 911 if you are in danger.";

export function safetyMessage(body: Record<string, unknown>): string | null {
  if (body.safety === "crisis") {
    const m = typeof body.message === "string" && body.message.includes("988") ? body.message : CRISIS_FALLBACK;
    return m;
  }
  if (body.safety === "blocked") return "Sparkle can't add that one. Try a school or home task.";
  return null;
}
