# Whole-scope capacity: implementation

Work in progress under request `b4062d8c`, promise `d3e026bd`, and full
capacity root `113a54bd`. This branch starts from Main `2637e6bb`, tree
`c7e7188b`. It is not ready for review or landing: configuration parsing
is present, but runtime admission and replay still use the old entry-only
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
