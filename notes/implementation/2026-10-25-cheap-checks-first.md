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
approved execution call. The failed setup is retained. A fresh capture
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

Under `docs/testing.md`'s isolated test-file follow-up rule, the remaining
checks are the replay test compiler context, the whole failing file and
the native phase that the gate never reached. The healthy plain files
and earlier stages are carried from the failed gate. Follow-up results
and exact-head checker review remain pending; they cannot turn the
failed gate into a pass. This tooling change requires no deployment.
