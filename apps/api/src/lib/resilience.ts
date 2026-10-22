/** Timeouts + bounded, jittered retries for outbound calls (CR-0007, NFR-42). */
export interface ResilienceOptions {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  /** Allow retrying non-idempotent methods (only when the server dedupes via Idempotency-Key). */
  retryUnsafe?: boolean;
  sleep?: (ms: number) => Promise<void>;
}

const IDEMPOTENT = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]);
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export function backoff(attempt: number, base = 100, rand = Math.random): number {
  return Math.round(base * 2 ** attempt * (0.5 + rand() / 2));
}

export function resilientFetch(fetcher: typeof fetch = fetch, opts: ResilienceOptions = {}): typeof fetch {
  const { timeoutMs = 5000, retries = 2, baseDelayMs = 100, retryUnsafe = false } = opts;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  return async (input, init = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    const canRetry = IDEMPOTENT.has(method) || retryUnsafe;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= (canRetry ? retries : 0); attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
      try {
        const res = await fetcher(input, { ...init, signal: init.signal ?? ctrl.signal });
        if (!RETRY_STATUS.has(res.status) || !canRetry || attempt === retries) return res;
        lastErr = new Error(`status ${res.status}`);
      } catch (e) {
        lastErr = e;
        if (!canRetry || attempt === retries) throw e;
      } finally {
        clearTimeout(timer);
      }
      await sleep(backoff(attempt, baseDelayMs));
    }
    throw lastErr;
  };
}
