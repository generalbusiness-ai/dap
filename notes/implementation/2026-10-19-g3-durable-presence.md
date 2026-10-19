# G3: durable application-owned presence

Request `8614ac1e0789eb5d323ad8853ee671ee3c357470`; promise
`3b26a047e49ef80a0d7b6fb22a1ec05a66a18e4c`. This is a separate head
from the published first G3 delivery. Implementation started from actual Main
`9554919beb3581ffe1124fcb2a70fab6bf20fbd2`, including the approved members
and presence design. Checker audit `b712c8ef` independently confirms that
the note is exact and every previous G3 runtime leaf is unchanged. Its
prior-incorporation receipt is not a normal new-merge receipt; no trailer
or sealed successor map is inferred.

## Chosen existing forms

One Site has at most 32 nonfinal presence items. That is a finite application
limit, within the native many-item projection and read bounds. It is not a
limit on all platform members. Each item has a fixed full MemberRef party,
states unknown, present and away, an optional room item ref, and an optional
reportedAt fact ref under the Site definition, of kind arrive or leave.

The admin's provision-presence act opens the item under grow.configure.
A native range guard refuses duplicate members by name. Initial unknown
has neither a room nor a report fact. Only arrive and leave report a
member's location: they transition that member's item, checked against the
signer. Arrive can move A to B. Leave requires present state and the current
room; a wrong-room leave refuses by name and leaves the last report fact
unchanged. A matching leave sets away, retaining the room that was left.
Both accepted reports set reportedAt from self. Native self refs store the
actual local entry position. The declared projection supplies its full
captured Site scope and incarnation, independently of item revision. An
exact known-position read resolves the native entry and hash; a failed
lookup stays unavailable. Assertion `903895eb` and the checker's addressed
reply record that no extra full-hash materialization is needed for F3.

Task routing reads the complete bounded presence-item projection through
the existing declared Site read and maps the room item to its full scope.
Missing and unknown items remain unavailable. Away means no current room
assignment. The recent-activity log may retain a bounded journal projection,
but task routing reads no history window. No native form, signer index,
hidden scan, device location or mixed queue is added.

## Required witnesses

The owning witnesses must distinguish initial unknown and duplicate
provisioning; another signer's refusal; move A to B followed by a named
wrong-room leave and its unchanged report fact; matching leave to away;
present, away, unknown and missing-item task selections; persistence after
more than 100 other Site reports; and an arrival whose entry position
differs from its item's revision. The kit/browser witnesses also retain
app-only data, quiet context, receipts, stale refusals and reciprocal
phone/desktop resizing. Run focused checks during work and one final gate
before exact-head review. Collected evidence is recorded below.

## Dependency preparation

The fresh checkout owns a private APFS copy-on-write view from the frozen
first G3 donor. Only the destination's 13 workspace links and Vite caches
were changed. All 106 maintained and four named nested manifests have
equal bytes and different inodes. Zero installs; unchanged lock SHA-256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
This is copied-version/link validation, not full tarball integrity.

Audit `/tmp/artroom-g3-durable-dependency-view-20261019.json`, SHA-256
`a7f9dee08f8b87052359a4eb14fa7018b7bd06f64425615d145f322cf00fbfe0`.
No frozen donor source, dependency or evidence file was changed or run.

## Development witnesses

Memory Site/Room tests pass seven cases in
`/tmp/artroom-g3-durable-site-room-local-fact-20261019.log`. The Site
witness proves unknown provisioning, named duplicate and signer refusals,
arrival at actual entry 111 while item revision is 2, move then wrong-room
leave with unchanged report, another 101 reports with unchanged member
state, matching leave to away, and native replay. Earlier runs caught a
missing required state guard, an incorrect test/helper assumption that
Party wrapped its MemberRef, and an incorrect expectation that a raw self
ref stores a hash. All failed logs remain. Existing Native validation was
not relaxed. The labelled Directory launcher now declares only its actual
creation row/root item, rather than clone Site self-fact declarations
under a different definition name.

The actual dap launcher, `packages/cli/bin/dap.js`, passes the 13-step Site
scenario with four projection checks and the unchanged 202-step G0 fault
scenario with three checks, both with native replay. Evidence:
`/tmp/artroom-g3-durable-dap-check-scenario-name-20261019.log`. Its eight
non-native scenario-owner outcomes remain labelled and belong to G5a.
The first main.ts command merely imported the module and ran no check;
the first actual launcher attempt refused an invalid scenario name with
spaces. These are retained attempts, not validation passes. The corrected
fixture has a bounded scenario label. CLI maintained examples pass two
cases in `/tmp/artroom-g3-durable-cli-examples-20261019.log`.

Both Core/SQLite kit cases pass in
`/tmp/artroom-g3-durable-owned-routing-first-20261019.log`. They prove the
same local report position under the exact captured Site scope, a direct
known-position read matching the actual receipt's full fact, honest failed
lookup, retained presence after 101 other reports while the activity window
contains only those other reports, and native replay. The queue case keeps
all nine role/type selections, missing and provisioned-unknown placeholders,
captured-unknown and away-before-Take refusal with zero signatures, persistent
task selection beyond the activity window, named wrong-room leave, actual
Take/Report/Approve/Decline, receipt/refresh separation and empty recovery.
Install lookup, membership, sessions and grants are explicit TEST ports.

The separate installed Worker owning case passes in
`/tmp/artroom-g3-durable-production-owning-20261019.log`. It retains actual
native install, issued session, production viewer adapter, related Site
read and public SDK parity on the existing empty-queue boundary. It is no
production nonempty-routing claim. MCP's four compiler targets and Grow's
own compiler pass in the `mcp-types-first` and `grow-types-first` logs under
the same prefix.

The browser driver passes both 320 and 592 px widths, reciprocal resize,
initial missing/provisioned-unknown read points, 101 other-member reports
without losing the task, wrong-room refusal, quiet context, app-only read
denial, five actual MCP signatures per width and all three scope replays.
Evidence: `/tmp/artroom-g3-durable-browser-points-20261019/` and its log.
Cached Playwright 1.63.0 and Chromium 153.0.8010.12 were used because the
Browser plugin was unavailable; no dependency was installed. The report
consumer is scripted typed text, not an LLM backend. Task and unavailable
phone captures were inspected: text wraps, read points fit and controls
remain visible. There is no provider, device or hosting outcome.

The first browser run failed its quiet-context count before the changed
Site point had been published. Its complete failure capture/log and driver
copy remain. The corrected witness waits for that exact Site point in both
captured reads and for the idle card before measuring two unchanged refreshes.
The kit runtime was not changed. These development observations have no
separate frozen input manifest and do not replace the final gate/head proof.

One targeted control restores the former task view's last-100 rule and
points that view's read at the retained recent-activity projection. It
changes no item or runtime code. The unchanged durable-selection assertion
then fails after 101 other-member reports: the task becomes unavailable
instead of ready. The producer still passes. Restoring the exact config
bytes returns both kit cases to passing. Evidence is the driver
`/tmp/artroom-g3-durable-window-control-20261019.py` and matching directory
(original 9160 closed zero): baseline two pass, control one pass/one fail,
restored two pass. The result records config SHA-256
`5dfb015c800186e48418901be6788cf18099ff5ad0bbc81103c23faf99ba0176`
and unchanged test SHA-256
`d78bb7f0c618e7514e35ea07c8082ecf876a2e97d04473d79877354298a0a39f`.
The control config is 63,217 bytes, within the unchanged source bound, so
the failure is the routing invariant rather than package-size admission.
This is a single policy control, not a mutation sweep.

## First gate and narrow handoff witness correction

The first complete gate failed at clean head
`4d3a316441ba3eb94e6ba5f23738be07c1be2e31`, tree
`d941c28c2030ecb70f385ffe797f5134f0ccfd72`. Type checking passed.
Vitest reported 398 files and 1,925 cases passed, one file and one case
failed, and one file and three cases skipped. The Node and Counting
checks were not run after that failure. This is an actual failed gate.

The existing directory-partition success-capacity witness expected the
next generation to remain in transient creating state, but generation 4
was already active. The correction is tracked separately by request
`ace812abb132f2b140a090b0d252885854fdd7cf` and promise `b1bb4898`.
It registers the actual successor from the exact Root creation entry,
explicitly dispatches that successor, then requires its active state and
full scope ref at that terminal boundary. The pre-dispatch snapshot still
requires the exact generation. All 1,000 birth, handoff, standing, capacity,
restart and final exhaustion assertions remain. No runtime code, native
pin, test deadline, retry or sleep changes. The neighboring ordinary
handoff witness already avoids requiring this transient state.

Evidence is `/tmp/artroom-g3-durable-final-gate-20261019.log`, the matching
outer time and machine JSON, and raw directory `tmp.64dww99zXQ` under the
recorded system temporary root. The gate reports test exit 1; its original
time/npm/bash processes 16390/16406/16417 were observed closed. The tool
session ID was lost during context compaction, so a terminal-tool exit
response is unavailable and is not claimed. No whole-suite retry was used
to dismiss the failure.

The measured pipeline took 416.03 s elapsed and 628.47 s CPU (535.02 user,
93.45 system). Type checking took 8.5 s and 32.2 s CPU; tests took 407.3 s
and 596.0 s CPU. Conditions: macOS 27.0.1 arm64, 18 CPUs, Node 26.12.0,
shared load 1.96/2.93/4.87, warm private APFS COW dependencies, zero installs.
No exclusive CPU, peak heap or total edit-cost claim is made.

After the original processes closed, this candidate incorporated audited
Main `9060775ee32c934086bca8b481c1e0d328036385`: the two approved celld
design documents and the three approved homepage cleanup paths. Audits
`cf6834e1` and `be8b86bc` were read in full. These are existing Main content,
not additional G3 implementation. At that point a corrected-head gate was
still required.

The focused native success-capacity case passes after that correction:
`/tmp/artroom-g3-durable-partition-boundary-20261019.log`, original tool
session 94988 closed exit 0. It completes all 1,000 actual births and seals,
the 3,000 standing-entry reserve, periodic restarts and final named refusal.
Vitest reports 124.87 s command duration, including 122.00 s test time;
this is not a measured outer-pipeline or CPU figure. The original failed
gate is retained, not converted into a pass by this focused result.

## Final gate and exact source browser proof

The corrected gate passes once at clean head
`324c752b11b56611df68f7f4add6fcda7d9514bc`, tree
`fd84ec07693897e5e75ce7a2ab855119591d2ee6`. Original tool session 42514
closed exit 0. Vitest reports 399 files and 1,926 cases passed, one file
and three cases skipped. The 31 Node and 55 Counting checks also pass.
Gate assertion `8916e7c8` records the result without erasing the failed
first gate. The raw logs are in `tmp.aLKpczkS5X`; complete output,
outer time, machine metadata and process closure JSON use the prefix
`/tmp/artroom-g3-durable-corrected-gate-20261019`.

Measured complete pipeline: 534.58 s elapsed and 759.18 s CPU (652.03 user,
107.15 system). Type checking: 8.9 s and 33.2 s CPU. Tests: 525.5 s and
725.7 s CPU. macOS 27.0.1 arm64, 18 CPUs, Node 26.12.0, initial shared
load 1.96/2.63/3.91, warm private APFS COW dependencies, zero installs.
These are this run's measurements, not exclusive-machine or total edit cost.

The exact gated browser run passes at 320 and 592 px, each resized to the
other width and back: `/tmp/artroom-g3-durable-gated-browser-20261019/`
and its matching log. Original 36538 closed exit 0. Both widths prove
missing and provisioned-unknown placeholders with read points; 101 other
member reports without losing the task or altering its presence report;
named wrong-room refusal; quiet context after exact source-point capture;
app-only read denial; typed report input; Take, Report, Hold, Approve and
Decline; receipt/refresh separation; empty Back recovery; and three
consistent scope replays. Each width records exactly five MCP signatures
(day 2, operator 1, head 2), no browser errors and no overflow.

The task captures at both widths and unavailable phone capture were
visually inspected: titles and full read-point hashes wrap, controls fit,
and unavailable content exposes neither the task body nor Take. Cached
Playwright 1.63.0 and Chromium 153.0.8010.12, scripted typed-text consumer,
and TEST authority boundaries remain as described above. Browser outer
pipeline: 38.05 s elapsed, 14.38 s CPU (12.14 user, 2.24 system), after the
gate closed, on the same warm shared machine. This is no LLM/provider,
physical-device or hosting result.

The selected 42 source/test/config inputs were hashed at that exact clean
head and checked unchanged before and after the run. Manifest
`/tmp/artroom-g3-durable-gated-browser-inputs-20261019.json`, SHA-256
`63d4e8ed6ef4947cfdc26a9102e7c99608bad920060d2e2139e12acef3d01c16`.
It is a selected-input manifest, not an independently computed complete
transitive import closure. The exact Git commit identifies the remaining
tracked source; it does not retroactively describe failed development runs.

## Review scope

The final base is audited Main `9060775e`. Twelve G3 paths and the one
separately tracked partition test change are offered together, with each
request and promise bound to its own artifacts. This primary note is the
only path changed after the passing gate and browser run; code and tests
remain identical. The final head/tree and the passing head/tree are recorded
by the evidence map and its Gitseq assertion. No gate is repeated for this
documents-only commit, following `docs/testing.md`.

| Request condition | Owning evidence |
| --- | --- |
| Provision unknown; duplicate/admin/signer refusal | Memory Site case and Core/SQLite producer case |
| Arrive A, arrive B, wrong leave A keeps B and last report; matching leave records away | Same native cases, exact item/head/ref assertions and replay |
| Present, away, unknown and missing routing; no unknown signing or body | Core/SQLite queue case, captured-unknown/away stale calls and browser placeholders |
| Selection survives more than 100 Site entries; entry position differs from item revision | Producer and queue cases, browser 101-report cases, one distinguishing old-window control |
| App-only data, quiet context, receipts, stale refusals and resize | Kit queue case, exact gated 320/592 browser proof and replay |

Stable-copy grant: exactly
`/private/tmp/artroom-g3-durable-review-evidence-map-20261019.json`
and its listed owned regular files for this exact review. Once sealed,
every listed leaf, the sealer, the entire candidate source checkout and
private dependency view freeze forever. Use a fresh copy for any probe.
Unchanged tracked code remains readable through the review commit.
No adjacent credentials/custody directories, publication or deployment
authority is included. The targeted witness correction does not close the
older broad gate-stability request. G5a/G5, P1-P3, mixed queues, device
location, the attention loop, provider and hosting work remain separate.
