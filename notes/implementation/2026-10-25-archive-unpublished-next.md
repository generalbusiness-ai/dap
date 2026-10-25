# Append after an unpublished archive receipt

Request `3e01b385`, promise `bc394fd5`, follows BR-2 landing `86204d44`.
The Directory, Site and Destination archive rows on Grow have old v2
receipts without published anchors. A capacity wake previously repeated
adaptive scouting. The published-anchor fixed path did not apply.

After a genuine capacity deferral, the driver now selects exactly the next
entry before planning. For an unpublished receipt, a separate wrapper
validates the complete old local range and collects its real legacy
anchors. It shares one journal preparation with the new entry's fresh
inventory. The common fixed build quotes all remaining work using the
actual legacy anchor count, then carries those same anchors into the
publication. It performs no Scout visit.

The existing published path keeps its guard and operation order. Initial
work, v1 conversion and pending reconstruction keep their existing paths.
A caller cannot supply legacy anchors to the new wrapper. Missing, pruned
or unsupported old inputs still refuse through the existing validator.

All six allowance axes, prices, the finish formula and the 64 KiB metadata
margin remain unchanged. Completed migration work stays spent in the same
budget. A failed finish quote creates no Mark, credential or send. Only
confirmation of an actual publication covering the old range sets
`anchorsPublished`; frontier bootstrap and Mark creation do not set it.

## Decisions and why

The change is limited to `packages/scope/src/archive-driver.ts`,
`archive-adaptive.ts` and `archive-build.ts`. Its native witness extends
`packages/scope/test/archive-parent-bootstrap.test.ts`. The driver uses
the recorded capacity wake rather than making every unpublished receipt
take the fixed path. Sharing the preparation removes a real duplicate
root visit; it does not discount work or change prices.

The witness uses actual Native birth, journal entries, SQLite rows,
frontier bootstrap, eviction and pending reconstruction. Source and policy
preparation, target, HTTP and mint/send ports are TEST stand-ins. The
initial capacity wake uses an entry ceiling of two or three, with the node
ceiling still 64. The fixed retry uses all ordinary bounds. This is not a
reproduction of the hosted 65/64 node refusal.

At cutoffs zero and one the fixed planning quote spends 26 nodes and
reserves 20, totaling 46 of 64. In axis order entries, attempts, nodes,
calls, metadata bytes, input-work bytes, used plus reserved is
`(2,69,46,194,875177,26374927)` and
`(3,71,46,199,906760,27682611)`. Adding the unchanged 65,536-byte metadata
margin gives 940,713 and 972,296 metadata bytes. The deliberate missing-mint
prefix spends 36 nodes. That prefix is not a complete same-pass send cost;
later separate turns reconstruct and confirm the same Mark after Native
advance and eviction. The constrained 512 KiB metadata case reaches the
complete quote and refuses before Mark, mint or send. Only actual confirmed
publication sets the bit; subsequent published appends make no old parent
or object reads.

## Evidence before the gate

Affected checks ran at commit `ed44e9667a315272eff6a698cf7019fdf95ea7a8`,
tree `84aecae31e2181c415507709511a41f1b0899836`, except the initial compiler
failure and its unchanged production-compiler pass at `ccd9767d`. The
isolated correction moves the original 20-second `test.for` deadline to
Vitest's options argument; it changes no assertion or test body. The
control at `3b1e043a` restores only the old `anchorsPublished` predicate
in a separate private worktree. It is never landed.

| Check | Command | Exit | Output SHA256 |
| --- | --- | ---: | --- |
| Initial test compiler: registration error retained | `node node_modules/typescript/lib/tsc.js -p packages/scope/tsconfig.test.json` | 1 | `88e2aed213e4ec5c983e2cdf6fe3867d64f9bc66d301ab1f6e93efda46606670` |
| Corrected test compiler | Same compiler command | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Whole owning file: six pass | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope packages/scope/test/archive-parent-bootstrap.test.ts` | 0 | `6ca91e9d13bd11c9b09311ea375ad7408e654f7bcf5222a7f20311bd79aab7a6` |
| Other 31 whole archive files: 162 pass | Same native command with the 31 explicit file arguments recorded in `remaining-result.json` | 0 | `919ba3e60c114bb2527a10681108da43ac401dfa5976fe624ffce6a7932c7b24` |
| Control: four historical pass, two new assertions fail | Same owning-file command after the control's production compiler passes | 1 | `7f03e59e4ccdfa21b3aace1abb9380337f9fcaf0021e4c86671704706bdb8fb9` |
| Ordinary gate | `npm run gate` | Pending | Pending |

Counts come from the same-run maintained progress and timing streams and
the terminal output. The owning file has six matching ready/result/final
callbacks. The remaining run has 162 ready and final states, all passed,
but only 143 incremental result callbacks: the 19 gaps are all in
`archive-driver.test.ts`. It also prints two unexplained uncaught
`RefcountedCanceler` / `abortContextSignal` diagnostics during scale-test
output, while exiting zero and reporting no unhandled errors. These
diagnostics remain in the raw evidence; the run is not described as
error-free. The control fails at the fixed-finish assertion with a null
plan, rather than by timeout or compiler failure.

The initial failed command took 2.06 seconds elapsed and 5.60 CPU seconds;
its follow-up took 10.92 elapsed and 14.10 CPU; the remaining run took
398.41 elapsed and 418.50 CPU; the control took 10.38 elapsed and 11.98 CPU.
These are separate outer `/usr/bin/time` observations on the M5 Max with
18 logical CPUs, uncontrolled load and caches first earned by the owning
run. Nested command costs are not added again. Private physical dependency
copies and finite Source/tool/environment boundaries are checked
separately; the affected-run owner makes no dependency metadata equivalence
or continuous-custody claim.

The gate is next. Its final checkpoint, results, one external evidence
directory and the PD-2 manifest will be added in a documents-only follow-up.
No raw output is committed. This head uses the expressly allowed temporary
directory exception in ruling `fcab078d`; later heads use the durable home
directory. Raw environment and physical snapshots remain private and are
withheld from the review directory, as are any unredacted request bodies.

## Open limits

Request `3e01b385` still needs the ordinary gate and exact-head review.
Parent request `1aedd35b` remains open for the planner's deployment and
two-wake observations of the hosted Directory, Site and Destination rows.
Local fixture quotes do not establish hosted fit. If fresh inventory still
exceeds 64 nodes, the planner reports its measured components and stops.
No bound changes in this head.
