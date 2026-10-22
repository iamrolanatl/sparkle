import { describe, expectTypeOf, it } from "vitest";
import type { SyncBatch as ApiBatch } from "../../api/src/ingest/schema";
import type { SyncBatch as AgentBatch } from "./types";

describe("wire contract (Team E #47-4)", () => {
  it("agent SyncBatch is identical to the API's", () => {
    expectTypeOf<AgentBatch>().toEqualTypeOf<ApiBatch>();
  });
});
