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

No runtime source, tests, gate, provider calls, deployment or publication
were performed for this preparation note.
