# Shared Page custody storage

K3 replaces three copies of the browser storage protocol with `custodyKind`
in `apps/room/page/src/custody.ts`. The connection, join and Start adapters
declare their record kind, exact storage prefix, byte bound, decoder and
public view. Their workflows and existing test assertions are unchanged.
The Page assets are rebuilt. The focused checks below pass; the required
gate has not yet run.

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
They were captured before any production source edits. The new reader
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

## Gate preparation and evidence

Installed dependencies are a private COW copy from the unsealed Main view,
not hardlinks and not a sealed review view. No package was installed and no
lockfile changed. Before gate adoption, the existing compatibility script
changed this private pool0.22.0 bundle from `8d3d1150…` to `cd50d18a…`.
The existing lock stamp matches SHA256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.

External evidence uses `/tmp/artroom-k3-*20261019*`: original capture
sources and outputs, before-counts, compiler and Page logs, both controls'
raw JSON reports, exact restored source hashes, and pool-adoption output.
Gate before/after snapshots will bind the clean head, tracked files, private
dependency files and contained relative links. Gate timing will state the
machine, load and cache limits. No passing gate, review, landing, publication
or deployment is claimed by this preparation note.
