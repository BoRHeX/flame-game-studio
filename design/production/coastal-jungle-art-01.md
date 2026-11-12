# Coastal jungle art wave — I.C.E.
Date: 2026-11-12
Authorization: user requested continued development toward the approved jungle/coastal preview and explicitly instructed the studio to resume the existing game plan.

## Deliver the next visible build
Build on the published Pass Two Operator game. The immediate work is substantial original industrial pixel art in the actual playable renderer. The four-pass game plan remains in design/game-bible.md and design/roadmap.md; this wave advances the visual target before campaign expansion.

## Approved visual target
Industrial foreground set in a dense coastal jungle, with Chilean Pacific sunset in the parallax distance. Warm peach/coral/gold horizon over a cool teal ocean; distant coastal ridges; layered dark emerald jungle canopy, palms/ferns/vines; weathered steel, pipes, refractory, grating, stairs and railings in the playable foreground. A closed combustion chamber emits light through inspection ports and seams; the furnace is not an open-front bonfire. A smoking stack and readable animated PPE workers convey a living plant. Equipment silhouettes, material texture and lighting must be a substantial visible change at normal phone scale.

The approved generated preview is a composition reference from the conversation, not an imported game asset. Its image bytes are not in this repository. Work from this explicit composition brief and create original editable code-based pixel art; never claim imported raster artwork.

## Art jobs and existing contracts
1. Environment Animator: replace game/world/parallax.mjs artwork with authored coastal sunset, ocean, ridges and jungle depth for the outdoor site. Give the hub warm workshop windows/openings that relate to this location. Keep Warehouse visibly enclosed and Heat-Hold an industrial heater scene. Preserve the exact public API and all process weather formulas/ranges from ADR-0006. Background art is not collision geometry.
2. Environment Animator / level art: enrich game/world/industrial-yard.mjs foreground with pixel-material detail, closed boiler/chamber, glowing ports, stack smoke, grates, pipe elbows/flanges, handrails, lights and authored PPE characters. Preserve actual geometry, interaction IDs, stations, repair visuals, process truth and pose-driven character animation. Keep existing spawn, platform and ladder coordinates for this art wave so saved games and authored touch routes remain valid. Middle-platform/stair geometry expansion belongs to a separately verified gameplay change; do not paint walkable-looking stairs into empty collision space.

## Release evidence
Existing 86 tests, all department checks and the complete no-purchase touch route must still pass. Run both protected environment and major-world acceptance checks. Inspect actual before/after mobile screenshots for the outdoor site and workshop: recognizable ocean sunset, jungle depth, textured industrial silhouettes and closed glowing chamber. Passing a rectangle-count test alone is not visual approval. Preserve reduced-motion, bounded drawing cost and 18-FPS world/24-FPS flame clocks. Integrator reviews and assembles tested proposals; publish the accepted preview. Physical Samsung assessment stays a player observation, never invented.

## Scope
Two bounded on-demand art jobs, no schedule and no budget-policy changes. Continue in BoRHeX/flame-game-studio only. Keep the separate Cataclysm / BoRHeZ Games Studio experiment untouched.
