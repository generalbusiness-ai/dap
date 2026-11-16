# Publish lending shelf pages from the journal

P1 is source work for `ai.generalbusiness.lending.publisher@0.1.0`.
Its separate definition is `lending-publisher`.
Planner rulings `36915a7c`, `ced41b00`, `d2d431a9`, and `b976446a`
set the package, Git, and test boundaries.

P1 derives every role row from `lendingRoles.roles` and adds
`lending.publish` to `agent`; it changes none of the shipped Lending
package's roles, manifest, source definition, JSON definition, or pin
under ruling `36915a7c`. Shipped release identifiers, signed packets and
hosted settings stay unchanged.

The scripts consume the checked source definition and publication map.
No script reads portable package metadata, so P1 adds no unused manifest.
It produces no package release, package signature, or trust row. A later
release head after P2 owns replacement of the shipped definition.

## Local Git boundary

The publisher takes the path of a canonical local bare repository and a
separate work directory. `GitProgram` uses its local transport with
disabled hooks, no credential helper, and no prompt. P1 builds no
authenticated remote connector and borrows no deployment credential or
Gateway token.

The room's owner carries the local branch to a remote Git host with their
own Git. The owner keeps the credential and revocation duty. P2 owns the
design for credential delivery to a publisher.

## One recorded report after one branch update

Staff bind a repository and appoint a publisher member. The publisher
reads the live `library` item, a complete journal interval, and earlier
donate entries that the map needs. A refused, filtered, or incomplete read
stops the cycle before a signature or push.
Journal pages with a continuation are followed to the fixed captured head.
An incomplete suffix without a continuation supplies no publication proof.

The map reads a page directly from `donate`. For `borrow`, `return`, and
`cancel`, it reads the page of the donate entry that opened the thing.
For `publish`, the named thing selects that opening entry. Every content
value comes from the mapped act itself. Later entries replace earlier
text at the same path. A path that Git cannot write is skipped, and the
commit message names the entry and reason.

The publisher and reader share the fold and exact commit construction.
The commit keeps the recorded base as its single parent, or has no parent
for the first publication. The fixed author and committer use UTC seconds
from the `through` entry. Its trailer binds the scope ID and genesis,
through position and hash, and earlier head. The through hash also binds
the entry's full timestamp.

The publisher sends one compare-and-set of the branch. After a lost Git
answer, it reads the branch and reconstructs the exact candidate before
reporting. An unexpected branch writer stops publication. Staff can name
an external baseline with `adopt-head`; that act changes the head but not
the cursor.

Client custody keeps and reads back the signed `published` request before
submission. An unresolved report reuses that stored envelope. A retry
does not sign a replacement. Two independent signing keys of the appointed
member can race: one report takes effect and the other meets a definitive
`revision-moved` refusal. The stale-base witness supplies the current
revision so the base guard decides separately. With the same key and an
identical report, `accepted-before` can return the original receipt. That
is the correct idempotent answer.
If a report took effect before its reply was lost, a fresh process settles
the kept original even when the new cursor leaves no mapped work.

A retained unsent ending returns `stopped` with reason `report-unsent`.
The publisher signs no replacement, resends no ended original and invents
no Native answer or receipt. Its report key combines the commit and Library
revision, so each cycle stops again until that revision moves. P1 adds no
second report for this case. Folded outcomes retain `custody-mismatch`.

Membership grants and session authority in the IPC witnesses are
scripted. They do not prove real enrollment, membership revocation, or
provider access. The scope's journal holds acts, with no publication
`outcome`, `preparation`, or `delivery` input.

## Check a supplied export and local branch

The reader takes a public JSON export with exactly these fields:

```text
scope: { scope, genesis }
entries: [{ entry, hash }, ...]
complete: true
coverage: "whole"
head: { seq, hash }
```

The rows start at genesis and continue without a gap through the declared
head. Each row's bytes, sequence position, previous hash, scope incarnation,
and definition must match. `complete` and `coverage` are the exporter's
claim. This check does not authenticate that claim against a live service
or prove membership authority. Replay supplies the separate judgment check.

The reader walks the observed branch's exact parent chain. For each
publisher trailer it finds the corresponding recorded report by through
and base, folds from that report's prior cursor, and compares the entire
commit. A changed file therefore reports `mismatch`, even when its trailer
is unchanged. After checking object identity and commit syntax, the reader
honors an exact staff-adopted commit as a baseline, even with a foreign
publisher trailer. An unadopted foreign trailer still refuses. A trailer
without matching report or adoption context reports `unreported-commit`.

The reader command is:

```sh
node --import tsx examples/lending/publisher/check.ts \
	--repository /absolute/local-shelf.git \
	--work /absolute/reader-work \
	--journal /absolute/public-journal.json \
	--branch main
```

The public export must be a canonical absolute path to a regular file of
at most 256 MiB. The reader prints a qualified JSON result with a count of
checked publisher commits. It reads no private key or Git credential.

## Nine required witnesses

The owner is `publisher.test.ts`, in the existing Lending test project.
The two process witnesses use actual Node children, a temporary bare Git
repository, and real file custody. Their in-memory judge owner answers
client requests over IPC, without a network listener.

| Witness | Required observation |
|---|---|
| 1. Donate and borrow | One report, the borrowed pot text, and its exact through trailer |
| 2. Lost Git answer | A fresh process reports the same commit without a second branch commit |
| 3. Two processes | One compare-and-set and one accepted report; the same-key case returns the first receipt |
| 4. Another writer | No report signature until staff adopt the external head |
| 5. Another agent | Publish permission alone does not satisfy the appointed-member guard |
| 6. Stale base | A fresh-revision report with the earlier base cannot move head or cursor |
| 7. Replay | `consistent`, with authority trust explicit and no outside-operation input forms |
| 8. Reader | Exact reconstruction passes; changing one file reports a mismatch |
| 9. Foreign entry | A supplied same-definition foreign fact cannot change this cursor |

The same owner also covers refused, filtered, and incomplete
reads stopping before signatures or pushes, and for an unwritable path
that the fold names and skips. Witness 2 includes a lost scope report
answer as well as a restart after the Git update. No witness uses sleeps.

The standalone Lending compiler and whole 13-case publisher baseline
passed at `146dcb26` on 2026-11-14. The directory-bound control
distinguished its mutant at that same head under END `1bf68510`.
Those checks use local bare Git, real IPC children and scripted authority;
they prove no network, remote credential or hosted publication behavior.
The implementation note retains their full source and evidence bindings.

The 2026-11-15 refresh starts from published main `ce6f02ba` and includes
the one-note main successor `9e42735a`. At current source `0ef9244f`,
the Lending compiler passed and the whole 13-case baseline passed inside
the corrected `report-unsent` control. Removing only the settled-ending
guard caused the existing restart witness's direct assertion to fail.
An earlier control invocation was inconclusive before tests because it
named the wrong package directory; that result remains separate.
The implementation note records both attempts and the exact evidence.
Fresh combined pins, including canonical reproduction, passed at
`50e16a76` in 17.286229459 s outer. The clean composition retains all
18 P1 blobs and modes from `63c30fd0`, including the current-client
accommodation. Its LS4 successor changes only two diagnostic scripts.
The normal reproduction owner ran its scratch preparation; no manual
producer or committed output, identifier or version change followed.
That ordinary owner uses real TEST signatures during scratch preparation;
it signs no production release.
The earlier compiler and control results remain bound to `0ef9244f`.
The combined gate passed at `50e16a76` under END
`7471c330f974c841a1c68d7d8fd0f11cab8d8530`, including the whole
13-case publisher owner in Plain. Final documentation checks, checker
review, landing and hosted acceptance remain owed. No remote Git write
or deployment ran for P1.


## Source review repairs

The reader honors a staff-adopted commit after checking its object identity
and commit syntax, before it interprets any publisher trailer. The adopted
baseline may carry a trailer for another room. An unadopted foreign trailer
still refuses, and a corrupt adopted-object read still refuses. The owning
witness uses a small real bare repository; only its corrupt-read check
substitutes bytes at that read boundary.

The fold bounds directory paths, including the root, by the existing
`SNAPSHOT_BOUNDS.trees`. It counts path occurrences, so aliased subtrees do
not reduce the count. Before a mapped write adds directories, the fold
checks the prospective total. An excess write changes neither file nor
directory state, and its entry appears in the commit message as
`tree-limit`. The pure witness supplies aliased baseline files at the
bound and one below it, with only two distinct tree objects.

The standalone 13-case baseline includes both repair witnesses. Its
directory control changes only `>` to `>=` and fails the real adjacent-bound
assertion before restoring the source. The original nine witnesses and
all earlier behavior assertions remain. Those dated directory-control
results stay bound to `146dcb26`; the later current-client compiler and
whole-owner baseline at `0ef9244f` cover the unsent accommodation.
The new control scripts an existing ending through real file custody;
it proves no journal-absence algorithm, native enrollment or remote host.
The combined gate passed; checker review remains owed. The implementation
note preserves the historical retained directory-control children and the
current helper's deleted-JSON qualification, as well as the invocation
that stopped before tests. The gate supplies no native enrollment,
remote credential or hosted publisher acceptance.
