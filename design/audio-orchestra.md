# Four-agent AI Orchestra: shared contract with animation

The orchestra is a department of the new studio, not a language model making sounds during gameplay.

1. **Composer/Conductor** — writes original motif, tempo, harmony, biome and emotional arc specifications.
2. **Orchestrator/Instrumentalist** — develops arrangements, MIDI/stems, instrument choices and render instructions.
3. **Sound Engineer** — makes mechanical/combustion/ambient SFX and parameterized loops with provenance.
4. **Audio-Visual Sync Director** — signs off event timings, animation maps and synchronization tests with character/environment animators.

Source parameters and events, not arbitrary playback timers, drive sound:
`pilot.spark.begin`, `pilot.ignite`, `main_flame.attach`, `main_flame.lift`, `combustion.pulse`, `combustion.rich`, `combustion.lean`, `soot.begin`, `chamber.overheat`, `valve.rotate`, `mission.stable`, `mission.fail`, `biome.wind_gust`.

Shared process values (stability, mass flow, draft, heat release) can control flicker, mechanical roar, ambient distortion and musical tension together. Audio uses Web Audio clock (user gesture unlock on mobile), not 18/24 FPS animation timing.

Do not store unexplained audio. Each asset must record creator role, generator & version, source material, prompt hash, rights/license, date and derivation chain. For Pass One, prefer small synthesized machinery loops and compact music motifs over heavy complete tracks. Music generation services may have costs and license terms; verify before adding them.
