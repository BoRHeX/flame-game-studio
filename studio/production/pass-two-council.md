# Pass Two / 25-role production wave

One **on-demand** council wave: 25 distinct specialist model sessions each deliver a specific contract; one chief integrator writes a **connected** four-file gameplay implementation; independent source review then independent no-secret Node + Chrome + trusted acceptance gates produce a review-only draft PR. Roles are sequential sessions, not 25 simultaneously running instances. Neither code generation nor QA alone changes the live game.

- Existing durable ledger enforces $2 run, $5 daily, $50 cumulative caps; one-shot requests, no cron, no new secrets.
- All source contributions are recorded as `ice-council-evidence`, so nobody can claim 25 people worked if a provider call did not happen.
- The four files explicitly connect NPC + save slots + missions + game runtime. Later specialized waves cover rich art, biome and orchestra work.
- Run once through an **isolated one-file** request commit in `studio/requests/`; preserve the older queued ICE-ROLE-08 request, which concerns a different physical valve module.
- A red gate prevents a draft PR or publish. Even a green draft PR needs integration review and a live playtest; generated code is never executed in the token-bearing job.
