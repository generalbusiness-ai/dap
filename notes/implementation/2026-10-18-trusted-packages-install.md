# M1 host and install work

Work in progress under Source child `873c84041d9259870f42ace3dc8235a59e9c3d17`
and promise `d299657b6432ac7182563dedf27166c9c241e128`, within M1 `eca1c7ee`.
Planner decisions `c643756e` and `866c7ae7` govern the implementation.
The developer half passed review at `4928fccc`, landed as Main `bfa02edd`,
and passed the separate Main audit `10f6249c`. Publication request `56d563c8`
is with planner. This install worktree incorporates that Main and has its own
dependency view. Its native install flow remains unfinished.

## Completed preparation

`packages/client/src/application-uri.ts` parses the confirmed immutable
release address without fetching it or granting trust. A full lowercase
40- or 64-character commit selects SHA-1 or SHA-256. The remote is HTTPS,
with a lowercase canonical host and canonically encoded repository/path
segments. Credentials, ports, query, fragment, floating refs, empty/dot
segments, encoded separators and ambiguous UTF-8 spellings refuse. The parsed
value and path array are frozen. Its maximum address length is 4,096
characters and its path maximum is 64 components.

Both focused URI cases pass (`fc3cf9` / session `92094` to `5d0761`, exit 0),
as do client source/test typechecks. The initial source typecheck found a
RegExp tuple assertion and unavailable broad URL types. Indexed captures
and a local declaration of the narrow standard Web URL surface correct
those errors. No DOM dependency or polyfill was added. This checkpoint is
`9db3c51a6`.

`packages/git/src/application-blob.ts` reads a commit, only the trees on the
selected path, and the final regular blob. Each object is checked for type,
size and its exact Git hash in the selected format. A symlink or gitlink
at any selected component refuses; no reference or ancestry lookup exists
in this interface. Payload size is checked before copying or parsing.
The transport must bound its own wire, inflation and reads.

Stated read allowances are 64 KiB per commit, 1 MiB per tree, 8 MiB total
tree bytes, 64 path components and 16 MiB for the blob. A caller may lower
the blob allowance. These are application-reader limits, not native platform
quotas or measured heap bounds.

Two focused cases pass against actual local Git SHA-1 and SHA-256 repositories
(`6ad04b` / session `72121` to `7b7941`, exit 0). They verify exact bytes,
refusal of aliases/submodules, a size refusal without a blob payload read,
absence without fallback, and type/size/hash failures. Git source/test
typechecks pass. This is an object-reader witness with no remote/provider
transport. The checkpoint is `5a1d599ac`.

`packages/scope/src/applications/admission.ts` checks an exact operator-listed
release and publisher, verifies the signed package and validates every native
definition under the host's bounds. Missing trust admits nothing; invalid,
extra-field, oversized, duplicate or ambiguous trust settings refuse as a
whole. Trust alone does not bypass signatures or native validation.
The current host accepts restricted@1 and no application-declared capability
code. Existing native sends to the room's destination stay ordinary factory
and delivery work.

Both focused admission cases pass in workerd (`062601` / session `83963`
to `c9a5c7`, exit 0), using the real current Counter and Lending declarations
and public TEST publisher keys. They distinguish wrong release/key, modified
bytes, unsupported host requirements and an invalid native declaration.
Source/test typechecks pass. Initial test typechecks found an incorrect
fixture import, a possibly absent byte and immutable profile metadata;
correct imports, an explicit byte read and a fresh fixture object fix them.
No scope, grant, store or native installation is created by these checks.

The private dependency view is a filesystem COW clone, with 13 first-party
links verified inside this worktree and 106 installed versions matching the
unchanged lock. No package was installed. The first audit tried an unnecessary
rewrite: the copied relative links already resolved correctly. The corrected
read-only audit accepts and verifies those targets. Only cloned caches were
removed; the frozen developer view stayed untouched.

## Private content checkpoint

`packages/scope/src/applications/content.ts` holds admitted canonical package
bytes in private R2, keyed by exact release id. It exposes no public route,
listing, delete or arbitrary-key method. Trust, signature and native host
checks precede any write. A conditional create refuses replacement; both a
successful write and a competing write require exact checked readback.
A lost successful write reply stays unknown; a later get or retry finds the
same bytes without another write. Corrupt stored bytes refuse without repair.
Metadata and streamed payload allowances precede package parsing.

Four focused cases pass (`6eb8e9` / session `99813` to `11236e`, exit 0),
with an actual local R2 binding for create races, independent-store readback,
unknown-reply recovery, corruption and refusal without a grant. The race
schedules two actual misses before conditional puts; exactly one write wins.
A separate labelled metadata/body stand-in proves an oversized body is
cancelled before reading. No provider bucket is used. Scope source/test
typechecks pass; the only new binding so far is in the test configuration.

R2 replaces the initial SQLite store direction because the package's 16 MiB
wire allowance exceeds the [documented 2 MB SQL row limit](https://developers.cloudflare.com/durable-objects/platform/limits/).
[The R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
supports conditional puts and returns null on a failed condition. This
implementation choice does not change native scope persistence. A production
private bucket/binding and generic route remain part of the reviewed install
head before planner provisioning/deployment.

## Resolution orchestration checkpoint

`applications/resolve.ts` parses the immutable address, refuses an unlisted
release before opening a transport, walks the exact Git blob, checks the
signed release/native support, closes the source and then stores admitted
bytes. A cached package never substitutes for resolving the requested URI.
The transport receives the exact parsed format, commit and path. There is
no branch/tag fallback. Transport and close failures are reported without
raw transport details.

Both focused cases pass (`4ac325` / session `44207` to `b5d242`, exit 0),
with real signatures/native validation and local R2. Git objects and their
transport are explicitly in memory; the real Git-object-store witnesses
remain separate. The cases distinguish a changed URI despite an existing
cache entry, wrong file bytes, no network for unlisted/malformed requests,
source closing and no store write on failure. This adds no actual host Git
transport or claim about either format's network support.

Scope now declares its existing client workspace dependency at runtime,
where host admission/resolution uses it. The lock changes only that one
workspace record; no package key, version, resolution or integrity changes.
All 13 local workspace links and 106 installed versions match. Audit
`/tmp/artroom-m1-install-client-runtime-dependency-20261018.json` precedes
refreshing this private view's ignored lock stamp. The lock SHA-256 is
`bf2d909d256e00845edf6fdaad6eb67a5f54305aac42bb8baa9c927567f23295`.
No package was installed and the developer view remains unchanged.

## Native proof preparation

The client now exports `readApplicationReleaseProof`: a semantic body and
signed release can be checked without carrying screen assets into a native
journal. It reuses the package's existing semantic, closure, release, signature
and byte-bound rules. The returned ids match the complete package; the copied
proof is frozen. This checks no omitted presentation bytes, operator trust
or native host admission. A full host package still passes the complete codec
and host checks above. No package format or identity domain changes.

The selected new codec witness passes (`846eff`, exit 0), with exact signed
binding, altered semantics/signature/expected id, caller input ownership,
pre-serialization limits and getter refusal. Client source/test typechecks
pass. It prepares the native install rule; no native operation, grant or scope
is created yet.

## Confirmed host fetch boundary

Planner report `0d973184`, read in full and ratified, resolves request
`9640b02a`. The host itself resolves the URI over smart HTTP. A CLI upload
cannot substitute for the URI-to-commit binding. The host fetches only the
bounded exact objects needed for the regular file and checks the expected
release and operator-listed publisher before admission.

The URI grammar retains both 40- and 64-hex commits. M1's host explicitly
refuses SHA-256 as `unsupported-object-format` before any network call, with
no retry in another format or downgrade. Native rules must record the refusal
against the original install act and URI; that native wiring remains due.
The Node CLI may support both formats for local checking. Local acceptance
of SHA-256 is not host admission. Host SHA-256 smart-HTTP support is a separate
later slice, outside M1 and plan 033.

The host resolution helper enforces that refusal before opening a source or
accessing storage. The updated three-case witness passes (`da0134` / session
`77460` to `f89f51`, exit 0). It preserves SHA-1 exact/cache refusal checks
and proves no source opens or bytes are stored for a valid SHA-256 address.

## Isolated smart-HTTP checkpoint

`applications/http-source.ts` uses the reviewed `SmartHttpSource` in explicit
one-object mode. Each object has a fresh isolated source, so previous objects
do not build an additional transport cache. Requests use shallow/filter and
only exact wants; a peer that lacks those capabilities refuses. There is no
full-closure fallback, subprocess, redirect following or credential supply.
One ten-second deadline covers the source's complete object walk.

This host now has an explicit 4 MiB packet allowance, below the portable
codec's 16 MiB ceiling. The current maintained Counter/Lending packets fit.
The same limit precedes Git blob reading, package parsing and stored-body
reading. Per-object wire overhead is 64 KiB; the transport's existing
conservative payload allowance is 80 MiB. These are stated caller allowances,
not an adopted scope quota or measured total heap. Commit, tree, total-tree
and path limits remain the reader's earlier bounds. Private R2 still avoids
splitting a packet into SQL rows.

The affected four files pass 11 focused cases (`20c47b` / session `81346`
to `8d8142`, exit 0), covering host bounds, admission, immutable local R2,
resolution and smart-HTTP. The HTTP peer is explicitly scripted and emits
real Git packs with the portable writer; this is not a remote-repository or
provider witness. It observes exactly four isolated object requests, explicit
shallow/filter, no credentials and no closure fallback. Unsupported isolated
capabilities and redirects refuse before storage. Scope source/test checks
pass. Four content-type warnings from the fixture's `.text()` call are
retained in that run. Explicit UTF-8 decoding of its binary request body
preserves both owning tests with no warnings (`e81957` / session `82848`
to `644029`, exit 0); no warning filter was added.

## Remaining implementation

The host needs a private content store keyed by content id and a route bound
to room, installation and exact presentation. The private R2 store above is separate from application scope state.
Only admitted immutable bytes enter it. The production binding and route
remain part of the reviewed install head, before planner deployment.

A new immutable rules version must record one admin-signed install and its
selected default roles. Existing generic native operations and checked
messages can record host admission and each activation/grant/create step.
The host's trust decision must be retained as native evidence; a rule cannot
read an unrecorded current environment setting. Package metadata, native
definition extents and the original install intent must remain bound to
that exact release. Existing grants remain, and each selected addition is
confirmed. Unknown replies resume the original step; no second signature or
cross-scope transaction is invented. Pending, active and refused remain
visible. This is a design direction, not an implemented native operation.

Fresh ordinary room creation, generic room/browser binding, native install,
MCP use and route opening after activation remain owed. The final head removes
active Counter/Lending routes, embedded assets and application-specific
cohort selection while preserving historical catalog pins and replay.
The public command sketch is updated only when that implementation lands.

No final install gate, Source review, room installation, arbitrary-package
isolation, upgrade, npm publication, provider/archive/device acceptance or
deployment is claimed. Planner owns publication and the host deployment
under Hugh's existing authorization.


## Public transport and native admission record

Two unauthenticated public GitHub probes completed without remote mutation.
The first read the repository advertisement and confirmed shallow/filter and
reachable SHA-1 support within the transport limits. The second used this
candidate's Web transport from Node to read the exact 632-byte blob at
`9c32a3843feb68af4119c34c2afbf10c06222ee9`,
`examples/grow/check/dap.application.json`. Six independently isolated object
reads made twelve successful HTTP requests. Its SHA-256 was
`9d204bdade6a0935537e06b73af34ed6ea076e07afe20040b34557bb1162ae78`,
matching the local Git blob. This proves the public object walk, not package
admission, a deployed Worker, or a completed native installation. Logs and
JSON results are `/tmp/artroom-m1-github-capabilities-20261018.*` and
`/tmp/artroom-m1-github-object-walk-20261018.*`. The object walk's original
session `61493` closed with exit 0; the Node deprecation warning remains in
its log.

Draft `platform:rules@5` records one signed install with its original URI,
exact signed release/semantic proof, selected roles and genesis values. Its
pure guard also validates and retains the actual native definition values.
A bounded read outcome records refusal or advances the pending phase to
activation. Unknown or mismatched answers cannot advance it. No fresh room
factory selects this version yet; activation, grant delivery, child creation
and real runtime recovery are still owed. Planner request `4077145f` asks
for the bounded resume policy after a definitive subordinate refusal.

The new client `./application` entry exposes portable package codecs without
browser-key imports. `Signer` moved to a type-only module and stays exported
from its original entry. Platform's runtime client edge changes only its
existing workspace lock record. The private audit
`/tmp/artroom-m1-install-platform-runtime-dependency-20261018.json`
(SHA-256 `85cac4f4919484105cee39636900fecd3a7f9dfb5eefe039c3c474c74dba114d`)
verified 13 local workspace links and 106 installed versions, no changed
package keys, versions, resolutions or integrity data, and zero installs.
Its verified lock hash is
`3e016bd5adba8024b3ee5395bdb6cc152b58fdd32de03eea6bf13128cc6b263b`.

The native in-memory admission witness passes two cases (`5f7ffc`, exit 0),
using real judges and rules with labelled registrar/membership fixtures and
scripted host answers. It checks retained proof, missing authority/values,
altered proof, exact answer identities, bounded refusal and refold equality.
It does not show a retry driver or real membership grants. The existing
rules-scope witness passes with its unsupported-version sentinel moved to 6.
The affected client package/intent witnesses pass sixteen cases (`6bdd02`,
exit 0); Platform source/test and Client source typechecks pass. Initial test
runs caught a wrong fixture action and an incorrect owner-shape assertion;
the final expectations use the actual declared action and native owner pin.
This preparation has not run the full gate or requested Source review.


## Admission and activation continuation

A confirmed admission now opens one active root-definition record in the same
native outcome, using the original installer's member and the checked name
and digest. It reuses an already active root and advances to the grant phase.
The original install has already retained the root and complete closure.
No extra member act or activation of each child is invented. The strengthened
native witness passes (`39d575`, two cases), including a second install with
no selected default roles and reuse of the existing activation. Native empty
lists do not satisfy a required slot; making the fixed selection slot optional
allows the explicit empty selection to remain an empty list.

`packages/scope/src/applications/outside.ts` supplies the trusted admission
port for the new rules owner and exact operation. Its initial send resolves
the original Git path, admits the package, stores it immutably, and returns
exact identities and a digest of the operator trust list. Unsupported formats
and permanent admission errors get bounded refusal codes. Transient failures
return no answer and remain pending. Raw error text never enters evidence.
Recovery rechecks Git provenance and reads existing admitted content, with
no put. Missing cache content stays pending; request `4077145f` still governs
the continuation needed if a process stopped before its first cache write.

Two direct-port cases pass in workerd (`cb259e` / session `18242` to
`cc3477`, exit 0), with real local R2, native in-memory admission and a labelled
Git object stand-in. A new port instance recovers exact content with a bucket
whose put throws; a cached release cannot stand in for an absent commit.
SHA-256 refuses before any network call; transient reads remain pending.
These direct calls do not prove the runtime's restart driver. Scope source
and test typechecks pass. The test-only HTTP peer's TextDecoder now explicitly
sets both narrow constructor options; this fixes its test typecheck without
changing transport behavior. No complete gate or Source review is claimed.


## Checked role delivery preparation

Draft opt-in cohort register12/directory11/membership7/rules5 adds a checked
Rules-to-Directory-to-Membership route. Default additions are a canonical,
bounded record of only the selected roles. Directory accepts only its
recorded full Rules reference and forwards to its recorded Membership.
It sends the actual Membership and destination references back as context.
Rules locks those references in its versioned guard after the first context;
they cannot be fixed schema slots because Native fixed slots are set only
in the entry that opens their item.

Membership unions the selected defaults with its current role lists. It
keeps all other actions and roles. A full list produces a recorded refused
answer without changing any list. Its native answer is bound to the original
job, release, semantics and additions. Rules waits if that answer arrives
before Directory's context, then accepts only the exact full Membership
reference. Refolding agrees for both scopes. The new cohort is registered
for explicit testing but no fresh host room setup selects it yet. Existing
cohorts and NEWEST retain their prior data.

Five focused Native in-memory cases pass (`8ae0b9`, exit 0), including the
real Register/Directory/sibling creation and confirmation judges, early
Membership answer, selected-role union and full-list refusal. Repository
creation and member authority are labelled fixtures; this is not a storage,
restart, live provider or full replay-verifier witness. Platform source and
test typechecks pass. Earlier runs exposed the outgoing request bound of
zero, a guaranteed-send declaration, and a fixed-slot update; the corrected
forms pass whole validation and the actual message chain.

Planner decision `716ace64` settles refused installs as final: unknown work
continues under the original signed act, but a definitive refusal does not
retry. Changed conditions require a new ordinary admin act. The draft now
marks refused final. Follow-up `00f747ea` asks to reconcile zero effects on
all refusals with non-atomic later steps, and the crash-before-first-cache-
write continuation; neither behavior is silently invented.

Child creation remains unfinished. The real Core bounds values beside an
act by its declared value places; the direct in-memory judge is more general.
The current original proof reads additional definition values without giving
each a place, so it must be corrected before any real-runtime acceptance
claim. The planned native handoff uses existing detached text inputs, at
most 17 definitions of at most 64 KiB each, verified against the signed
semantic proof. Directory must retain those exact bytes before it creates
an ordinary child. No native judge or replay primitive is to change. This
is an implementation plan, not a completed custody witness. All current
preparation remains unsubmitted, with no full gate or Source review.

The developer publication is confirmed by planner report `864b5ae2`, read
and ratified (`edd4a509`). Main `bfa02edd` and workroom `4077145f` were pushed
and verified equal to their remote refs. G0's parent now closes by planner
supersession `57185c8a` without a duplicate landing; M1 stays open until its
install child has landed and been audited. Queued M2a request `b6aaa3ce`
waits for the M1 install delivery.


## Native custody and real restart witness

The planned custody correction is now implemented. The signed install names
up to 17 ordinary detached declaration texts. The proof guard checks each
text digest against the canonical bytes in the signed semantic body, rejects
extra texts, and validates every definition whole. The only JSON value places
are the signed semantic and release values, so Core's input bound now matches
the real submission. Native text retention carries the declarations from
Rules to Directory before the grant request can leave Rules.

The host profile permits at most 64 KiB per declaration and 256 KiB for the
semantic proof, alongside the existing 4 MiB complete packet allowance. These
are host admission limits, below the portable codec's limits. Directory
retains a bounded catalog of sixteen roots, each with at most seventeen exact
digest/text bindings. A pure locator exists only on rules5 and directory11.
The scope's declaration reader checks the retained text and definition hashes
and canonical bytes before returning it. Historical direct-definition reads
keep their existing path. There is no remote or content-cache fallback in
that reader and no change to a native judge or replay primitive.

The native sequence is now admission, activation and checked declaration
staging, Directory context, then the selected role additions. This makes
context precede the grant request. The prior artificial early-reply fixture
is replaced with the reachable ordered sequence. Original user genesis
fields are validated before any grant. The signer is injected as opener;
Directory will inject its actual destination later. No placeholder scope
reference is treated as authority. The checked genesis fields remain in the
native install record. Missing or malformed required genesis values refuse.

The real workerd witness passes, first at `d6efeb` / session `55462` to
`8472b9`, then with the paired altered-text control at `081015` / session
`88761` to `b85f1a` (five cases over three changed files), and after genesis
validation at `66a81d` / session `90689` to `f146f8` (three cases over two
changed files). It creates actual register12/directory11/membership7/rules5
scopes, seats the real admin, submits one signed install with two value
places and detached texts, loses the successful admission answer, evicts
Rules, and recovers the already marked attempt without a second send.
The altered text is refused before any host/Git call. A first fixture run
used an obsolete member revision; reading the actual expected revisions
corrects setup without weakening the native revision checks.

After recovery, the witness removes its private packet fixture, releases the
native stage delivery and checks that Directory serves the exact declaration
from retained native text even after Directory eviction. The real Membership
adds the selected member action, and Rules reaches creation with exactly one
install act and one admission outcome. Repository creation, Git objects,
clock and the read-session inspector remain explicit fixtures. This stops
before child creation and is not a complete-install or full replay-verifier
claim. Five strengthened in-memory native cases pass (`f546cf`); Platform
and Scope source/test typechecks pass. No full gate or Source review yet.
