# G3: durable application-owned presence

Request `8614ac1e0789eb5d323ad8853ee671ee3c357470`; promise
`3b26a047e49ef80a0d7b6fb22a1ec05a66a18e4c`. This is a separate head
from the published first G3 delivery. The base is actual Main
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
Both accepted reports set reportedAt from self. That full fact identifies
the reporting entry independently of the item's revision counter.

Task routing reads the complete bounded presence-item projection through
the existing declared Site read and maps the room item to its full scope.
Missing and unknown items remain unavailable. Away means no current room
assignment. The recent-activity log may retain a bounded journal projection,
but task routing reads no history window. No native form, signer index,
hidden scan, device location or mixed queue is added.

## Witnesses to collect

The owning witnesses must distinguish initial unknown and duplicate
provisioning; another signer's refusal; move A to B followed by a named
wrong-room leave and its unchanged report fact; matching leave to away;
present, away, unknown and missing-item task selections; persistence after
more than 100 other Site reports; and an arrival whose entry position
differs from its item's revision. The kit/browser witnesses also retain
app-only data, quiet context, receipts, stale refusals and reciprocal
phone/desktop resizing. Run focused checks during work and one final gate
before exact-head review. No validation is claimed by this preparation.

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
