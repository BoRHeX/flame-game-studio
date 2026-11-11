# Durable agent memory policy

**Never use conversation transcripts as the ultimate authority.** Before each task, compile brief context from:
1. `memory/canonical/` — active product facts only;
2. active `memory/decisions/` ADRs — precedence over superseded decisions;
3. target contracts/source code and test fixtures;
4. recent incident lessons, clearly marked as history;
5. specific work order including permitted files, acceptance tests, token budget.

Each decision: status, timestamp, author, problem, alternatives, rationale, evidence, supersedes, affected contracts and commit.
Each incident: reproduction, input seed, symptom, root cause, remedy, regression test.
Each completed task: expected/actual files, tests, cost and review.

Memory updates are code-reviewed. No direct editing of canonical rules by feature agents. Never treat experiment notes or rejected proposals as binding. Context builder should prefer small scoped retrieval over replaying entire chat history.
