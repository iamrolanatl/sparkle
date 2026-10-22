# RB-02: Latency SLO burn
**Detect:** p95 > 2× NFR-38 (cached read 200 ms, write 400 ms) for 10 min, or an error-budget burn above 14.4× over 1 h.
1. Find out which route is slow (Workers analytics by path, or `observe` logs with `ms > 1000`).
2. **For a Today or cached route,** check the KV hit rate. A low hit rate means invalidation is churning, so check imports and ingest.
3. **For a DB route,** run Supabase → Query Performance, look for missing indexes or `auth.uid()` without `(select …)`, and fix it with an additive index migration (SOP-15).
4. **For an AI route,** a slow tier should trip its breaker. Force a cheaper tier by disabling T2/T3 keys.
5. If more than 50 % of the 7-day error budget is burned, apply the NFR-39 feature freeze.
