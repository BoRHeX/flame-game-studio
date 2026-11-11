# Production runtime

The bounded API runtime is activated for one authorized work order at a time. Producer, specialist and independent reviewer create inert proposals; no-secret tests and task acceptance checks must pass before a draft PR is opened. Current activation and budgets are enforced by runtime guards, the repository variable and the durable ledger. Dry-run compilation remains available without model calls.

Implementation sequence:
1. Versioned work order + scoped context builder.
2. Token/cost ledger recording input, cached input, output, model and retry count.
3. Pre-call estimated cap enforcement and post-call actual usage reconciliation. Fail closed if unknown.
4. One agent on isolated branch. Tool allowlist, no secrets, explicit file permissions.
5. Tests -> independent review -> PR; no auto-merge.
6. Benchmark specialist studio against one strong coding agent on identical small Flame Lab task.
7. Add limited parallel agent orchestration only after benchmark and cash limits.

The four-agent orchestra is defined in `design/audio-orchestra.md`; roles listed in `studio/agents/roles.json`. See `memory/README.md` for canonical context assembly rules.

**Risk:** policy JSON alone is not a budget limiter; never attach API credentials to agent workflows until checks are enforced in code and tested with failures/retries.

