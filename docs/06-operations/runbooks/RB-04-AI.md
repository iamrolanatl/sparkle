# RB-04: AI provider outage / cost spike
1. **Outage:** the router falls back to cheaper tiers automatically. If T1 (Workers AI) is down, chat shows the degraded message, and tasks still work because the parser is deterministic (DEC-100).
2. **Cost spike:** look at AI Gateway analytics by `budgetKey`. Lower `dailyBudget` and set the chat kill switch (`feature_flags.chat_enabled=false`) if needed.
3. **Unsafe output reported:** turn the chat flag off, keep the redacted transcript in the admin queue, and add the pattern to the guard tests. Treat any child-safety issue as Sev-1 (RB-05).
