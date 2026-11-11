# ADR-0005: Pass Two Operator, Missions and Persistence Contracts
Status: ACCEPTED
Date: 2026-11-12
Owner: Technical Director
Source evidence: I.C.E. council run 43120683621 (25 individual specialist handoffs)
Scope: I.C.E. The Flame Game only

## Reason
The completed 25-role council provided cross-department designs, but coding specialists were subsequently asked to implement without a single frozen inter-module contract. Runs 43120683621 and 43121969257 yielded empty/incomplete candidates; the original NPC specialist run 43122372086 explicitly refused because technical director decisions were missing. This ADR fixes that root cause. It is authorization for source implementation within registered work-order file ownership; it does NOT authorize untested merges, invent new product goals, or treat a model's description as executable code.

## Locked ownership and call order
- `game/main.mjs` is the sole browser, DOM, player/input, burner device command, cash, transition and autosave orchestrator. It may consume new modules but those modules must not mutate DOM, main cash, burner, or touch controls.
- `game/missions/jobs.mjs` remains source of truth for `JOBS` and `MissionEvaluator`. Keep `new MissionEvaluator(job)`, `tick(simDt, missionDt, processState, funds)`, `progress()` backward-compatible. Add `snapshot()` and `restore(data)` methods for persisted mission progress; they must validate plain data. Terminal success or failure may only be recorded once. `main.mjs` applies the agreed payout once on first transition, never from operator callbacks or reloading.
- `game/npc/operator.mjs` exports `class OperatorAI` with `request(command, context)`, `snapshot()`, and `restore(data)`. Optional `reset()` and `tick()` are allowed. A new instance works with no arguments; its defaults are safe. Do not rely on a not-yet-implemented API before writing this file.
- `game/persistence/save-slots.mjs` exports `class SaveStore` with injected optional storage, plus optional `createSaveStore(storage)` convenience factory. Required methods: `listSlots()`, `loadSlot(id)`, `saveSlot(id,snapshot)`, `loadAutosave()`, `saveAutosave(snapshot)`; optional remove/reset methods. Slot IDs 1,2,3, plus a distinct autosave. No network or third-party storage dependency.

## NPC request interface
The physical operator is a helpful worker and story actor, NOT a remote actuator or a gate on required player actions.
- `command` is a plain record `{id:string, type:string, deviceId?:string, value?:number, jobId?:string}`. Unknown types produce refusal feedback, not throws.
- `context` is plain data `{distancePx?:number, available?:boolean, actorRole?:string, authority?:string[], jobId?:string, missionStatus?:string, elapsed?:number}`. Default `distancePx=Infinity`, `available=true`, `missionStatus='active'`. Distances are measured in world pixels by `main.mjs`, with accepted range at most 112px. User-initiated direct physical controls are NEVER dependent on operator permission.
- `request` returns `{status:'accepted'|'refused'|'deferred',reason:string,retryAt:number|null,cue:string,effect?:object}`; `effect` is declarative, not executed by `OperatorAI`. `main.mjs` applies only allowlisted effects through its authoritative world/mission command path.
- Refusal when out of range, insufficient authority or unsupported command, defer when unavailable, accept when permission and proximity pass. Fixed finite defer thresholds; deadline-critical commands always remain manually executable. No role can create an unavoidable game over.
- `snapshot()` returns bounded JSON-safe `{version:1, flags:object, state:string}`; `restore()` validates/normalizes malformed values and never prevents new requests. Transient pending timers must not be saved.

## Mission contract and cause/effect
- Existing IDs, icons and scene keys remain `backyard`, `warehouse`, `heat-hold`. `JOBS` entries may add `warnings`, `deviceLimits`, `operatorPolicy`, `faults` or `biomeModifiers` but cannot remove existing `burner`, `chamber`, `objective`, `payout` or `deadline` fields.
- Backyard: pilot-to-main light-off; Warehouse: restricted draft / sticky damper effects; Heat-Hold: temperature, soot and stability window. Each must have a fixed-seed no-upgrade solution and distinct visible warning/failure states. The solver remains authoritative; no milestone awards merely for pressing an icon.
- The evaluator remains deterministic and side-effect-free for money; main handles economy and transition. `MissionEvaluator.snapshot()` captures `{version:1,jobId:string,status:'active'|'won'|'failed',elapsed:number,hold:number,reason?:string}`. `restore()` clamps numeric fields and rejects mismatched job IDs. `tick` uses *process dt* for hold progress and *mission dt* for deadline, preserving accelerated observation danger.

## Versioned save contract
`SaveStore` persists **plain data** snapshots `{schemaVersion:1,savedAtUtc:string,timezoneOffsetMinutes:number,player:object,economy:object,progression:object,scene:object,controls:object,mission:object|null,operator:object,workshop:object}`. A producer can supply additional optional validated fields.
- `saveSlot(1..3, snapshot)` writes to a per-slot staging key, verifies its JSON, preserves the last valid primary under a backup key, then promotes; a failed storage write returns a safe failure result rather than crashing gameplay.
- `loadSlot` tries primary, then backup, then a normalized new-game snapshot; one corrupt slot never mutates another. `loadAutosave` follows equivalent checks. `listSlots()` exposes three entries, not the autosave.
- `main.mjs` captures real cash, world/player coordinates, job/evaluator status, device configuration, controls and operator flags; it restores before first active simulation tick. Autosave on page hide, contract transitions and meaningful mission changes; periodic saves are bounded.
- UTC and timezone from device are metadata only, never a trustable authority to mint money or claim unlimited offline progress. Limit offline workshop reconciliation; no mandatory equipment purchases.

## Source task staging (approved)
1. NPC engineer may implement `game/npc/operator.mjs` NOW from the exact interface above. This task needs no upstream game/main edit, no speculative API and no additional sign-off. Tests will run in separate no-secret CI.
2. Persistence engineer may independently implement `game/persistence/save-slots.mjs` using the exact schema above.
3. Mission engineer may implement `game/missions/job-templates.mjs` as a first isolated module, then a follow-up integration branch may adjust `game/missions/jobs.mjs` without removing old exports.
4. Integrator connects independently reviewed modules in `game/main.mjs` and checks actual game play; do not ask a single model to generate four full integrated files in one response.
5. QA validates all save recovery, manual operator bypass, all three solvable jobs, original Android joystick/climb/ignition/observation and budget evidence. Red tests block merge/release.

## Precedence
This is the Technical Director interface decision based on the fully recorded 25-role council. It supersedes any old 'contracts missing' provisional analysis. Agents should implement their scoped deliverables and declare any *new, concrete* contract conflict, rather than returning an empty file due to unspecified hypothetical interfaces. Nothing in this ADR relaxes independent source review, budget reservation, or mobile gameplay tests.
