---
name: verify-outside-effects
description: Check outside-effects changes against the bounded TLA+ model and real-source regression witness. Use when changing the covered lifecycle, cancellation, custody or recovery code.
---

# Verify outside-effect dispatch

Read `verification/state-machines/README.md` and `verification/state-machines/Effects/Effects.tla` from the repository root.
Check every result with `/statechart`. Use that skill's current setup and invocation instructions; do not assume a machine-specific path.

A duplicate mutation could repeat a Git push or child-creation request.

## Coverage

The correspondence review covers commit `99ed4a7e143f`, the identifier cutover. In the protected functions the cutover changes one line: `Operations.#pass` passes `ownOf(store, this.#scope.localSequence()!)` to `beforeSend`. See the [cutover note](../../../notes/implementation/cd-dropped-kind-checks.md#gate-and-the-effects-model). Before the cutover the review covered `c9f4dff6267d12d89d1215a0d894e7ec2f5f2435`. `verification/state-machines/coverage.json` records exact source hashes. BR13 moves the publication-origin version query outside the protected functions; those functions stay byte-identical to the S4 correspondence. The 9 November model and T19 source checks pass. Planner ruling `12c4f5fb` requires no repeated fault control for this unchanged boundary. See the [BR13 note](../../../notes/implementation/2026-11-09-br13-version-questions.md) for the comparison and retained evidence.

- `packages/scope/src/operations.ts`: `Operations.#pass`, `Operations.#send`, `Operations.#answer`, `Operations.#offer`.
- `packages/scope/src/sqlite.ts`: `markSent`.

S4 extracts `ParkedAttempts` and `ReplyCustody` as memory-only owners. `Operations` still reads the durable sent mark before choosing recovery, writes and reads back a new mark before queuing its sole original send, and awaits judgment before releasing a held answer. The model leaves parked scans and reply paging outside its bounds. The earlier formal delivery retains the S4 check and source-control evidence.

Rules: `AtMostOneSend`, `MarkBeforeEffect`.

One opened attempt, two possible send counts, arbitrary restarts. Mark and dispatch are separate actions. Durable storage survives restart; in-memory permission does not. Safe recovery reads, additional attempts, selection, parked scans and retained-reply paging are outside this model. A decisive answer must authenticate the exact original attempt. Send counts calls from Operations to its outside port, not provider-internal retries.

## Run the check

Use TLC 1.7.4 and Java 11 or later outside the checkout. Set `TLA2TOOLS` to the installed jar and `JAVA` to the Java executable. The runner checks the jar digest before use. The recorded run used Temurin 25.0.5.

Use a dedicated worktree and reserve the single validation slot before any check or control. Never run either command from the shared checkout at `~/play/artroom`. Run no other validation or builds during that interval. Keep the checked worktree's source fixed, except for the control's recorded fault and restoration. The control refuses a dirty checkout or an unreadable Git status.

From the dedicated worktree root, run:

```sh
node verification/state-machines/check.mjs Effects
```

The command checks source drift, runs TLC in scratch storage, then runs the real-source witness. A zero exit means both checks passed. Missing tools, drift and failed assertions fail the command. To diagnose only the source witness, append `--source`.

Copy the model, config and `view.mjs` into a new scratch folder outside the checkout. Use `/statechart` on that copy, with its view module. Read the report and show its Mermaid chart. It hides stuttering waits and same-label steps, not user choices. Only modeled terminal states stutter. TLC checks active phases for deadlocks, but no fairness or liveness property guarantees external completion.

## Review a change

Compare each action with the named source functions. Keep awaits and durable marks separate. The model abstracts values, not the ordering of the actions it covers.

If source hashes differ, review the changed control flow before updating `coverage.json`. Recheck every affected transition, run the relevant source control below, then run the command again. Advance the sync commit only after this correspondence review. A hash match detects drift; it does not prove correspondence.

Replay a failing model path against the source, one action per step. Treat a path that the code cannot reproduce as a model error until evidence proves otherwise. Keep confirmed findings and their original invariant. Change no product behavior under this skill alone.

The source control and its original, broken and restored results appear in the evidence manifest linked from the README. Repeat only this subsystem's control when the protected boundary changes. Do not run a mutation sweep or a whole suite per control. Use `/maintain-formal-verification-skill` after an unchecked source change, if that skill is available.

Run the recorded source control with `node verification/state-machines/control.mjs Effects` followed by a new external evidence directory. `controls.json` names the exact source fault. Read the resulting assertion before treating a nonzero exit as evidence. The README gives a complete example.
