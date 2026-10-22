/** Per-IP rate limiting. Uses the Workers Rate Limiting binding when present, else an in-isolate window. */
export interface RateLimitBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

const memory = new Map<string, number[]>();

export async function allow(
  key: string,
  binding?: RateLimitBinding,
  max = 10,
  windowMs = 60_000,
  now = Date.now(),
): Promise<boolean> {
  if (binding) return (await binding.limit({ key })).success;
  const hits = (memory.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    memory.set(key, hits);
    return false;
  }
  hits.push(now);
  memory.set(key, hits);
  return true;
}

export function _resetMemory() {
  memory.clear();
}
