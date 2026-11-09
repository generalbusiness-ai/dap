# Retain scale output and set the main runner allowance

Request: `a5f3d838aaaf7b2f44a162eb045e6878fc25457e`.
Promise: `2f8e738275709d36411f1d73f5da84a330971783`.
Ruling: `38d6107697b4611d2d108bf5880d0408408780b9`.

The first Ubuntu main run
[42570561287](https://github.com/generalbusiness-ai/dap/actions/runs/42570561287)
failed at main `4f06bbbc`: five cases passed, and the 30,000-entry floor
case reached its original 600,000 ms deadline. Its archived output and
manifest `95b70522` remain a separate failed result. No rerun replaces it.

The planner attributes the difference from the passing local gate to the
slower standard GitHub runner and sets a factor of three for that runner.
Only the main scale workflow sets `ARTROOM_SCALE_DEADLINE_FACTOR=3`.
The scale configuration validates it and defines the factor for the four
whole owners. Without that variable, each case keeps its original local
and review deadline. The workflow allows ninety minutes.

Each of the six explicit deadlines now calls `scaleDeadline`. Removing
only its import and wrapper restores all four files byte for byte to
main. No witness body, entry count, bound, or assertion changes. The
harness deadline makes no performance claim. Destination and Worker
runtime source and recorded meanings stay unchanged.

`scripts/scale-runner.mjs` redirects full stdout and stderr to separate
files and asks the same `npm run test:scale` command for a JSON report.
It prints every case's result and duration, checks six unique case
results across the four complete owners, and preserves a nonzero child
exit even when the report says every case passed. Missing or incomplete
reports also fail. The always-run upload step keeps command, raw output,
report, summary, and actual exit files for seven days. Its pinned
`actions/upload-artifact` v4 commit is `ea165f8d65b6e75b540449e92b4886f43607fa02`,
resolved from the action's official tag.

The two added cheap Node cases check unchanged default deadlines and
factor-three allowances, reject malformed factors, and distinguish
missing or duplicate results. A real scripted child writes three MiB of
stdout, a stderr marker, and six passing report rows, then exits 1. The
capture must retain all bytes and keep that failure. This child is a
harness stand-in; it supplies no Native scale result.

## Validation

At `5ac318c4`, tree `8d342e2b`, the complete five-case Node owner passed,
then the Scope test and lane scope compiler contexts each exited 0.
Actual driver exit is 0. Every tracked input stayed equal and all process
groups closed. No scale case ran in this focused pipeline. The
[focused manifest](evidence/2026-11-09-scale-runner-focused.manifest.json),
digest `c72399f77f11de81e508137810fbc20ba367bdf315f5387f270a049d302606a7`,
seals fourteen public files and retains 77 private originals.

One named control removes only the child-exit propagation. The unchanged
complete Node owner then exits 1: four cases pass, and only the capture
case fails at its assertion that a child exit of 1 stays a failure. The
verifier exits 0, every tracked byte restores exactly, and the process
group closes. The control reuses the saved passing baseline; neither the
baseline nor the restored owner repeats. The
[control manifest](evidence/2026-11-09-scale-runner-lost-exit-control.manifest.json),
digest `ba790205ebd336682f636ff0ae9c6cc62782532847a7a18f6bb110231a177b6d`,
seals ten public files and retains 66 private originals.

The branch integrates approved BR11 main `9ce45bd1` before its full gate.
No integration conflict or runner source change follows the focused checks.
The full gate at clean `f17b07a7`, tree `22cafa2d`, finished with actual
`gate.exit` equal to `exit 0`. All prechecks, typecheck, and fixed stages
passed: Node 142, Counting 56, Plain 4,028 with one skip, and Native 1,118
with two skips. Exactly six scale cases passed only in `scope-scale`.
Both environment overrides stayed unset. The final audit again restores
all four frozen owner texts to their original hashes after removing only
the helper imports and wrappers.

Every tracked input stayed equal and the owned process group closed.
Reports reconcile with no failure, contradiction, report error, or
unhandled error. The 102 unclassified observations are three Node wrapper
events for each of 34 files. One explicitly skipped recorder module has
no duration. Six retained process samples found no other local validation
body; samples cannot prove uninterrupted isolation. The
[gate manifest](evidence/2026-11-09-scale-runner-gate.manifest.json),
digest `797cb2d1836afbfce3ab65108d111e0f0464cb6b6ea8b0acc55ee06051f6d02d`,
seals 21 public files and points to 2,384 private originals.

The archive watch now contains twenty-one full gates: seventeen archive
passes and four Native-unreached failures. No retained full gate observes
an archive retry. Watch `64552d40` stays open. The separate GitHub
scale-only runs below do not enter this full-gate count.

Only this note and the gate and main-CI manifests follow the tested head.
Exact-head review remains due. The next main workflow result after this
change lands must pass all six cases or name each failed case and its
duration, with the new output artifact retained.
No Worker deployment or live acceptance follows this test-harness change.


## Retain both original-deadline main observations

While this head's gate ran, automatic BR11 main scale run
[42578225982](https://github.com/generalbusiness-ai/dap/actions/runs/42578225982)
passed all six cases in four files at `9ce45bd1`. It used the original
unscaled deadlines and old console output path. The 30,000-entry case
finished in 426,631 ms; Vitest reported 804.86 seconds elapsed for the run.
The four owners, both scale configurations, project membership, native
wrangler configuration, and lock match the earlier failed main run.
This later success adds evidence of runner variability, but proves no
cause for the first timeout. Run `42570561287` stays failed. Neither run
was a retry.

Automatic main Page run
[42578226025](https://github.com/generalbusiness-ai/dap/actions/runs/42578226025)
passed all four maintained commands at that same main head. Neither
workflow uploaded images or other downloadable artifacts. The
[main-CI manifest](evidence/2026-11-09-br11-main-ci.manifest.json), digest
`aa2a1a41c2b9b8f081a6344fad1ddd3a6abbd356e341358009ec180f1806d73a`,
seals six public files and retains 35 private originals, including both
complete raw log ZIPs and the exact six case durations. No truncated
rendered log replaces either ZIP.

Builder report `bdce1733` and its planner mention record this new evidence.
Ruling `38d61076` still governs this head. The new factor-three workflow
and artifact upload remain unobserved until this change lands; the
unscaled main success supplies no evidence for those new paths.
