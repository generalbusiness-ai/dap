# File test evidence

You send a head for review, and the reviewer checks its test evidence
against a sealed record. Run the gate once, as
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

1. Write raw run output to a new directory,
   `~/play/artroom-evidence/<date>-<head-slug>/`, never under `/tmp` or
   `/private/tmp`.
2. Write a `SHA256SUMS` file at the top of the directory, then make the
   directory read-only with `chmod -R a-w`.
3. Commit one manifest at
   `notes/implementation/evidence/<date>-<head-slug>.manifest.json`.
4. Commit one implementation note under `notes/implementation/` whose
   evidence table cites the manifest's files.

[The implementation note and its evidence](#the-implementation-note-and-its-evidence)
gives the exact rule.

## Review a change

Review the change, the invariants it touches and their witnesses. Probe
with a few focused counterexamples of your own. Check the head's evidence
manifest: every listed file exists at the directory with its size and
digest, and every digest the note cites is in the manifest. A missing or
changed file is a changes-requested gap. Cite the manifest's own sha256
in the report. Run the gate once at the head under review, subject to
the [limited follow-up exception](#follow-up-after-a-gate).
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

Raw run output stays out of the tree: gate logs, JSON reports, tail
captures, mutation inventories and results, stdout and stderr. Write it
to one new directory under the owner's home,
`~/play/artroom-evidence/<date>-<head-slug>/`, with a `SHA256SUMS` file at
its top. Make the directory read-only after the last write
(`chmod -R a-w`) and keep it for at least 30 days after the landing. Do
not use `/tmp` or `/private/tmp`, because a restart clears them. A
directory is removed later only by a recorded act that names its
manifest.

The head commits one manifest at
`notes/implementation/evidence/<date>-<head-slug>.manifest.json` and
nothing else under that directory. The manifest holds:

- a qualification line
- the absolute directory path
- the checkpoint commit and tree at which the evidence was taken
- the file count
- a `files` list with the path, bytes and sha256 of every file the note
  cites
 The note's evidence table
names the same checkpoint. Where the reviewed head differs from it, the
follow-up rule above applies.

A raw file that holds a secret, a token or an unredacted request body
stays out of the directory as well, and the note names it as withheld. Other
raw output, including room identifiers from hosted tails, may stay.

Design packets commit their sources and at most three key images. Renders
and screenshot series go in the directory and its manifest.

The rule applies to heads filed after ruling `fcab078d` of 25 October
2026. Notes, evidence files and manifests already in the tree stay as
they are. The gate's `notes` step checks the committed base-to-head file
changes. It warns on each added or changed file under
`notes/implementation/` over 40,960 bytes, and on each added path under
`notes/implementation/evidence/` whose name does not end in `.manifest.json`.
A new name counts as an addition. Unchanged and deleted historical paths
produce no warning. The check reads Git objects, not working-tree files.
Warnings exit 0. Git, missing-base, and decoding errors exit 2. The check
does not verify manifest contents or replace the reviewer's evidence check.


## Run a reviewed focused plan

For a frozen candidate with an exact compiler closure and complete static
case ledger, use `scripts/focused-check.mjs`. Its one invocation runs each
declared compiler once, then one Vitest body. It does not collect the same
tests in a separate discovery run or pause between successful phases.

```
/usr/bin/time -p node scripts/focused-check.mjs reviewed-plan.json ~/play/artroom-evidence/<date>-<head-slug>
```

The reviewed JSON plan names these inputs, as paths and hashes and never
secrets:

- the canonical checkout, head and tree
- every tracked package, script and example input, the read-only
  documentation fixtures and the root configuration
- extra external inputs, including the actual pipeline file and body
  config
- the lock stamp, the current workspace bindings and the source export
  aliases
- the pinned Node, compiler and Vitest tool files
- each unique compiler config and its working directory
- the body config, its working directory, and the complete selection of
  files, projects, pools and full titles

A selected file must have unique full titles within its project. When that static ledger cannot
identify every case, keep an explicit collection plan instead of guessing.
The dependency namespace and its Vite state must be owned real directories.
A symlink to shared `node_modules` or `@generalbusiness` is refused even when
an individual workspace resolves to the right source.

The driver checks those facts before any tool or application import, at
each command boundary and after the terminal command. Any refusal, changed
source, nonzero exit or signal stops the pipeline. Its same-run reporter
checks complete file/project/pool identity before global setup, then records
actual case states, errors, skips and unfinished or unrun obligations. It
uses structured status fields, so a title that contains “failed” is only a title.
The built-in JSON reporter provides a second count/file/status check in the
same body invocation. Verbose output and complete raw reports stay in the
new external evidence directory, and its manifest seals their hashes. Existing
evidence is never overwritten, and the driver never installs dependencies,
retries a command or changes an original test deadline.
`result.json` records verification outcomes. The actual process exit
decides. A sealing failure exits nonzero and retains partial artifacts
and, when possible, a fresh sibling failure record without rewriting them.

Time the outer command to include guards, parsing, artifact work and child
CPU. The driver also retains each command's own wall, user and system time.
Their sum is a sum of separate commands, not a measured pipeline duration.
A focused pass protects only its selected boundaries. It does not replace
the final gate, meaningful controls, manual acceptance or complete review.
