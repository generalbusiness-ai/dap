# S2b: foreign archive inputs

Request `c8c6ff6b6277fd103c30f80d0b76fd40a60ca8bb`, promise
`ea3d761900e434f096adbb83e46ff1af3a86fe1f`. Development below is based on
reviewed Main `3ed2a08a50f31e84ea42b4f6027684e14a8cedb8`. It adds explicit
fixture source metadata, separate policy checks, direct-copy inventory,
immutable rebuilds and structural archive readback. No whole gate, review
or landing is claimed. Final installed-application integration on the
required reviewed Main remains pending.
Actual reviewed G5a and S2a landings must be incorporated before final
S2b integration. Neither unreviewed branch is imported here.

The adopted S2 split `75060e2d` gives S2a the room binding and manifest
requirement. S2b owes foreign-source privacy metadata, the reviewed policy
configuration path, and export of an installed application's scopes,
including genesis position zero when binding happens later. The A2/A3
fixture boundary remains. A0b production admission and consent are separate.

## Initial refusal boundaries

Before this slice, copied entries refused at several interfaces. The table
records that starting point. Removing `uses != 0` alone cannot deliver it.

| Interface | Current boundary |
|---|---|
| [Privacy metadata](../../packages/scope/src/archive-privacy.ts) | The selected local prefix is classified without returning entry or retained payload bodies. Any foreign use refuses `unsupported-foreign-copy`. Operation owners, record kinds, preparation steps and custom domains are checked against finite support metadata. |
| [Inventory](../../packages/scope/src/archive-inventory.ts) | Every local inline class needs explicit reviewed coverage before body planning. Delivery planning that needs an exact `under` selection refuses. Definition closures are classified before selecting rule, snapshot or value payloads. |
| [Retained reader](../../packages/scope/src/archive-retained.ts) | Entry copies refuse before retained-body fetch. Other admitted kinds retain canonical, domain, digest, size and budget checks. |
| [Immutable input selection](../../packages/scope/src/archive-input.ts) | An entry-copy key is rejected at construction. Restart reads only the marked selection; it does not select against current retention. |
| [Git selection](../../packages/git/src/journal-selection.ts) | The path/wire grammar can name an entry copy, but current native selection refuses it. Parsing a parent key grants no export permission. |
| [Git layout](../../packages/git/src/journal-layout.ts) | Selected entry copies refuse before input reads. Other selected inputs undergo exact bytes and canonical digest checks. |

The existing journal reader already parses and hashes entry-copy files.
That format support is separate from native selection or privacy admission.
The journal manifest and retained paths therefore need examination before
choosing any new format; a format change is not assumed.

## Adopted identity and policy boundary

`core.used` retains each selected foreign entry's canonical bytes and its
producer name. `retained_input.under` is that name, not an exact definition
digest, native birth proof or permission to export. Receiver aliases are
transient; `receiver-facts.ts` preserves the original producer name. This
is useful handler metadata and cannot be promoted into stronger provenance.

A non-genesis foreign entry does not carry its producer's seed. The
implementation must obtain exact producer scope/incarnation and pin
metadata through an explicit trusted configuration or verified native birth
path before choosing its reviewed policy. Missing or conflicting provenance
must refuse. A declaration digest in an allowlist, an `under` string, or a
caller-supplied owner table alone is insufficient coverage of inline signed
fields, founding claims, outcome evidence and custom domains.

The existing inventory is one synchronous, caller-owned transaction frame.
Any asynchronous native birth work belongs before that frame, with bounded
owned metadata and explicit provenance; it cannot become an unbounded read
inside selection. The final choice must preserve scope/incarnation binding
and the existing final pin/cutoff fence. No new policy certificate, request
parameter, public read bypass or production credential is proposed here.

Planner report `b5584b262c2a9eb2fed7cb79c81758f143d4c24a`, adopted as
`e63673f7b5a0e2739120a4b3deb549ed34056923`, answers decision request
`992b2b650b1f929274a50bc080874a0070513ddb`. The fixture configuration
route is approved with these fixed points:

1. Read the producer's exact ScopeRef from the retained copy's own canonical
   entry header through bounded metadata. A producer name, alias, digest
   allowlist, fixture tag or owner table supplies neither identity nor
   privacy coverage.
2. Supply an immutable, bounded ScopeRef-to-pin/declaration map through an
   explicitly fixture-named configuration port before the synchronous
   inventory frame opens. The fixture builds it from actual installed-graph
   native births at genesis 0 read through the existing reader. Record the
   bound and provenance at the call site. Persisting provenance at retention
   time is outside S2b; it remains an A0b open question.
3. Keep reviewed policy separate, keyed by pin and covering every inline
   class, owner, record, preparation step and custom domain. Join every
   direct copy header to its pin and classify every selected local and
   foreign class before fetching any copied, value, rule or snapshot body.
   Missing identity, map entry or policy, or a conflict with a retained
   genesis seed or retained declaration digest, refuses the whole prefix
   with a named reason. Later body selection verifies canonical bytes, raw
   content digest and the consumer's exact FactRef.
4. Mark each foreign source's full ScopeRef and classified pin in the
   immutable selection. Restart/rebuild checks the same pair and refuses a
   changed configuration. Name that ScopeRef/pin policy basis in the archive
   pass manifest. Keep the same pass budgets, one synchronous inventory
   transaction and final scope/pin/cutoff fences. No foreign copy recursively
   brings in its producer's other history.
5. Actual native birth/setup are trusted fixture preparation under A2/A3,
   not a public RPC, request-supplied policy, production certificate or
   consent. Integrated export includes an installed application's late-bound
   genesis 0 and structural readback through the existing reader. It proves
   neither production admission nor complete offline foreign-history
   verification. Incorporate actual reviewed G5a and S2a Main before the
   final integration gate, and name that Main in the final note.

The later G5 request `78fba9fc` puts the hosted demo ahead of S2b runtime,
while S2a continues. This note records the adopted decision now; runtime
work has not started and no pending approval is inferred from that priority.

### A0b open question

Whether production retention should persist independently verified exact
source-pin provenance is a store/runtime and admission question for A0b.
The fixture map is not a production provenance certificate or consent.

## Verification plan

Strengthen existing boundary witnesses where they expose the invariant:

- An uncovered or unsupported foreign source in the last selected local
  position refuses the whole prefix before any selected payload-body read.
  Named unknown owners, capabilities, steps, custom domains and inline
  classes remain refusals. Cover missing and mismatched producer provenance.
- An explicitly covered source selects only the exact locally retained
  copy named by the consumer. Validate its native entry shape, canonical
  bytes, raw content digest and full fact binding; an alias cannot substitute
  for any of these checks. Separate privacy classification from integrity,
  authority and replay conclusions.
- Every new metadata query, cache hit, definition closure and input read
  spends the same finite pass budget. Overflow, timeout and incomplete
  retention publish no partial selection. Detached texts keep their existing
  omission rule; no recursive foreign-history traversal is implied.
- After Mark, eviction/restart rebuilds the same commit from the same
  immutable selection. New retention or a changed head cannot enlarge it.
  Tampered or missing selected copies refuse rather than replan.
- Use actual native install, Membership, Directory and application journals
  for the integrated export witness. Bind after application genesis, export
  from position zero, and inspect the resulting archive with the existing
  reader. Label TEST Git, host, read and policy/provider ports. Export and
  structural readback do not establish production permission or a complete
  offline foreign-history verification result.

No new tests have been added or run for this preparation. Final witnesses
must state their actual boundaries; one owning gate and exact-head review
remain required before landing.


## Private dependency preparation

An idle S2a dependency view was copied with APFS `cp -cR` into this
checkout, retaining independent regular-file inodes and only internal
relative links. No install ran and no manifest or lock changed. The
copy audit covers 127 package.json files, including embedded subpackage
metadata; 106 installed package versions match the lock. All missing
lock entries are optional and also absent from the donor. This is no
claim about every optional absence's cause or tarball integrity.

Audit `/tmp/artroom-s2b-dependency-view-20261019.json`, SHA-256
`787158d16647b8e8543229187c528f65ee8778838dced971a8009a19a4110a1b`.
The locked-version and cache-cleanup receipt is
`/tmp/artroom-s2b-dependency-versions-20261019.json`, SHA-256
`1a45cd4019dda8b48bc6311e798b8a67ea97ef7f53928b224698039ec1d2b5de`.
Six copied Vite cache directories were cleared before any execution.
Lock and retained install stamp both equal
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
The receipt retains two stopped validation attempts: the first tried an
absent optional package; the second assumed every optional absence had
platform metadata. The corrected audit records those absences explicitly.
No test, build or dependency process ran during copying or cleanup. No
S2b tests or runtime implementation have run yet.


## Initial fixture source-identity implementation

While G5 awaits actual reviewed G5a for its installed integration, the new
archive-source-pins.ts prepares the adopted immutable fixture map. It takes
bounded actual genesis 0 bytes/hash and exact declaration bytes from the
fixture's existing native reader. It checks canonical entry bytes, seal
hash, full scope/incarnation/kind, matching genesis incarnation, and the
seed-derived scope ID. Digest pins require the exact declaration; native
platform pins use finite registry data and their declared outcome domains.
It owns frozen metadata and exposes no birth payload. A later get uses the
full ScopeRef only and charges the pass even on a repeated lookup. The map
itself grants no reviewed privacy coverage, production provenance or consent.
It has not been wired into inventory, export, a driver or a public route.

The focused case uses actual native creation/SQLite and an existing genesis
read under TEST authority, clock and reader. It checks the owned map,
unknown source, declaration/identity conflicts, repeated lookup cost, map
count/lookup bounds and malformed input. Tampered configuration bytes are
never inserted into the native journal. One allowed original process 33705
ended 0: one file/one case, 34 ms tests, 4.06 s overall. The earlier sandbox run
stopped at loopback EPERM before tests. Logs:
`/tmp/artroom-s2b-source-pins-first-owning-20261019.log` and
`/tmp/artroom-s2b-source-pins-allowed-owning-20261019.log`.

A one-line seed-to-scope check bypass gives one pass to one unchanged
boolean assertion failure, followed by exact source restoration; original
process 51232 ends 0. The control log is
`/tmp/artroom-s2b-source-seed-control-20261019.log`.
A later extension adds named malformed-object/JSON refusals: one case
passes, 32 ms tests/2.60 s overall, original 88646 ends 0 in
`/tmp/artroom-s2b-source-pins-shape-owning-20261019.log`. Its compiler caught
an index-signature narrowing in the inline shape check; an equivalent typed
shape predicate fixes that. The corrected source/test compiler exits 0 in
`/tmp/artroom-s2b-source-pins-shape-corrected-types-20261019.log`.
The earlier compiler failure is retained. No whole gate or installed Grow
export is claimed. Current reviewed Main 715e97f0 adds the planner's sprint
report only; actual reviewed G5a/S2a Main incorporation remains required
before final integration. Earlier preparation-only statements above are
historical to this initial implementation checkpoint.

## Shared and foreign metadata classification

The local header/owner/record/step classifier is now shared in
archive-entry-metadata.ts. archive-privacy.ts retains the exact default
foreign-copy refusal when no fixture foreign classifier is supplied. The
existing inventory/export driver still takes that default path. This stage
has not enabled payload selection or export.

archive-foreign.ts classifies only direct copied entries. It joins each
selected local use to the retained copy's own full header, then to the
immutable fixture pin map and a separate exact-pin reviewed policy. It
checks inline class coverage, native support metadata, owner/step/record
coverage and domains, and refuses legacy membership pins. A retained
genesis copy must match the mapped genesis fact and seed pin/incarnation/
kind. Source names and receiver aliases choose neither identity nor policy.
The metadata descriptors name the exact fact/content/byte size and source
pin; they fetch no nested foreign history. Copied JSON work reserves the
same 64 full-entry equivalents before inspection; caches and metadata
lookups spend the original pass allowance. New named source failures are
foreign-source-unavailable and foreign-source-mismatch.

After the first shared extraction, the compiler caught a moved domain set;
restored it before the owning run. Three native files/15 cases pass,
original 95861 exit 0, 309 ms tests/2.95 s overall:
`/tmp/artroom-s2b-shared-metadata-owning-20261019.log`. Corrected compiler is
`...shared-metadata-corrected-types...log`.

The new two-case foreign witness initially used the simple TestScope
fixture, whose resolver is deliberately scripted and has no peer value:
both foreign acts correctly returned dependency-unavailable. No metadata
assertion ran, and that first failure is retained in
`/tmp/artroom-s2b-foreign-metadata-first-owning-20261019.log`. The corrected
fixture selects the real namespace resolver for actual peer source reads;
no foreign entry is invented. Genuine native assignment and genesis copies
are retained through accepted acts. Their own producer name is deliberately
the same as the receiver's, with a different exact pin. A body-read tripwire
checks successful metadata admission, missing source/policy/class coverage
and a conflicting retained genesis pin. The corruption case changes only
the retained copy, never either native journal.

Both cases pass, original 78947 exit 0, 120 ms tests/2.69 s overall, in
`/tmp/artroom-s2b-foreign-namespace-owning-20261019.log`. Final source/test
compiler passes in `...foreign-namespace-types...log`. The initial compiler
also caught one unused type import before that witness ran. Scope/pin
metadata and trusted fixture policy are still distinct from archive payload
integrity, production permission and offline foreign-history verification.
At that checkpoint inventory/body selection and immutable rebuild were
still pending. The following checkpoint adds them. The actual installed
application export still awaits reviewed G5a/S2a Main incorporation.

## Direct-copy inventory, immutable rebuild and structural readback

The optional `fixtureSources` configuration reaches inventory, planning,
rebuild and the fixture driver. Without it the default privacy pass still
refuses foreign uses. Every selected local and foreign inline class must
pass metadata checks before any local entry or copied/rule/snapshot/value
body read. The retained reader then verifies the copy's canonical bytes,
raw digest, size, full producer ScopeRef, sequence and consumer FactRef.
It checks a genesis copy against the configured pin. No copied entry's own
dependencies are selected recursively.

The immutable selection records `foreign: { fact, pin }` on each copied
entry and a sorted, unique `foreignSources: [{ at, pin }]` basis. Rebuild
joins every stored pair to the immutable fixture map before any SQL input
read. Missing configuration returns `foreign-source-unavailable`; a
different marked pair returns `foreign-source-mismatch`. This named rebuild
refusal prevents the driver from reducing it to a generic retry. Reads
after construction remain restricted to the marked positions and keys.

The existing inventory/v1 manifest grammar now has an explicit optional,
nonempty `foreignSources` extension. Local-only descriptions and manifests
omit it. The new `foreign-use` selection consumer admits only entry-copy
keys with exact source metadata. Layout binds every copy consumer to an
actual direct use in its selected native entry, verifies copied bodies and
preserves the appropriate source basis when checking an earlier parent.
The cumulative manifest carries ScopeRef/pin pairs; private consumer facts,
work counters and policy review strings remain in selection/configuration.
This vocabulary/schema extension needs review with S2b. It supplies no new
certificate or permission.

The existing structural reader returns the descriptive source basis. For
extended manifests it checks every direct use against the copied body,
rejects missing/orphan source metadata and checks a copied genesis's own
pin. Legacy manifests retain their existing read grammar. The replay
archive data interface can carry the same descriptive basis; no replay
judge, trust rule or foreign-history traversal changed.

The native witness uses real assignment and genesis copies from the earlier
fixture. It proves final-class policy refusal before any entry body,
successful direct-copy selection, post-admission body tampering refusal,
later-act/restart reads and missing/mismatched source configuration. In
both SHA-1 and SHA-256 it persists a real native Mark, appends another act,
evicts/restarts, reconstructs identical objects and reads the original
cutoff through the existing structural reader. A changed consumer fact
refuses before any retained body read. A mechanically altered manifest
with freshly valid Git objects but a false source pin refuses at its real
retained genesis. The graph is two native test scopes, not an installed
application; grants, policy and map setup are explicit TEST fixtures.
There is no provider send, production admission or complete offline replay
claim.

Checks, with every original process terminal before subsequent edits:

- Native inventory/retained regression: original 69277 exit 0, three files,
  18 cases, 3.07 s, `...foreign-inventory-owning...log`.
- Native immutable-input regression: original 74099 exit 0, two files,
  five cases, 2.77 s, `...foreign-input-owning...log`.
- Native build/driver and Git layout/reader: original 17501 exit 0, five
  files, 35 cases, 11.04 s, `...foreign-build-owning...log`.
- Named rebuild refusal: original 61254 exit 0, five cases, 2.89 s,
  `...foreign-rebuild-refusal-owning...log`.
- Independent pin-corruption readback: original 92864 exit 0, two cases,
  2.78 s, `...foreign-reader-pin-owning...log`.
- One targeted control: original 41787 exit 0, one unchanged case passed;
  disabling only foreign inline-class coverage made its final-genesis
  refusal assertion fail. The helper restored the exact source. Full log:
  `/tmp/artroom-s2b-foreign-final-class-control-20261019.log`.

Logs above have prefix `/tmp/artroom-s2b-` and suffix `-20261019.log`.
Source/test compilers pass for Scope, Git and Replay. The first driver
compiler rejected an explicitly undefined optional configuration property;
the corrected call omits that property when absent. Final compiler logs
include `...foreign-reader-pin-types...log`, `...foreign-git-test-types...log`
and `...foreign-replay-types...log`. No package or lockfile changed. These
focused checks are not a combined gate or installed-application acceptance.

The actual native alarm also preserves a named stop when the graph map is
removed after Mark and eviction. Its first pass persists the real Mark;
an explicit TEST provider returns no credential. After restart with the
same reviewed policy but no source map, the alarm records
`foreign-source-unavailable`, preserves the pending Mark, clears its wake,
and makes no second mint or send. The native head is unchanged. Original
28927 exits 0: one case, 102 ms tests/2.72 s overall, in
`/tmp/artroom-s2b-foreign-alarm-owning-20261019.log`; its source/test compiler
passes in `...foreign-alarm-types...log`. This is a real alarm/storage
witness with a scripted host, not evidence of a provider adapter or token.

## Installed native fixture preparation

`archive-installed.test.ts` installs the existing signed TEST root/child
package through the real MCP installer, native Rules/Directory/Membership,
create/confirm dispatch and SQLite. Its root genuinely creates its child
from the declared genesis form; neither birth, identity, source nor grant
is handmade. The package peer, clock, scheduler and archive review policy
remain explicit fixtures. The native membership issues the read session.
That session reads each installed journal and every source birth at zero
through the existing HTTP reader before inventory opens. The source map
owns at most `ARCHIVE_SOURCE_PINS` (64) unique full references, built only
from the actually used graph sources. Policy remains a separate exact-pin
table over validated declarations and finite actual native owner rules.

Both root and child perform later native `bump` acts before archive
configuration is supplied. Planning includes their original genesis zero
and all entries through the issued-session cutoff. The existing structural
reader opens the resulting SHA-1 object sets, returns the source basis and
matches every entry byte against the native session read. This is late
fixture configuration, with no provider or deployment. It does not replace
the actual S2a directory binding, the G5 Grow graph or final integration on
reviewed G5a/S2a Main. All existing pin refusals, including the exact
membership cohort restriction, remain unchanged.

The first compiler caught a millisecond clock passed where Mark needs a
timestamp; `timeOf` supplies the existing representation. The first native
run, original 26238 exit 1, stopped at the later `bump`: the root's child
confirmation had already advanced its item revision. The corrected fixture
reads that actual revision instead of assuming one. No archive assertion
ran in that failed setup; its log is
`/tmp/artroom-s2b-installed-first-owning-20261019.log`.
The corrected native run, original 26093 exit 0, passes one case in 423 ms
tests/3.08 s overall (`...installed-native-revision-owning...log`). Adding
complete issued-history and structural-readback checks passes, original
51627 exit 0, one case in 443 ms/3.10 s
(`/tmp/artroom-s2b-installed-readback-owning-20261019.log`). Source/test
compiler passes in `...installed-readback-types...log`. The case's explicit
30 s functional allowance bounds its native installation and reads; no
existing timeout was changed and no speed/stability claim follows.

The direct-copy witness also extends an existing archive after a later
native act introduces a second real producer. A new immutable source map
preserves the old source's pair and adds the new birth. In both Git formats
the cumulative archive names two sources while parent validation retains
the parent's original single-source basis. Manual component confirmation
stands in for host custody and writes no journal entry. Original 73312
exit 0, two cases, 259 ms tests/2.87 s overall, in
`/tmp/artroom-s2b-foreign-parent-basis-owning-20261019.log`; source/test
compiler passes in `...foreign-parent-basis-types...log`.
