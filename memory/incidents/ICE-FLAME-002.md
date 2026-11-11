# ICE-FLAME-002: rejected renderer after bounded correction
Status: incident evidence, NOT canonical game design
Date: 2026-11-11
Run: 43066083767
API token spend: USD 0.032345, settled
Published game changes: none

The independent reviewer rejected the final candidate because capped particle births could accumulate in spawnRemainder and continue spawning after the flame extinguished. It also found unsupported assumptions about chamber geometry bounds and missing transition tests.

Root cause: the specialist was given the owned flame renderer source but not the read-only game/chambers/flow.mjs contract, the burner solver, or existing burn-state tests. The repair model guessed geometry.

Prevention: include those exact dependency modules in the specialist brief AND independent review and repair, keep a rejected-source artifact, and require a seeded regression from saturated emission to flame off with zero new births. Never bypass QA to get a green run.
