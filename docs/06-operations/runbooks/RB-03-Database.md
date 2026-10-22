# RB-03: Supabase degraded / connection exhaustion
1. Check status.supabase.com and the project's health page. Free projects **pause** after inactivity, so resume the project if it was paused (R-32).
2. **Connections:** confirm the API is using the pooler (transaction mode) and not direct connections. Look at the connection count against the limit.
3. **Shed load:** serve stale Today documents (KV keeps them), and switch off imports, ingest and OCR queues by pausing the consumers.
4. **Never** restore a backup over production without Rolan's approval (hard limit). Follow SOP-11 and SOP-15.
5. **Verify:** `/health?deep=1` reports `supabaseMs` < 300 and no 503s for 15 min.
