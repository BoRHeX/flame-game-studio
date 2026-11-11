# I.C.E. — canonical game bible (foundation draft)

The game is a **flame-first**, single-player industrial tuning adventure. The first-run UI conveys gameplay without language through equipment poses, icons, sound, and cause/effect. Source code and accessibility semantics remain readable and properly named.

## LOCKED identity
1. **The flame is the truth.** Observe → adjust → verify → hold.
2. Players walk, inspect, manually turn valves/air dampers, operate switches and interact with machinery in close-up views. A diagnostic number is a later tool reward, not a baseline HUD.
3. An authoritative, deterministic burner solver drives flame shape, color, luminosity, flicker, soot, chamber temperature, risk and sound. A renderer must never invent process truth.
4. The Backyard Burner hub is home, workshop, introduction and contract staging ground. Cash drains over time; contracts replenish funds.
5. The player may beat the story without buying character upgrades or perks. **Equipment/tool ownership** can unlock additional mission access; upgrades primarily improve knowledge, convenience, authority or appearance.
6. The main story eventually has alternate endings and a final contract offered only once. Those systems have schemas from Pass One and gameplay implementation in later passes.
7. Physical actions and operator authority are real gameplay, not menu shortcuts.
8. A job specifies chamber, burner, devices, initial state, objective, modifiers, operator authority, failures and payout.
9. Multiple authored chamber flow fields make levels mechanically distinctive.
10. There is a dedicated four-role AI orchestra coordinated with mechanical and character/environment animation.
11. Legacy `BoRHeX/kbc-rpg-prototype` and its workflows must not be changed.

## Time and animation (LOCKED)
- NORMAL: simulation ×1; mission time ×1; cash drain ×1.
- WATCHING FLAME: process & mission clocks accelerate; cash drain slows. All harmful process evolution accelerates too. Multipliers are **TUNABLE** data, not secret constants.
- World/environment presentation 18 FPS; independently rendered flame 24 FPS; input and audio timing are not limited to either frame rate.

## First pass (LOCKED exit criteria)
A phone player can move around a backyard, inspect at least one visually reactive flame, manipulate valves and ignition in-world, experience the two time states and declining cash, learn an iconographic short tutorial, and succeed or fail **three distinct jobs**. A playable demo and an honest living roadmap are required.

Proposed first jobs:
- Backyard Light-Off — pilot, air, ignition, main transition.
- Warehouse Restart — restricted draft and sticky damper.
- Heat-Hold Contract — tune and hold without sooting or overfire.

## Progression boundaries (LOCKED)
Pass Two: player receives preset competent equipment/stats; no mandatory purchasable upgrades. Polish two levels, preserve three playable scenarios, implement save, UI, narrative skeleton and biome modifiers.
Pass Three: 7+ authored levels, campaign, economy, equipment-gated access, progression, rich biome animation, audio themes and cutscenes.
Pass Four: story/challenge/puzzle modes, varied characters, optional abilities/upgrades/perks, equipment, secrets and multiple endings.

## Deferred but represented by schemas
CharacterDefinition, CharacterStats, PerkDefinition, ToolDefinition, EquipmentDefinition, UpgradeDefinition, JobDefinition, CustomerDefinition, BiomeDefinition, AuthorityRule, OperatorDefinition, EndingDefinition, StoryFlag, WorkshopTask, ChallengeDefinition, PuzzleDefinition, AudioTheme, ChamberDefinition, BurnerDefinition.

## Observation, not fantasy physics
No CFD. Flow is scripted spatially with virtual-pipe zones. Combustion is a simplified causal model, not an industrial design or safety tool. Rich/lean, unlit fuel, flameout, delayed ignition and overfire must be distinguishable and testable.

## Later content not to forget
Operator delays/refusals, varying gas quality, draft/fans, storm modifiers, character variety, equipment bench, instrumentation, field notebook, offline workshop tasks, parallax, interactive biomes, orchestra, easter eggs and one-time finale.

## Design-state vocabulary
`LOCKED` = explicit product rule; `TUNABLE` = parameters; `PROPOSED` = candidates requiring decision; `DEFERRED` = contract exists, implementation intentionally absent.
