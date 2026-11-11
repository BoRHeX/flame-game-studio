# BoRHeX Flame Game Studio

**I.C.E. / The Flame Game** — a lightweight, mobile-browser combustion game and the future autonomous production system that builds it.

## Project boundaries
- This is a **new, independent repository**. Do not edit `BoRHeX/kbc-rpg-prototype` or the experimental BoRHeZ Games Studio.
- `game/` and `prototypes/` hold game code. `studio/` holds work-order, agent-memory, budget and production infrastructure.
- **No paid AI worker is installed or enabled.** All studio settings are policy drafts until a separately tested enforcement implementation exists.
- The original I.C.E. design and the accompanying research plan are the source of the foundation. The canonical rules are recorded under `memory/canonical/` and `design/`.

## Current milestone: foundation 01
- Game bible, system architecture, release criteria and living roadmap
- Scoped agent roster including the four-agent AI orchestra
- Canonical, decision, task and incident memory rules
- Explicit cost and repository write-permission policy
- A zero-dependency lab prototype plus Node test harness (not a finished Pass One game)

Run tests: `npm test`. Open `prototypes/flame-lab/index.html` through a local static HTTP server, for example `python -m http.server 8000`, then visit `/prototypes/flame-lab/`.

**Next deliverable:** validate flame scenarios and mobile input, then introduce audited task-to-PR automation. No agent gets credentials or merge/deploy privileges at this stage.
