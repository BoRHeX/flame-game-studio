# BoRHeX Flame Game Studio

**I.C.E. / The Flame Game** — a lightweight mobile-browser combustion game, plus the future autonomous production system that builds it.

## Current status
- game/: early experimental interactive vertical slice, **not** a complete Pass One release. Includes a backyard hub, touch-to-walk, manual pilot/main fuel and air controls, draft, ignition, observation mode, three contract definitions and distinct pixel-particle chambers.
- studio/: activated API-backed producer, specialist and independent reviewer, scoped source proposals, durable per-run/daily/cumulative spend ledger and review-only PR pipeline. Each paid run requires a bounded one-time request and all activation guards.
- design/, memory/: game bible, architecture, four-agent AI orchestra, durable agent decision rules, roadmaps.
- tests/: unit/invariant tests and Chrome touch smoke with a screenshot artifact.

Run locally with Node 22+:

    npm test
    npm run studio:dry-run
    npm run browser:smoke

For playing:

    python3 -m http.server 8765

Then open http://localhost:8765/game/ on the same computer. The earlier isolated experiment remains at /prototypes/flame-lab/.

## Playtest distribution
The branch workflow runs independent tests and uploads the game files plus mobile screenshot as GitHub Actions artifacts. The **separate** Pages preview workflow attempts to deploy the game at the repository's standard GitHub Pages URL. If Pages has not been enabled, the owner must select Settings → Pages → Build and deployment → GitHub Actions. A GitHub Pages success check, not the presence of a workflow, confirms a publicly usable preview.

## Boundaries
- This repository is independent of BoRHeX/kbc-rpg-prototype. Do not edit the existing experimental BoRHeZ Games Studio.
- The production stack (TypeScript + Phaser / custom flame renderer) remains a measured decision, not an installed dependency.
- No API tokens in source, scheduled autonomous work or automatic merging. Authorized paid runs create review-only proposals.
- Source simulation is dimensionless gameplay design, **never real equipment guidance**.
- Do not merge into main until an actual phone playtest and independent acceptance.

## Next gate
Fix observed Chrome/mobile defects, confirm meaningful lean/rich/stable visual differences, implement durable and atomic spending controls for any future model worker, and only then allow reviewed paid task-to-PR execution.


## New API-backed production studio (review stage)

This branch adds the full I.C.E. visual constitution, specialist role registry, a separately protected AI generation job, a no-secret test job and a GitHub Actions draft-PR publisher. It does **not** call paid models unless GitHub main-branch settings and the policy allow it.

See [activation instructions](studio/runtime/README.md), [visual target](design/visual-bible.md), [full product scope](design/product-systems.md) and [studio operation](studio/production-plan.md).

The initial deterministic pipeline works one scoped task at a time. Art and audio are authored as code/data in the first iteration; image-model PNG/GIF production, human-quality music rendering and automatic multi-task scheduling require separate quality/cost gates.

