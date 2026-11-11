# Full I.C.E. product systems — implementation contracts

The game is not only a combustion sandbox. The following must be represented as explicit interfaces and planned release gates.

## One core simulation, many levels
- Deterministic pilot/main flame, ignitability, airflow, recirculation, draft, soot, meltdown, process temperature and shutoff.
- Per-level authored combustion chamber and virtual flow-zone graph.
- Interaction: player traversal, ladders, pass-through grating, proximity, detailed valve/damper/panel close-up, input customisation, operator requests with access restrictions, NPC pathing/latency.
- Independent simulation, mission, cash, input, world animation (18 FPS), flame animation (24 FPS), Web Audio timing.
- Observation state accelerates all process evolution **including danger**, mission clock and reduces cash drain. Upgrades may tune multipliers but are not required for campaign completion.

## Scene runtime
- Backyard Burner hub is a real navigable place, not a list of buttons.
- Intro/tutorial demonstrates close-up manipulation, ignition, process response and inspecting the flame with no written instructions in the world. Accessible semantic labels and optional external help are acceptable.
- Level transitions and loading screens show the destination biome and contract icons, preserve money/process state, and never lose session data on mobile tab transitions.
- Fullscreen-ish Samsung Chrome portrait/landscape layout, customizable controls, touch targets, alternate handedness, sensitivity, haptic toggle and audio controls.

## Time and saves
- Runtime UTC is derived from device Date.now() and timezone from Intl.DateTimeFormat; offline workshop credit reconciled on return using persisted timestamps and strict caps. The device clock is **not authoritative** and may be manipulated. Do not require network connection for a single-player game.
- At least three independent save slots plus an autosave mechanism with schema version, migrations, backup-on-write and corruption recovery. Autosave on contract transitions, purchase, significant objective state change and page hide.
- Persistent player notebook, replayable contracts and workshop experiments. Automated workshop tasks produce capped offline proceeds based on equipped assets, materials and elapsed wall clock.

## Economy and progression
- Cash continuously drains while operating the company; contract payments and workshop testing fund it.
- Equipment purchases unlock contracts/permission/measurements, not mandatory character statistics; optional upgrades are mostly quality-of-life, accuracy, convenience or aesthetics.
- Reputation, permits, tools, operator authority, contracts, client relationships, hidden story flags and endings need distinct persistence types.
- Zero-optional-upgrade victory route remains a campaign balance invariant.
- One-time final contract requires save-protected offer semantics, state machine and multiple ending conditions.

## Modes and content
- Story mode: progression, 15 environments/biomes as design horizon, branching incidents, weird/special requests, final one-time job and endings.
- Challenge mode: replayable efficiency/time/safety constraints, no dependence on random mandatory purchases.
- Puzzle mode: authored burner control/diagnosis problems with reproducible seeds.
- Variety of characters, selectable abilities, perks, wardrobe, equipment, rare special discoveries and easter eggs.
- Industrial pixel-art biomes with editable platforms, parallax, local lighting, storms, temperature/wind/draft modifiers, interactive scenery and cutscenes.

## Audio and animation
- Four-agent Orchestra: composer/conductor, orchestrator/instrumentalist, sound engineer, AV sync director. Synchronized with environment and character animators.
- Parameter-linked roar, lift, puff, valve motion, alarms and state changes. Sound is independent of render ticks; original biome-specific arrangements (orchestral + liquid DnB + regional instrumentation).
- No undisclosed copyrighted recordings or unidentified generated assets; every item needs provenance and applicable commercial-use rights.

## Release quality
Independent QA, mobile Chrome performance budget, no writable secrets in untrusted test jobs, replay fixtures, gamepad/touch input validation, accessibility, save migrations and documented device test passes.
