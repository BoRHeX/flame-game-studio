# Legacy scoped worker

New game-production briefs use [the autonomous production workflow](../production/README.md). This module-level runner remains available for small repairs; its draft-PR endpoint and file ownership are not the default production authorization.

# API-backed autonomous production worker

Uses the OpenAI Responses API, canonical memory, approved scoped work orders and relevant source. Three bounded model sessions per authorized run: Producer/Planner, Specialist Builder, Independent AI Reviewer.

The paid job writes an **inert JSON artifact**. It does not execute or commit generated code.

GitHub Actions separates five trust zones:
- reserve: GitHub write token but no OpenAI key; record budget reservation on isolated ice-studio-ledger branch.
- propose: OpenAI key, read-only repository, never execute generated code.
- reconcile: GitHub ledger write token but no OpenAI key; record actual returned usage.
- verify: read-only token, no secrets; apply generated source and run simulation + browser tests.
- submit: restricted GitHub branch/PR token, no model key; apply validated text as data, open draft PR. Never execute candidate code.

## Activation checklist
The API workflow must be installed on main for manual dispatch to appear in GitHub Actions. Do not copy an API key into the repository, ChatGPT conversation, or workflow YAML.
1. Create a GitHub Actions repository secret named OPENAI_API_KEY.
2. In Settings > Actions > General enable Allow GitHub Actions to create and approve pull requests.
3. After initial code/security review, set Actions repository variable ICE_STUDIO_ENABLED=true.
4. The reviewed main-branch studio/budget/policy.json must set STUDIO_ENABLED=true. This is the last separate switch.
5. In Actions, run I.C.E. studio - propose one scoped work order. Choose a committed JSON path in studio/work-orders/.

Initial budget: $50 cumulative, $5/day, $2 per run and one serialized worker run. All billing rates are text-token estimates and do not represent an OpenAI account-wide spending restriction. Use OpenAI project budgets independently. A failed provider call can leave its full reservation allocated and requires explicit reconciliation.

This is a production pipeline, not an independently persistent conversational mind. Art/sound specialists work through the same role contracts. Later artwork generation APIs, composited image layers and studio-orchestra synth rendering need their own cost/rights controls. No third-party artist assets should be copied without rights.

## Operational requirement: minimal player GitHub work
The assistant starts single bounded jobs by committing a new request under studio/requests/ on main. The player should not be asked to activate GitHub Actions. The player is needed only for inaccessible credentials or permissions and playing the next accepted game build.

Forensic rejected candidate JSON and reviewer reasons are preserved as an untrusted CI artifact, not applied or executed. Read-only source dependencies and prior incident evidence are part of the task brief.
