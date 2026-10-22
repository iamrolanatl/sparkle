import { ingestQueue } from "./ingest/route";
/**
 * Single queue entrypoint (Integration arbitration of #31/#48). The Worker has one `queue()` export;
 * each team registers a handler for its queue name here — one line per team, no other shared edits.
 * Unknown queues are retried (not acked) so messages are never silently dropped.
 */
import { scanQueue } from "./scans/route";

export type QueueHandler<E = unknown> = (batch: MessageBatch<unknown>, env: E, ctx: ExecutionContext) => Promise<void>;

export function makeDispatcher<E>(handlers: Record<string, QueueHandler<E>>) {
  return async (batch: MessageBatch<unknown>, env: E, ctx: ExecutionContext) => {
    const h = handlers[batch.queue];
    if (!h) {
      console.error(JSON.stringify({ level: "error", msg: "no_queue_handler", queue: batch.queue }));
      batch.retryAll();
      return;
    }
    await h(batch, env, ctx);
  };
}

/** Registry. Team D: "sparkle-ingest". Team B: "sparkle-scans-ocr". */
export const queueHandlers: Record<string, QueueHandler<never>> = {
  "sparkle-scans-ocr": scanQueue as QueueHandler<never>,
  "sparkle-ingest": ingestQueue as QueueHandler<never>,
};
