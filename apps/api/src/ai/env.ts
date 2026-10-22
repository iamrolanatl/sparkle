import { createRouter, kvBudget, workersAi, type OutputFilter } from "./router";

export interface AiEnv {
  AI?: { run: (m: string, i: unknown, o?: unknown) => Promise<unknown> };
  AI_GATEWAY_ID?: string;
  TODAY_CACHE?: KVNamespace;
  XAI_API_KEY?: string; // T2 — not configured yet (D-09 / SA)
  ANTHROPIC_API_KEY?: string; // T3 — not configured yet (D-09 / SA)
}

const T1_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

/**
 * Baseline output screen until Team A's screenModelOutput (#40) is wired in here. Conservative: blocks self-harm
 * method talk, sexual content, and requests for personal contact/identity data.
 */
const baselineFilter: OutputFilter = (text) => {
  const bad = [
    /\b(how to|ways to)\s+(kill|hurt|harm)\s+(yourself|myself)\b/i,
    /\b(suicide|self[- ]harm)\s+(method|instructions?)\b/i,
    /\b(porn|explicit sex|nude)\b/i,
    /\b(send|share|give) me your (address|phone|password|ssn|social security)\b/i,
  ];
  const hit = bad.find((r) => r.test(text));
  return hit ? { ok: false, reason: "baseline_filter" } : { ok: true };
};

/** Build the router from bindings. T2/T3 stay off until keys exist; requests fall back to T1. */
export function routerFromEnv(
  env: AiEnv,
  opts: { outputFilter?: OutputFilter; defer?: (p: Promise<unknown>) => void } = {},
) {
  return createRouter({
    providers: env.AI ? { t1: workersAi(env.AI, T1_MODEL, env.AI_GATEWAY_ID) } : {},
    budget: env.TODAY_CACHE ? kvBudget(env.TODAY_CACHE) : undefined,
    outputFilter: opts.outputFilter ?? baselineFilter,
    defer: opts.defer,
  });
}
