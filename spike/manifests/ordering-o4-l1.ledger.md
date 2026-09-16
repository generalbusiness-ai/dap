# O4 L1 own-property registry repair

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:1b6384e27d6dbfd5a22da3330378776d32ad23ab`.
Review `869821dee977b1697050fb09ba8f80f8112425f3`, ratification
`04ea60627a747adfa56f518bfde5fbc7096a262e`, and builder adoption
`794a913979b8e34c5b32d9e1d401f6300730ee34` use the same workroom prefix.

This isolated branch starts at frozen O4 candidate
`e0467ae9c44d99e10f38916b74f047b4e9183c5c`. It does not include the concurrent
L2 issuance-exception or L3 unbound-kind completeness corrections. Original
checker scripts and before outputs are retained in `corpus/ordering-o4/l1`.
Both kinds and roles reproduced permanent strict cold-replay failure after an
admitted property-name input. The separate command path typo never executed
a probe and is labelled accordingly.

## Audit and repair boundary

Kinds, models, role tables, resolution maps and installation positions now
use `own()` from the existing descriptor module for dynamic lookup. The
helper checks own string keys; absent or inherited properties are absent.
`setOwn()` defines enumerable writable own data properties without invoking
Object.prototype's `__proto__` setter. These helpers preserve ordinary JSON
object prototypes, their own keys, canonical serialization and normal lookup
order. Legitimately declared property-name models, roles and kinds remain
supported; names are not blacklisted.

The audit covers binding lookup/identity/visibility, attachment resolution
and dependencies, foundation dispatch/model initialization/per-model outcomes,
audience model reads, Context activation metadata, interpretation bindings,
observation bindings/models/outcomes and Scope right lookup. Invitation
records use own-data writes; their keys are already content hashes. Grant
history uses an array and capability expansion uses Sets, so no principal or
capability string is a dictionary property. Package registries already used
own-property validation; packageIn now delegates to the shared helper while
preserving its behavior and fault propagation. Corpus package-name lookup
uses that same validated path.

Descriptor hashing reads keys obtained from Object.keys and writes tables
with Object.fromEntries, both already own-property-safe. Append retry indexes
are Maps; SQLite binds strings as values. Numeric position arrays are separate
from payload-string tables. Generator weight/payload maps and checker patches
are trusted test definitions, not protocol admission registries; no seeded
campaign algorithm changes are included.

Unbound property-name kinds keep the ordinary `unhandled` verdict. Unknown
roles keep the prior empty-capability behavior: grant/revoke may be effective
no-ops, and invitation acceptance adds the invitee without invented authority.
No new schema or role policy is introduced. Scope treats unowned property-name
rights as unowned. Unexpected registry/handler exceptions still propagate;
this repair does not weaken strict scope replay.

No descriptor module or descriptor identity formula changes. Sale and
Inspection descriptors should retain their identities; the scope runtime
fingerprint and Scope package must change because descriptor/foundation/
context/interpret/scope code changed. Final combined identities are root's
integration responsibility, not the component result here.

## Focused validation plan

The signed memory/SQLite regression submits the four reported property-name
kinds in S, I, D and F; unknown-role grants/revocations and invitation acceptance;
property-name package lookups and unowned rights. Each saved event is retried
immediately, after cold reopen and after the actual transfer completes.
The live and reopened final owner/state observations must agree, with one
activation and both spends. Separate signed Journal cases install real
property-name models/kinds/roles, rebind `__proto__` with an own resolution,
and verify folding, observation, interpretation and cold replay preserve own
data properties without changing object prototypes. A registry unit case
rejects inherited packages and missing inherited handlers while preserving
explicit own data through serialization.

One focused invocation will include this regression and the existing descriptor,
origin, and scope exception-boundary tests, followed by whole-tree typecheck.
The root will run the combined noncampaign suite after merging L1–L3. This
component does not rerun broad suites or campaigns and claims no review verdict.
