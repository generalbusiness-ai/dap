# Copy one archive entry across bounded passes

This is ARC-1's design under ruling 80026b71, after accepted measurement
a737a945. It proposes no kernel or cap change. Source inspection uses
main `372a52f9`; the archive files cited below equal `4cef11d2`, the
measurement's base. This branch changes this document only. Build waits
AE-1 (0c265d01), its driver move, and the decisions below. No compiler,
test, build or gate ran for this note.

The measurement admitted 128 maximum-size copies from one source, then
returned `retry` / `limit` at `scout-next`. Input work decided first, at
32 attempts, not the 512-attempt cap. The wide entry remained outside the
confirmed receipt. It establishes the need for stages, not their safety
or a finite-pass proof.

## 1. A position records progress

One scope has at most one active entry. A versioned progress record holds
only its full scope reference, entry position, entry hash, trusted
binding generation, phase and ordinal within that phase. It holds no copied body, declaration, token,
secret, retained-value cache or array of object descriptors. All payloads
stay in the scope's existing retained rows. A cursor is bookkeeping; it
grants neither source identity nor permission to export.

The ordinal selects a deterministic member of the exact entry's uses,
births, declaration dependencies or retained plan. The driver rechecks
the local position and hash before each stage and before committing its
next cursor. A different hash, scope, unsupported record version or
changed provider/policy binding discards that cursor and starts from the
confirmed prefix. An appended local head does not change the active
entry. The AE-1-owned trusted binding must supply that generation for its exact
policy and provider identity. This is a required contract, not an existing
field. A different generation invalidates earlier classification progress.

The phases are: prepare source identities and support; classify all local
and foreign metadata; copy admitted objects; assemble publication; confirm
read-back. Source/support preparation and classification may interleave as
metadata-only substeps; all must finish before the first payload upload. Each
phase has a monotonically increasing ordinal. A pass finishes one bounded
unit and commits its next position, rather than rebuilding the complete
entry on every pass. Source preparation, support validation and inventory
must resume too. Merely wrapping the present full inventory in a cursor
repeats the measured refusal.

## 2. Provider custody starts before coverage

Before the first provider payload, the driver must finish metadata
classification of **every** local and foreign inline class. This retains
`archive-inventory.ts:90-95`'s present boundary. A later unchecked class
must not turn an earlier upload into an accidental declassification.
Every payload stage then binds its retained bytes, digest, source identity
and reviewed policy to that completed classification.

Proposed provider contract: stage only those admitted archive objects,
under an exact repository/scope/entry-hash/stage binding. A bounded stage
write returns an object identity that the driver reads back before
advancing progress. The provider holds staged objects before the journal
entry becomes visible at its final archive ref. Normal readers of that
repository can read those objects if the provider exposes them, including
public readers of a public repository. The design claims no secrecy from
an unadvertised ref or an unknown object ID. Policy must permit that
visibility before upload; otherwise the provider needs an independently
reviewed private staging service.

An abandoned entry contributes no confirmed coverage. The driver drops
its cursor and releases the staging reference through the same bounded,
authorized provider owner. Uploaded bytes can remain with the provider
under its retention and garbage-collection policy. Ref removal cannot
promise erasure, revoke earlier reads or recover confidentiality. AE-1
must name the custody owner and bounded orphan cleanup before this
contract can support a production Security conclusion.

This is a proposed contract, not an existing capability.
`archive-host.ts:226-251` binds credentials to the exact repository,
scope and `journalRef(scope)`. `archive-send.ts:28-33` verifies an append
from its supplied objects. Neither port provides arbitrary stage refs,
persisted stage inventory or final assembly from provider-held objects.
Credentials stay ephemeral in the provider owner and never enter progress.

## 3. The largest stage needs a static proof

A stage comprises its fresh binding checks, exact read/validation work,
provider work if any, read-back and cursor transaction. Its cost vector
must fit **all six** unchanged `ARCHIVE_BOUNDS` dimensions, not just
attempts. No prior pass supplies uncharged read or validation credit.
Each completed phase may carry only its trusted, exact-bound cursor fact;
a body reread pays again.

The current cold source preparation alone charges
`128 * entryBytes + 96 * definitionBytes`
(`archive-source-pins.ts:53,83`). At both bounds of 262,144 that is
58,720,256 work units, before other work. Adding even the prefix's
`64 * entryBytes` reservation gives 75,497,472, above the unchanged
67,108,864 cap before metadata or host work. Thus source preparation and
the full prefix cannot form one claimed safe stage. Birth admission,
declaration admission and source association need separate bounded units.

The implementation needs a static test that enumerates each proposed
unit's **complete** forecast, adds its mandatory opening/closing work,
and compares each coordinate with the current limits. The test reads the
actual kernel bounds and original charge functions. A changed bound that
breaks any inequality must fail it. It must also include journal layout,
transfer and manifest-reader limits; a scalar work quote is insufficient.

That proof is not complete yet. No number from the one-source measurement
bounds final assembly or every retained payload. This note does not label
a stage safe merely because it has one object. AE-1's provider operations
and the publication shape in point 5 must exist as specified contracts
before their full cost vectors can be derived. There is no static test or
stage-fit evidence in this documents-only lane.

## 4. A finite count needs a finite dependency bound

Let `U = usesPerEntry`, `S <= U` be distinct later source sequences and
`K` bound additional retained/declaration dependency units for one entry.
Let `p_open`, `p_entry`, `p_source`, `p_copy`, `p_retained`, `p_page` and
`p_finish` be the statically proved maximum bounded units for each named
phase. A one-unit-per-successful-pass schedule has this proof target:

`N <= p_open + p_entry + (S + 1)*p_source + (U + S)*p_copy + K*p_retained + ceil(S/64)*p_page + p_finish`.

`U + S` includes each later use and each distinct sequence's genesis.
Duplicate payloads may reduce work but grant no proof credit. Each
successful pass advances the lexicographic phase/ordinal rank by at least
one. One restart inside a stage adds at most one repeated unit; a restart
between committed stages adds none. Arbitrarily many crashes, provider
outages or timeouts cannot have a finite bound on all attempted passes.
The formula concerns successful, bounded passes with readable admitted
inputs and an available conforming provider, not elapsed time.

This is an explicit proof target, **not a proved finite number**. `K` and
the phase constants need derivations over the permitted inputs. In
particular, ruling bb6cf92b establishes no constant size for one declared
rule row: whole subjects hold uncapped `attributed`. RB-1 (0ce66e16) owns
those ceilings. `archive-retained.ts:124,130-133` instead has a 1 MiB
serving limit. A formula using only `U` and `entryBytes` cannot bound all
kernel-admitted retained payloads. The planner must rule on this boundary
before ARC-1 promises that every admitted entry eventually archives.

## 5. 128 distinct sources need more than map batching

The step-3 witness must use 128 uses from **128 distinct sequences**,
each at the admitted body ceiling, and must count their real genesis
copies. The accepted one-source fixture remains the measurement control.
Each preparation/copy unit may hold the consumer and one foreign source,
so its resident map stays below `ARCHIVE_SOURCE_PINS = 64`. It must never
silently drop, alias or trust the other sources.

That alone does not solve publication:

- `archive-finish-cost.ts:56-58` rejects `scopeBase + copies > 64`.
- `journal-selection.ts:98-99` bounds a manifest's `foreignSources` by
  the same 64-node inventory ceiling.
- `archive-transfer-cost.ts:7,28` caps one transfer at 8 MiB; the 128
  maximum-size copies alone total 32 MiB.
- `archive-entry-metadata.ts:83-85` classifies at most 64 effects, while
  the kernel's `derivedEffects` bound is 256. A stage must page that
  owner walk too if the promise covers every admitted entry.

The proposed direction is bounded source/publication pages and provider
assembly from already checked objects, with one final entry publication.
Each page and transfer retains its present limit. The final reader must
verify all pages and their exact association before it reports the entry
complete. A new continuation/assembly contract changes the archive format
and its readers even though it changes no kernel record. It requires a
planner decision; this note does not reinterpret the current whole-
manifest limit as a per-page limit without that decision.

## 6. Restart does not turn an attempt into confirmation

After a committed stage, a restart reloads the exact-bound cursor and
checks any corresponding provider object before using that position. A
metadata-only stage has no provider object. It rereads authoritative scope rows as required; no in-memory
cache survives. A different target, policy, entry hash or unreadable stage
invalidates the claimed progress rather than making it evidence.

Within a stage, a crash can leave an object at the provider while the
cursor still points to that stage. Recovery queries that **same** bound
stage. If read-back proves its expected identity and the admission still
holds, recovery commits the next cursor. Otherwise it performs that stage
again through the provider's idempotent content/coordinate contract.
An unknown send outcome is never a confirmed cursor or receipt. The same
rule applies after final publication: exact final-ref and complete-proof
read-back precede receipt advancement. Provider side effects and cursor
writes are not one database transaction.

## 7. Floors read only confirmed coverage

`ArchiveRows.confirmed`, after complete publication and read-back, remains
the sole archive coverage for `offerFloor` and `judgeFloor`. Progress,
staged objects and an attempted final commit add no coverage. The cursor
authorizes no deletion, and a floor cannot remove the unconfirmed local
entry. Normal detached-text redaction still follows the archive omission
proof; this design claims no new retention pin. The regression must archive
the widest distinct-source entry within the proved bound, restart once between stages and then show that a
real floor can cross it using the resulting confirmed receipt. It must
also interrupt one stage and prove exact recovery without premature
coverage. No test or floor execution belongs to this design lane.

## Security conclusion and requested decisions

Source-only review found no safe cursor-only adaptation of the existing
provider and format. The proposed identity binding, complete metadata
classification before upload, ephemeral credential ownership, exact
read-back and confirmed-only floors preserve the required boundaries in
the design. They do not yet establish safe production staging or the
largest-stage/finite-pass proof. The existing Effects model covers
`Operations` dispatch and `markSent`; it proves no new archive staging
lifecycle. Checker review must assess that new boundary with its source
witnesses and an explicit Security conclusion after AE-1.

Builder requests two concrete rulings before filling the proof and before
source: (1) permit and name the owner of the bounded provider staging and
paged archive publication/reader contract described above, including
visibility and abandonment; (2) state whether the universal admitted-entry
claim waits for RB-1's retained-row bounds, or define its exact supported
cohort and require bounded streaming of larger retained rows within ARC-1.
Neither choice permits a kernel or cap change under this note. If either
needs one, builder stops for a further ruling. The stage proof and numeric
finite-pass guarantee remain open; AE-1 remains the build prerequisite.
