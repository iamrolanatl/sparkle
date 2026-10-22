import { serviceRest } from "../lib/supa";
import { rotateKek, type RotationEnv } from "./rotation";

export interface JobsEnv extends RotationEnv {
  VAULT_BUCKET?: R2Bucket;
}

/** Two-phase purge (DEC-28): claim → delete R2 objects → finalize only what R2 confirmed. */
export async function purgeDue(env: JobsEnv): Promise<{ purged: number; failed: number }> {
  if (!env.VAULT_BUCKET) return { purged: 0, failed: 0 };
  const rest = serviceRest(env);
  const rows = await rest<{ r2_key: string }[]>("rpc/vault_purge_claim", { method: "POST", body: "{}" });
  const done: string[] = [];
  let failed = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    const keys = rows.slice(i, i + 1000).map((r) => r.r2_key);
    try {
      await env.VAULT_BUCKET.delete(keys);
      done.push(...keys);
    } catch {
      failed += keys.length; // stays claimed; re-claimed after 1 h
    }
  }
  if (done.length) await rest("rpc/vault_purge_finalize", { method: "POST", body: JSON.stringify({ p_keys: done }) });
  return { purged: done.length, failed };
}

interface LifecycleEvent {
  event_student: string;
  event_kind: string;
}

/** Inactivity + age-18 lifecycle (DEC-28). Returns events for the notification queue — this job sends nothing. */
async function runLifecycle(env: JobsEnv): Promise<LifecycleEvent[]> {
  return serviceRest(env)<LifecycleEvent[]>("rpc/vault_lifecycle_run", { method: "POST", body: "{}" });
}

/** Daily vault maintenance; Integration wires this into the Worker's scheduled() handler. Flag-independent (deletion must run). */
export async function vaultDaily(env: JobsEnv) {
  const purge = await purgeDue(env);
  const lifecycle = await runLifecycle(env);
  await serviceRest(env)("rpc/vault_access_log_prune", { method: "POST", body: "{}" });
  const rotation = await rotateKek(env);
  console.log(JSON.stringify({ level: "info", msg: "vault_daily", purge, events: lifecycle.length, rotation }));
  return { purge, lifecycle, rotation };
}
