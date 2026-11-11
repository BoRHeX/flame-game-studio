# I.C.E. vertical slice (unreleased)

Open with a local HTTP server rooted at the repository, for example:

    python3 -m http.server 8765

Navigate to http://localhost:8765/game/

**Controls:** tap a contract symbol in the hub, tap a station to move to it, adjust its physical valve/damper in the focused slider, spark pilot ignition, and enter the observation port. Normal time and observation time have different process/mission/economy scales. Flame rendering is separate from the 18 FPS world presentation.

**This is not the complete Pass One game.** It is an engineering slice: simplified dimensionless combustion, a rough hub, manual devices, three initial jobs, reactive pixel particles, and procedural audio. It does not yet include progression saves, NPC delegation, authoritative equipment acquisition, a true no-text onboarding sequence, or a verified phone-performance budget.

The existing prototype at ../prototypes/flame-lab/ remains as a frozen comparison. No API keys are needed to run the game.
