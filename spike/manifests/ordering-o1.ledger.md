# O1 implementation and validation record

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:bd246dce91a664112690703f808129a5db76a534`.
Base: `7bd311f221c62615c55b659f0a693e42db887fba`, the landed V3 tree.
Branch: `request/o1-profile-codec-journal`.

The implementation follows [the O1 profile](../ordering-profile.md). It adds
an authenticated boundary to the existing append operation; SQLite supplies
storage and serialization only. The lifecycle manifest is expected data for
O4, not an implemented transfer fold.

## Development checks

Before the full integration campaign, focused checks passed: codec 15/15,
journal 23/23, lifecycle 10/10, and TypeScript. The journal checks include
actual SIGKILL of child processes at eight append boundaries, two initial
creation boundaries, and publication before acknowledgment. Separate checks
cover exclusive ownership, asynchronous delivery failure, SQL position
corruption, authenticated replay, and uncertain-response reconciliation.

A bounded codec-agent review found three integration defects before this
snapshot: an asynchronous delivery could be acknowledged early; SQL keys
were not compared with embedded positions; and legacy safe-integer hashing
rejected signed invitations/origins containing fractional JSON numbers.
All were corrected with focused regressions. A test-only TypeScript
assertion-overload error was corrected during development. No full seeded
campaign was run before the source snapshot below.

## Full integration run

Run 1 source: `5219ad71de4d34fd7f70682c22b1c98fd5fff182`.
Commands: `npm test`, `npm run typecheck`, `git diff --check` from `spike`.
Result: **136/136 tests passed**, typecheck and whitespace check passed.
Node 26.8.2; full run 69.0 seconds. Exact output is retained in
[run-1.txt](ordering-o1-runs/run-1.txt).

The 200-seed Sale campaign had zero violations. Coverage: 946 joins,
199 attaches, 1,716 disclosures, 273 offers, 31 replacements, 175 withdrawals,
159 counters, 111 acceptance attempts, 18 effective accepts, 279 closes,
11,171 entries, zero private disclosures, zero effective Inspection attaches,
and 120 unbound Inspection requests. V3's reviewed seven-fix overrun and
historical corpus are unchanged; this is a fresh integration run over the
legacy visibility path, not a signed replay of all 200 seeds.

After run 1, audit identified a wire presentation omission: signed readable
views did not carry original envelope bytes, although full-journal verification
worked. The follow-up adds bytes only to readable signed view entries and
verifies views independently, including every participant/frontier of the
signed V1 traces. Focused journal checks now pass 24/24; typecheck passes. Run 1 establishes its recorded checks, not that
missing recipient-facing proof path.

## Final integration boundary

Merge `3c88770` incorporates exact V6 candidate
`05c98e2d778124648834b9b00e772a6ad270a870`, including V4 main
`5eff67d81fbbb025f91951571a9f029c0481812a` and the V5/V6 evidence.
Only README required conflict resolution: the V4, V5, V6 and O1 sections
are all retained. Context's deterministic nonce option and foundation's
reviewed authorization behavior merged without a source conflict.
Earlier O1 and V6 ledgers and raw results remain intact.

The O1 view follow-up delivers original actor proof bytes to authorized
readers and independently verifies the complete header prefix, visible
signatures and origin adoption. Outbox callback records are frozen so a
callback cannot alter which saved identity is acknowledged. These source
changes precede the final full run; its exact source and result will be
recorded separately after completion.

## Integrated run 2 and QA finding

Source: `6bd263f029df0ea2c49a9e04dcf1fba4bf7f6962`.
Commands: `npm test`, `npm run typecheck`, `git diff --check` from `spike`.
Result: exit 0; **179 tests, 178 passed, 0 ordinary failures, 1 TODO**.
Focused O1 checks: 49/49. Typecheck and whitespace check passed.
Full run: 110.9 seconds. Exact output: [run-2.txt](ordering-o1-runs/run-2.txt).
The TODO is the incoming Club second-admission counterexample, retained by
user choice. Its inherited test annotation says repair pending; this O1
record does not commission or claim that repair. The frozen Club manifest
still passes while that stronger plan expectation fails.

All 600 current manifest seeds had zero violations. Coverage:

| Campaign | Measured coverage |
|---|---|
| Sale 200 | 942 joins; 199 attaches; 1,722 disclosures; 195 offers; 25 replacements; 147 withdrawals; 157 counters; 114 accepts, 20 effective; 295 closes; 11,047 entries; zero private disclosures and effective Inspection attaches; 118 unbound Inspection requests |
| Booking 200 | 955 joins; 198 attaches; 1,629 disclosures; 2,553 requests; 1,497 occupancies, 652 effective and 471 linked; 383 frees; 419 cancels, 324 effective; 1,630 ticks; 12,000 entries |
| Club 200 | 991 joins; 200 attaches; 1,939 disclosures; 629 applications; 1,575 votes, 1,001 effective; 343 admits, 126 effective; 514 standings; 246 grants; 11,939 entries |

Incoming V4/V6 generator changes mean run 2's Sale seed numbers are not the
same event streams as run 1. These measurements do not relabel old snapshots.
The model manifests and packages remain those of the supplied V6 candidate.

After this run, independent internal QA demonstrated a missing ownership
boundary at this exact source. Two `Journal` facades over one backend held
separate folds. Facade A revoked Alice's invite authority; stale facade B
then issued an invitation and accepted it as effective, joining Bob and
consuming the token. Reopen correctly found the invitation unauthorized and
acceptance ineffective, so live and replay state disagreed. Run 2's existing
checks did not cover this sequence. The source snapshot and output are kept;
a single-facade ownership repair and exact regression follow in a new snapshot.

## Ownership correction and final scoped validation

The follow-up enforces one live `Journal` per backend with a private weak
ownership map. A second facade is rejected before it can create another
admission fold. `Journal.close()` invalidates the facade and closes SQLite;
a fresh backend handle rebuilds state on reopen. Legacy direct backend close
remains compatible with callers that discard the old facade and handle.
The profile and regression specify this ownership rule explicitly.

The exact QA sequence is retained as a prevention regression: reject facade B,
revoke through A, record the unauthorized invitation, refuse its acceptance
without consuming it, close/reopen, compare state, and recover an exact retry
with the same ineffective verdict. Memory facade release/reopen is checked too.
A test-only attempt to clone function-bearing foundation state was corrected
to compare the retained closed facade's state; no runtime behavior was changed
for that test issue.

Run 3 source: `bdb275f4c5c9e3fa8756a5a7dd709b76d857e249`.
Fresh commands from `spike`:
`node --test test/journal.test.ts test/codec.test.ts test/ordering-lifecycle.test.ts`,
`npm run typecheck`, and `git diff --check`.
Result: **50/50 passed**, zero failures/TODOs; typecheck and whitespace check
passed. Exact output: [run-3.txt](ordering-o1-runs/run-3.txt). This includes
25 journal, 15 codec, and 10 lifecycle tests. Environment: Node 26.8.2,
SQLite 3.53.4, Darwin arm64; focused run 1.63 seconds. This correction changes
only Journal ownership, its tests and profile documentation; the legacy
visibility campaign path is unchanged from run 2. Accordingly run 2 remains
the measured 600-seed integration result, and the final scoped run does not
pretend to be another campaign.

## Identities and scope

- Profile: `dap.fixture.single-writer/1`; document SHA-256:
  `sha256:fbc4d00e3f3eca6401541359642cdcf013c2c9ff821c2300d7afe8774b77e8fc`.
- Codec source SHA-256:
  `sha256:39e2060dd76bf8f6ec2e6378be79e663a1b983671277d927257b8f7b2a10d96f`.
- Fixed vector file SHA-256:
  `sha256:255fa95a57bcd5ccd136512e1b6f2429f8e05750a6648284d2e03db3eb421969`.
- Lifecycle manifest: `sha256:63be83e60036a5936569c478da7a8c7be6b8ab1c744d59ef3296b7d6182b5a9d`.
- Lifecycle coverage: 20 healthy boundaries, 27 adverse branches, and 115
  changed-genesis variants; exact owner/state comparison hooks are executable.
- Signed traces use different envelope commitments from legacy body IDs.
  Existing safe-integer fixture identities and visibility policies are retained.
- O1 adds zero application model-policy fixes and zero application kinds;
  it does not relabel any historical visibility campaign.
- No O2–O6 completion is claimed. O1 supplies the crash machinery and expected
  lifecycle traces for those later tasks.

The promise covers application-process crashes on the same host and intact
local disk. It excludes power/host/disk loss, malicious equivocation or rollback,
filesystem-lock failures, and concurrent writers using independent copies.


The integrated campaign identities are unchanged from V6:

| Experiment | Manifest | Package |
|---|---|---|
| Sale | `sha256:2377e5df338aaa854a56540092bf286aab0ef2dceb563dff6a0fcbdb4633aec9` | `sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85` |
| Booking | `sha256:cb4514f4967891077ad78e1dd0fba4c17438fb32b98cd8bd790df8531b35dd16` | `sha256:0556de5c337344eaa15afcbbbf5d22aa82c384bd6841d4ffb0c07185d4b7ec27` |
| Club | `sha256:806ae62febaa0b28f35fcc7099bcb00db73a61d0921806c911e993b6db808fde` | `sha256:ef19bdaf2a70813266ab7e490ac3759580df0613efc382bef8bf5b4a96523f4e` |

## Review correction O1-F1: closed Context and raw restoration

Checker report `76eee32f4f976ffe9d2903547c630a38572e1413` found that the
one-facade correction did not disable the public Context on MemoryBackend.
The regression-only source `1351ad09df256e6714a1ef2b8ea8598dcbc24113`
preserves the reviewed runtime from `c9fe7d5` and adds three focused cases.
Command: `node --test --test-name-pattern=O1-F1 test/journal.test.ts`.
All three tests failed; exact output is retained in
[run-4-f1-before.txt](ordering-o1-runs/run-4-f1-before.txt).

The memory test stopped in setup: FoundationState includes package functions,
so structuredClone of the complete state threw DataCloneError. This run did
not reproduce the stale-invitation sequence. The two raw restoration tests
did reproduce their bypass: Context.restore accepted a backend owned by a live
Journal on both memory and SQLite. The earlier progress note claiming the
memory sequence had run was incorrect and has been corrected. A later
isolated pre-repair run below uses the corrected test harness.

The repair gives Journal and its Context one private ownership lease. Closing
the Journal permanently invalidates writes through that Context before
releasing backend ownership. A new Journal may reuse MemoryBackend. Raw
Context.create/restore cannot use a live Journal-owned backend; a raw Context
acquired before ownership cannot submit or act while the Journal owns it.
Storage/fold errors also invalidate the owned Context until close/reopen.
The shared append/admission/transaction algorithm is unchanged. Direct backend
mutation and malicious in-process code remain outside this cooperative API
boundary; Context.restore on an unowned backend is still a trusted semantic
entry point.


The first runtime check at `35f103ebac92a1d1025b6b68022c0e219374694d`
ran `node --test test/journal.test.ts test/codec.test.ts`: 44 passed and one
failed with that same test-setup DataCloneError. Typecheck passed. Output:
[run-5-f1-runtime.txt](ordering-o1-runs/run-5-f1-runtime.txt). The harness now
copies only the plain participant/grant history used for its historical-state
assertion. No runtime change was needed for this failure.

The corrected regression was then committed over the original reviewed runtime
in isolated source `b8fe4965efdd9b06371e950535837dfc6e1ccdac`, based on
`c9fe7d5f6f5624dd6407d57ff213038c8e955e0c`. Its `journal.test.ts` bytes
are exactly those of repaired-harness source
`940506b473abc808666560d5e757811f985fcdaa`, Git blob
`0e9fa5376b8496ea731d05a0ab80aa76457d6f31`. The old runtime is unchanged.
Command: `node --test --test-name-pattern=O1-F1 spike/test/journal.test.ts`
from that isolated checkout. All five regression cases fail there.
[run-6-f1-before-corrected.txt](ordering-o1-runs/run-6-f1-before-corrected.txt)
records the actual stale memory invitation at 3 and acceptance at 4 as
effective, Bob present only in A's stale fold, and cold replay judging the
invitation unauthorized. It also records both backends' raw restoration and
previously acquired raw-Context bypasses. This is the product-failure evidence;
it supersedes no historical log and does not turn the earlier setup failure
into a product observation.

At repaired source `940506b473abc808666560d5e757811f985fcdaa`, the same
corrected harness ran with `node --test test/journal.test.ts test/codec.test.ts`:
45 passed, zero failures, including all five F1 regressions. Output:
[run-7-f1-repaired.txt](ordering-o1-runs/run-7-f1-repaired.txt). Its appended
typecheck passed while the independently owned F2 documentation/lifecycle
files were being prepared; the later combined-source check below is the
whole-tree typecheck boundary. Runtime and journal/codec test inputs during
this focused run were exactly those of `940506b`.

## Review correction O1-F2 and combined validation boundary

The lifecycle specification now distinguishes a different valid genesis
(`ineffective`, `destination_mismatch`) from a malformed or wrongly signed
candidate rejected at a recognized codec/profile boundary before activation.
All 115 changed-genesis cases require zero activations and no live destination
rights. An unrecognized exception is a test failure. Ordering §7 and the
withheld-evidence expectations now permit an admitted unsuccessful activation
attempt followed by the first effective activation at a later position;
transferred rights remain dormant until then, and exact retry adds no position.

The revised lifecycle manifest ID is
`sha256:d7419b5d85d9acd4767b8733b47729c29f49088a0495ee246c60c2da658a7613`.
It retains the historical manifest identity and source references rather than
relabelling the old runs. This revision precedes O4's formal baseline, not its
existing prototype. The separately agreed public-opening rule has ID
`sha256:475b415bbf8b16ccdb1bea078174712c57f2b2955ece9338d762abd60228bad8`;
it pins 21 kinds and no wildcard. The profile also names the verified header
class leakage, view completeness/truncation/extra-field limits, and the exact
normal-close versus crash ownership checks. The documentation agent prepared
these five paths and computed their identities; it did not run their tests.

At combined source `b92cc4ff4105332394439293d4930b7fc07ca5d9`, `npm test`
executed 186 tests: 185 passed, zero ordinary failures, and the one retained
Club TODO. All 600 visibility campaign seeds passed. Typecheck passed. Exact
commands, source and exit codes are in
[run-8-full.json](ordering-o1-runs/run-8-full.json), with output in
[run-8-full.txt](ordering-o1-runs/run-8-full.txt).

That run was already frozen and executing when internal QA found a further
F1 path: direct public `Journal.context.submit` could commit a revocation and
lose its reply without passing through Journal.submit's error handler. A
later Journal invitation and acceptance then used the Context's stale state.
This is a real remaining defect at `940506b`/`b92cc4f`; the successful run did
not cover it and is not evidence that F1 was complete.

QA's original probe and output are retained byte for byte as
[f1-direct-context-940506b.mjs](ordering-o1-runs/f1-direct-context-940506b.mjs)
and [f1-direct-context-940506b.json](ordering-o1-runs/f1-direct-context-940506b.json).
To reproduce, restore source `940506b473abc808666560d5e757811f985fcdaa`,
copy the probe to that checkout's `spike/qa-context-error.mjs`, and run
`node qa-context-error.mjs` there. The relative imports are deliberately those
of the original probe. Its SHA-256 is
`4af1c74a2882755ed34fbfc5a68a505a0f5571e8688aeb5bd5422f18b365cea2`;
the output SHA-256 is
`3832b31416945fa16f95f76eec142a1076ab6de1ae761327bed04b8eb69ef376`.

The correction now also invalidates the lease inside Context.submit's own
append/fold exception handler. Journal.submit keeps its handler for failures
after Context returns. Two regressions cover committed revocation/lost reply
through direct Context.submit on memory and SQLite, refusal through every
owned write entry point afterward, and correct receipt recovery after reopen.
No append, retry, admission, or storage transaction rule changes.

Before the final source freeze, the specification owner corrected the
stale-source-proposal expectation from `closed` to the existing Sale model's
actual per-model reason `not_open`; the observed Sale status remains closed.
The revised manifest ID is
`sha256:75de2a860b049b5d9dcad3dab234be14d7a965d53df2e0d0eae8de6f05a1b327`.
The public-opening rule ID is unchanged. Ordering §7 now explicitly forbids
origins or intervening events from exercising dormant transferred rights,
without forbidding their unrelated effects. The earlier `d7419b5` manifest
and run 8 remain their own measured boundary.

At repaired combined source `747a0905dc80f15a108fd62bdc5399e9f31f4431`,
the full run executed 188 tests: 187 passed, zero ordinary failures, and the
one executing/failing Club TODO retained from the original visibility
experiment. All three 200-seed campaigns passed. Typecheck passed. Exact
source, commands and exit codes:
[run-9-full.json](ordering-o1-runs/run-9-full.json); output:
[run-9-full.txt](ordering-o1-runs/run-9-full.txt).

Internal QA independently restored `747a090` and reran the byte-identical
original direct-Context probe. It now exits 1 at the first attempted stale
invitation with `Context: owning facade is closed or inactive`, before an
invitation or redemption can append. That exit is the expected rejection in
the original exploit script, not a failing current regression. The two current
direct-error regression tests pass on memory and SQLite. Retained QA evidence:
[summary](ordering-o1-runs/qa-summary.json),
[original probe against the repair](ordering-o1-runs/qa-original-probe-fixed.txt),
and [two current regressions](ordering-o1-runs/qa-direct-error-regressions.txt).
This internal QA does not substitute for the requested independent checker
review or grant merge approval.

After run 9, decision `216ac47f05f375e1ccfab036452182063f0f1541` clarified
one last specification case. A valid but different genesis may remove the
actor's activation grant. An actually unauthorized attempt then remains
`ineffective`, `unauthorized`, with foundation `authorized:false`, before
destination checking. An authorized valid-different attempt still requires
`destination_mismatch` and `authorized:true`. Both branches require zero
activations and no live destination rights. Missing activation authority is
not grounds for inventing a malformed-profile rejection. Recognized malformed
candidate rejections and failure on unrecognized errors remain unchanged.

This specification-only refinement changes the manifest ID to
`sha256:fc55bfa123891e750f7bbe3a0d9cb33b5f65c07750db08bc984544ed2dd6b378`.
The opening-rule ID and all runtime files remain unchanged. Its focused
lifecycle/typecheck run is recorded separately below; run 9 remains the full
runtime/campaign measurement at its actual `75de2a86` manifest boundary.
