import { describe, expect, it, vi } from "vitest";
import { makeScheduler } from "./scheduled";

const ev = (cron: string) => ({ cron, scheduledTime: 0, noRetry() {} }) as unknown as ScheduledController;
const ctx = {} as ExecutionContext;

describe("cron scheduler", () => {
  it("runs every handler for the cron and isolates failures", async () => {
    const ok = vi.fn(async () => 1);
    const bad = vi.fn(async () => {
      throw new Error("x");
    });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await makeScheduler({ "* * * * *": [bad, ok] })(ev("* * * * *"), {}, ctx);
    expect(ok).toHaveBeenCalledOnce();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
