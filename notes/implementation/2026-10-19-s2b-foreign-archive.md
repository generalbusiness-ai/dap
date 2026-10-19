# S2b: foreign archive inputs — preparation

Request `c8c6ff6b6277fd103c30f80d0b76fd40a60ca8bb`, promise
`ea3d761900e434f096adbb83e46ff1af3a86fe1f`. This is preparation against
reviewed Main `3ed2a08a50f31e84ea42b4f6027684e14a8cedb8`. There is no
S2b inventory/admission/selection change, gate, review or landing. The initial
fixture source-identity helper and focused checks are recorded below, along
with the private dependency preparation.
Actual reviewed G5a and S2a landings must be incorporated before final
S2b integration. Neither unreviewed branch is imported here.

The adopted S2 split `75060e2d` gives S2a the room binding and manifest
requirement. S2b owes foreign-source privacy metadata, the reviewed policy
configuration path, and export of an installed application's scopes,
including genesis position zero when binding happens later. The A2/A3
fixture boundary remains. A0b production admission and consent are separate.

## Current refusal boundaries

The current implementation refuses copied entries at several interfaces.
Removing the `uses != 0` check alone cannot deliver this slice.

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
Inventory/body selection, immutable Mark/manifest/restart binding and the
actual installed application export remain to implement and prove after
actual reviewed G5a/S2a Main incorporation. No whole gate or review claim.
