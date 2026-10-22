# RB-05: Privacy or security incident (Sev-1)
**Examples:** one family can see another family's data, a secret has leaked, the vault access log shows anomalies, or a credential-shaped field turns up in ingest logs.
1. **Contain (15 min):**
   - Turn off the affected feature flag (the vault, chat and ingest flags all fail closed).
   - Rotate any exposed secret (Supabase secret key, VAULT_KEK version, API tokens) through the secret store. Never paste a secret into a chat or a ticket.
2. **Preserve evidence:** export the relevant logs and `vault_access_log` / `share_audit_log` rows to the incident folder, which is not committed to git.
3. **Assess scope:** work out which students and which data classes were affected. The cross-tenant RLS suite plus a targeted pg test reproduces the issue.
4. **Notify:** Rolan decides. Breach notifications (FERPA, COPPA, state laws such as GA) and their timelines need privacy counsel (SA-19). **The bot never sends external notices.**
5. **Fix:** ship the fix with a regression test, review it under SOP-14, and apply migrations under SOP-15.
6. **Post-incident review** within 5 business days.
