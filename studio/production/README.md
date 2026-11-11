# Producer's dependency-driven project plan

`pass-one-dag.json` is an explicitly bounded *initial* task dependency graph, not a command to run every AI worker at once. The Producer maintains milestone priorities and handoffs; agents take only approved, scoped tasks whose prerequisites are accepted.

`studio/orchestrator/roster.mjs` validates role coverage and topological dependencies, and identifies ready tasks. A staged contributor can finish its job and issue a reviewed PR. The Integrator connects approved modules; separate QA and real phone testing are still required.

A new task is never automatically a paid API request. Paid execution requires an explicit, single-file request commit through `studio/requests/` and the repository's existing budget/secret safeguards. The full-game target is the source-controlled game bible, not the simple current demo.
