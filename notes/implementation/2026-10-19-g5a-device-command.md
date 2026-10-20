# G5a: native device commands

Request: `5aae9b0ab67909ee49118dc49d465fe881a8037a`.
Promise: `79f23cb727ca2ae086f49764b6b8ab7a69d2f950`.
Base: actual Main `dba3e76237250b6ce205d511691554de3d809baf`.
The earlier reviewed candidate used Main `3ed2a08a50f31e84ea42b4f6027684e14a8cedb8`;
the new integration adds only Main's corrected sprint report.
The first three gate attempts and historical baseline comparisons ran on
Main2127. The later
Main adds only the approved sales-design note; receiptbcfbc8dc and its
exact one-path Git delta were read before incorporation.

G5a adds device-command@1, its bounded native install grant, Grow commands
and owner answers, and shared runtime/replay code. Target, sensor report
and owner outcome have separate writers. No device or provider operation
runs. The delivery is one complete Source head. Three failed gates remain
evidence. The fourth gate passed at the earlier code/test head. Complete
review `5396f5ed` requested the command-ordering correction. Its gate
passed, then complete review `0ff93247` found a residual independently
conditional targetAt write. The current fresh revision addresses that
finding and two additional self-checks, and its whole gate passed. The
complete third review `b8d8dda2` then found a skippable allowed-kind guard.
The current fresh revision corrects that execution-context proof and a
related open-effect self-check. Its focused checks and new whole gate
pass. Complete exact-head review remains owed. Earlier
sealed candidates, dependencies and evidence remain frozen forever.

## Execution context after the complete third review

Complete review `b8d8dda25abd045d6c792031f4b0676e23cd7826`, adopted by
`f6b606bfef01eabd89b50310b3bcefd5d4b339a5`, reports one required F1.
The kind operand can name the commanded device while the guard's own
`of` names another optional, unbound item. Runtime skips that guard before
reading its operand. The old admission proof accepted the declaration,
and an out-of-grant fan target was written without a command.

The local proof now checks execution subjects as well as the kind source.
The guard and command effect must use the primary transition item or the
commanded device as their own execution subject. A transition's primary
item is bound; binding the command's own device suffices too. An unrelated
subject does not prove execution, even if another argument names the right
device. This conservatively refuses the unsafe declaration. It preserves
Grow authorize's primary alert guard with a kind operand from the actual
heater. Capability execution, grant/owner records, native declarations,
pins and defaults remain unchanged; admission is stricter.

A builder self-check found the same mismatch on the open effect itself:
its own optional `of` could skip while `with.device.of` still named the
written target. A heater target was accepted at on/80 with zero command
records. The same binding proof now covers that effect. Shared if/unless,
written ordering, final-before-open refusal, no-grant behavior and answer
reservation/current/late semantics stay in place.

Fresh view `/tmp/artroom-builder-g5a-guard-context-20261019` starts from
exact reviewed `7f15e2be2d4db9acd262f18d242a1ee6e6d718c6`. Merge
`f2f9acd00a227818196468bd91355d72d759ba14` integrates actual Main; its
only delta from that candidate is `notes/reports/2026-10-19-sprint-report.md`.
Dependencies are a private COW copy of unsealed Main, with the repository's
exact pool compatibility adoption before checks; no installation occurred.
Only the checker's manifest and six granted regular files were read and
stable-copied to `/tmp/artroom-g5a-guard-context-checker-evidence-20261019`.
Every size and SHA-256 matches. Original sealed views and tools were neither
edited nor executed; no adjacent checker directory was read.

The exact copied probe independently reproduces the guard failure: one
selected case fails directly with write instead of refused, and six cases
are deliberately unselected. The additional effect-context probe fails
its direct command-count assertion, zero instead of one, after the target
assertion passes; seven other probe cases are unselected. Both original
commands naturally close with exit 1 and unchanged source hashes.
Parent grant metadata and identity are SCRIPTED; the validator, native
capability, judges and fold are real. This is no provider execution.

The strengthened maintained admission case now includes both unsafe
contexts. All earlier assertion text and five case declarations remain;
no case or deadline is added. The first test compiler caught a readonly
array push in the new witness and two such mutations in the temporary
checker probe. The maintained witness now replaces its readonly array.
Both owning compiler targets pass with temporary probes absent. Exact
probe copies are placed only after compilation closes and removed only
after runtime closes; no compiler setting was widened.

The final four-file pure command passes 22 cases: 14 maintained cases and
the checker's seven exact cases plus the additional builder case. Unsafe
probe cases pass by declaration refusal, not by an observed act refusal.
One control makes only the shared binding proof always true: both concrete
probes fail directly, then source is restored byte-for-byte. This is one
focused control, not a sweep.

Six existing native/CLI/pin files pass 19 cases, including real native
install/SQLite/restart, Grow set-heater/authorize/current/late answers,
recorded projections/replays and local CLI scenarios. Their TEST
repository/package/clock/scheduler and recorded or SCRIPTED parent identity
boundaries remain. These are this run's six selected files and 19 cases,
not the checker's separately reported six-file/20-case selection. Outer
runtime was 15.00 seconds wall/21.28 CPU. The two existing asset files pass
four cases in 1.29 seconds wall/2.10 CPU. Normal Page generation updates the
embedded validator; MCP generation reproduces its existing module.

Logs, source hashes, copied evidence, intermediate failure, controls and
closures use `/tmp/artroom-g5a-guard-context-*20261019*`. Temporary probe
sources are retained outside the checkout, with exact hashes. The gate
outcome follows; complete Source and exact-head review remain ahead.

## Current execution-context gate

Original process 69768 naturally exits zero at clean code/test head
`8e1968a47d14c7e0213e1e493b36b0d9c05fad67`, tree
`09ac23cb2e1dce87c0b20e2e680d8a80bb20cf7a`. Native assertion
`ab6a92c3274fc0a18fd906edc9f797f2977204a7` records the result.
Whitespace, typechecking and tests pass: 401 Vitest files and 1,939 cases,
with three existing recorder skips; the chained Node and Counter steps
pass 31 and 55. Temporary probes were removed before this gate. Existing
case/model/Node/denial limits, including the adopted functional Scope
allowance, remain unchanged.

Outer cost was 501.80 seconds wall and 723.01 CPU (621.28 user plus 101.73
system). Typechecking reported 8.4 seconds wall/32.0 CPU and the test step
493.2/690.8; these are separate, rounded step measurements. Host:
arm64 macOS 27.0.1 / Darwin 27.0.0, 18 logical CPUs, starting load
1.5513/1.7900/1.8428. Focused compilers, native/CLI checks, regeneration
and filesystem reads made caches warm or partly warm. Other host work
was uncontrolled. Separate-checkout documentation and read-only evidence
work ran concurrently; no competing builder native tests ran. These are
no product-latency or stability-under-load figures.

All 2,306 tracked files, 5,498 installed regular files and 31 contained
links remain exact before/after. Only the named Vitest results cache
changes among 5,499 dependency-directory files. Installation is skipped
under the verified lock stamp. The exact pool adoption preceded the gate;
no source or installed dependency changed while it ran. Raw output
retains an unclassified different-Durable-Object/RefcountedCanceler warning;
it is not relabelled as expected or a stability fix.

Raw gate directory:
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.4a9vl2KLcP`.
Counter output: its sibling `artroom-counting-node-svqu9g`. Logs, snapshots,
comparison, diagnostic index, timing and closed-process receipt use
`/tmp/artroom-g5a-guard-context-gate-*20261019*`.

The prior frozen map's 2,248 leaves / 60,902,723 bytes and separately
granted 25,623-byte closed Source CLI log were rehashed unchanged; the
audit is `/tmp/artroom-g5a-guard-context-previous-evidence-audit-20261019.json`.
Earlier failed gates, passing gates, complete reviews, packaging and
instrumentation failures remain their own history. They are not this
changed-head acceptance. No original frozen project, dependency, tool or
checker view was executed or edited.

This outcome update changes only the primary note after the passing
code/test head. Source and tests remain byte-identical; no gate is
repeated for the document update. The Source record binds the resulting
candidate and tree beside the passing tree above. The complete delivery
still covers all 83 paths against its actual Main base dba3. No approval,
native landing, push, hosted Device/archive integration, physical-device,
provider or deployment acceptance is claimed here.

## Historical conditional coupling correction

Complete checker report `0ff93247576b4ef9fc8ca384b3f8e6ca128a0cfb`,
adopted by `a14b9630`, confirms both prior unsafe orderings are refused.
Its one residual F1 finding conditions only targetAt=self on level=30,
then submits level=80. The validator accepted the target change while
the skipped fact write left no command or answer reservation.

The validator now conservatively requires all target/level/targetAt writes
on a device to carry identical canonical `if` and `unless` forms. It does
not try to prove implication between different conditions. Native effect
conditions read the state before the entry's effects, so those shared
forms execute or skip the writes together. The command remains after all
relevant writes and has no independent condition. Existing shared `if`
and shared `unless` cases each prove false leaves the previous target with
zero commands/reservations, while true records the final target and one
reserved answer. The no-install-grant path remains unchanged.

Before the gate, two builder self-checks tested other silent exits of open:
a final-state effect before the command, and an omitted kind guard while
the granted kinds exclude the actual fan. Both reproduced missing commands.
The same revision rejects an effect that can make that device final before
open, and requires a direct act guard `device-command.allowed` on the
exact device's kind slot. A constant or another subject cannot supply that
guard. This reuses the existing capability guard and its named refusal;
there is no new runtime action, role, provider or grant. Without an install
grant that existing guard still admits the target and opens no command.
The actual act's guard list is passed to the existing effect validator.
No maintained declaration or native pin data changes.

Fresh view `/tmp/artroom-builder-g5a-command-conditions-20261019` starts
from sealed `e0363323c`. The five checker grant leaves and its manifest
are size/hash-verified and stable-copied to
`/tmp/artroom-g5a-conditional-checker-evidence-20261019`. Manifest SHA-256
`d8e37d9f2bb9d1cb273bd294002db59f72aae70d8393669be1ac157e2c5b460d`;
probe SHA-256
`d3c80d70d40267c035f55056160534be1c3a11628c3b68094da3087320f063d7`.
No original frozen source/dependency/evidence view or adjacent checker file
was edited or executed.

The exact checker probe reproduces one semantic failure and 17 passes
across four files before correction (original6980 naturally exit1).
The intermediate condition-only correction passes those 18 cases. The
owned builder probe then adds the final-state and kind-guard cases: two
semantic failures/four passes. After all corrections, four owning files
pass 20 cases, including the six-case temporary probe. Finally the exact
unchanged four-case checker probe is copied again and passes all four
against the final code. The temporary probe is removed only after those
processes close; its exact original and builder variant remain evidence.
No redundant test file is added to Source. Parent metadata and identity in
these probes are SCRIPTED; validator, capability, judges and fold are real.

A single control bypasses only the conditional comparison
`previous && previous.condition !== condition`. The unchanged owning file
passes five cases before, then four pass and one fails by assertion, and
source is exactly restored. Original30682 naturally exit0. The standard
helper removes its scratch JSON on exit; the full control log is retained.
This is no sweep or frozen baseline rerun.

Derive's source/test compilers pass. The real native device install and
Grow Site-to-Room cases pass two (original10360 naturally exit0), with
their prior TEST repository/package/clock/scheduler/setup boundaries.
Normal Page generation updates the embedded validator; MCP generation
reproduces its unchanged module. The two freshness files pass four cases
(original77636 naturally exit0). Logs have prefix
`/tmp/artroom-g5a-conditional-`, date `20261019`, and suffixes
`baseline-reproduction`, `corrected-owning`, `builder-selfcheck`,
`all-coupling-owning`, `exact-checker-probe`, `guard-control`, `types`,
`native`, `regenerate-page`, `regenerate-mcp` and `assets`.

Private dependencies are an independent-inode APFS COW copy from the
frozen order-correction view, read only. Audit
`/tmp/artroom-g5a-conditional-dependency-view-20261019.json`, SHA-256
`ffa88d3668d4d506a93b70fefb4f02c263f7e3b1d381de3203a090a1935b4926`,
checks 127 package.json files including embedded metadata and 28 internal
links (13 workspace links plus executable links), with zero installs and
unchanged lock/stamp. Four copied Vite caches are cleared before execution.
This is no tarball integrity claim. All originals are terminal before each
source/dependency edit. The new whole gate passes as recorded below. One
complete exact-head review remains ahead; no landing, push or deployment yet.

## Passing gate for complete coupling admission

The required whole gate passes at code/test head
`8a3aad1a5246243da9306714fd29c97d66791589`, tree
`ab14afc7be9e65ffe97f97d223fd6131852a5574`. Original89038 naturally exits
zero, clean before/after with the same head and no source/dependency edit,
install or related execution during the run. Only this evidence note
changes afterward; no suite is repeated for that note-only follow-up.

Vitest reports 401 files and 1,939 cases passed, one file/three cases
skipped. Chained Node checks pass 31 and Counting passes 55. Whitespace
passes; full typecheck is 8.3 seconds elapsed/32.4 CPU and the test step
is 503.1 seconds elapsed/701.0 CPU. Vitest reports 496.45 seconds.

One actual npm run gate subprocess, measured with Python monotonic time
and RUSAGE_CHILDREN deltas, takes 511.6560 seconds elapsed and 733.7086
CPU seconds (632.2517 user + 101.4569 system), excluding pre/post Git
checks. This is separate from its per-step figures. The shared macOS
27.0.1 arm64 machine reports 18 CPUs; initial load averages are 1.0000,
1.5029 and 1.6787. Focused/build caches are warm. There is no isolation,
product-latency or broad stability claim. The adopted functional scope
30-second framework allowance and all explicit case, semantic, Node and
scope-denial limits remain unchanged. Earlier three failed gates, both
prior passing heads, both complete reviews and their reproductions remain
separate evidence.

Log `/tmp/artroom-g5a-conditional-complete-gate-20261019.log`, SHA-256
`f2cba71698d129caf5c72ec8fe266da97ce4d0f91d14d0c98a6842acc0a1d432`.
Raw directory
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.T09WOik0V2`;
Counting evidence is sibling `artroom-counting-node-n5trws`.
Closure `/tmp/artroom-g5a-conditional-gate-process-closure-20261019.json`,
SHA-256 `9c425f602c408aeec9474ce4fab3997d595a1e8f5d7c49d2a5fdb5f0d4f1781b`.
Machine receipt `/tmp/artroom-g5a-conditional-gate-machine-20261019.json`.
Raw warnings and scripted fault output remain evidence; no warning-free
claim is made. No landing, push, deployment or physical device action occurs.

## Command-ordering correction after complete review

Checker report `5396f5ed44ca31175be75eeb813a1063eed7a97a`, adopted by
`a566fd79`, has one required finding, F1, and no other required findings.
The validator admitted `[open, target, level, targetAt]`, which wrote a new
target without a command, and `[targetAt, open, target, level]`, which
recorded the previous target snapshot. The capability correctly observes
the working item at its written position; the missing condition was in
whole-definition admission.

The validator now tracks each command's position and each subject's last
relevant target/level/targetAt write. Admission requires targetAt=self and
one command after all those writes. Conditional target writes keep their
written order; an independently conditioned command remains refused. The
legacy no-device fast path and the pure runtime/replay capability are
unchanged. No maintained declaration or native pin data changed.

Fresh checkout `/tmp/artroom-builder-g5a-command-order-20261019` starts at
sealed candidate `dfb0268f8`; its original view was neither edited nor
executed. The checker granted nine exact frozen regular files through
`/private/tmp/checker-g5a-review-s4k7guda/checker-evidence-manifest.json`,
SHA-256 `d91f78d60d34d33412e9b78c0ca5a61108295274e94d8dd6ee4e4a44991ddcc6`.
All nine bytes/sizes/hashes were verified and stable-copied into
`/tmp/artroom-g5a-order-checker-evidence-20261019`. No adjacent checker
files or checker source/dependencies were used or executed.

The exact checker probe, SHA-256
`59adbe0c6a43bd8cca9711b19957dccba541d0f79dbe6c4408751e4eab8620c4`,
was run only in the new owned checkout. Its original-order control and
five existing cases pass, while both counterexamples fail semantically
(two files, six pass/two fail; original82998 naturally exit1). Log
`/tmp/artroom-g5a-order-baseline-reproduction-20261019.log`. This is a
focused reproduction, not a gate failure. Parent creation metadata and
identity are SCRIPTED; validator, capability, judges and fold are real.

After correction, the owning four-file selection passes 17 cases,
including all three unchanged probe cases. The two unsafe orders join
the existing validator witness. The reservation witness now also proves
shared-condition false leaves the previous target and no command or
reservation, while true records the final target and reserves one answer.
Existing no-grant behavior remains covered. The temporary duplicate probe
is removed from source after that original process closes; the exact
probe remains in the owned evidence copy. No redundant test file is added.

A single control replaces only `command <= target.last` with false.
The unchanged owning file has five passes before the bypass, four passes
and one assertion failure with it, and the exact source is restored.
Original58306 naturally exits zero; log
`/tmp/artroom-g5a-order-guard-control-20261019.log` retains the before and
changed outcomes and assertion. The standard helper removes its temporary
`artroom-control-cjE7eA` directory on exit (`scripts/control.mjs:134`), so
its temporary JSON files are not retained evidence. No sweep or frozen
baseline rerun occurs.

The Derive source/test compilers pass. Actual native install and Grow
Site-to-Room tests pass two cases (original56394 naturally exit0), retaining
their TEST transport, setup, clock and scheduler boundaries. Normal Page
generation updates its embedded validator; MCP generation reproduces its
unchanged module. Both freshness files pass four cases (original13194
naturally exit0). Logs use `/tmp/artroom-g5a-order-` with suffixes
`corrected-owning`, `types`, `native`, `regenerate-page`, `regenerate-mcp`
and `assets`, all dated `20261019`.

The private dependency view is an independent-inode APFS COW copy from
the sealed donor, which is read only. It checks 127 package.json files,
including embedded subpackage metadata, and 28 internal links (13 workspace
links and executable links). Two copied Vite caches were cleared before
execution. No installs or manifest/lock changes. Audit
`/tmp/artroom-g5a-order-dependency-view-20261019.json`, SHA-256
`4de3655896a73b507df6e76eec7e2ca6cfb7c79cc9b17f2082d945d3d5b3481e`.
This checks copied manifests/inodes/links, not tarball integrity. Original
processes are terminal before each source/dependency edit. The new complete
gate passes as recorded below; exact-head review remains required, with no
landing or publication yet.

## Passing gate for the command-order correction

The required new whole gate passes at code/test head
`6cb9a93379ab10e561967136735667ff1cfbbc79`, tree
`551a64b177f391ac150215c779192fe54be2ceb9`. Original process18796
naturally exits zero. The checkout is clean before and after, the head is
unchanged, installation is skipped against the verified lock/stamp, and
no source or dependency changes or related executions occur during it.
Only this evidence note changes after that passing head; no suite is
repeated for the note-only follow-up.

The run reports 401 Vitest files passed, one file skipped; 1,939 cases
passed and three skipped. The chained Node checks pass 31 cases and
Counting passes 55, with no failure. Whitespace passes. Per-step full
typecheck is 8.3 seconds elapsed / 32.0 CPU; the test step is 501.1 seconds
elapsed / 697.6 CPU. Vitest reports 494.71 seconds.

One actual `npm run gate` subprocess is also measured with Python's
monotonic wall clock and `RUSAGE_CHILDREN` deltas: 509.6367 seconds elapsed,
629.6444 CPU user + 100.1670 system = 729.8114 CPU seconds. Pre/post Git
checks are excluded. This whole-process measurement is separate from
its per-step figures and from the earlier gate's per-step-only evidence.
The machine is shared, with focused-run/build caches warm; initial load
averages are 2.1265, 1.6333 and 1.9917. No product latency or broad stability
claim follows. The adopted functional scope project's 30-second framework
budget remains explicit; all case-specific and semantic limits, Node and
scope-denial budgets remain unchanged.

Log `/tmp/artroom-g5a-order-complete-gate-20261019.log`, SHA-256
`b44d3212969bd2f01a2e000dffc877a29e21a7548c51a77a2f29ac3596dc3801`.
Raw directory
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.yXnC8gwe2Q`;
Counting evidence is the sibling `artroom-counting-node-e5tdSQ`.
Closure `/tmp/artroom-g5a-order-gate-process-closure-20261019.json`,
SHA-256 `92c0fd1662eb765148a250ca18e8de9d5cf3bb71979c2c50a48d7c7bd215b5cb`.
The machine receipt is `/tmp/artroom-g5a-order-gate-machine-20261019.json`.
Raw warnings and scripted fault output remain evidence; passing does not
mean warning-free operation. All three earlier failed gates, their real
corrections, the earlier passing gate and both checker counterexamples
remain retained, with their own exact heads and boundaries.

The first sealing attempt (original28467, exit1) expected that disposable
control directory to remain. It stopped before creating a map; no gate,
control or source check was rerun. Its failed sealer and 166 partial Git
snapshots remain unchanged, with receipt
`/tmp/artroom-g5a-order-sealer-failed-attempt-20261019.json`. A new v2
sealer uses a fresh history and map, retaining the actual control log and
this correction. This is evidence packaging failure, separate from the
passing whole gate and the distinguishing control.

## Decisions and native pins

Planner decision `f33619936fa8c1435a73a6d6f2d519bea5aff461` specifies owned
outcome slots, bound-one owner preparations, an existing full MemberRef
chosen at install, one-hop delegation, and targetAt fact binding independent
of item revision. An older answer closes its own command only. Runtime and
replay use the same pure code. No grant means no command opening.

Cohort decision `9192ef3fce43017abb91864c0f87cb76de8a5be9`, adopted by
`84753eff`, permits G5a before S2a and reserves these numbers:

| Work | Register | Directory | Membership | Rules | Destination |
| --- | --- | --- | --- | --- | --- |
| S2a | 14, 15 | 13, 14 | 8 | 7, 8 | 9, 10 |
| G5a | 16 | 15 | 9 | 9 | 11 |

The implemented device-application cohort uses Register16, Directory15,
Rules9 and Destination11, with Membership7 and Inbox1. Membership9 remains
reserved. The pin witness contains 49 names: four additions and all 45
shipped data digests unchanged. Defaults and earlier proof formats remain.
A reserved but unused number is not supported or reassigned.

Local-boundary decision `86916ce87e516b14b57842abe44d5a68a3e33b6e`, adopted
by `ddc894d7`, chooses an explicitly scripted parent proof for local check,
with real child genesis and preparations. Genuine native issuance is proved
separately. Durable G3 has landed and is incorporated. S2a still needs its
own passing gate and review; S2a plus S2b precede the demo archive slice.

## Command, answer and reservation

A target-writing member transition sets target, level and its own targetAt,
then opens one command for the bound device through a declared capability
effect. The record is keyed by that entry and captures device, kind, target,
level, targetAt and the granted full owner. Opening clears the previous
outcome and outcomeAt. Without an install grant, target acts open nothing.
An outside-granted kind is refused as device-kind-ungranted.

Only the capability owns the optional mutable outcome/outcomeAt pair. Its
answer names the exact full local command fact and closes the command once
as confirmed, refused or unknown, recording description and answerAt.
For the current target, it writes outcome and its answer position. An older
answer closes its own record without changing the current device. A sensor
report may advance the item's revision independently. Missing answers leave
outcome and outcomeAt empty.

The validator names capability-slot-owned for ordinary act, receive, timed
or opaque native-rule writers. Target writers must set their own targetAt
and open a command for that same subject. Generic derived-effect checks
also enforce the declared owned slots, answer kind, optional/mutable shape,
valid value, local answer position and at most three derived effects.

The owner preparation uses current native signing identity in the recorded
membership, within its scope and validity window. The trusted capability
table selects scope-granted admission. The intent and transport cannot
select it. Actual role actions remain in the recorded grant; no target
permission or invented answer action is required. Revocation, wrong key or
incarnation, removed member, inactive controller, scope, expiry, age and
high-water guards remain active.

Every open command reserves one complete bounded answer entry. Only the
preparation naming that pending command, closing its record and moving
decided from zero to one spends the reservation. Other preparations remain
new work. Whole-scope admission still enforces its ceiling for settlements.
The preparation index is derived history; no separate retained input is
needed. Finite archive metadata names command records and answer
preparations, with no outside operation owner. Installed Grow archive/export
admission remains S2b work.

## Native install and delegation

The signed package declares device kinds in sorted order and owners=1.
It declares no member identity. At most eight package definitions may use
the finite capability. Install chooses a full existing MemberRef and checks
its membership, active member/key and controller standing. An owner who is
also the signer is served by the actual grant observation; the native
observation rules do not invent a second own-member read.

Rules retains the owner, bounds, root and allowed definitions in the
canonical genesis wrapper, within its existing twelve value slots. The
wrapper is at most 20 KiB and its device grant at most 4096 bytes. Directory
checks exact membership, root and permitted declarations, then emits the
reserved version2 creation context. The root may relay that grant once to
a listed child, with delegation disabled. Domain fields cannot choose it.
Legacy/version1 metadata keeps its earlier meaning.

SDK and MCP retain the full owner in the signed install selection. CLI
supports the explicit device-application cohort and package-install
`--owner <full-member-JSON>`. The host accepts this finite native capability,
not package-supplied capability code. The new destination origin policy
accepts the exact new native factory; the old destination refuses it.
Origin admission is no publication or outside-write claim.

## Grow and local check

Grow's set-vent, set-fan, set-heater and authorize open commands for their
target-writing device. Device and layers projections keep outcome separate
from target and reported values. Portable fact kinds accept known native
capability steps, including device-command@1:answer, and refuse unknown
capability, version and step names.

The maintained fault scenario replaces all eight external owner labels
with native preparations. Its 222 steps retain all 100 benches and the
original fault, restoration, authority and stale-request journey. They
check command closure, exact targetAt/outcomeAt, named non-owner,
unknown/closed refusals and an exact answer retry. It reaches head169 with
eight accepted preparation entries. The same full journey without answers
replays through161: every command stays open and every outcome stays empty.
The small no-grant witness separately opens no record and refuses an answer
as device-command-ungranted.

Local check scripts its parent creation draft before sealing, then runs
actual Core/SQLite child genesis and preparations. It anchors both parent
facts explicitly: creation0 and confirmation1. Anchoring only creation
correctly failed when proving confirmation required replay of that scripted
parent genesis. The actual child journal and preparations are replayed.
The report exposes the full owner and both anchors, labels the boundary as
scripted rather than a native install, and cites the genuine install
witness. Local TEST identity grants are trusted as recorded. No sealed
journal rewrite or production issuer is introduced.

The runner supports native prepare steps, exact named refusal expectations,
capability-record assertions, full `$fact` and saved receipt `$position`.
Exact preparation retries return their original receipt and count once.
A custom factory cannot silently ignore a requested scripted grant. The
independent MCP read fixture retains its real local Site/Room births and
scripted authority, with no install grant; it removes obsolete owner labels.

## Acceptance witnesses and limits

| Requirement | Owning witness |
| --- | --- |
| Set-heater and authorize open and reserve commands | `packages/scope/test/grow-owned-scopes.test.ts`, genuine native install and SQLite |
| Owner closes and writes; reports and late answers stay independent | Same Grow Worker witness; pure command forms also cover unknown as final |
| Full granted owner only, with current identity | `packages/derive/test/forms-device-command.test.ts`, `forms-grant.test.ts`, native install/restart witness |
| Ordinary outcome writers refused by name | Pure command validator cases for act, receive, timed and opaque native rule |
| Unknown/closed and missing/outside grant named refusals | Pure command forms and `packages/cli/test/application-scenarios.test.ts` |
| Fault journey and missing answers replay | `packages/cli/test/application-examples.test.ts`, explicitly scripted local parent; actual check-command run |
| Reserved answer fits when a new act does not | `packages/scope/test/device-command-install.test.ts`, actual sixteen-entry SQLite edge and restart |

The two Worker witnesses use real native scopes, production authority,
Membership, Core and SQLite. Repository creation, Git/package HTTP, clock,
scheduler and setup read access are TEST fixtures. Native Directory creates
Site with delegation enabled; Site creates Room with delegation disabled.
Issued-session projections read the actual answer. Site/Room and the
separate Rules/Directory/device/Membership histories pass strict replay
with proven grants, production code and no anchors.

The quota witness sets its actual child's sixteen-entry ceiling before
exact native creation delivery. It measures Used+Reserved at sixteen,
denies a new report without changing state, removes the owner's target
permission, deletes cached package content and evicts the child. The owner
still answers on current identity and its installed grant. Closure releases
one reservation while preserving the ceiling and independent report.
Replay uses shared default bounds for its foreign Register/Destination
histories; it does not check that smaller child ceiling. Earlier attempts
to impose sixteen globally failed at Register's real duty; 128 globally
failed at Destination's duty. Those failures remain evidence.

Focused evidence before the first gate, each original terminal exit0:

- Native capacity/origin/replay: original16737,
  `/tmp/artroom-g5a-native-device-capacity-origin-replay-20261019.log`.
- Native Grow delegation, both command reservations, projection and two
  proven replays: original17618, `grow-native-outcome-projection` log.
- Seven owning local files/29 cases: original17760,
  `grow-scripted-preparations-focused` log. The complete unanswered run
  passed in original51502; its title filter skipped MCP routing, later
  covered in the complete owning selection.
- Four MCP inventory/read files/nine cases: original55561,
  `grow-mcp-inventory-and-reads` log. Actual MCP metadata generates the
  documented install schema and catalogue.
- Actual check-command over both maintained scenarios: original16523,
  `grow-dap-check` log, eight preparations and both explicit parent anchors.
- Pure command/reservation five cases: original68657; current-identity
  three cases:39241; finite archive classification five cases:4444. The
  archive row is synthetic and proves classification only.

Log stems above have prefix `/tmp/artroom-g5a-` and suffix
`-20261019.log`. Owning compiler targets also passed. No new G5a browser
screenshot is claimed; projection observations are programmatic SDK/MCP
reads. There is no simulator, device/provider execution or deployment proof.

Two targeted controls distinguish plausible wrong behavior. Removing only
the delegation check fails the unchanged second-hop assertion, then exact
restoration passes six cases (original4368, onehop-control driver). Replacing
full owner comparison with bare member name fails the unchanged foreign
incarnation assertion, then restoration passes five (44132, owner-control).
Their baselines copy preceding exact-source passes, not fresh baseline
executions. Historical one-hop source/test SHA-256:
`bcf61ac1027db310d0dfa956b790a3d7ee6f8d391d6bd890024d4890af26880b` /
`82124643f32b983b88c9f6947eff6ba9ad33bd17ffc55ab7c09702b18e0d9759`.
Historical owner source/test SHA-256:
`bbda040a70ee70ded921f20788c1b5c78ac14abe539fd9df7ec35606a01df9ee` /
`c3a84a537d6b7db30ee83d1b0a6025c566b817b2b96497d2d4ef3c8ce7b3284d`.
Neither is a mutation sweep.

## Gate failures and corrections

First gate head461c1e3fca3a0dbe9586c5488bf73456de96d648,
tree7556440081af4621993e4986a0e5f3b044a67b30: original80923 naturally
closed exit1. It passed whitespace and full typecheck, skipped install,
and reported 1929 passed, ten failed and three skipped cases across402
files. Two failures were stale generated MCP/Page assets. Eight were native
timeouts: seven at five seconds and dense proof residency at sixty.
Test step elapsed1285.6s, CPU1512.3s; typecheck8.5s, CPU32.6s. A brief
read-only Worker stack sample was taken after failures; these are observed
run costs, not clean performance benchmarks. No outer timing wrapper was
used and no source/dependency edit occurred while the original ran.

Raw logs: `/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.HoVDOGeXRq`.
Outer log: `/tmp/artroom-g5a-complete-gate-20261019.log`. The original
process receipt, machine/load metadata and two-second sample are retained.
No interruption or infrastructure dismissal is claimed.

The unchanged eight-case selection reproduced seven timeouts (43216);
application establishment passed, while the alarm case still timed out.
Lending alone also timed out at five seconds (50443). A diagnostic-only
30-second allowance completed its unchanged assertions in10.53s (5053).
That diagnostic is not gate acceptance.

A clean separate Main2127 checkout, with private version-identical COW
dependencies, passed Lending at its normal limit in3.73s (94359).
The new validator had scanned every item slot for every opaque native
rule, including definitions without the capability. The fix limits those
device-specific cross-effect scans to definitions declaring device-command.
For legacy validation, repeated ownership work changes from rules times
slots to one constant check per rule. Item-slot validation still rejects
unlisted ownership, and ordinary writer/runtime protections remain active.
Lending then passed its unchanged limit in3.77s (34252), and all five owned
command-form cases passed. Shared-machine timings support the diagnosis;
they are not a general performance guarantee.

After that fix, the eight-case selection had seven passes and one different
Lending failure: no native query reply (85898). The same selection passed
all eight on Main (61011). That interaction remains unexplained and is
retained; it is not called a baseline defect. The existing broad stability
request1d3a13e3 is not claimed complete.

Both generated assets were rebuilt by their owning scripts. Freshness
checks passed four cases in two files (26800). Lending and both genuine
native device/Grow witnesses then passed together at their original limits
(95626). No test deadline or assertion was changed. Derive's two compiler
targets and all five ownership cases also pass after the fix. The corrected
full gate is still required before review.

The exact corrected-head mixed selection then passed all eight cases with
six unselected skips (74561, corrected-native-mixed-selection log). Its
original limits remained. Gate554cb1bb839f3b46cb3392c785a2177cad0def8d,
tree86d82c6e5b8b55beb6ff7307b394a24d91545b77 naturally closed89612 exit1:
1938 passed, one failed, three skipped across402 files. All stale assets
and eight original timeouts cleared. The prior Lending query-reply error
did not recur. Typecheck8.4s/CPU32.2s; test481.1s/CPU678.9s. No profiling
or source/dependency edit occurred during that gate.

The remaining assertion was hosted MCP H5 at line396: an offline inventory
change expected one reconciliation notification, but the background SSE
reader still held zero after a fixed30ms sleep. Stream opening first awaits
an asynchronous inventory snapshot. Positive SSE checks in that existing
case now await the observed header or notification with its existing
bounded until helper. Exact counts, quiet-period checks and test deadlines
remain. No production MCP code changes. The focused case passes (11560,
with a retained resolve-pending teardown warning); the complete owning
hosted file passes all twelve cases (97781, hosted-observed-events-file
log). This is a concrete synchronization correction, not a general closure
of the separate stability request.

Second gate outer log: `/tmp/artroom-g5a-corrected-complete-gate-20261019.log`.
Raw: `/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.Ug7IT3AcXU`.
Both failed gates remain evidence. The final corrected full gate is pending.

Attempt3 at b5120d5f772d119261ecba816ed2e0f463388d4e,
tree5015f6e603cd22b16e9e99dc6070497180e154f0 naturally closed88101 exit1.
It passed1932 cases with seven framework5000ms timeouts and three skips,
across402 files. H5 and all other behavior assertions passed. Failures were
application establishment, Lending, manifest T3, native3 publication, Page
source preview and both Page task-data stories. Stage traces show real
setup/publication/review progress before the framework limit. This recurrence
means the prior focused/gate passes do not establish full-suite stability.
No profiling or source/dependency edit occurred during the run. Typecheck
8.4s/CPU32.4s; test941.2s/CPU1152.6s. Outer log is
`/tmp/artroom-g5a-event-synchronized-gate-20261019.log`; raw logs are in
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.YfkOY40xim`.

Host load and memory observations are retained without a cause claim.
The memory-pressure query reported59% free; a low instantaneous free-RAM
sample alone is not proof of pressure. Decision request34bc30df asks planner
whether to give the functional workerd project an explicit bounded framework
allowance, preserving case-specific limits and every modeled protocol,
read, clock, capacity and latency assertion, or put the broader stability
investigation first. It also asks which Source owns that correction.
At that checkpoint, limits and acceptance conditions remained unchanged. The ownership
validator witness was strengthened to reject unlisted owned slots in both
ordinary and opaque-rule definitions; all five cases pass (74252), as do
Derive's two compiler targets (81347). All three failed gates remain
evidence. No seal, Source or review has been filed.

Planner decisionf20558ab29815618a8e84333cbab2def29c64b75 answers34bc30df:
set an explicit thirty-second framework allowance in
packages/scope/vitest.worker.config.ts, the functional `scope` project
running native application, MCP, Page and CLI stories in one isolate. This
configuration and explanation belong to the same complete G5a Source.
Case-specific limits and every modeled protocol, read, clock, capacity and
latency assertion remain. Pure Node and separate scope-denial budgets stay.
The allowance describes the harness on a shared machine, not product
latency. It waives no acceptance condition, relabels no old process and
closes no stability investigation. Request1d3a13e3 remains after G5a. A new
original whole gate must pass at the committed configuration head.
The seven attempt3 timeout stories pass in the new configured project
(49863, native-functional-budget-witnesses log): six files, seven selected
cases, one unselected skip; unchanged assertions completed in14.66s total
case time. This focused result does not replace the full gate.

## Passing full gate

The new committed harness configuration ran in a new original process,
43536, at code/test head09918e4a94a2cd85660343171ad567d1b26b0daa,
tree0fc433fdf4f464c5d8217ce913b9036dd0db8946, based on reviewed Main3ed2a08a.
The process naturally closed exit0. The checkout was clean before and after;
no source/dependency edit, install or profiling occurred during this run.
The final candidate changes only this evidence note after that passing head.

The complete gate passes: whitespace, all workspace typechecks,401 Vitest
files with1939 passing cases and three original skipped cases in one skipped
file,31 chained Node checks, and55 Counting Node witnesses. Typecheck was
8.4s elapsed/31.8s CPU; the complete test step478.3s/673.5s CPU. Vitest itself
reported471.86s. These are the gate's separate step measurements, not an
outer pipeline measurement or product latency benchmark.

Outer log: `/tmp/artroom-g5a-functional-budget-gate-20261019.log`, SHA-256
`2208930fed79c76daf72e5e83a247f80b145a5bf837b6c0dc867b1b5ca897c33`.
Raw step logs:
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.osuUJ9ItCU`.
Counting source/metafile and actual Node results:
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/artroom-counting-node-DvITjH`.
Original terminal receipt and machine metadata are retained. Earlier failed
runs, diagnostic allowances, scripted fault output and runtime warnings
remain in the evidence. There is no warning-free or general stability claim.

The incorporated Main's landing auditeb413618 was also read in full: all
2291 prior leaves stayed exact and the approved note was the sole addition.
Its original merge-process log was not supplied, so this note makes no
independent execution/timing/warning claim for that other landing.

No G5a Source review, landing, push, deployment or physical device action
has occurred. This note and the exact passing code will be frozen for the
independent review; no further tests are needed without a new change or
unresolved finding. Stability1d3a13e3 and installed Grow archive/export S2b
remain separate open work.

## Dependency preparation

The G5a checkout owns an APFS COW dependency copy from the frozen G3 view:
106 maintained and four named nested manifests have equal bytes and
different inodes; thirteen workspace links are relative and local. There
were zero installs and no lockfile change. The donor remains frozen and
was never executed for this work. This verifies manifests and links, not
full tarball integrity.

Audit `/tmp/artroom-g5a-dependency-view-20261019.json`, SHA-256
`3fcdee9504104a0f7040b357b7851e2820044edfe05fd17a9e849e9e37ea70bc`.
Lock SHA-256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.

The separate Main comparison copies only the current private dependencies,
with110 identical manifest bytes/different inodes and thirteen local links,
zero installs, and its own cleared Vite caches. Its audit is
`/tmp/artroom-g5a-baseline-main-dependency-view-20261019.json`, SHA-256
`2bf06b9fca26f30eb69502f84b6e287c7398e9763370ab1ab016c97de51d90a5`.
Every listed original diagnostic process is terminal. Frozen earlier
candidate, dependency and evidence views were neither changed nor executed.
