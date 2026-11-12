# I.C.E. Pass Two — The Operator (commissioned 11 November 2026)

## Goal and boundaries
Convert the successful tall industrial Pass One prototype into a complete **base game** rather than extending the content count prematurely. Pass One remains the rollback point; preserve the reactive burner/flame/audio solver, normal/watch process clocks, cash consequences, hub, three contracts and phone-friendly iconographic first-run journey. Player can finish without buying upgrades. No changes to the existing BoRHeZ Games Studio or Cataclysm.

The user's physical-phone Pass One screenshot confirms navigable multiple floors, ladders, NPC response, industrial atmosphere and visible icon-based controls. It does not establish that all three jobs, valve mechanics, or persistence are finished.

## Delivery order — independent bounded work, not one overlong token request

1. **P2-UI-01 (gameplay+UX):** fullscreen request/exit, analog movement joystick, left/right thumb options, alternate D-pad, jump/interact reachable by opposite thumb, portrait and landscape-safe HUD, keyboard fallbacks. Never let movement stick after a finger-up, blur, mode switch or backgrounding. UI first; independent browser and pure-motion regression checks required. No paid AI run needed for this supervised patch.
2. **P2-DEVICE-02 (interaction specialist + integrator):** receive the already queued capped ICE-ROLE-08 valve-wheel module from studio run #43095653405. Independently review code, then connect valve rotation, damper travel/limits, knob sound and optional haptics to actual burner device commands and nearby industrial world props. Source-only proposal is **not** gameplay integration. Avoid creating a second paid request while the original is unresolved.
3. **P2-SAVE-03 (persistence engineer):** implement versioned three-save-slot and autosave lifecycle, strict state validation, transactional backup, recovery from corrupt local storage and browser background/return. Track funds, progression, workshop, scene, job, controls and operator/story flags. Include migration fixtures and no-loss roundtrip tests.
4. **P2-MISSION-04 (mission/combustion/chamber specialists):** polish Backyard Light-Off and Warehouse Restart to release-grade fault/cause/effect loops with distinct equipment, readable failure reasons and success. Heat-Hold stays playable as the third prototype. Environmental modifiers must measurably affect the deterministic solver rather than only tinting art.
5. **P2-WORLD-05 (narrative, NPC, environment, orchestra):** minimal branching interaction with the first operator, job context/world UI, meaningful no-language scene signals, biome modifier preview, original state-driven sound and correct synchronized audio cues. Narrative text may exist in menus, optional help and accessibility; base gameplay must remain understandable without it.
6. **P2-QA-06 (independent release):** prove all three jobs remain playable, two are polished, watch mode accelerates danger and mission but reduces cash drain, no-upgrade completion, save/load and corruption recovery, correct touch and fullscreen behavior on phone, 390×844/landscape/foldable viewports, no runtime exceptions, memory/timing performance. Publish only after CI and real Android playtest.

## Pass Two acceptance
- Interaction uses physical world proximity, accessible close-ups and visible response.
- Touch controls support thumb reach and do not shrink world below half of screen; joystick and fallback both work with climbing, jumping and camera.
- Fullscreen button toggles actual browser fullscreen where permitted, explains unsupported browsers without faking an active status.
- Save slots and autosave survive reload with recoverable schema migration.
- Two polished missions + third functional mission; different hazards and rewards, not just icons or color variants.
- Every delivered stage includes code, independent executable tests, CI evidence, and a separate review. Not complete merely because a studio worker ran.
- No provider work is repeated or auto-scheduled. Cost caps, preview verification and review gates remain mandatory.


## Operator 02 implementation candidate — 12 November 2026
The ordered feature scope above is implemented in the connected candidate described in memory/evidence/acceptance/pass-two-operator-02.md. The older valve job was not re-dispatched; this integration supplies its consumer and a pure tested physical control while preserving the unresolved job as provenance. Five accepted specialist implementations plus the recovered environment module are wired into the game. Final real-touch Chrome, verified publication and physical Samsung review remain explicit gates; implementation checkmarks alone are not release acceptance.
