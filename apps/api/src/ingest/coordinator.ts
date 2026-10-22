/**
 * SyncCoordinator Durable Object (DEC-162, DEC-167): one instance per student, named by student id.
 * Two-phase admission: `reserve` (dedupe + throttle + in-flight lock) → work → `commit` (record runKey)
 * or `release` (on failure). A failed save therefore never turns the agent's retry into a "duplicate".
 */
export const MIN_INTERVAL_MS = 5 * 60_000;
const RUNKEY_TTL_MS = 24 * 3600_000;
const INFLIGHT_TTL_MS = 2 * 60_000;

export type Admit = { ok: true } | { ok: false; reason: "duplicate" | "too_soon" | "in_flight"; retryAfterS?: number };
export type CoordOp = "reserve" | "commit" | "release";

interface Store {
  get<T>(k: string): Promise<T | undefined>;
  put(k: string, v: unknown): Promise<void>;
}

const prune = (m: Record<string, number>, ttl: number, now: number) => {
  for (const [k, t] of Object.entries(m)) if (now - t > ttl) delete m[k];
  return m;
};

/** Pure coordinator logic so it can be unit-tested without the Workers runtime. */
export async function coordinate(store: Store, op: CoordOp, runKey: string, now = Date.now()): Promise<Admit> {
  const seen = prune((await store.get<Record<string, number>>("runKeys")) ?? {}, RUNKEY_TTL_MS, now);
  const inflight = prune((await store.get<Record<string, number>>("inflight")) ?? {}, INFLIGHT_TTL_MS, now);
  if (op === "reserve") {
    if (seen[runKey]) return { ok: false, reason: "duplicate" };
    if (inflight[runKey]) return { ok: false, reason: "in_flight", retryAfterS: 30 };
    const last = (await store.get<number>("lastAccepted")) ?? 0;
    if (now - last < MIN_INTERVAL_MS)
      return { ok: false, reason: "too_soon", retryAfterS: Math.ceil((MIN_INTERVAL_MS - (now - last)) / 1000) };
    inflight[runKey] = now;
    await store.put("inflight", inflight);
    return { ok: true };
  }
  delete inflight[runKey];
  await store.put("inflight", inflight);
  if (op === "commit") {
    seen[runKey] = now;
    await store.put("runKeys", seen);
    await store.put("lastAccepted", now);
  }
  return { ok: true };
}

export class SyncCoordinator {
  constructor(private state: DurableObjectState) {}
  async fetch(req: Request): Promise<Response> {
    const { op, runKey } = (await req.json()) as { op: CoordOp; runKey: string };
    if (!["reserve", "commit", "release"].includes(op) || typeof runKey !== "string")
      return Response.json({ error: "bad_request" }, { status: 400 });
    // blockConcurrencyWhile gives strict per-student serialization.
    return Response.json(await this.state.blockConcurrencyWhile(() => coordinate(this.state.storage, op, runKey)));
  }
}
