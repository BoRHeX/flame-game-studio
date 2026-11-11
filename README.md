# BoRHeX Flame Game Studio

**I.C.E. / The Flame Game** — a lightweight mobile-browser combustion game, plus the future autonomous production system that builds it.

## Current status
- game/: early experimental interactive vertical slice, **not** a complete Pass One release. Includes a backyard hub, touch-to-walk, manual pilot/main fuel and air controls, draft, ignition, observation mode, three contract definitions and distinct pixel-particle chambers.
- studio/: canonical scoped work orders, specialist role roster, context briefing and budget math. **No paid worker exists or is enabled.** Policies are not durable global cost enforcement.
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
- No AI API tokens, scheduled autonomous work, production deployment or paid model calls.
- Source simulation is dimensionless gameplay design, **never real equipment guidance**.
- Do not merge into main until an actual phone playtest and independent acceptance.

## Next gate
Fix observed Chrome/mobile defects, confirm meaningful lean/rich/stable visual differences, implement durable and atomic spending controls for any future model worker, and only then allow reviewed paid task-to-PR execution.
