# BoRHeX Flame Game Studio

**I.C.E. / The Flame Game** — a lightweight mobile-browser combustion game, plus the future autonomous production system that builds it.

## Current status — Pass Two Operator 02 published preview
The Operator expands the accepted tall-platformer foundation into three physical contracts. Backyard requires an intake-shield diagnosis/repair and air adjustment; Warehouse requires freeing and testing a seized draft linkage; Heat-Hold remains a clean-combustion temperature challenge. Each job requires inspection, physical work, adjustment, verification and a stable hold. All calibrated tools are available without purchases.

The published preview connects six department contributions: six character animation clips, four authored biome environments with real process effects, contextual persistent operator narrative, four original composer themes, their adaptive arrangements, and synchronized mechanical/process/mission cues. The environment proposal was recovered from a source-review scope deadlock and is accepted only through integrated executable checks.

The game includes analog/alternate-handed/D-pad controls, native fullscreen, physical valve-wheel and damper-lever close-ups with detents and stops, live diagnostics, operator assistance, three transactional save slots/autosave, recovery/migration, pause/options/equipment menu and portrait/landscape support. World presentation stays 18 FPS, flame 24 FPS; fixed simulation and audio scheduling remain independent.

The engineering build is complete and published at https://borhex.github.io/flame-game-studio/. All 86 Node tests, department acceptance checks and the complete real-touch Chrome route passed in PR #42 CI #43138219173 and again in Pages release #43138763886. All three contracts were won without purchases, including physical repairs, local NPC assistance, save/reload and corrupt-slot backup recovery. Physical Samsung comfort, audio mix and sustained-performance acceptance remain pending; they are not inferred from CI. See [the release evidence](memory/evidence/acceptance/pass-two-operator-02.md) and [living roadmap](design/roadmap.md).

The studio remains bounded, on-demand Producer → Specialist → independent source review → no-secret executable verification → reviewable PR. Five new specialist PRs plus the recovered environment contribution were integrated for this wave. No schedules, permanent background agents, automatic paid task loops or changes to the separate Cataclysm experiment.

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
- Reviewed development previews may integrate changes after independent tests. A game release requires an actual phone playtest and independent acceptance.

## Next gate
Collect the user's physical-phone review of the verified, published Pass Two preview. Pass Three's campaign expansion remains separate.

## New API-backed production studio (review stage)

This branch adds the full I.C.E. visual constitution, specialist role registry, a separately protected AI generation job, a no-secret test job and a GitHub Actions draft-PR publisher. It does **not** call paid models unless GitHub main-branch settings and the policy allow it.

See [activation instructions](studio/runtime/README.md), [visual target](design/visual-bible.md), [full product scope](design/product-systems.md) and [studio operation](studio/production-plan.md).

The initial deterministic pipeline works one scoped task at a time. Art and audio are authored as code/data in the first iteration; image-model PNG/GIF production, human-quality music rendering and automatic multi-task scheduling require separate quality/cost gates.


