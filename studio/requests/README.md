# One-time studio work requests

When the studio is enabled, the assistant can initiate bounded production without asking the player to open GitHub Actions. The assistant adds **one new** JSON request file in this folder as a dedicated commit on main. GitHub Actions then automatically reserves the work-order budget, runs the producer/specialist/reviewer workflow, reconciles its API usage, tests the candidate in a no-secret checkout, and opens a **draft pull request**.

Example request:

```json
{"version":1,"order":"studio/work-orders/ice-flame-polish-01.json"}
```

Security requirements: main branch only; exactly one newly added request file per commit; fixed work-order path; schema and role validation; single serialized workflow; daily/per-run/cumulative budget guards; no automatic retry or merge. Existing modified request files cannot start paid runs. No schedule exists.

The player is responsible only for credentials/permissions inaccessible to the GitHub connector and for playing and reviewing the game. All technical triggering, code integration and troubleshooting should be handled by the production team.
