import { describe, expect, it, vi } from "vitest";
import { NotConfirmedError, sendConfirmed } from "./gate";

const base = {
  id: "d1",
  body: "Hi",
  recipient: "t@example.com",
  confirmed_at: null,
  confirmed_by: null,
  sent_at: null,
};

describe("confirmation gate (WBS 3.6)", () => {
  it("refuses to send an unconfirmed draft", async () => {
    const t = vi.fn();
    await expect(sendConfirmed(base, t)).rejects.toBeInstanceOf(NotConfirmedError);
    expect(t).not.toHaveBeenCalled();
  });
  it("sends a confirmed draft exactly once", async () => {
    const t = vi.fn(async () => {});
    await sendConfirmed({ ...base, confirmed_at: "2026-10-22T00:00:00Z", confirmed_by: "u" }, t);
    await sendConfirmed({ ...base, confirmed_at: "2026-10-22T00:00:00Z", confirmed_by: "u", sent_at: "x" }, t);
    expect(t).toHaveBeenCalledTimes(1);
  });
});
