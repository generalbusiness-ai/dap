---
name: verify-retained-editor
description: Check retained-editor changes against the bounded TLA+ model and real-source regression witness. Use when changing the covered lifecycle, cancellation, custody or recovery code.
---

# Verify retained editor progress

Read `verification/state-machines/README.md` and `verification/state-machines/Editor/Editor.tla` from the repository root.
Check every result with `/statechart`. Use that skill's current setup and invocation instructions; do not assume a machine-specific path.

Premature progress could present an unverified change as recorded.

## Coverage

The correspondence review covers `6728059211cee75dc0f6fdd104ef52a44c5f7da0`. CV1 reviews all 19 exported data-file commits and every parent edge. The reducer matches the stored sync bytes at all five exported cuts. `continueEdit`, `runStep`, `verifyStep`, `keepStep`, and `checkEditRequest` retain their exact bodies and receipt-before-progress order. The identifier cutover changes source identity guards on that call tree; this review does not prove those predicates equivalent or authenticate source contents. The executed source probe exercises `transitionEdit` only. See the [CV1 note](../../../notes/implementation/2026-11-16-cv1-source-correspondence.md) for the history and source anchors.

The 10 November model check, reducer witness, and statechart PASS remain historical at `8dc1381c732132be8a6d378697e0b87191bd2801`. That run reached seven states without a deadlock or `EvidenceBeforeProgress` violation. Planner ruling `12c4f5fb` addressed the unchanged boundary at that time. CV1's source review and metadata refresh add no fresh model or control result. The [BR13 note](../../../notes/implementation/2026-11-09-br13-version-questions.md) and [F note](../../../notes/implementation/2026-11-10-canonical-spelling.md) retain their earlier evidence.

- `apps/room/page/src/retained-editor-state.ts`: `transitionEdit: attempted, answer, receipt-verified, step-recorded`.
- `apps/room/page/src/retained-editor-data.ts`: `continueEdit`.

Rules: `EvidenceBeforeProgress`.

One request step. Repeat this obligation at opening, rules, source and manifest stages. Receipt verification is a trusted input from the network executor. This model does not prove signatures, workflow stage order, reload persistence or source contents. The reviewed executor awaits receipt verification before progress; the executed source probe exercises the reducer only. Source identity checks and their payloads remain outside this receipt-verification abstraction.

## Run the check

Use the pinned TLA+ tools release 1.7.4 artifact and Java 11 or later outside the checkout. Its TLC component reports version 2.19. Set `TLA2TOOLS` to the installed jar and `JAVA` to the Java executable. The runner checks the jar digest before use. The recorded run used Temurin 25.0.5.

Use a dedicated worktree and reserve the single validation slot before any check or control. Never run either command from the shared checkout at `~/play/artroom`. Run no other validation or builds during that interval. Keep the checked worktree's source fixed, except for the control's recorded fault and restoration. The control refuses a dirty checkout or an unreadable Git status.

From the dedicated worktree root, run:

```sh
node verification/state-machines/check.mjs Editor
```

The command checks source drift, runs TLC in scratch storage, then runs the real-source witness. A zero exit means both checks passed. Missing tools, drift and failed assertions fail the command. To diagnose only the source witness, append `--source`.

Copy the model, config and `view.mjs` into a new scratch folder outside the checkout. Use `/statechart` on that copy, with its view module. Read the report and show its Mermaid chart. It hides stuttering waits and same-label steps, not user choices. Only modeled terminal states stutter. TLC checks active phases for deadlocks, but no fairness or liveness property guarantees external completion.

## Refresh reviewed source metadata

Pins compare all eight mapped files without importing source or running TLC. A mismatch names the file and its model. Before a deliberate refresh, confirm that the changed file still meets the Editor model's premises. State that confirmation in the body of the commit that carries the refreshed record. If those premises changed, repair the model or correspondence first. A missing statement is a review finding; the script does not check that prose.

Commit the reviewed source, then run `node scripts/check-formal-source-hashes.mjs --refresh Editor`. Only this route reads Git. It refuses without a write if any mapped file differs from its bytes at the recorded HEAD, then updates this model's hashes and sync commit together. The refresh adds no model or source-control PASS. The existing `--source` check skips the hash guard and keeps its current source-witness behavior.

## Review a change

Compare each action with the named source functions. Keep awaits and durable marks separate. The model abstracts values, not the ordering of the actions it covers.

If source hashes differ, review the changed control flow before updating `coverage.json`. Recheck every affected transition, run the relevant source control below, then run the command again. Advance the sync commit only after this correspondence review. A hash match detects drift; it does not prove correspondence.

Replay a failing model path against the source, one action per step. Treat a path that the code cannot reproduce as a model error until evidence proves otherwise. Keep confirmed findings and their original invariant. Change no product behavior under this skill alone.

The source control and its original, broken and restored results appear in the evidence manifest linked from the README. Repeat only this subsystem's control when the protected boundary changes. Do not run a mutation sweep or a whole suite per control. Use `/maintain-formal-verification-skill` after an unchecked source change, if that skill is available.

Run the recorded source control with `node verification/state-machines/control.mjs Editor` followed by a new external evidence directory. `controls.json` names the exact source fault. Read the resulting assertion before treating a nonzero exit as evidence. The README gives a complete example.
