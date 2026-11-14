# File test evidence

You send a head for review, and the reviewer checks its test evidence
against one retained gate log. Run the gate once, as
[Test dap](testing.md#run-the-gate-once-before-a-review) says. Then follow
the rules below to repair a failed gate, file the evidence, and review a
head.

## Follow-up after a gate

Do not run the gate again for a commit that changes only documents. Say that
the source and tests are unchanged, and give the two tree hashes.
When a gate fails only in a test that reads a document and the repair changes
only that document, rerun that test file and the steps the gate never reached,
and report the failed run and follow-up together.

If a gate fails only in one test file, a targeted follow-up can cover an
isolated repair to that file. Only the failing test file and
explanatory documentation may change. Production code, configuration outside
that file, dependencies, shared helpers and imported code must remain unchanged.
The test file must not be imported by other files.

Run any compiler context whose inputs changed, the whole owning test file,
and the steps the gate never reached. Retain all original cases, their
deadlines and their assertions about production behavior.
Do not replace the failed case with a narrower test or weaken its assertions.
Keep the failed gate and follow-up outcomes separate. The reviewer assesses
whether the exact repair and evidence meet these conditions. A passing
follow-up does not turn the failed gate into a pass.

## File the evidence

1. File a START act with the head, tree, and current main.
2. At that clean head, run `npm run gate` once. Write its output to one log
   in a new directory under
   `~/play/artroom-evidence/<date>-<head-slug>/`.
3. File an END act with the exit code, wall time, each stage's count lines,
   and the log's SHA-256.
4. Commit one implementation note whose evidence table cites the log's
   path and SHA-256. Keep each cited control's output in the same directory
   and cite its path and SHA-256 too.

No power condition applies to a run. A head owes no formal focused
interval, supervisor plan, source or tool hash inventory, cache copy,
`SHA256SUMS` file, read-only seal, committed evidence manifest, sleep
record, or sealed landing record. Report a timeout as a failure.

Records that already exist stand. Historical notes, logs, and manifests
retain their original source and result limits.

## Review a change

Review the change, its invariants, and their witnesses. Probe with a few
focused counterexamples. Check the retained gate log:

1. The file exists at the cited path, and its SHA-256 equals the note's.
2. Its first lines name the reviewed head and tree with zero changed files.
3. Its last line says the gate passed.
4. Each cited control has its output in the same directory, with the
   SHA-256 that the note gives.

A missing or changed file is a changes-requested gap. The
[document-only follow-up rule](#follow-up-after-a-gate) still applies:
when the final head adds only documents, the note identifies the gated and
final trees and states that source and tests are unchanged.
Do not rebuild a per-field or per-guard inventory.

## The implementation note and its evidence

Each landing head carries one implementation note under
`notes/implementation/`, of at most 40 KB, with these parts in this order:

1. What changed.
2. The decisions and why.
3. The final evidence, as one table with a row for each check: the
   check, the command, the exit code and the digest of its output.
4. The open limits, each with the request that owns it.

Say how each timing, count or reconstruction was taken.

Raw run output stays out of the tree. Keep the gate log and cited control
outputs under `~/play/artroom-evidence/<date>-<head-slug>/` for at least
30 days after landing. Do not use `/tmp` or `/private/tmp`, because a
restart can clear them. Retain failed attempts separately. A later pass
does not turn a failed run into a pass.

The note names the commit and tree that the gate tested. When the reviewed
head differs, the follow-up rule above applies. Its evidence table gives
each command, exit code, output path, and SHA-256. Count lines come from
the actual terminal output. A concurrent sum of case durations is not a
measured wall time.

A raw file that holds a secret, token, or unredacted request body stays out
of the evidence directory too. The note names it as withheld. Other raw
output, including room identifiers from hosted tails, may stay.

Design packets commit their sources and at most three key images. Renders
and screenshot series stay outside the tree, with direct output citations.

The rule applies to each new head. Notes, evidence files, and manifests
already in the tree stay as they are. The gate's `notes` step reads the
committed base-to-head changes. It warns on each added or changed file
under `notes/implementation/` over 40,960 bytes. New names count as
additions. Unchanged and deleted historical paths produce no warning.
The check reads Git objects, not working-tree files. Warnings exit 0.
Git, missing-base, and decoding errors exit 2. The step neither requires a
manifest extension nor replaces the reviewer's log check.

## Run an optional focused plan

No head owes a formal focused run. Run changed test files, their affected
compiler contexts, and meaningful controls during development, as
[Test dap](testing.md) describes.

`scripts/focused-check.mjs` remains an optional tool for a frozen candidate
with an exact compiler closure and a complete case ledger. One invocation
runs the declared compilers, then one Vitest body. It does not collect the
same tests in a separate discovery run.

```
/usr/bin/time -p node scripts/focused-check.mjs plan.json ~/play/artroom-evidence/<date>-<head-slug>
```

The tool validates the plan's source, dependency, command, and case inputs.
Its same-run reporter checks actual case identities and results against
the plan. Its output covers only that selection. The tool's internal
records do not add a filing requirement or replace the gate, controls,
manual acceptance, or review. It never installs dependencies, retries a
command, or changes an original test deadline.
