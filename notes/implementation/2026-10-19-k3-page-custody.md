# Shared Page custody storage

K3 replaces three copies of the browser storage protocol with `custodyKind`
in `apps/room/page/src/custody.ts`. The connection, join and Start adapters
declare their record kind, exact storage prefix, byte bound, decoder and
public view. Their workflows and existing test assertions are unchanged.
The Page assets are rebuilt. Its first required gate passed at code/test
head `1e6aaa994c2a344d980746fbbcd1b5112ce2f370`, tree
`3098ed1bb185f51160443ceab760433b5e3e36e5`: 1,927 Vitest cases passed,
three existing cases skipped, and all 31 Node and 55 Counter cases passed.
The reporting candidate changes only this note after that run.

Request: `1c59d16cf1513df9e038327aa8be6e56e96e4306`.
Builder promise: `c837835c8cbd0f0c90040fea1ac16b668379f532`.
Base: actual Main `dba3e76237250b6ce205d511691554de3d809baf`.
This is interruptible consolidation work behind G5a, S2a and G5. It borrows
no unreviewed Device or archive changes and grants no deployment authority.

## Storage and validation

The shared adapter reads a bounded record, validates a complete candidate
before replacing storage, checks exact readback, checks the current context
before and after a write, and returns a public view through the kind's own
projection. It retains these differences:

| Kind | Exact prefix | Bound | Existing format and write result |
| --- | --- | --- | --- |
| Connection | `artroom-page-connections:` | 256 KiB | Strict, canonical JSON; the binding includes origin, membership, creator key and creator operation; return an owned clone |
| Join | `artroom-page-enrollment:` | 64 KiB | Existing JSON reader, signed request, receipt and bounded refusal history; re-read storage after writing |
| Start | `artroom-page-start:` | 4 KiB | Existing JSON reader, founder key and register7/register8 descriptor; re-read storage after writing |

The same-origin check remains on join and Start. The connection workflow
keeps its creator verification and composite binding. No new connection
origin check is inferred. The connection writer retains its truthy callback
check; join and Start still refuse only an explicitly false current callback.
The connection-specific full-custody message and every existing unavailable,
locking, unresolved-operation and history refusal remain exact.

The format decoders keep the same fields, accepted shapes, canonicality
rules, signature checks and key-zeroing `finally` blocks. Start's claim
journal consistency check and all connection sender stages remain in their
original workflows. No storage migration, eviction, fresh-operation fallback,
key generation policy, definition pin or authority changes.

The three old adapters had 429 lines: connection 138, join 161, Start 130.
They now have 388: 131, 144 and 113. The shared module has 57 lines, so the
total is 445, an increase of 16. This centralizes the storage protocol; it
does not claim an overall line reduction. Explicit kind policies account
for the extra configuration. The original source hashes and line counts
are in `/tmp/artroom-k3-custody-before-20261019.json`.

## Compatibility and checks

One new case reads all three records from
`apps/room/page/test/fixtures/custody-before-k3.json`. These are exact bytes
written by the old modules on Main, with their old public reader outputs.
They were captured before any production source edits. They are the first
persisted states: a reserved connection and prepared join and Start. The
existing unchanged cases cover later workflow states. The new reader
returns each old public view without a write or any byte replacement.
All secrets in this fixture are fictional test keys.

The capture used temporary copies of the existing three custody tests,
with an observer on their scripted storage adapters. The original test files
were never edited. The connection capture passed four cases; join passed
six; the corrected Start capture passed three. These use actual Page
codecs, signers, storage adapters and public readers over the existing
SCRIPTED CLI, HTTP service, creator proof and locks. They prove no native
admission, browser persistence, provider operation or deployment.

The first capture setup stopped after creating the connection copy because
its replacement pattern also matched a join reload adapter. The subsequent
Start observer first tried to inspect a claim-journal write as a Start
descriptor and caused one capture-only failure. Restricting it to the Start
storage prefix corrected the observer. Both failed preparations, temporary
test sources, raw logs and the provisional Start capture remain external
evidence. These were instrumentation failures, not passing baseline claims.
All temporary capture/control test files were removed from the candidate.

Checks completed before the gate:

- The Page's source, Node-test and native-story TypeScript projects pass.
  The first compiler run found one newly unused `utf8` import; removing it
  was the only correction required by that run.
- Six focused files pass 18 cases: custody compatibility, all three custody
  adapters, join UI and sending. Existing test files remain byte-for-byte
  identical to Main.
- After rebuilding assets, the full Page Node suite passes 26 files and
  81 cases, including the existing asset correspondence case. The one extra
  case is compatibility; no existing case or deadline changed.
- A paired control changes only the shared storage-key separator. Its
  unchanged compatibility case passes before the change and fails by a
  direct assertion after it: the old connection public state becomes null.
- A separate, temporary boundary witness counts shared sender entries with
  dropped storage. It passes with zero entries; bypassing only exact storage
  readback produces one entry and a direct failed assertion. Source is
  restored exactly after both controls. The CLI, creator proof, locks and
  storage in this witness are explicitly SCRIPTED.

An earlier readback probe against the unchanged connection test produced a
Vitest `rejects` refusal-message mismatch after entering an unconfigured
sender stand-in. It is retained as narrow evidence, not claimed as a direct
no-dispatch assertion. The independent count witness replaces that claim.
There was no sweep or whole-suite retry.

## Gate and evidence

Installed dependencies are a private COW copy from the unsealed Main view,
not hardlinks and not a sealed review view. No package was installed and no
lockfile changed. Before gate adoption, the existing compatibility script
changed this private pool0.22.0 bundle from `8d3d1150…` to `cd50d18a…`.
The existing lock stamp matches SHA256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.

Original session 59112 naturally exited zero with a clean head and tree
before and after the run. Whitespace and typechecking passed; 400 Vitest
files passed and one recording file skipped. The three existing skipped
cases are the Page recorder, demo recorder and Darwin long-path MCP
dead-reclaimer case. No whole-suite retry was run.

The measured outer gate took 498.86 seconds wall time and 714.88 CPU
seconds (615.36 user plus 99.52 system). The gate's test step took 490.4
seconds wall and 683.0 CPU; typechecking took 8.3 and 31.7 respectively.
These are the outer measurement and its reported steps, not summed
independent runs. The machine was arm64 macOS 27.0.1, Darwin 27.0.0,
18 logical CPUs; starting load averages were 1.5034, 1.2769 and 1.2998.
Private COW dependencies and recent focused runs made caches warm or
partly warm. Other host work was uncontrolled. A read-only K2 fixture
survey and external review-packaging preparation ran during the gate;
neither changed the tested source or installed dependencies.

Before/after snapshots match all 2,297 tracked files, 5,498 installed
regular files and 31 contained links. Of the 5,499 dependency-directory
regular files, only Vitest's `results.json` output cache changed, and both
hashes are retained. The final pretest verifies the stable `cd50d18a…`
bundle after the earlier adoption. No install occurred.

Passing raw logs retain deliberate scripted reset and SQLite retention
faults, four Git advertisement `.text()` warnings and one unclassified
different-Durable-Object I/O / `RefcountedCanceler` diagnostic in Vitest's
abort path, without a case attribution. These are retained with their
actual scope. This gate does not establish general stability; that remains
the separate request `1d3a13e385d2b1f4b914e651e5463ba948730b2a`.

External evidence uses `/tmp/artroom-k3-*20261019*`: original capture
sources and outputs, before-counts, compiler and Page logs, both controls'
raw JSON reports, exact restored source hashes, and pool-adoption output.
The original raw gate directory is
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.JphKzvZl1w`;
the retained Counter output is `artroom-counting-node-7G1rRB` in that same
temporary parent. Gate assertion: `6139b724852efd41fc588f66cf1ac77a547ecd82`.
The formal Source supplies a finite map and its digest. Every listed
source, private dependency, snapshot, log, tool and sealer original freezes
forever at publication. Reviewers read or make independent private copies;
they never execute or edit originals. The sealer excludes its own open
output, which can be granted separately after closure. No review approval,
landing, publication or deployment acceptance is claimed.
