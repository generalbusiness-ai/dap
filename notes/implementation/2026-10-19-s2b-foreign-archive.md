# S2b: foreign archive inputs — preparation

Request `c8c6ff6b6277fd103c30f80d0b76fd40a60ca8bb`, promise
`ea3d761900e434f096adbb83e46ff1af3a86fe1f`. This is preparation against
reviewed Main `3ed2a08a50f31e84ea42b4f6027684e14a8cedb8`. There is no
S2b implementation, dependency view, test run, gate, review or landing.
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

## Identity and policy questions to settle in implementation

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
