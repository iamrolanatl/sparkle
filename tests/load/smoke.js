// k6 smoke test (CR-0007, DEC-55). Thresholds mirror NFR-38 at smoke scale.
// Local CI:  BASE_URL=http://localhost:8788 k6 run tests/load/smoke.js
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:8788";

export const options = {
  scenarios: {
    smoke: { executor: "constant-vus", vus: Number(__ENV.VUS || 20), duration: __ENV.DURATION || "30s" },
  },
  thresholds: {
    http_req_failed: ["rate<0.001"], // 99.9 %
    // NFR-38 targets (200/500 ms) apply to the deployed edge; CI runs wrangler dev on a shared runner, so CI
    // passes looser P95/P99 via env and the gate there is correctness (error rate). DEC-65.
    "http_req_duration{name:health}": [`p(95)<${__ENV.P95 || 200}`, `p(99)<${__ENV.P99 || 500}`],
    checks: ["rate>0.999"],
  },
};

export function setup() {
  for (let i = 0; i < 20; i++) http.get(`${BASE}/health`); // warm-up (not measured against thresholds)
}

export default function () {
  const r = http.get(`${BASE}/health`, { tags: { name: "health" } });
  check(r, { "health 200": (x) => x.status === 200, "status ok": (x) => x.json("status") === "ok" });
  sleep(0.5);
}
