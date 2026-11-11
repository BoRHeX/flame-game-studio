# ADR-0001: Independent studio and review-gated autonomy
Status: ACCEPTED
Date: 2026-11-11
Owner: Technical Director

## Decision
Use `BoRHeX/flame-game-studio` as a separate codebase for I.C.E. and its production software. The legacy BoRHeZ Games Studio and Cataclysm workflows are read-only reference. The new project has explicit roles, contracts, memory and autonomous cost controls.

All autonomous workers operate on feature branches; no model pushes to main. No code-under-test gets API credentials. CI is read-only by default, elevated credentials exist only in narrowly scoped jobs. The initial activation restriction is superseded by ADR-0002 after durable budget enforcement and explicit activation; isolation and review requirements remain active.

## Alternatives
1. Extend legacy council: rejected due to coupling and unreliable task integration.
2. Many persistent personas: rejected as unnecessary idle cost.
3. Single strong coding agent only: retained as required benchmark baseline.
4. GitHub Actions + optional later isolated worker VM: preferred hybrid.

## Evidence
Original I.C.E. source design and 2026-11-11 production research. This ADR can be superseded only with architectural review.

