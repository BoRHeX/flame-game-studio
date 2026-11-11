# ADR-0004: First major Pass One world build
Status: ACCEPTED
Date: 2026-11-11
Owner: Technical Director

## Product direction
The user reviewed Flame & Sound Playtest 01 and explicitly requested the first MAJOR build: a taller platformer, a real hub, and higher-resolution industrial pixel art. The earlier small chamber/control demonstration is foundation work, not a complete Pass One. Preserve the four original delivery passes in design/game-bible.md.

Use the existing Canvas modules for this bounded build. Preserve BurnerSolver, FlameParticles, chamber geometry, ProcessSound, independent clocks and all three job IDs. A larger world does not authorize replacing the causal combustion game with a generic platformer. Running, jumping and climbing let the operator physically reach equipment.

## Shared world contract (frozen for this build)
game/world/industrial-yard.mjs exports:
- VIEWPORT: {width:768,height:1152}, the default logical portrait viewport. The integrator may adapt canvas height to actual available portrait space while retaining width 768; camera width/height must always match that canvas.
- SCENES: dictionary with keys hub, backyard, warehouse, heat-hold. Each scene has id, width>=1200, height>=2400, spawn:{x,y}, platforms:[{id,x,y,w,h}], ladders:[{id,x,y,w,h}], interactions:[{id,type,x,y,icon,label,deviceId?}], and optional artist-defined theme/decor data. Coordinates are world pixels; x/y for player spawn are top-left, player size is 28x52; platform y is the solid top, and ladders extend from y to y+h.
- drawScene(ctx,scene,view): draws the world and player into the existing context. view={camera:{x,y,width,height},player:{x,y,w,h,vx,vy,grounded,climbing,facing,walkPhase},time,selectedId,stage,jobId}. No simulation mutation. Draw parallax before applying camera translation, then authored foreground, detailed PPE operator and foreground occlusion. No DOM access at module import; no external assets or dependencies. Canvas pixel primitives and authored sprite pixels are sufficient.

Every scene has at least four distinct walkable floor heights joined by at least three usable ladders. Full-width lowest floor catches falls. Scene bounds, collision platforms and interactions are data independent from scenery. Distinct backyard/warehouse/vertical-heater art and geography are required. Visual polish includes shaded machinery, ducts, pipe bends, valves, grates, rivets, workbench, contract board, lamps and an animated helmeted operator, not flat featureless blocks or emoji characters.

Hub interactions include types contracts, practice, workbench and npc. Place the contract board within 150 pixels of spawn center so onboarding can start immediately. The hub includes a home burner, workshop and multiple upper catwalks.

Each job scene includes device interactions with IDs pilotFuel,pilotAir,mainFuel,mainAir,draft and matching deviceId; plus ignition (id spark), observation (id port) and exit. Place ignition and observation within 150 pixels of spawn center for the first touch-smoke path. Put meaningful equipment on upper accessible floors. Do not alter job objectives or burner coefficients in this build.

game/player/platformer.mjs exports PlatformPlayer:
- constructor(scene), state:{x,y,w:28,h:52,vx,vy,grounded,climbing,facing,walkPhase}
- setScene(scene): reset to scene.spawn; retain the documented state shape.
- update(dt,input,scene): fixed-step motion. input={x:-1..1,y:-1..1,jump:boolean}; negative y climbs up. Real gravity, solid platform-top landing, edge-triggered jump, ladder climbing and bounded world coordinates. Return state. Reject invalid dt; zero dt leaves state unchanged. No DOM, timers, rendering or process-solver writes.
- camera(scene,viewport): return a bounded {x,y,width,height} following the player in both axes. It must scroll upward as the player climbs.
- nearby(scene,radius=112): closest interaction within radius from the player's center or null.

## Integration contract
The integrator replaces game/main.mjs, game/index.html and game/style.css only. Import SCENES,VIEWPORT,drawScene and PlatformPlayer; remove the placeholder drawWorld implementation. Keep the existing source modules unchanged. Use compact visible touch buttons Move left, Move right, Climb up, Climb down, Jump, Interact, keyboard equivalents and safe pointer-release/blur resets. Movement is simulated in fixed updates and presented at the existing 18 FPS world clock. Hold inputs must work; touch targets are at least 44 CSS pixels.

Keep existing tutorial-ok, [data-job], spark, observe, return, reset, device-slider, world, flame and progress IDs/accessibility labels for regression testing. Contract icons are compact and represent the in-world board; spawn is near it. Manual device changes require physical proximity and open a tangible equipment close-up. Ignition/observation are in-world stations with accessible touch shortcuts when nearby. No giant dashboard rows consuming most of the portrait screen. Show funds and mission progress; numeric process telemetry is debug-only.

Keep the flame canvas at its existing logical 640x360 with aspect-preserving presentation in the inspection overlay; only the world becomes taller and higher-resolution. Preserve pilot/main ignition, all jobs, observation clocks, money drain, return-to-hub and procedural audio. window.ICE_DEBUG.snapshot keeps all old fields and adds playerY, cameraX, cameraY, sceneId, worldWidth, worldHeight, grounded and climbing. This interface is test evidence, not player UI.

Build marker: 20261111-major-pass-one-01. Use a clearly identified development preview. Full Pass One and real-phone creative acceptance are separate gates.
