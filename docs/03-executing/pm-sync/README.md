# PM Sync

Integration is the PM's sync point (CR-0009). Cadence (DEC-72): **every 2 hours, 8 AM–8 PM ET** (8, 10, 12, 2, 4, 6, 8).

Each sync note is a file `YYYY-MM-DD-HHMM.md` (ET) with:
1. Merged since last sync (PR links, reviewer team).
2. Open PRs by team and review state; merge queue order.
3. Open `interface-change` and `docs-gap` issues and their disposition.
4. Deploys (dev URLs, versions) and smoke results.
5. Blockers and items needing Rolan (Sponsor Action Items).
6. Next 2 hours per team.
