/**
 * Single cron entrypoint (Integration). Teams register one handler per cron expression; one line each.
 * Errors are logged per handler so one failing job never blocks the others.
 */
import { purgeScans, type ScansEnv } from "./scans/route";
import { vaultDaily, type JobsEnv } from "./vault/jobs";

export type CronHandler<E = unknown> = (env: E, ctx: ExecutionContext) => Promise<unknown>;

export function makeScheduler<E>(handlers: Record<string, CronHandler<E>[]>) {
  return async (event: ScheduledController, env: E, ctx: ExecutionContext) => {
    const list = handlers[event.cron] ?? [];
    if (!list.length) console.error(JSON.stringify({ level: "error", msg: "no_cron_handler", cron: event.cron }));
    const results = await Promise.allSettled(list.map((h) => h(env, ctx)));
    for (const r of results)
      if (r.status === "rejected")
        console.error(JSON.stringify({ level: "error", msg: "cron_failed", cron: event.cron, err: String(r.reason) }));
  };
}

/**
 * Registry. "30 3 * * *" (daily, UTC): Team C `vaultDaily` (vault flag OFF — must no-op when disabled) and
 * Team B `purgeScans` (DEC-126: delete scan originals/unsaved scans older than 30 days). Each team adds one line.
 */
export const cronHandlers: Record<string, CronHandler<never>[]> = {
  "30 3 * * *": [(env) => purgeScans(env as ScansEnv), (env) => vaultDaily(env as JobsEnv)],
};
