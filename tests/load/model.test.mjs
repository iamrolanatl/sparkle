import { strict as assert } from "node:assert";
import { capacity } from "./model.js";
const c = capacity();
// Must stay consistent with NFR-35 (≈30k concurrent, ≈6k RPS design point).
assert.ok(c.designConcurrent >= 28_000 && c.designConcurrent <= 32_000, `concurrent ${c.designConcurrent}`);
assert.ok(c.designRps >= 5_500 && c.designRps <= 6_500, `rps ${c.designRps}`);
console.log("capacity model ok", c);
