# Whole-scope capacity

Implementation for root request `113a54bd`, implementation request
`b4062d8c` and promise `d3e026bd`. Planner decision `63195bdd` sets the
runtime boundary; report `acdd1f6b` sets the standing-slot boundary.
The branch includes reviewed Main `95959b92`. Exact candidate, gate and
review outcomes belong to the Gitseq artifacts for this request.

This note describes the current implementation. Development checkpoints
and their individual test logs remain in Git history through `1d5297fe`.
They establish no independent approval or landing. The final gate remains
unresolved; exact-head checker review is also required before landing.

## Admission and compatibility

A definition opts in with `capacity: {name: "whole-scope", version: 1}`.
Unknown names or versions refuse `unsupported-definition`. Omission keeps
existing declaration bytes, legacy admission and old-scope replay.
No platform default, lane pin or existing cohort opts in through this work.

The existing `scopeEntries` ceiling remains. New temporary deployment
ceilings are `scopeBytes = 1073741824`, `scopeItems = 100000`,
`scopeRecords = 200000` and `scopeRequests = 10000`. These are logical
limits. R4 still owes measured ceilings and physical storage costs.

After an entry has been appended, retained, folded and redacted, the same
storage transaction checks Used plus Reserved in all five dimensions.
Equality is allowed. Exceeding any ceiling rolls back the complete turn's
writes and returns `scope-full`, naming that bound. `full(head, bound)`,
client answers, API responses and metrics preserve that name. Entry,
Input and diagnosis formats do not change.

| Dimension | Used |
| --- | --- |
| Entries | Sealed journal entries. |
| Items | Every first item key, including final items. Replacements add none. |
| Records | Capability-record and relationship-copy keys in every state. State, index and bookkeeping rows are outside this unit. |
| Bytes | Canonical UTF-8 journal and retained-input bytes, deduplicated by byte domain and digest. Redaction removes bytes from that entry onward. |
| Requests | Sent requests awaiting a recorded result or `undelivered`. A transport acknowledgment releases none. |

Memory and SQLite derive Used from their stored state. There is no
persisted Used counter to drift. SQLite's scope metadata-row size is not
the logical byte budget. Persistent item and request duties are part of
the fold and survive eviction. Failed transactions restore them too.

## One reservation graph

`Amount` carries entries, items, records, bytes and pending requests.
`reserved` uses the existing task traversal; numeric entry APIs project
its entry component. Distinct duties sum and alternatives of one duty
take a componentwise maximum. Every opted-in operand and intermediate
result must be a nonnegative safe integer; invalid arithmetic is never
free room, including inside zero products or a maximum.

The graph covers timed work, item settlements, relationship copies,
marker duties, platform operations and holders, native capability work,
future requests, result clauses, receiver pins and standing entry slots.
Future native work returns through this same graph. Cycles and reachable
producers without finite writer maxima refuse `reserve-unbounded` and
name the producer. Read ceilings do not supply missing writer bounds.

Only the actual settling entry releases a duty. An ordinary state change
that makes its item look final retains the admitted duty. Settlements
spend admitted room, transfer future requests from Reserved to Used,
and retain what their effects and sends start. `delivery-unavailable`
spends its diagnosis entry but keeps the remaining late-result work.
Closing checkpoints remain funded and rearm after later ordinary work.

Each platform send uses its own joint result-clause Amount. The direct
settling-rule mark includes operations and openings without adding the
contract's forbidden state-change term. Holder marks include new work
only at their opening. Bound decisions count actual native record
producers: a plain state change has no generic effect-count record proxy.
A native license's first key still costs one record; replacing its own
bound pin costs no new key.

Native receiver pins quote the full deciding handler, its retained inputs,
new items and future requests. A bad-field refusal can still consume a
pin decision; the retained payload uses the writer ceiling because pin
binding precedes field validation. Unknown counters or recursive closures
refuse explicitly. Earlier successful field checks can prove binding
after erasure; an ambiguous bare refusal cannot silently decide the
binding phase.

Planner report `acdd1f6b` keeps C1 `{item, slot, entries, max}` as an
entry-slot floor: entries plus their `entryBytes` stand-in. It does not
invent item, record or request maxima for an undeclared future form.
The actual handoff is admitted in all five dimensions when it arrives.
A stronger full-handoff guarantee needs a separately declared form.

## Retained producers and journey inventory

Entry reservations use the existing `entryBytes` stand-in. Result entries
also reserve their foreign source. Typed detached text reserves canonical
JSON string bytes, at most six bytes per raw byte plus two quotes; value
places use their declared canonical maximum. The existing rule-input
writer ceiling is 262144 bytes. An opted-in birth retains and charges its
complete statically named child-declaration closure, once per digest,
before genesis. Every named signed-birth text body must be present even
when genesis will refuse its fields; an existing birth receipt can repeat
without resupplying bodies or child declarations.

The source inventory covers both exported lanes and all 36 native catalog
entries. A final read-only probe validates all 38 original declarations.
All 36 catalog entries also validate with the opt-in. Issue and change
both refuse it, naming `hold@1/check ancestry-snapshot producer has no
finite canonical-byte ceiling`. No writer maximum is invented for that
snapshot. Supplying one is outside this stop point.

| Room family | Reached retained producers and existing maxima |
| --- | --- |
| Every scope | Journal entries use `entryBytes`; foreign facts, presented facts and delivery sources use the accepted local entry ceiling and `usesPerEntry`. Birth declarations and named children use `definitionBytes` and `namedDefinitions`. |
| Issue and change | Detached bodies, report summaries, verdicts and comments declare raw text maxima of 65536. Both reach hold and Git-read work; their ancestry snapshot has no writer maximum and prevents opt-in. Neither declares evaluator expressions. |
| Membership | Foreign-entry fields and inline entry data. Membership@6 has no detached text, value place, outcome evidence or retained observation-value declaration. |
| Rules | Foreign entries; check configuration declares 32768 canonical bytes. Rules@4 activation declares a 262144-byte definition value and 16 dependency value places. Named declaration closure is checked separately. |
| Directory and register | Foreign entries, validated child declarations, inline entries, and owner-derived creation/import work. Directory@10 and its partition have no detached text or retained observation-value declaration. |
| Destination | Foreign entries; destination@6 judge observes rules extents at 262144 bytes and declares changed-set evidence at 262144 bytes. Operation, cleanup and closure work joins the holder graph. |
| Inbox | Inline entries; inbox@1 has no separate field, observation-value or outcome-evidence producer. |

Authorities are `field-retention.ts`, `created-definitions.ts`, the native
workspace/hold/Git-read code, Scope's definition writer, lane declarations
and the platform catalog and rules. This inventory describes reachable
source producers; it establishes no live room's activated pins or a live
outside provider's behaviour.

## Replay and erased sizes

Replay derives the same five dimensions, including birth retention,
request duties and redaction. A missing historical text size produces an
explicit `incompleteBytes` interval with reason
`redacted size not retained`. It never becomes zero or hides an overflow
in another dimension. Later checked aliases can recover actual sizes
without caching an erased payload, rerun historical comparisons, and
retract invalidated coverage and its transitive consumers.

A genuine size-only refusal remains derivable after its payload is erased.
Replay tests possible field-comparison classes and accepts one only when
the entire derived entry is byte-identical. It assigns no size. Earlier
successful checks constrain those classes through a prefix index, which
is trimmed with invalidated coverage; later checks cannot establish an
earlier refusal's binding phase. Bound-holder uncertainty retains its
separate explicit incomplete result. Actual recovered sizes replace the
conditional comparison. Partial recovery preserves remaining gaps;
a valid-size recovery disproves a fabricated refusal. Extra effects or
sends cannot be explained by an unknown size.

## Verification evidence

Focused checks ran as the corresponding mechanisms changed. The final
gate runs once after the complete freeze; its exact outcome is recorded
separately. No mutation sweep or repeated whole suite is part of this work.

| Invariant | Meaningful witnesses |
| --- | --- |
| Opt-in and old definition bytes | Derive `validate`, `compose`; native Scope `compose`; unchanged lane/catalog pins. |
| Checked arithmetic and one traversal | Derive `forms-settles`, `forms-holds`, `forms-final-holder`, `forms-ledger`, `standing`. |
| First keys, final keys, acknowledgment and rollback | Derive `state`; native Scope `turn` logical-key witness. |
| Canonical bytes, domains, deduplication and redaction | Derive `byte-usage`; native Scope `turn` logical-byte and rule-writer witnesses. |
| Exact all-five admission, named refusals and funded settlement | Derive `capacity-admission`; native Scope `capacity-admission`, `capacity-owner`, `capacity-bound-records`, `capacity-standing`; client `answers`, Scope `metrics`. |
| Actual settlement, diagnoses, late results and checkpoint rearming | Derive `forms-settles`, `platform-request-amounts`; native Scope `capacity-platform-requests`, `turn`. |
| Native pin item/request closures, writer-size refusal and real child results | Derive `receiver-pins`; native Scope `capacity-receiver-pins`. |
| Birth closure, missing dependency retry, deduplication and repeated receipts | Derive/Replay `child-definitions`, `genesis-bodies`; native Scope `capacity-child-definitions`, `capacity-genesis-bodies`. |
| Historical byte gaps, recovery and invalidated consumers | Replay `capacity`, `recovered-bytes`, `genesis-bodies`, `text-refusals`; native Scope `capacity-recovered`, `capacity-receiver-pins`. |

Native witnesses use the real Durable Object, SQLite transaction,
capability implementation, eviction and HTTP Replay where stated. Their
small declarations, authority, clocks and transport wiring are fixtures.
Tests without platform marks do not prove execution of a platform rule.
Pure adversarial histories explicitly fabricate impossible refusals or
anchor a foreign send; they do not claim native admission. No fixture
establishes Git-host, custody or other outside-provider behaviour.

Selected isolated controls each passed their baseline and failed the
intended assertion with one fault. They cover domain aliasing, first keys,
ordinary-state duty release, request-unit transfer, platform clause mixing,
child closure, standing bytes, receiver-pin projection, native record
production, and redacted-text rederivation. Each source was restored before
the next source-dependent check. The latest three distinguish removal of
conditional refusal, disregard of earlier field proof, and disregard of
actual recovered sizes; they fail the native incomplete-span, fabricated
refusal and consumer-retraction assertions respectively.

The last focused Replay run passes 18 cases; the last native redaction run
passes three. Derive, Scope, Replay and Platform test compilers pass.
Earlier focused results and exact controls are retained in the development
history; these local results do not replace the final gate or review.

The copied dependency view was found stale before the gate. The exact
lockfile was installed in a scratch directory and adopted as private
root and workspace copies; `npm ls --all` then passed. No package manifest
or lockfile changed. Gate evidence names this corrected dependency view.

The one full gate at `4c7c2bc9` passed whitespace and workspace typechecks.
Its test phase reported two stale Page/Counting generated bundles and
seven native turn fixture failures, then stopped progressing after a
Workers cross-object I/O error in Vitest's timeout handler. The original
Vitest process was terminated after confirming unchanged output and a
busy workerd child. The original gate exited 1 (test phase 143), with
209.76 seconds outer wall time and 337.93 seconds outer CPU. There are no
terminal suite totals and no full-test pass claim. The timeout's cause
and the uncompleted cases remain unresolved. No whole suite was repeated.

Focused diagnosis traced all seven fixture failures to the shared lane's
unused link create naming a dummy child digest. The opt-in closure check
correctly refused that unresolved birth. Those witnesses now omit only
the unused placeholder create, as the other closed opt-in fixture already
does. Their seven cases and two legacy counterparts pass; the native
Scope test compiler passes. The Page and Counting generators rebuilt
their committed client bundles, and both freshness witnesses pass.
No runtime admission was weakened to make these fixtures pass.

Raw gate evidence is in /tmp/artroom-capacity-final-gate-20261017.log and
its .time sibling; stage logs are in the gate's reported temporary
directory. Focused repair evidence uses /tmp/artroom-capacity-gate-.
The passing repair runs are terminal. Temporary validation diagnostics
were removed before those checks.
