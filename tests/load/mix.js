// k6 scenario mix toward the 1M-user target (NFR-35/38, DEC-187).
// Fraction of the design load is set with SCALE (0.001 = 0.1 %). Free tiers cap real runs (SA-16);
// results are extrapolated per tests/load/README.md.
//   BASE_URL=https://sparkle-api.crystal-iamrolan.workers.dev SCALE=0.002 k6 run tests/load/mix.js
// Authenticated endpoints run only when TOKEN and STUDENT_ID (sample student, never real data) are set.
import http from "k6/http";
import { check } from "k6";
import { ASSUMPTIONS, capacity } from "./model.js";

const BASE = __ENV.BASE_URL || "http://localhost:8788";
const SCALE = Number(__ENV.SCALE || 0.001);
const TOKEN = __ENV.TOKEN || "";
const SID = __ENV.STUDENT_ID || "";
const authed = Boolean(TOKEN && SID);
const target = Math.max(1, Math.round(capacity().designRps * SCALE));
const DURATION = __ENV.DURATION || "3m";

const rate = (share) => Math.max(1, Math.round(target * share));
const scenario = (exec, share) => ({
  executor: "ramping-arrival-rate",
  exec,
  startRate: 1,
  timeUnit: "1s",
  preAllocatedVUs: Math.max(5, rate(share) * 2),
  maxVUs: Math.max(20, rate(share) * 10),
  stages: [
    { target: rate(share), duration: "1m" },
    { target: rate(share), duration: DURATION },
    { target: 0, duration: "30s" },
  ],
});

const m = ASSUMPTIONS.mix;
export const options = {
  scenarios: authed
    ? {
        today: scenario("today", m.today),
        tasks: scenario("tasksList", m.tasks_list),
        health: scenario("health", m.health + m.other),
      }
    : { health: scenario("health", 1) },
  thresholds: {
    http_req_failed: ["rate<0.001"], // NFR-36 at load
    "http_req_duration{name:today}": ["p(95)<200", "p(99)<500"], // cached read (NFR-38)
    "http_req_duration{name:tasks}": ["p(95)<400"],
    "http_req_duration{name:health}": ["p(95)<200"],
  },
  summaryTrendStats: ["avg", "p(50)", "p(95)", "p(99)", "max"],
};

const h = { headers: { Authorization: `Bearer ${TOKEN}` } };
export function health() {
  check(http.get(`${BASE}/health`, { tags: { name: "health" } }), { "health 200": (r) => r.status === 200 });
}
export function today() {
  check(http.get(`${BASE}/students/${SID}/today`, { ...h, tags: { name: "today" } }), {
    "today 200": (r) => r.status === 200,
  });
}
export function tasksList() {
  check(http.get(`${BASE}/students/${SID}/tasks`, { ...h, tags: { name: "tasks" } }), {
    "tasks 2xx/404": (r) => r.status === 200 || r.status === 404,
  });
}

export function handleSummary(data) {
  const c = capacity();
  const got = data.metrics.http_reqs?.values?.rate ?? 0;
  const d = data.metrics.http_req_duration?.values ?? {};
  const failed = data.metrics.http_req_failed?.values?.rate ?? 0;
  const breached = Object.entries(data.metrics)
    .filter(([, v]) => v.thresholds && Object.values(v.thresholds).some((t) => !t.ok))
    .map(([k]) => k);
  const line =
    `achieved ${got.toFixed(1)} RPS = ${((got / c.designRps) * 100).toFixed(3)} % of design ${c.designRps} RPS; ` +
    `p95 ${(d["p(95)"] ?? 0).toFixed(1)} ms, p99 ${(d["p(99)"] ?? 0).toFixed(1)} ms, failed ${(failed * 100).toFixed(3)} %; ` +
    `thresholds ${breached.length ? "BREACHED: " + breached.join(", ") : "all passed"}\n`;
  return { stdout: line, "k6-mix-summary.json": JSON.stringify({ capacity: c, scale: SCALE, data }, null, 2) };
}
