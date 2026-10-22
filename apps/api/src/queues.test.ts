import { describe, expect, it, vi } from "vitest";
import { makeDispatcher } from "./queues";

const batch = (queue: string) =>
  ({ queue, messages: [], retryAll: vi.fn(), ackAll: vi.fn() }) as unknown as MessageBatch<unknown>;
const ctx = {} as ExecutionContext;

describe("queue dispatcher", () => {
  it("routes by queue name", async () => {
    const a = vi.fn(async () => {});
    const b = vi.fn(async () => {});
    const d = makeDispatcher({ "q-a": a, "q-b": b });
    await d(batch("q-b"), {}, ctx);
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
  });
  it("retries unknown queues instead of dropping", async () => {
    const bt = batch("nope");
    await makeDispatcher({})(bt, {}, ctx);
    expect(bt.retryAll).toHaveBeenCalledOnce();
  });
});
