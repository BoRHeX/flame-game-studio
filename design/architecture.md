# Technical architecture and initial engineering decisions

## Target and candidate stack
Mobile Chrome is primary; desktop web secondary. Planned production stack: **TypeScript + Phaser for world/interaction + independent pixel-particle chamber renderer + Web Audio + Vite**. This is a candidate, not yet a dependency. A zero-dependency plain-JS Flame Lab under `prototypes/` measures the simulation and rendering contracts before committing to an engine. Godot Web, PixiJS and pure Canvas remain alternatives; choose by measured mobile fit, integration cost and input/asset needs.

## Trust and dependency direction
```
DeviceCommand -> BurnerSolver -> BurnerState -> Failure/MissionEvaluator
                                     |
                                FlameVisualMapper
                                  /          \
                          ParticleRenderer  Audio Event State
                                  |
                         ChamberFlowField (authored)
```
A state solver must accept a seeded input sequence and yield reproducible outputs. The renderer and audio may embellish truth but not independently alter it.

## Required contracts
`BurnerDefinition`, `BurnerState`, `DeviceCommand`, `FlameVisualState`, `ChamberDefinition`, `FlowZone`, `GameEvent`, `JobDefinition`, `SaveVersion`.
No agent can change public contracts without an ADR and dependent-owner review.

## Independent clocks
- Input via browser pointer/touch events and requestAnimationFrame.
- Process solver fixed-step (target 60 ticks per simulation second).
- World presentation 18 FPS, flame presentation 24 FPS.
- Web Audio scheduling independent from visual frames.
- Mission and economy clocks driven by explicit scalar multipliers.
- Watch mode defaults are prototype values only (process 2x, mission 2x, money drain 0.35x); final values are balance data.
- Never use a single game-FPS knob to speed gameplay. Bound accumulated ticks to prevent mobile tab-resume runaway.

## Flame model
Device opening is not flow. Flow depends on coefficients, pressure, draft and restrictions. Pilot/main ignition are state machines; unburnt fuel can accumulate; heat release and chamber temperature evolve with losses; lean/rich/stability/soot are derived. Flame render particles have position, velocity, normalized temperature, age, size, light, fuel/oxygen and smoke state. Per-zone vector fields drive movement; typed-array pooling and spatial grids are preferred over all-pairs collisions.

## Chamber authoring
Levels specify nozzles, inlets, acceleration/mixing/combustion/recirculation/exhaust/dead zones, wind biases, operating ranges, target conditions and failure thresholds as data. Do not hard-code each new level into `BurnerSolver`.

## Persistence and offline work
Local versioned save with migrations. Background Chrome tasks are not persistent, so workshop offline earnings are calculated on return from saved timestamps, with caps. Local-only saves cannot prevent clock manipulation; avoid advertising impossible integrity.

## Testing and acceptance
Independent unit/property tests, seeded replay fixtures, browser touch tests, Android physical playtests, visual flame diagnosis (numeric debug hidden), FPS profiling, save migration fixtures, mission solvability and cost evidence. The user owns creative acceptance; green CI alone does not declare a good game.
