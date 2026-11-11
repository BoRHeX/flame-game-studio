# ADR-0003: Source review precedes independent execution
Status: ACCEPTED
Date: 2026-11-11
Owner: Technical Director

Run 43083672372 generated a complete renderer but repeatedly rejected it because tests had not run. The generation job deliberately cannot execute untrusted code while holding model credentials. Requiring execution evidence before leaving that job created a circular dependency.

The independent model reviewer approves or rejects source quality and coverage before execution. Its approval only makes a proposal eligible for the no-secret verification job. It must not demand fabricated execution evidence or worker edits to protected acceptance scripts. The existing trusted acceptance tests can provide coverage even when a specialist's file scope excludes tests.

Every accepted source candidate must still pass unit tests, mobile Chrome and its task-specific acceptance script in the separate no-secret job before a draft PR is created. No test is waived. Release and deployment require integration review beyond model source approval.

Preserve useful rejected candidates and their provenance. A corrected supervised work order may continue from that source rather than paying to regenerate it from scratch. Historical rejected-review demands are evidence, not new immutable instructions.
