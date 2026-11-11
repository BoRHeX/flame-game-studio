# Agent studio V1 operating model

A studio role is a **bounded work session** with scoped code ownership, a canonical-memory briefing and an independent verification gate, not a chatbot with indefinite conversation memory.

## Departments
Producer prioritizes work orders; Technical Director owns contracts/ADRs; Game Director enforces I.C.E. canon; combustion + flame physics/render + chamber specialists build authoritative process; player/mission/economy/NPC/persistence own gameplay; art director, biome environment and animators create graphical content; QA/performance/security enforce gates; four Orchestra roles compose original adaptive audio and synchronize animation.

## Delivery cycle
1. User review -> Producer ticket with role, bounded scope, explicit test requirements and asset reference.
2. Paid worker requests are allowed **only** from a manually dispatched workflow installed on main and guarded by an audited GitHub-backed, reserved-cost ledger. Default OFF.
3. Trusted model job receives **read-only** repository context and API key; model output is untrusted JSON data, never executable in a secret-bearing job.
4. Separate token-free CI job applies and tests candidate. If red, the task fails and requires a new work order. No endless automatic retries.
5. Separate privileged publish job applies validated files *as data*, creates branch and draft PR, with no execution of candidate code and no model secret.
6. Human acceptance and manual merge; use PR history, test evidence and incident ledger to update project memory.
7. New versions ship from reviewed main to public playtest with frozen tags, not automatically from model-generated code.

## Agent memory
Only canonical rules + active ADRs + current interfaces/task may instruct an agent. Historical incidents, rejected designs and prior experiments are evidence, never authority. Compile a fresh scoped brief from canonical memory every work order. Full transcript is not engineering truth. Revisions require PR-review and supersession.

## API-only does not equal free
Initial API allowance is 50 USD cumulative, 5 USD/day, at most 2 USD reserved per run, serial jobs and one attempt. These protect against internal run loops, not against account-level abuse; set hard spending limits in the OpenAI API project as a second independent control. GitHub Actions storage/minutes and image/audio generators can bill separately.

## Boundary
Do not change BoRHeX/kbc-rpg-prototype, the experimental council or its workflows. Do not automatically merge this studio's work to main. The first studio worker is a measured coding PR, not the complete campaign.
