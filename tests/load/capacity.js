// Capacity ramp (CR-0007). Run manually against dev with modest VUs; full-scale (6k RPS) needs paid tiers (SA-16).
// BASE_URL=https://sparkle-api.crystal-iamrolan.workers.dev PEAK_VUS=200 k6 run tests/load/capacity.js
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:8788";
const PEAK = Number(__ENV.PEAK_VUS || 50);

export const options = {
  stages: [
    { duration: "1m", target: Math.round(PEAK / 4) },
    { duration: "2m", target: PEAK },
    { duration: "1m", target: 0 },
  ],
  thresholds: { http_req_failed: ["rate<0.001"], http_req_duration: ["p(95)<200", "p(99)<500"] },
};

export default function () {
  check(http.get(`${BASE}/health`), { 200: (r) => r.status === 200 });
  sleep(1);
}
