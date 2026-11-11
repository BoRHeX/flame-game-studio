# I.C.E. multi-department production studio V2

**25 registered and individually configured specialist agents**, one central Producer, independent QA and Integrator roles, with **four dedicated AI Orchestra specialists**. Each agent is a role-specific model session on demand, not a permanently running server.

## Routing
1. Read canonical game vision, approved design decisions, latest accepted interfaces, and agent profile.
2. Producer selects a ready task from `studio/production/pass-one-dag.json` and returns a scoped plan.
3. The assigned specialist produces only files allowed by its work order. A default one-file target prevents malformed multi-file output.
4. Independent QA reviews the candidate against the canonical vision, technical interfaces, character/graphics/audio requirements and risks.
5. On rejection, Producer triages the defects and explicitly briefs the same specialist for correction. At most two corrections within one reserved run.
6. If approved, independent tests and a mobile browser smoke test run without any API key. A draft PR is opened only when those checks pass.
7. Integrator assembles reviewed PRs and validates the complete game. No worker may merge, alter CI, or edit secrets. The user playtests accepted builds.

## Departments
Production: Producer, Game Director, Technical Director, Integrator.
Combustion: combustion engineer, flame behaviour engineer, particle engineer, chamber designer.
Gameplay: interaction, missions, economy, NPC, UI, persistence.
Art: pixel-art director, character animator, environment animator.
Orchestra: composer/conductor, instrumentalist/orchestrator, sound engineer, AV sync director.
World & Story: narrative designer.
QA & release: QA architect, performance engineer, security/release specialist.

## Working memory
`studio/agents/profiles/*.json` stores individual expertise, source boundaries and handoffs. Canonical game knowledge is shared, while each brief contains only role-relevant source and prior incidents. Profiles are durable through commits; conversations are not authoritative memory. Compacted lessons and rejected work are evidence, never current requirements.

## Boundaries
No 25-way simultaneous token burn, no unscheduled unlimited workflow cascade and no automatic merging. The existing experimental BoRHeZ Games Studio remains untouched. The current first-pass browser game must remain playable. The art team can author layered SVG and structured pixel data; original raster and high-quality mastered musical assets need separate asset/rendering workflows and provenance checks. Music for a game must be original/licensed.

## One-shot operation
A technical operator (normally ChatGPT) adds one verified `studio/requests/*.json` file on `main` to initiate a single specific work order, after checking dependencies and risk. The user only has to test the playable build and make creative decisions.
