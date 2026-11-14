# Publish lending shelf pages from the journal

P1 is source work for `ai.generalbusiness.lending.publisher@0.1.0`.
Its separate definition is `lending-publisher`.
Planner rulings `36915a7c`, `ced41b00`, `d2d431a9`, and `b976446a`
set the package, Git, and test boundaries.

P1 derives every role row from `lendingRoles.roles` and adds
`lending.publish` to `agent`; it changes none of the shipped Lending
package's roles, manifest, source definition, JSON definition, or pin
under ruling `36915a7c`. CUT-R's canonical identifiers, pending signed
release, and hosted settings stay unchanged.

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
is unchanged. A staff-adopted commit without a publisher trailer is an
explicit baseline, not a fold-produced commit. A trailer without matching
report context reports `unreported-commit`.

The reader command, not run for this checkpoint, is:

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

## Nine witnesses still need validation

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

The same owner also drafts witnesses for refused, filtered, and incomplete
reads stopping before signatures or pushes, and for an unwritable path
that the fold names and skips. Witness 2 includes a lost scope report
answer as well as a restart after the Git update. No witness uses sleeps.

This checkpoint is source-only. CUT-A holds executable work. The new and
affected owning tests, compiler contexts, controls, and one gate before
review remain owed. No test, compiler, generator, build, install, network
request, remote Git write, deployment, or landing has validated P1 yet.
