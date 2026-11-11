# I.C.E. Specialist Agent Roster

Exactly **25 individually configured specialist agents**. The registry is `studio/agents/roles.json`; full instructions are `studio/agents/profiles/<role>.json`; ready-to-use starter work orders are `studio/work-orders/role-*.json`.

Each specialist receives:

- Shared canonical game design and visual constitution
- Their own role-specific system instructions, inputs, read-only contracts, handoff and success rules
- A role-owned single-file work order, with path guards
- Producer plan and independent QA (with bounded correction loop)

**A configured role is not an idle API process.** No 25-way paid fan-out, no self-merging code or unsupervised recurring schedule. All 25 roles are callable by the same API worker when their own order is selected; only the assigned specialist runs. Specialist review/QA is an independent agent call, not trusting the specialist to grade its own work.

Producer, QA and Release agents can author specific safe design/test outputs. They cannot edit `.github/`, AI runtime, credentials or memory canon through the generation workflow. For art/audio, SVG/JSON/MJS are authoring assets; real raster generation, commercial sound rendering and live synchronization require the dedicated asset pipeline and device QA.

See `studio/production/pass-one-dag.json` for proposed dependencies and `studio/production-plan.md` for integration gates.
