# Operational observability reconciliation

At published `d82afed25df860551fbf9f82213f7c01efcdebff`, request
`84da99bab78704e9e2f052c3eff1b6db055b23fd` remains open. It refiles
`f57fc4da` unchanged and orders retain/count, See, then Judge; it does
not authorize provider mutation. Draft 6 sections 4 and 7 remain the
basis. A source landing and an operational acceptance are different facts.

## 1. Retain and count: delivered source

Child `d2a8b9cf` is satisfied and incorporated. Main `e444edf8` landed
it. `notes/implementation/2026-10-16-observability-retain-count.md`
records the closed metrics-v1 schema, bounded loss accounting, actual
turn/route marks, validated correlation and bounded request sidecar/admin
read. Owners include `packages/scope/src/metrics.ts`, `operational.ts`,
`correlation.ts` and the request-index/read paths. The note records W1
pure/native controls, including absent, throwing and unresolved sink
behavior; its source configuration is not a deployment claim.

## 2. See: delivered source

Child `1faf0c5b` is satisfied and incorporated; merge `aeebc18cb7`
landed See after retain/count. `packages/scope/src/health.ts`,
`packages/cli/src/status-report.ts` and `docs/operations.md` own health,
bounded per-column status and operator instructions. The implementation
note `2026-10-16-observability-see.md` records W2 health and status
witnesses, physical single-flight and limited cache. Source landing did
not perform a provider operation.

## 3. Judge: delivered source; live acceptance remains open

Child `d13caf1d` is satisfied and incorporated: merge `02a9180357` landed
reviewed local Judge source. `scripts/deploy-check.mjs`,
`deploy-check-evaluate.mjs`, their tests and `packages/mcp/src/metrics.ts`
provide the bounded evaluator and closed MCP events. The implementation
note `2026-10-17-observability-judge.md` records synthetic evaluator and
actual-service MCP focused controls. It also records failed composed
gates and separately passing isolated/downstream checks; do not describe
those failed gates as passing. The merge explicitly retained calibration,
live SQL/health, storage reporting and full operational acceptance as owed.

OB-L `b3d586a9` is satisfied for its bounded observation and note; landing
`15fe9f3e0d` includes `notes/implementation/2026-11-22-ob-l-demo-observation.md`.
The authorized Demo 15-minute window had zero weighted routes and no
latency bound; it reports no-data and unknown coverage. The separate Grow
window measured 149 weighted routes and p95 864 ms. Planner ruling
`9647a0f4` set a Grow-only 1,800 ms bound; sampled coverage remained
unknown, and three further deployment windows are needed to tighten it.
These observations do not prove a complete-coverage deployment pass.

## First remaining work and authority

No independent missing implementation is established for the three Source
heads at this published revision; do not implement them again. The first
remaining parent outcome is a real, authorized operational acceptance:
a sufficiently populated, unsampled window and matching deployed health,
version and calibration under the operator/planner's exact scope. The
Demo observation is no-data and Grow's coverage is unknown. A telemetry or
deployment read, configuration change, provider operation or new rollout
requires its own current authorization; request 84da99ba is not that grant.
Storage rows-written reporting is also disclosed as unknown in the Judge
note, and needs an independently scoped owner/decision before anyone claims
it measured. The exact request remains open; only the planner can reconcile
its final disposition against these landed children and operational limits.
