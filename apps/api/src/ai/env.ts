import { createRouter, kvBudget, workersAi } from "./router";

export interface AiEnv {
  AI?: { run: (m: string, i: unknown, o?: unknown) => Promise<unknown> };
  AI_GATEWAY_ID?: string;
  TODAY_CACHE?: KVNamespace;
  XAI_API_KEY?: string; // T2 — not configured yet (D-09 / SA)
  ANTHROPIC_API_KEY?: string; // T3 — not configured yet (D-09 / SA)
}

const T1_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

/** Build the router from bindings. T2/T3 stay off until keys exist; requests fall back to T1. */
export function routerFromEnv(env: AiEnv) {
  return createRouter({
    providers: env.AI ? { t1: workersAi(env.AI, T1_MODEL, env.AI_GATEWAY_ID) } : {},
    budget: env.TODAY_CACHE ? kvBudget(env.TODAY_CACHE) : undefined,
  });
}

/** Non-secret status for health checks: which tiers are configured. */
export function aiStatus(env: AiEnv) {
  return { t1: Boolean(env.AI), t2: Boolean(env.XAI_API_KEY), t3: Boolean(env.ANTHROPIC_API_KEY) };
}
