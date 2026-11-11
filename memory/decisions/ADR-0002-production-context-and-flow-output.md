# ADR-0002: Authorized proposal context and reusable chamber-flow output
Status: ACCEPTED
Date: 2026-11-11
Owner: Technical Director
Supersedes: ADR-0001 activation restriction only; isolation and review gates remain active.

## Evidence
Paid runs 43070213408 and 43070680664 produced empty files. The particle specialist reported an allocation-free requirement blocked by the existing allocating flowAt helper. The composer reported dry-run-only execution. The runtime was sending compileBrief's inert dry-run status into already authorized paid requests.

## Decision
The context compiler remains inert and defaults to dry-run. After checking policy and the activation variable, the production runtime explicitly supplies paid_proposal metadata to Producer, Specialist and QA. This authorizes proposal generation only. Budget reservation, no-secret verification, manual review and no automatic merge remain required.

The active work order defines the current deliverable; profile success definitions describe department goals. Do not impose a department's whole roadmap on a prerequisite task. Accepted ADRs are included in model briefings. Historical activation restrictions are superseded by current execution metadata and the actual runtime guards.

Authorize a backward-compatible optional reusable output argument for the existing chamber API:

    flowAt(chamber, x, y, seed = 0, out)

When out is supplied, write vx/vy into it and return that exact object. With no out, preserve the existing fresh-object return behavior. Preserve CHAMBERS, all flow formulas, orientations, default seed and existing callers. The particle engineer may implement this contract in game/chambers/flow.mjs under ICE-FLOW-001. A later renderer task can reuse one object per particle pool; this prerequisite does not claim the existing renderer is allocation-free yet.

## Verification
Independent acceptance fixtures record the existing chamber velocities before agent changes. Verify exact output identity, repeated reuse, legacy calls, all chambers, baffle regions and updraft behavior. Run acceptance only in the no-secret verification job. Paid specialists cannot edit studio/acceptance/ or runtime/CI files.
