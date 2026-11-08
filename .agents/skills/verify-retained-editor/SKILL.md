---
name: verify-retained-editor
description: Check retained-editor changes against the bounded TLA+ model and real-source regression witness. Use when changing the covered lifecycle, cancellation, custody or recovery code.
---

# Verify retained editor progress

Read `verification/state-machines/README.md` and `verification/state-machines/Editor/Editor.tla` from the repository root.
Check every result with `/statechart`. Use that skill's current setup and invocation instructions; do not assume a machine-specific path.

Premature progress could present an unverified change as recorded.

## Coverage

The correspondence review covers commit `8faa38dcf31855a0a6264e5912b58061b5eda223`. `verification/state-machines/coverage.json` records exact source hashes.

- `apps/room/page/src/retained-editor-state.ts`: `transitionEdit: attempted, answer, receipt-verified, step-recorded`.
- `apps/room/page/src/retained-editor-data.ts`: `continueEdit`.

Rules: `EvidenceBeforeProgress`.

One request step. Repeat this obligation at opening, rules, source and manifest stages. Receipt verification is a trusted input from the network executor. This model does not prove signatures, workflow stage order, reload persistence or source contents.

## Run the check

Use TLC 1.7.4 and Java 11 or later outside the checkout. Set `TLA2TOOLS` to the installed jar and `JAVA` to the Java executable. The runner checks the jar digest before use. The recorded run used Temurin 25.0.5.

From the repository root, run:

```sh
node verification/state-machines/check.mjs Editor
```

The command checks source drift, runs TLC in scratch storage, then runs the real-source witness. A zero exit means both checks passed. Missing tools, drift and failed assertions fail the command. To diagnose only the source witness, append `--source`.

Copy the model, config and `view.mjs` into a new scratch folder outside the checkout. Use `/statechart` on that copy, with its view module. Read the report and show its Mermaid chart. It hides stuttering waits and same-label steps, not user choices. Only modeled terminal states stutter. TLC checks active phases for deadlocks, but no fairness or liveness property guarantees external completion.

## Review a change

Compare each action with the named source functions. Keep awaits and durable marks separate. The model abstracts values, not the ordering of the actions it covers.

If source hashes differ, review the changed control flow before updating `coverage.json`. Recheck every affected transition, run the relevant source control below, then run the command again. Advance the sync commit only after this correspondence review. A hash match detects drift; it does not prove correspondence.

Replay a failing model path against the source, one action per step. Treat a path that the code cannot reproduce as a model error until evidence proves otherwise. Keep confirmed findings and their original invariant. Change no product behavior under this skill alone.

The source control and its original, broken and restored results appear in the evidence manifest linked from the README. Repeat only this subsystem's control when the protected boundary changes. Do not run a mutation sweep or a whole suite per control. Use `/maintain-formal-verification-skill` after an unchecked source change, if that skill is available.

Run the recorded source control with `node verification/state-machines/control.mjs Editor` followed by a new external evidence directory. `controls.json` names the exact source fault. Read the resulting assertion before treating a nonzero exit as evidence. The README gives a complete example.
