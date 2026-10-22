/** Redaction + pre-model safety classification for the public chat (FR-19). */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const LONG_ID = /\b\d{7,}\b/g;

export function redact(text: string): string {
  return text.replace(EMAIL, "[email]").replace(SSN, "[id]").replace(PHONE, "[phone]").replace(LONG_ID, "[id]");
}

export type Verdict = { kind: "ok" } | { kind: "crisis" } | { kind: "blocked"; reason: string };

const CRISIS = /\b(kill myself|suicid|self[- ]?harm|hurt myself|want to die|being abused|abuse at home)\b/i;
const UNSAFE = /\b(bomb|weapon|hack into|steal (a )?password|porn|nude|drugs? (buy|sell))\b/i;
const INJECTION = /\b(ignore (all |the )?(previous|above) instructions|system prompt|jailbreak|you are now)\b/i;

export function classify(text: string): Verdict {
  if (CRISIS.test(text)) return { kind: "crisis" };
  if (UNSAFE.test(text)) return { kind: "blocked", reason: "unsafe" };
  if (INJECTION.test(text)) return { kind: "blocked", reason: "prompt_injection" };
  return { kind: "ok" };
}

export const CRISIS_REPLY =
  "I'm an AI, and I care about your safety. Please talk to a trusted adult right now. In the US you can call or text 988 (Suicide & Crisis Lifeline) any time, or call 911 if you are in danger.";
export const BLOCKED_REPLY =
  "I can only help with questions about Sparkle. Want to know how the Today view or family sharing works?";

export const estimateTokens = (s: string) => Math.ceil(s.length / 4);
