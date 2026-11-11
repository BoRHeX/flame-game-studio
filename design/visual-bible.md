# I.C.E. visual constitution — production target (not the F0 demonstration)

## Canonical art direction
Cinematic **industrial pixel art**, not a minimalist dashboard. Every scene has deliberate geography, equipment depth, character animation, refractive chamber glow and clear visual causality. Low-resolution aesthetic with careful composition; no featureless rectangles as final art.

### Levels and layering
- Distant environmental backdrop (wide, mostly static): sun/moon, skylines, mountains, dunes, oceans, jungle canopies, snow, waterfalls, storms and day/night.
- Parallax layers: distant sky -> regional landmark -> far terrain -> midground -> **walkable industrial foreground** -> foreground occlusion -> fixed overlay UI.
- Player, industrial equipment, ladders, platforms, railings, valves, ducts and pipes use independent editable scene nodes/sprite layers and independent collision. A large background PNG cannot be the gameplay collision map.
- Camera follows the playable foreground; backgrounds drift at biome-specific parallax rates. Indoor sites may have no distant sky.
- Touch access to platforms and observation ports must remain readable and reachable.
- The primary chamber view is individually authored per mission, with nozzle/burner pose, refractory, tubes/coils, silhouettes, reflections, depth, heat shimmer and physically consistent light.

### Prior reference inventory, reconstructed from earlier design work
- **PPE-wearing operator** with flame-head silhouette in some character concepts.
- Walkable grated industrial platforms, stairs, railings, ladders and valves.
- Pipe/duct fittings, top-down valve wheel close-up, horizontal heater and tall chimney.
- Regional preview concepts: **Sweden (snow), Russia (ice), Arabia desert, Texas desert, African jungle, Brazilian jungle, Vietnamese jungle, Aruba tropical, Indonesia tropical, Canada, Italy/France, Kazakhstan, Caribbean offshore, North Sea storm**.
- A Dubai image concept included Burj Khalifa far beyond dirty desert dunes, tiny camel, plane, bright sun.
- Pixel flame: blue core near high-temperature reaction zones; white-hot highlights; yellow-orange outer glow, transparent flame edge, soot/smoke for rich combustion, flame-lift and draft states visually distinguishable.
- Flame light must visibly affect refractory and metal, not merely draw random colored dots.

This is a **reference description**, not proof that the original image assets are present in this repository. The art director must obtain original approved images or rebuild assets and document provenance. Do not silently claim the original pixel-art images were imported.

### Authoring standard
Each biome ships a manifest: palette, lighting key, camera depth scales, sky, ground, environmental modifier, ambient loop, interaction overlays, hazards, art layers, accessibility variants and performance tier. Require original asset provenance and accepted source/license. Freeze palettes and sprite scale before multiple artists run simultaneously.

### Graphics production workflow
1. Asset brief from canonical design, composition and playable geometry.
2. Asset-generation or procedural drawing worker creates source art; Image API use is separately budgeted and reviewed.
3. Pixel art director checks silhouette, anatomy, platform accessibility, image provenance and style consistency.
4. Level composer generates editable layers/parallax metadata and collision-independent equipment layout.
5. Animator adds timed sprite states and event markers; AV director binds them to authored sounds.
6. Screenshot difference/regression tests and physical Chrome playtest gate the result.

### Exact fidelity requirement
Existing demonstration sprites are scaffolding. Never consider them finished visual references. Historical rendered images are not presently bundled; original source references, when available, should be committed under assets/reference/ with explicit user approval and source metadata.
