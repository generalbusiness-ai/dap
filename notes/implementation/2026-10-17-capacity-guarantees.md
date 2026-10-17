# Whole-scope capacity: implementation

Work in progress under request `b4062d8c`, promise `d3e026bd`, and full
capacity root `113a54bd`. This branch starts from Main `2637e6bb`, tree
`c7e7188b`. It is not ready for review or landing: configuration parsing, the shared Amount traversal and logical key reads
are present, but runtime admission and replay still use the old entry-only
check. No whole-scope capacity guarantee is established by this checkpoint.

## Adopted boundary

Planner report `63195bdd`, accepted by `cd5d2265`, answers the remaining
choices in preparation request `4dccae54`. A pinned definition opts in
with `capacity: {name: "whole-scope", version: 1}`. Omission keeps the
legacy definition's bytes and entry-only admission/replay. An unknown
name or version cannot silently select another rule.

The four new temporary deployment ceilings are 1,073,741,824 logical
bytes, 100,000 items, 200,000 records, and 10,000 pending requests. They
apply only to opted-in scopes. R4 still owes measured ceilings and physical
storage costs. The existing `scopeEntries` ceiling remains the fifth axis.

## Existing mechanisms to extend

The implementation uses `Amount` and the task traversal already in
`packages/derive/src/reserve.ts`. `pendingWorkAmounts`, the holder
amounts in `validate/holds.ts`, and the marker traversal already carry
five components, but some producer terms are partial. Numeric entry APIs
must remain projections of that one traversal. Distinct tasks sum;
alternatives of one task take the componentwise maximum.

The actual commit point is still `Turn.#judged`, after `#seal` appends,
retains, folds and redacts inside one storage transaction. The full check
must include all logical Used and Reserved before that transaction commits.
A failed check rolls back every write and returns `scope-full` with the
bound's name. Recorded entry and diagnosis bytes do not gain a new field.

Used counts include retained final item keys; capability-record keys and
relationship-copy keys in every state; canonical entries and retained
inputs once per byte domain and digest; and requests until their recorded
result or `undelivered` diagnosis. Replacements add no new key. Transport
acknowledgment does not release a pending-request unit. Redaction removes
bytes from that entry onward. Derived indexes and outbox bookkeeping are
outside those logical dimensions.

Current storage reads and writes are mapped in the preparation note.
`SqliteStore.scopeBytes()` measures only the scope metadata row and must
not be mistaken for the new logical byte budget. Any persisted Used cache
must share the commit transaction and be checked against stored-state
derivation after restart. Replay must use the same logical units.

## Required settlement trace

A state-based count alone cannot establish the adopted release rule.
The implementation must distinguish the entry that actually settles a
duty from an ordinary state change that merely makes its item look final.
The required witness opens a duty, moves its item to a state with no
reachable settling branch without settling it, and verifies that its
reservation remains. Ordinary traffic can fill only the unreserved room.
That duty may remain stuck; releasing its reservation is not a repair.
A real settling entry spends its own admitted reservation, records what
it starts, and leaves the closing checkpoint reserved where required.
Marker tasks, late results, final holders and rearmed checkpoints need
the same distinction without changing legacy cohorts.

## Retained producers

The retained-input kinds are definition, entry, rule, text, snapshot and
value (`packages/contract/src/read.ts`). The existing limits include
`definitionBytes`, `entryBytes`, declared text/value maxima, and explicit
owner value-domain maxima. A read ceiling is not automatically a producer
maximum. In particular, hold's ancestry-check result names a retained
snapshot (`capability/hold.ts`); its complete producer bound and closure
must be proved or an opted-in definition that reaches it must refuse
`reserve-unbounded`, naming the producer. Missing maxima never mean zero.
The complete list reached by the journey's rooms remains to be filled in
before this implementation is sent for review.

Replay may lack a formerly retained text's size after a later redaction.
For that historical span it must report the byte check as incomplete,
with the reason “redacted size not retained”. The other dimensions remain
checked. This does not waive current runtime admission or let earlier
unknown sizes count as zero.

## Development checks at the configuration checkpoint

The definition-validator file passed all 65 cases against this branch's
private dependency copy, with all 13 workspace links resolving into this
worktree. The new case checks omission without mutation, a distinct digest
for the supported rule, and refusal of unknown rules. A focused control
that removes the version guard passes before the change and fails the
new assertion after it; the original source was restored. Contract,
derive source and derive test compiler configurations each pass.

These were development checks of uncommitted source, not a frozen-head
Source gate or proof of runtime capacity. The initial command used the
wrong relative tool path and did not start tests. A following run still
used copied absolute workspace links to Main and is excluded from this
checkpoint's evidence. The links were corrected before the authoritative
65-case run and compiler checks. An auxiliary path assertion initially
compared `/tmp` with its canonical `/private/tmp` spelling; its corrected
check confirmed all local links without changing source or bindings.

Next are the complete Amount terms, first-key counts, persistent duty
release, the transactional Used check one dimension at a time, refusal
propagation, and actual runtime/replay/restart/legacy witnesses. The gate
is owed once at the final implementation freeze before independent
exact-head review. No gate has run for this branch, and no artifact or
approval is filed for this incomplete implementation.


## Shared traversal checkpoint

`reserved` now carries the existing task Amounts through the same pending
work walk; `owed` projects its entry component. `heldReserved` keeps the
holder Amounts and `heldEntries` projects them. `markerReserved` uses
`markerReservations`; `markerOwed` projects its entries. There is no second
task calculator. The legacy path still reads its existing numeric entry
terms, including C1's validation and closing-checkpoint behavior.

The opted-in path retains the known timed, item/copy settlement, marker,
platform outcome and holder terms. An already-sent request contributes no
second Reserved pending-request unit: that unit belongs in Used. It still
reserves diagnosis/result entries, the result's foreign source bytes and
its declared clause. Future requests remain Reserved until sent. The
closing and provisional confirmation entries retain the static entry-size
stand-in. Producer-specific retained terms, owner record closures and
complete arithmetic checks inside every nested closure are still owed.
These partial Amounts are not yet an admission guarantee.

Focused development checks selected `forms-settles.test.ts`,
`forms-holds.test.ts` and `standing.test.ts`: 55 passed. The added scenario
uses the existing made-up marker definition with real in-memory judges and
fold. It distinguishes a short marker settlement from the alternative
that sends a request: future pending-request reservation moves to an
actually pending request, while the entry projection remains identical.
It is not a native scope, complete byte accounting or storage witness.

A separate focused case checks a fractional record operand before a zero
item count can conceal it. It passes normally and fails by the intended
assertion when only that pre-multiplication check is removed; source is
restored afterward. The added Amount checker requires all five fields to
be nonnegative safe integers and refuses negative zero. Runtime usage,
first-key counts, transaction rollback, historical bytes and persistent
duty identity are still the next implementation work. No gate or Source
review is claimed for this checkpoint.


## Logical key-count checkpoint

`StateView.keyCounts()` now reads items, records and pending requests.
Memory uses the item/record/relation maps and a derived pending-request
key set. SQLite counts the retained rows: every item key, every capability
record plus relationship-copy key, and outgoing requests with neither a
result nor an undelivered diagnosis. Replacing a key or making its state
final does not add or remove that key. A transport acknowledgment does
not remove the request's unit. The outside-state facade forwards the same
read without exposing writes. No counter is added to checkpoint bytes.

The memory boundary file passed two cases, including replacements, final
keys, delivery-unavailable, undelivered, late result and rebuilding from
retained rows. A new raw storage-boundary case also passed in the real
Durable Object's SQLite runtime: one selected case, with the file's other
17 cases deliberately unselected. It checks the same units, the actual
Store acknowledgment method, transaction rollback and reopening a
SqliteStore over the same storage. Its initial run is owner 88301,
CLOSED0/chunk9c43e3. It uses raw test rows, not judged or sealed acts; it
does not establish native authority, capacity admission or an actual
Durable Object eviction/restart. Those witnesses remain owed.

A focused native control changes only the item query to omit final keys.
The baseline passes; the changed query fails the intended retained-key
assertion (expected two items, received one). The control restores source
and reports DISTINGUISHES (owner 93500, CLOSED0/ef55c2). No whole suite or
mutation sweep ran. The Scope test compiler passes after forwarding the
new read through its facade. The first compiler attempt lacked the
package-local Workers types; an owned copy of the existing dependencies
resolved that, without an installation. It then identified the missing
facade method, which was added before the passing compiler run.

SQLite derives these values on demand, without a persisted Used cache.
This checkpoint makes no constant-time or physical-storage cost claim.
Canonical byte-domain accounting, complete reservation producers, duty
identity/release, multi-dimensional post-fold admission, named refusals,
replay and actual lifecycle/legacy witnesses are still unfinished. This
branch remains unready for Source review or landing; its gate is still
owed once at the final implementation freeze.
