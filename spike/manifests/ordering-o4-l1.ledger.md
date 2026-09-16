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


## Measured component result

Frozen source `28981dd1982e02b40fc154d43972c19d82ebc7bf` passes all **33
focused checks**, with no failures, skips or TODOs. Whole-tree typecheck
passes. The single focused invocation includes five new L1 cases, existing
descriptor and origin checks, and all 16 scope phase/exception-boundary cases.
Exact command arguments, raw output, source blobs, dependency/configuration
blobs and eight observations are retained in `corpus/ordering-o4/l1/run1`.
The earlier uncommitted compiler-only development check is labelled as such;
it is not a lifecycle result or a frozen-source measurement.

Each backend records 33 signed test inputs and 99 exact retry checks across
immediate, cold and post-completion states. The four names are tested as
unknown application kinds in S/I/D/F, unknown roles in grants/revocations and
invitation acceptance, unavailable package names and unowned rights. The
real transfer ends at S42/I5/D5/F11, with one activation, delivery confirmed
and fulfilment complete. Reopening every context yields the identical final
snapshot. The positive property-name tests also pass: four own model/kind/
role declarations, `__proto__` rebinding, per-model outcomes, observations,
client binding maps and cold replay remain usable with ordinary object
prototypes. No inherited object is resolved as a registry entry.

The measured component identities are:

- scope implementation `sha256:f891ce00e1f6578863eb5424b7410c625d031914bfd58ae336f36350142d2111`;
- Scope package `sha256:a948ef9a269688c1bd40b01f78dab2749c96b15283450956fea36ef414a6452e`;
- unchanged Sale `sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85`;
- unchanged Inspection `sha256:18a886c149b383b8630836307195c1a89b90c463e7e32df6e0663b5d4ecc3030`;
- unchanged foundation table `sha256:5a7be1514529bac249c683ada733e64273f94b2700abf8a55c47dcb7ebfb8d78`.

The opening rule remains `701403e9` and lifecycle manifest `a766fe56` for
this isolated component. These are not the future L1–L3 combined identities.
No profile or manifest prose changed here. Existing package definitions keep
their ids; old signed histories remain pinned to their historical runtime
and are not silently reinterpreted as this new Scope implementation.

Only these results, observations and documentation follow the measured
source. Root owns the combined integration, one noncampaign run, publication
and independent review. This component does not claim to fix L2/L3 or the
shared profile's other recorded limits, and no broad suite or campaign ran.
