# Archive A2 preparation

Request: `432f26b3`, under archive root `e871ba09`.

This preparation follows reviewed Main `6ce62bd2`. The card kit is in
checker review under `b85d79ec`; this note does not change its candidate.
The archive worktree also records the accepted historical-witness gap
from `72d94bf9`. A2 and A3 use synthetic or explicitly reviewed fixtures.
No real room is selected, read or exported.

## Package boundary requiring a decision

Section 15.7 assigns `gitSource(directory)` to the replay package. Git
object parsing and hardened process execution belong to the Git package.
The active-source guard currently permits only scope, checkers and the
platform tests to name Git. The public SDK publishes replay but excludes
Git and the replay command's Node entry point. Its release plan requires
the replay runtime dependencies to remain contract, bytes and derive.

Planner decision requested before dependent source: keep the public SDK
portable and add a source-only Node entry point for clone replay.

Proposed boundary:

- The Git package owns archive object and tree validation, bounded local
  object reads and ref resolution. A narrow archive export reuses the A1
  parsers. It imports no replay code.
- Replay owns the `HistorySource` adaptation and verification reports.
  Its portable source accepts a structural read port; it contains no Git
  object parser, process execution or filesystem traversal.
- A separate Node entry point in replay supplies
  `gitSource(directory)` by composing those two parts. The repository's
  `artroom-replay` command wires it to `--git`. Git is a source-command
  development dependency, not a dependency of the published portable SDK.
- The release plan explicitly excludes that Node entry point and its
  source-only export, as it already excludes `src/bin.ts`. The active
  source guard allows Git only in that composition, its tests and the
  replay manifest. The portable export remains independently checked.

This requires an explicit release-plan exclusion and package-guard change.
It adds no package to the public SDK and publishes nothing. If clone
replay must instead ship in the public SDK now, the publication boundary
needs a separate decision; an unpublished runtime dependency is not an
acceptable substitute.

## Concrete API and failure proposal

Checker consultations `85143d73` and `f2b69d75` support the boundary above,
subject to planner disposition. The proposed paths are:

| Path | Responsibility |
|---|---|
| `packages/git/src/journal-reader.ts` | A bounded, explicit-format archive reader over the A1 object port and parsers; no replay import. |
| `packages/git/src/journal-local.ts` | Node-only, read-only local Git plumbing with bounded output and process lifetime; no clone path checkout or lazy network fetch. |
| `packages/replay/src/archive.ts` | Portable `ArchiveReadPort`, `archiveSource` and `verifyArchive` adaptation and result types; no Git or Node import. |
| `packages/replay/src/git.ts` | Source-only Node composition exposing `gitSource(directory)` through a precisely excluded `./git` source export. |
| `packages/replay/src/bin.ts` | Supplies the Node composition to the portable command's injected archive/file ports. |

Only replay's `src/git.ts` and existing `src/bin.ts` are proposed Node-only
production inputs. Any further helper needs an explicit named exclusion;
there is no directory-wide exception. Git-owned Node code stays in Git's
Node subpath. The portable root must not reach either Node entry through
imports, types, exports or generated declarations.

The archive read port opens a scope at a resolved commit and returns its
validated layout descriptor or a typed archive failure. Its pages and
retained inputs implement `HistorySource`. An absent foreign ref remains
a real absent dependency, not a corrupt entry or service fallback.

`verifyArchive` first checks the archive structure, then calls the native
verifier without changing its judges. Its result distinguishes an archive
failure from a completed native `Verification`. Structural corruption is
`mismatch`; unsafe forms are refused. Unavailable reads, deadlines and
work limits retain those meanings. Before native verification returns,
an archive failure contains its actual scope/commit/object read location
where known, and no invented native target, hash, coverage or report.
Successful adaptation retains the real native result and coverage;
incomplete ancestry stays incomplete. Clone provenance qualifies the
transport-specific trust text. A source-selected head is `archive-head`,
even when passed internally to the verifier as its expected head. A
caller head or receipt remains a separate pin.

Receipt membership follows successful integrity and continuity checks
through the resolved archive head, then compares the receipt's own
scope, incarnation, position and hash. A later corrupt archive entry
cannot be bypassed by a matching earlier receipt. A receipt past a valid
archive head is behind. Text and receipt file inputs use separate bounded
caller-selected file ports; archive tree paths never reach those ports.

Planner disposition is still requested for this API and result boundary,
as well as the package exclusions. No dependent implementation is made
by this preparation.

## A2 implementation and review boundary

The source child will implement the clone source and the `--git`,
`--texts` and `--receipt` options. Clone bytes remain untrusted. Reads
resolve commit, tree and blob object IDs; no archive path becomes a
filesystem path. Both object formats, native scope ref spelling, strict
tree modes and path grammar, bounded blobs and segment lines, and
foreign-scope dependencies retain the reviewed A1 rules. No service or
anchor silently replaces a missing clone dependency.

Focused witnesses will compare HTTP and clone reports, then verify the
four dependency cutoffs from section 15.9 offline. The staged-ref
snapshot case must be incomplete for unwalked ancestry, exactly as HTTP
is; it must not become missing-input. Changed lines, cut segments and
wrong heads must be mismatch. Missing foreign refs must be
missing-dependency. Symlinks, submodules and invalid paths must be
refused. Receipt prefix membership follows integrity and continuity
checks; it cannot bypass them. Explicit detached texts are bounded and
checked against their digests.

The final fixture witness clones, disconnects and verifies through an
explicit cutoff. Focused checks run while building; the gate runs once
at the head submitted for exact-head checker review. A3 follows as a
separate Source child. Its real object-storage and scripted-host
witnesses, archive-token prefix boundary, Mark/reset rebuild and lost
push reconciliation remain owed. A4, A5, real-history disclosures,
progress and G1 remain outside this milestone.

The initial preparation commits ran no tests, gate, provider calls,
deployment or publication. They made no runtime source change.

## Independent fixture preparation

The test-only `packages/replay/test/archive-fixtures.ts` now constructs
the four required cutoff histories with derive's judges:

| Fixture | Target cutoff | Required retained input | In-memory replay |
|---|---:|---|---|
| Declared genesis | 0 | The genesis's declaration | consistent |
| Outcome evidence value | 2 | The value first named by the final outcome | consistent |
| Outcome staged refs | 8 | The snapshot first named by the final check outcome | incomplete: ancestry walk unproved |
| Observing delivery | 3 | The value first named by the final delivery's rules observation | consistent |

Each check supplies no anchor and ends at its stated cutoff. Removing
exactly the required input makes replay incomplete for that missing
input. The snapshot's intact case reaches entry 8 and reports the
unproved ancestry walk, rather than a missing input. Its actual parent
creation and confirmation histories are present. The observing case
includes its sender, rules scope and rules creator histories.

These are judged in-memory fixtures, with explicitly recorded test
authority and labelled owner/host/read stand-ins. They establish no
native storage, privacy admission, real-room export, clone or CLI result.
The existing staging helper accepts a judged parent for this fixture;
its default hand-made creator remains labelled. Its 53 existing replay
regression cases passed. The final four-fixture scratch checks and
Replay test typecheck passed. No gate has run for the A2 candidate.

Two initial fixture setup attempts failed before replay: the snapshot
variant received a validated definition instead of its declaration, and
the rules observation request omitted its target scope. Type checks
also rejected those calls. Both calls were corrected before the final
four-fixture check; those earlier attempts remain failures.
