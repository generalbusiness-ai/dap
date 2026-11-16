---
name: verify-outside-effects
description: Check outside-effects changes against the bounded TLA+ model and real-source regression witness. Use when changing the covered lifecycle, cancellation, custody or recovery code.
---

# Verify outside-effect dispatch

Read `verification/state-machines/README.md` and `verification/state-machines/Effects/Effects.tla` from the repository root.
Check every result with `/statechart`. Use that skill's current setup and invocation instructions; do not assume a machine-specific path.

A duplicate mutation could repeat a Git push or child-creation request.

## Coverage

The correspondence review covers `6728059211cee75dc0f6fdd104ef52a44c5f7da0`. CV1 reviews ten operations commits and twelve SQLite commits, including every merge parent. The five model-listed function bodies match the recorded identifier-cutover sync bytes at `99ed4a7e143f82ba9ca946b9d98f21bbaf09efe2`. Historical merges restore the already-covered pre-Mark `beforeSend` Own input and publication/outcome evidence premises. Those contacts are not unrelated changes. Later CDF retained-byte accounting and scope-full result detail remain outside the one-attempt model and do not change its durable-mark, readback, or dispatch order. A trusted late answer does not prove quota availability or payload authentication. See the [CV1 note](../../../notes/implementation/2026-11-16-cv1-source-correspondence.md) for every parent comparison.

The earlier model and T19 source checks, source controls, and the 13 November cutover results remain historical at their recorded source cuts. Planner ruling `12c4f5fb` addressed the unchanged protected boundary at that time. CV1's source review and metadata refresh add no fresh model or control result. The [BR13 note](../../../notes/implementation/2026-11-09-br13-version-questions.md) and [cutover note](../../../notes/implementation/cd-dropped-kind-checks.md#gate-and-the-effects-model) retain their earlier evidence.

- `packages/scope/src/operations.ts`: `Operations.#pass`, `Operations.#send`, `Operations.#answer`, `Operations.#offer`.
- `packages/scope/src/sqlite.ts`: `markSent`.

S4 extracts `ParkedAttempts` and `ReplyCustody` as memory-only owners. `Operations` still reads the durable sent mark before choosing recovery, writes and reads back a new mark before queuing its sole original send, and awaits judgment before releasing a held answer. The model leaves parked scans and reply paging outside its bounds. The earlier formal delivery retains the S4 check and source-control evidence.

Rules: `AtMostOneSend`, `MarkBeforeEffect`.

One opened attempt, two possible send counts, arbitrary restarts. Mark and dispatch are separate actions. Durable storage survives restart; in-memory permission does not. Safe recovery reads, additional attempts, selection, parked scans and retained-reply paging are outside this model. A decisive answer must authenticate the exact original attempt. Send counts calls from Operations to its outside port, not provider-internal retries. The reviewed identifier and evidence premises restore the known sync source. Later retained-payload accounting and scope-full result detail lie outside this one-attempt model; trusted late-answer evidence does not prove quota availability or payload authentication.

## Run the check

Use TLC 1.7.4 and Java 11 or later outside the checkout. Set `TLA2TOOLS` to the installed jar and `JAVA` to the Java executable. The runner checks the jar digest before use. The recorded run used Temurin 25.0.5.

Use a dedicated worktree and reserve the single validation slot before any check or control. Never run either command from the shared checkout at `~/play/artroom`. Run no other validation or builds during that interval. Keep the checked worktree's source fixed, except for the control's recorded fault and restoration. The control refuses a dirty checkout or an unreadable Git status.

From the dedicated worktree root, run:

```sh
node verification/state-machines/check.mjs Effects
```

The command checks source drift, runs TLC in scratch storage, then runs the real-source witness. A zero exit means both checks passed. Missing tools, drift and failed assertions fail the command. To diagnose only the source witness, append `--source`.

Copy the model, config and `view.mjs` into a new scratch folder outside the checkout. Use `/statechart` on that copy, with its view module. Read the report and show its Mermaid chart. It hides stuttering waits and same-label steps, not user choices. Only modeled terminal states stutter. TLC checks active phases for deadlocks, but no fairness or liveness property guarantees external completion.

## Refresh reviewed source metadata

Pins compare all eight mapped files without importing source or running TLC. A mismatch names the file and its model. Before a deliberate refresh, confirm that the changed file still meets the Effects model's premises. State that confirmation in the body of the commit that carries the refreshed record. If those premises changed, repair the model or correspondence first. A missing statement is a review finding; the script does not check that prose.

Commit the reviewed source, then run `node scripts/check-formal-source-hashes.mjs --refresh Effects`. Only this route reads Git. It refuses without a write if any mapped file differs from its bytes at the recorded HEAD, then updates this model's hashes and sync commit together. The refresh adds no model or source-control PASS. The existing `--source` check skips the hash guard and keeps its current source-witness behavior.

## Review a change

Compare each action with the named source functions. Keep awaits and durable marks separate. The model abstracts values, not the ordering of the actions it covers.

If source hashes differ, review the changed control flow before updating `coverage.json`. Recheck every affected transition, run the relevant source control below, then run the command again. Advance the sync commit only after this correspondence review. A hash match detects drift; it does not prove correspondence.

Replay a failing model path against the source, one action per step. Treat a path that the code cannot reproduce as a model error until evidence proves otherwise. Keep confirmed findings and their original invariant. Change no product behavior under this skill alone.

The source control and its original, broken and restored results appear in the evidence manifest linked from the README. Repeat only this subsystem's control when the protected boundary changes. Do not run a mutation sweep or a whole suite per control. Use `/maintain-formal-verification-skill` after an unchecked source change, if that skill is available.

Run the recorded source control with `node verification/state-machines/control.mjs Effects` followed by a new external evidence directory. `controls.json` names the exact source fault. Read the resulting assertion before treating a nonzero exit as evidence. The README gives a complete example.
