# Load tests and the 1M-user capacity model (NFR-35, DEC-187)

| Script | Purpose | Where it runs |
|---|---|---|
| `smoke.js` | Correctness and error rate at small scale | CI, every PR (local `wrangler dev`) |
| `capacity.js` | Simple VU ramp on `/health` | Manual, against dev |
| `mix.js` | **Arrival-rate scenario mix scaled from the capacity model** | Manual or scheduled, against dev (sample data only) |
| `model.js` | Capacity math shared by `mix.js` and `model.test.mjs` | `node tests/load/model.test.mjs` |

## Capacity model (`model.js`)
| Step | Assumption | Result |
|---|---|---|
| Registered users | NFR-35 | 1,000,000 |
| School-day DAU | 35 % | 350,000 |
| Peak-hour active (7–8 AM ET) | 20 % of DAU | 70,000 |
| Concurrent sessions | 10-min sessions | ≈ 11,700 |
| Design concurrency | × 2.5 headroom | **≈ 29,200** (NFR-35: 30k) |
| Request rate | 12 req per session-minute | ≈ 2,300 RPS → **≈ 5,800 RPS design** (NFR-35: 6k) |
| DB-touching RPS | Today KV hit 95 %; tasks and chat hit the DB | **≈ 2,200 RPS** to Supabase |

**Finding: the database is the bottleneck, not Workers.** Workers scale horizontally. At design load, about 2,200 DB-touching RPS needs the Supabase connection pooler (Supavisor transaction mode) and a paid compute tier. The Free plan (60 direct connections, pauses when idle, no PITR) cannot reach it, which matches R-32. Mitigations already in the design: the KV Today cache (DEC-61), `(select auth.uid())` RLS, and FK indexes (#8). Planned: cache task lists in KV per student with 60 s staleness, and move chat persistence to Queues so writes are batched.

## Running `mix.js`
```bash
BASE_URL=https://sparkle-api.crystal-iamrolan.workers.dev SCALE=0.002 k6 run tests/load/mix.js
# with authenticated endpoints (SAMPLE student only; never real data):
TOKEN=<sample session token from secret store> STUDENT_ID=<sample uuid> SCALE=0.002 k6 run tests/load/mix.js
```
`SCALE` is the fraction of the design RPS. Free-tier limits (Workers Free 100k requests per day, Supabase Free) cap real runs at about 0.1–0.5 %. A full-scale window needs SA-16 (Workers Paid) and a paid Supabase tier, and both are sponsor decisions.

## Extrapolation method
1. Run `mix.js` at 3 or more scales (e.g. 0.1 %, 0.3 %, 0.5 %) and record p95, p99 and the error rate.
2. Workers latency should stay flat as scale increases. If it does, the edge is not the constraint.
3. For the DB, measure Supabase CPU, connections and query p95 at each step and fit a linear model. The projected design-point DB load must stay under 70 % of the target tier's capacity.
4. Record the results in the gate report (`docs/04-monitoring-controlling/gate-reports/`).

## Baseline (2026-10-21, local `wrangler dev`, health-only mix)
At SCALE=0.005: 17.4 RPS achieved (0.3 % of design), p95 5.7 ms, p99 15.8 ms, 0 errors, all thresholds passed. This is a harness check only, not a capacity claim.
