# Run cheap checks before Worker tests

BR-2 (`777e234d`, promise `bde9081b`) changes the root test order so a
failed cheap check prevents the Worker test projects from starting. It
also reports slow observed cases and time per project. Archive work
reached exact-head review before this work began and landed as Main
`2f5d9a2f`.

The test command runs five fixed stages: kernel boundary, maintained
Node checks, Counting build and generated Node witnesses, plain Vitest,
then native Vitest. The plain and native views select their project
data before inherited config resolution. They share all sixteen
canonical project declarations. The plain phase keeps fourteen projects;
the native phase keeps `scope`, then `scope-denial`. Each existing
project retains its settings, file selection, assertions and deadlines.
The npm compatibility hook runs once before these stages.

Timing observations use a separate stream from optional Vitest
readiness, result and final-state callbacks. The summary reconciles
actual case identities, preserving duplicate display names and callback
gaps. Node suite aggregates stay outside the case ranking. Counting
retains its generated file identity and the source mapping validated
from the build's entry points. This is Node evidence, with no browser
execution claim.

The summary prints up to ten slowest known-duration cases, each Vitest
project's observed module test-and-hook duration sum, and separate Node
and Counting case sums. These concurrent sums are neither wall time nor
CPU time. Missing durations stay unknown. A failed or incomplete phase
is partial; a stage that never started is unreached. Phase wall time is
measured separately, while phase CPU is unknown. Outer gate timing
includes its children and is not added to their nested measurements.

Both direct tests and the gate finalize once. A pre-test gate failure
still prints no observed cases and unreached stages. A summary failure
fails an otherwise healthy run and preserves an earlier child failure.
No in-process finalizer promises a report after a forced process kill or
host loss.

The dependency view was copied once into the isolated checkout without
installation or package execution. The copy checked 5,498 private file
copies, 535 directories and 32 contained relative links against the
quiescent donor. It excluded runtime caches and verified the unchanged
lockfile stamp. Its separate outer cost was 2.28 seconds wall and 1.94
seconds CPU.

Root reviewed and integrated parallel Sol Source packets for orchestration,
reporting and phase/Counting seams. One affected command at `38bd089d`
ran five whole Node files: all fifteen cases passed, with no skip or
cancellation. It exercised the actual custom reporter, the actual Bash
gate's early-failure summary, and child launch, spawn failure and signal
handling. The separate outer command used 3.64 seconds wall and 3.13
seconds CPU. Source and environment hashes matched before and after.

One control at disposable `894f10a7` changed only the stop guard to
`false`. The unchanged six-case owning file finished with four passes
and two assertion failures. The required plain-failure case observed
the later native sentinel where it required absence (`test.test.mjs:45`).
The spawn-failure branch failed at the same boundary (`:56`); its later
signal variant was not reached in that control. The separate command
used 2.23 seconds wall and 2.07 seconds CPU. The candidate stayed
untouched, and the control branch is neither pushed nor landed.

These are tiny process-boundary workloads and a declared Git refusal
stand-in, with the real orchestration and summary code. They make no
Worker or provider claim.

The first gate preflight refused before launching any application
command: its capture used a different `CODEX_SANDBOX` setting from the
approved execution call. That failed setup used 0.52 seconds wall and
0.52 seconds CPU. It remains failed. A fresh capture
under the matching execution setting kept the full environment guard;
no cache reset, package installation or test preceded the correction.

Ordinary gate `82795` then finished naturally with exit 1. All compiler
contexts passed. The kernel check, all 53 maintained Node cases and all
55 generated Counting cases passed. The plain phase recorded 2,815
passes, one failure and one skip in 274 files. Its failure was
`archive-git-v2-layout.test.ts:70`: the fixture's `git hash-object` child
hit its 30-second limit. The raw failure establishes that timeout and
does not identify its cause. The native phase was unreached. The summary
printed once, marked the failed phase partial and retained exit 1. All
source and dependency boundary guards passed. Outer cost was 159.78
seconds wall and 411.79 seconds CPU; nested timings are not added.

The isolated repair changes only that failing test and this note. It
uses the existing independent SHA-1 loose-object fixture writer, checks
each returned ID against the built object, then asks real Git to check
all inserted objects in one batch. Existing Git `fsck`, offline replay,
every original assertion, all three ranges and the 30-second deadline
remain. No shared helper, production code, configuration or dependency
changes after the failed gate.

Under `docs/testing.md`'s isolated test-file follow-up rule, the follow-up
covers the replay test compiler context, the whole failing file and
the native phase that the gate never reached. The healthy plain files
and earlier stages are carried from the failed gate. Follow-up `16214`
completed naturally with exit 0 at `801129fc`, tree `ab37fe58`. Its three
direct commands passed: the replay test compiler, the whole repaired
one-case file, and the previously unreached native phase. Native recorded
769 passes and two ordinary skips across 771 unique final cases in 227
files, with no unhandled errors.

The repaired case has matching readiness, result and final PASS records.
Native has 18 missing readiness callbacks and 40 missing intermediate result
callbacks, all with terminal PASS records. There are no duplicate or
conflicting identities. Missing callbacks do not establish an unstarted
or still-running case. The separate timing streams reconcile the same
actual case identities without inventing a collection report or retries.

Root accepted the independent closed follow-up audit. All eight clean
boundary records match the allocation under the inherited named cache and
empty `.vite-temp` directory timestamp exceptions. The four observation-copy pairs match
the original records. These are finite source and tool checks, environment hashes and
dependency metadata, not continuous custody of dependency contents.

The follow-up used 1,327.32 seconds wall and 1,343.59 seconds CPU. Nested
compiler, file and native timings overlap the outer command and are not
added. It did not invoke another maintained whole-gate summary. The closed
raw timing and progress streams were reconciled independently; they do
not replace the failed gate's original summary or manufacture one healthy
combined run.

Ordinary gate `82795` remains failed. The isolated replay repair and accepted
follow-up are historical evidence for `801129fc`. They do not validate a
later change to the reporter. The compatibility repair below changes
tooling source, so the isolated test-file exception no longer covers the
new candidate. Fresh owning checks on Node 22 and Node 26, then a fresh
ordinary gate, remain pending. Exact-head checker review and landing also
remain pending. This tooling change requires no deployment.

These timings were recorded on an Apple M5 Max with 18 logical processors.
Load was not sampled for the owning checks or gate. OS cache temperature
was uncontrolled, and the checkout used privately copied dependencies.
A later load sample cannot describe those earlier runs. The measurements
are local observations, not a portable performance benchmark.

## Node 22 compatibility blocker

The earlier checks used pinned Node 26.12.1. The package also permits Node
22.23.4, whose public events lack the reporter's modern case-identity fields.
Actual Node 22.23.4 baseline `44405` completed naturally with exit 1: two
owning cases passed and one failed at `test-summary.test.mjs:66:12`, where
the integration expected two identified cases and observed zero. Recorded source,
environment and binary pins agree before and after. That failure
is retained separately from the Node 26 results.

The measured Node command used 0.90 seconds wall and 0.16 seconds CPU.
The Python wrapper's CPU was not measured, so those figures are not a
complete wrapper cost or delivery total.

Root is reviewing a repair in `scripts/test-summary.mjs`, its owning test
and `docs/testing.md`, with the declared engines unchanged. Missing modern
identities remain unknown and excluded from case ranking. Neither a
legacy type label nor a raw ordinal establishes a case identity. Actual
end-of-stream consumption is distinct from a framework summary or success:
known failed terminals must still prevent a successful reporting outcome.
The final source, owning checks and new gate outcomes remain unearned.
