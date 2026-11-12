# Department source review versus integration ownership
Status: RESOLVED_IN_VERIFIED_INTEGRATION
Run: 43134559549

The environment specialist implemented ADR-0006 exports, four authored layer sets, deterministic process factors and protected foreground drawing. QA rejected two corrections because main.mjs did not consume environmentAt and the protected department test did not prove solver coupling. Both requested changes were outside the worker's single-file scope. The model run remains failed; its preserved inert source was not relabeled approved.

Root reviewed the preserved source and integrated it in PR #42: drawScene consumes authored parallax, fixed physics multiplies immutable job base factors through ContractSession.environment, and real-biome no-purchase completion tests plus actual touchscreen routes prove all three jobs remain solvable. Trusted module and integration checks, 86 Node tests, Chrome CI #43138219173 and repeat release #43138763886 passed. Runtime review context was corrected in PR #37 to include explicit target/allowed ownership and department/integration stage; uncovered module defects still block approval, and downstream consumer tests remain mandatory before release. A future scoped module is not required to edit read-only consumers.
