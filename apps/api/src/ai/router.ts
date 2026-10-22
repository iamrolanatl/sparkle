/**
 * Tiered AI router (WBS 5.2, handoff §5): T1 Workers AI (Ollama-class open model, cheapest) → T2 Grok → T3 Claude.
 * - Task decides the preferred tier; unavailable tiers (no key) or open circuits fall back to the next cheaper one.
 * - Per-key daily token budget (KV) and per-request token cap.
 * - Every answer carries the sources it was grounded on (citations); callers must pass them in.
 * - Circuit breaker per tier: 3 failures within 60 s opens it for 30 s.
 */
export type Tier = "t1" | "t2" | "t3";
export type Task = "classify" | "summarize" | "explain" | "draft" | "reason";

interface Source {
  id: string;
  title: string;
}
export interface AiRequest {
  task: Task;
  system: string;
  prompt: string;
  sources: Source[];
  budgetKey: string; // e.g. student id or "public-chat"
  maxTokens?: number;
}
export interface AiResponse {
  text: string;
  tier: Tier;
  model: string;
  sources: Source[];
  tokens: number;
}
export type Provider = (req: {
  system: string;
  prompt: string;
  maxTokens: number;
}) => Promise<{ text: string; tokens: number }>;

export interface RouterDeps {
  providers: Partial<Record<Tier, { model: string; call: Provider }>>;
  budget?: { get(key: string): Promise<number>; add(key: string, n: number): Promise<void> };
  dailyBudget?: number;
  now?: () => number;
}

const PREFERRED: Record<Task, Tier> = { classify: "t1", summarize: "t1", explain: "t2", draft: "t2", reason: "t3" };
const ORDER: Tier[] = ["t3", "t2", "t1"];

export class BudgetExceededError extends Error {}
class NoProviderError extends Error {}

class CircuitBreaker {
  private fails: number[] = [];
  private openUntil = 0;
  constructor(
    private now: () => number,
    private threshold = 3,
    private windowMs = 60_000,
    private coolMs = 30_000,
  ) {}
  get open() {
    return this.now() < this.openUntil;
  }
  success() {
    this.fails = [];
  }
  failure() {
    const t = this.now();
    this.fails = this.fails.filter((x) => t - x < this.windowMs).concat(t);
    if (this.fails.length >= this.threshold) {
      this.openUntil = t + this.coolMs;
      this.fails = [];
    }
  }
}

export function createRouter(deps: RouterDeps) {
  const now = deps.now ?? Date.now;
  const breakers: Record<Tier, CircuitBreaker> = {
    t1: new CircuitBreaker(now),
    t2: new CircuitBreaker(now),
    t3: new CircuitBreaker(now),
  };
  const daily = deps.dailyBudget ?? 20_000;

  function chain(task: Task): Tier[] {
    const start = ORDER.indexOf(PREFERRED[task]);
    return ORDER.slice(start).filter((t) => deps.providers[t]);
  }

  return {
    breakers,
    chain,
    async run(req: AiRequest): Promise<AiResponse> {
      if (req.sources.length === 0 && req.task !== "classify") throw new Error("grounding sources required");
      const used = (await deps.budget?.get(req.budgetKey)) ?? 0;
      if (used >= daily) throw new BudgetExceededError(`daily AI budget reached for ${req.budgetKey}`);
      const maxTokens = Math.min(req.maxTokens ?? 400, daily - used);
      const sourceList = req.sources.map((s, i) => `[${i + 1}] ${s.title}`).join("\n");
      const prompt = req.sources.length ? `${req.prompt}\n\nSources:\n${sourceList}\nCite sources as [n].` : req.prompt;
      let lastErr: unknown = new NoProviderError("no AI provider available");
      for (const tier of chain(req.task)) {
        if (breakers[tier].open) continue;
        const p = deps.providers[tier]!;
        try {
          const out = await p.call({ system: req.system, prompt, maxTokens });
          breakers[tier].success();
          await deps.budget?.add(req.budgetKey, out.tokens);
          return { text: out.text, tier, model: p.model, sources: req.sources, tokens: out.tokens };
        } catch (e) {
          breakers[tier].failure();
          lastErr = e;
        }
      }
      throw lastErr;
    },
  };
}

/** Workers AI provider (T1). */
export function workersAi(
  ai: { run: (m: string, i: unknown, o?: unknown) => Promise<unknown> },
  model: string,
  gatewayId?: string,
): { model: string; call: Provider } {
  return {
    model,
    call: async ({ system, prompt, maxTokens }) => {
      const r = (await ai.run(
        model,
        {
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          max_tokens: maxTokens,
        },
        gatewayId ? { gateway: { id: gatewayId } } : undefined,
      )) as { response?: string; usage?: { total_tokens?: number } };
      const text = r.response ?? "";
      return { text, tokens: r.usage?.total_tokens ?? Math.ceil((system.length + prompt.length + text.length) / 4) };
    },
  };
}

/** KV-backed daily budget counter (approximate; fine for cost guardrails). */
export function kvBudget(kv: KVNamespace, day = () => new Date().toISOString().slice(0, 10)) {
  const k = (key: string) => `aibudget:${day()}:${key}`;
  return {
    get: async (key: string) => Number((await kv.get(k(key))) ?? 0),
    add: async (key: string, n: number) => {
      const cur = Number((await kv.get(k(key))) ?? 0);
      await kv.put(k(key), String(cur + n), { expirationTtl: 172_800 });
    },
  };
}
