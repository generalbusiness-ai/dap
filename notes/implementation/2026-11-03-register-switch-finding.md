# A register switch stops new child births under the earlier register

Changing `REGISTER_SCOPE` changes the permitted creation root for the whole
Worker. It affects existing rooms as well as new room installation. An
existing room keeps its Native pins and stored objects, but those facts do
not admit a new child whose ancestry ends at the earlier register.

## The local observation

The OAuth browser fixture first created an own-agent room under Register27.
I then changed that same local Worker's configured register to Register21
to prepare the earlier-cohort room. In the original room, the person's join
and the agent's add each produced an Inbox creation send. Both sends
received three `not-found` replies and reached an `undelivered` diagnosis.
The room's existing reads still worked. The consent page retained its
unknown original; no hosted enrollment or authorization code followed.

This was a test setup error. The successful witnesses use separate local
Workers, each with its original register fixed throughout. Their full
browser code flows and revocations completed at `42a76281`. The public
outcomes and masked screenshots live in evidence unit
`2026-11-03-oauth-browser-42a`; the raw diagnostic, profiles, and test
identities remain in its owner-only archive. This unit remains unsealed
while the implementation record is in progress.

## The check that causes the refusal

[`admitChildCreation`](../../packages/scope/src/creation-lineage.ts) checks
the complete creation ancestry before the namespace addresses a child.
For a configured deployment, the root must equal the current
`REGISTER_SCOPE`: `from.at.scope !== register.scope` refuses the creation.
Recognizing the earlier cohort does not waive that identity check.
[`indexedScopes`](../../packages/scope/src/scope-index.ts) applies that
check to creation deliveries in both index modes. An ordinary lookup of
an existing indexed object takes a different path.

The fixed mini runtime `afdd8ee5288a7b33c90536c9489bcfc06eafc7d9` contains
the same root comparison. This finding changes no creation guard or
configuration and sends no request to H3 or the original G3 room.

## The reach to H3

The [G3 configuration record](2026-11-02-g3-mini-configuration.md) and
planner ruling `4943c76a` put G3's register in the existing mini Worker's
default position. Under that deployment's normal creation policy, a new
H3 Inbox still traces back to H3's original register. The current root
comparison therefore refuses it. The same comparison reaches other new
child scopes under that earlier root, including new lanes.

That is a source-derived consequence of the recorded deployment, not a
new H3 write witness. The H3 baseline reads existing Membership8 and
Directory20 objects; it cannot establish that a new Inbox or lane can be
born. Existing stored objects and successful reads do not establish that
property either. The planner must account for this additional effect when
it rules on preserving H3. O3's local witnesses need no change to the
creation policy.
