# O5 isolated ordering-control verifier

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:8c67d385336192e5f19e60b4b9a82eeec1519d36`.
Base: O2 final `b6d156163285c8eaab3d05766dd9b0de35fef79b`.
Branch: `request/o5-control-verifier`.

## Declared checks and independence

The verifier was written from ordering §§3, 5, 6 and 9, design invariant 19,
and the agreed v2 wire schema. It neither reads nor calls O3's transition
algorithm. Its only local imports are the canonical codec, JSON/hash
constants and shared data types. It has no journal, append, application
package, participation or grant dependency. O3 and O5 share the Ed25519
codec; this is independent control logic, not an independent cryptographic
implementation.

Inputs are an independently pinned genesis commitment, its signed wire
entry, every signed `dap.seq.*` entry, and signed headers for every other
position. Ordinary openings are rejected by the API. A subprocess test copies
only the verifier and its three allowed modules to a temporary directory and
runs it with Node filesystem permissions restricted to that directory. The
subprocess receives only a proof through stdin; application packages, payloads
and grant folds are absent.

The v2 genesis has exact sequencing fields `profile`, `writer`, `control`.
The control key is independent of every writer. Both seal and assign actors
are the genesis control key. Both headers are signed by the retiring writer.
Seal carries the current epoch and prior entry commitment; assign carries
the next epoch, immediate seal commitment and a new writer key. Header `prev`
separately binds the prior header hash. Only assign may follow a visible seal.
The successor begins at the position after assignment. Positions never reset,
control/profile do not rotate, and no used writer key can be revived. v1 keeps
its fixed writer; requests in either profile do not install an assignment.

The fixture generator uses only deterministic test keys and the shared codec.
Expected accept/refuse results are declared explicitly before measurement;
it does not derive them from either control algorithm. The committed proof
file retains exact signatures and bytes for valid handovers, interruption,
two nominations, wrong authority, forged proofs, skipped positions/epochs,
commitment/header-hash swaps, request-as-authority, old-writer continuation,
extra fields, key reuse, and competing assignments. Two otherwise valid
histories with conflicting signed heads are compared to retain both proofs.
The verifier does not choose a winning branch.

## Completeness and other limits

**Acceptance assumes that every control opening was supplied.** The opaque
header has no event kind, so it cannot establish this completeness by itself.
A retained counterexample presents identical signed headers twice: a visible
seal followed by an old-writer entry is rejected; hiding that seal opening
makes both headers look ordinary and is accepted. Missing controls can also
be exposed by an unauthorized successor signature, but that does not detect
all malicious omission. Comparing actual conflicting signed heads supplies
evidence of equivocation; it does not supply Byzantine tolerance, complete
omission detection, availability, freshness or a fork choice.

The verifier checks ordering authority only. It does not evaluate request
capabilities, application effects, audience correctness, envelope admission,
retry persistence, transfer proofs or journal durability. An authentic
request from an actor without a grant is harmless to assignment verification;
its application authorization is a separate question. Exact network retries
are deduplicated before constructing a dense history; a repeated receipt is
not a new committed position.

## Measurements

Focused run 1 source: `462d7dec3a40eb504bc45688cdecc89383820e8a`. Command from
`spike`: `node --test test/control-verifier.test.ts`. Result: 53 passed,
one failed, zero skips or TODOs. The isolated subprocess was denied access
while Node resolved macOS's `/var` symlink; no verifier assertion failed.
The retained [run-1.txt](ordering-o5-runs/run-1.txt) records that failure.
The test now resolves the temporary directory before starting permission mode.
The first typecheck could not find the newly created worktree's dependencies;
`npm ci --ignore-scripts --no-audit --no-fund` installed the committed lockfile.

Focused run 2 source: `ac5630356e71749b841340cf0023a353e41c793e`,
which integrates O3 final candidate `c527584d5399f20dff33625e20cb97d237bdad98`.
The same focused command passed all 54 checks, including isolation, with no
failures, skips or TODOs; see [run-2.txt](ordering-o5-runs/run-2.txt).
TypeScript then rejected one deliberate malformed-input test cast; the cast
now explicitly passes through `unknown`, with no runtime or verifier change.

Full integration run 3 source:
`0a1daff7126ce63dd3aa258bfad25becb073f67a`.
Commands from `spike`: `npm test` and `npm run typecheck`.
Node 26.8.2. Result: **256 tests, 255 passed, zero ordinary failures,
one executing/failing Club TODO**, zero skips; exit status 0; 107.4 seconds.
All **55 O5 checks** passed: 47 declared proof cases, four history comparisons,
the identical-header omission counterexample, input/mutation checks, and two
permission-isolated subprocess checks. TypeScript passed. See the retained
[run-3.txt](ordering-o5-runs/run-3.txt) and
[typecheck-3.txt](ordering-o5-runs/typecheck-3.txt).

One subprocess receives an actual O3 SQLite-produced handover, with explicit
expected seal/assign/successor positions 2/3/4. The origin and successor entry
are reduced to headers; only genesis, seal and assign openings are supplied.
Its exact projected input and result are retained in
[run-3-journal-proof.json](ordering-o5-runs/run-3-journal-proof.json), extracted
unchanged from the test diagnostic. O3 produces this input; it does not provide
the expected control result. The successor starts signing at position 4 in
epoch 1. Genesis contains its public bootstrap metadata and declared origin;
no package implementation or later application payload is provided.

All three 200-seed visibility campaigns again had zero declared violations:
Sale 11,047 entries (195 offers, 20 effective accepts); Booking 12,000 entries
(652 effective occupancies, 471 linked occupancies, 324 effective cancels);
Club 11,939 entries (1,001 effective votes, 126 effective admits). These are
the existing visibility-path campaigns, not 600 signed journal/control traces.
The chosen Club policy failure and Sale repair-budget overrun remain unchanged.

No control verifier algorithm repair was needed after the first frozen source.
The two corrections were to the isolated runner path and a test-only cast.
Source, fixtures and edited prose pass the scoped whitespace check. Raw Node
logs retain whitespace in stack traces, including the first isolation failure
and existing Club TODO; no whole-tree whitespace claim is made.

The final commit adds only measured outputs and this record after run 3.
Independent checker review remains the completion gate.


## First combined O2/O3/O5 candidate

The first integration on `request/ordering-o2-o3-o5` incorporates corrected
O1/V6 candidate `4cfc69376fbd513c4cacf5baa0d32c316797cf89`, retaining this
O5 request, implementation and historical evidence. Its common source,
merge resolution and focused verification are recorded in
[the integration ledger](ordering-integration.ledger.md). This ledger remains
the O5 reporting artifact at that same candidate head. Component review
approvals and an additional 600-seed run are not claimed.


The common frozen source `671400d8d44b661084918a2a70edb917662ec51e`
passed all 138 focused integration checks and typecheck. The exact output and
scope are in the linked integration record. The final common candidate adds
only evidence after that run; no subsequent source or test repair occurred.


## O1 G1/G2 integration

The common branch now includes final O1 candidate
`aaa447d9e5ac4d88f07f144d46f2f5e63752c399`, retaining this O5 request,
implementation and original measurements. Frozen combined source
`2a57bd2ab0b1e30912f1e2bc044951d71477c5cc` passed all **149 focused integration tests** and typecheck,
including the new Context freshness cases and lifecycle manifest
`sha256:d94090b21ce42f2eec4a046558b3a776895d82905c2096a19df1f5f02e011f86`.
The exact commands, component scope and outputs are linked from
[focused integration run 2](ordering-integration.ledger.md#focused-integration-run-2).
Only evidence records follow that measurement. No additional 600-seed run or
component review approval is claimed; this ledger remains the O5
reporting artifact at the common candidate head.


## O-H1 correction: exact-head control signatures

Ratified review `5643a940fde2c3c372d48ae89ee34e8e35593cf3` found a real
wrong-head acceptance at common candidate
`1ba67c39062ddf44508b14c0716817cfa9735964`. The old commitment-only control
signature allowed the retiring writer to repeat commitment C at positions 2
and 4, insert D, then move the same seal from its intended position 3 to
position 5. The old verifier accepted epoch 1 with the successor beginning
at position 7. This corrects the earlier wrong-head claim; the original
measurements above remain historical results, not evidence of rejecting
this attack.

[The before record](ordering-o5-runs/h1-before/record.json) retains the
checker's exact probe, the original 47 signed `/2` vectors and generator,
their SHA-256 hashes, and the reproduced acceptance output. The original
probe's hard-coded temporary checkout no longer existed; its first run is
retained as a module-path setup failure. A second copy changes only its
import directory to four modules exported unchanged from `1ba67c3`; that
run reproduces the acceptance. No historical raw evidence was rewritten.

Builder decision `2d7edc9c76b3d657a2a9fbb3fa6ffa819cb25492` chooses the
stronger correction, `dap.fixture.single-writer/3`. Both control payloads
now carry predecessor exactly `{position, headerHash}`: seal names the
immediately previous authenticated head, and assign names the immediately
previous seal head. The header hash also commits to that entry's commitment.
Both fields are required; extra fields, strings, arrays and incomplete
predecessors are rejected. The retiring writer still signs both headers,
the independent genesis control key signs both actor envelopes, and writer
assignment changes only after assign. `/2` is unsupported at this revised
boundary; `/1` fixed-writer valid proof bytes stay unchanged.

The verifier independently rejects any repeated entry commitment at a new
position, including genesis, opaque application headers and fixed-writer
proofs. Exact retries are still represented by one original position. Its
only local imports remain codec, canon and types; the revised O3 transition
algorithm was neither read nor reused. A Set tracks commitments in one
forward scan rather than rescanning prior entries.

The revised codec-only generator declares 76 proof cases, including the
checker's A,C,D,C,seal pattern, repeated hidden/genesis commitments, and two
individually unique histories containing exactly the same control-signed
seal bytes. One changes the predecessor position; the other keeps its
position and changes only its ancestry/header hash. Both must fail exact-head
binding. A reused assign after a different valid seal also fails. Existing
valid handovers, authority, forgery, omission and conflict cases remain.
The historical `/2` inputs remain separately retained, not silently replaced
as evidence. The fixed-writer compatibility check compares exact old/new
proof bytes. A real-journal projection check repeats its signed origin
commitment at a newly signed position and expects rejection without changing
the journal. Permission isolation now evaluates every declared vector in
one process, in addition to the separate actual-journal proof. One boundary
vector deliberately supplies an ordinary opening and must be rejected; valid
accepted inputs contain only genesis, control openings and ordinary headers.

**Acceptance still assumes every control opening is supplied.** Exact-head
binding and duplicate detection do not identify hidden control kinds. The
same-header visible/hidden seal counterexample remains an explicit accepted
limitation; neither this correction nor conflicting-history evidence proves
completeness, freshness, availability, fork choice or rollback protection.

Frozen common source `773a38ec8367d0b563f7741d1ff902aceb72350c` passed
all **86 O5 checks** inside one full noncampaign invocation: 76 declared
proof cases, four history comparisons, the omission counterexample, input
boundary, exact-control-byte relocation, historical/fixed-writer compatibility,
all-vector isolation, and actual-journal isolation/projection checks. These
are the O5 subset, not another run added to the suite total. The combined
suite selected 325 tests: 321 passed, zero ordinary failures and four executing
retained Club TODOs. Three 200-seed campaigns were excluded.

[O5 result and hashes](ordering-o5-runs/h1-result.json) identify the frozen
verifier/vector bytes and shared raw output. The generator reproduced the
new proof file byte-for-byte before freezing, with SHA-256
`03bea9188036158a14da96a4168907675928375abf65cb45a0179238b929b36b`.
The new [journal proof](ordering-o5-runs/h1-journal-proof.json) is extracted
from the shared diagnostic; it retains the actual `/3` seal/assign/successor
positions 2/3/4. No O5 algorithm or fixture repair followed this measurement.

Whole-tree typecheck at this exact source failed with TS2322 in the O3
malformed-payload test (`ordering-handover.test.ts:143`): inferred optional
`undefined` properties were not assignable to Json. The runtime owner corrected that test annotation only; the next
focused/typecheck boundary remains separate. The failed output remains in
[the combined run](ordering-integration-runs/run-4-h1-h2-combined.txt).
No new 600-seed campaign or independent approval is claimed.


At correction source `713315d17030fbafae275dbde3e04c7c1e7dd2f4`, all 12
handover checks and whole-tree typecheck pass. The [correction record](ordering-integration-runs/run-5-h1-h2-type-correction.json)
retains commands, output links and matching hashes for all 19 runtime files
against `773a38e`. All six O5 source/test/fixture files are also unchanged.
The 86 O5 checks and full noncampaign result remain measured at `773a38e`;
no new broad or campaign run is claimed for the annotation correction.
