# Bound reusable observation records and payload

Request `22b57b9e`, promise `26d84746`. This source checkpoint starts from
R3a's frozen review head `07cc88520d3e46434c72972752d87505750a65a4`, after
review request `e85e6cd8` was filed. Ruling `1f159465` sets both ceilings,
first-use custody, and the three validation obligations below.
Ruling `5da28958` narrows the signer-cache handle invalidation in this head.

## What changed

`ObservationCache` keeps at most 4,096 reusable records and 8 MiB of
retained payload bytes. The store owns its FIFO and both ceilings. Its
constructor accepts the ceilings so its Node owner can use small values.
The measurement includes the actual subject name, full observation,
run/read and last-use metadata, and every retained value copy. It counts
the canonical UTF-8 serialization of those parts. The `last.observation`
field shares the original observation, so the measure counts that payload
once. It does not measure JavaScript heap residency.

An insertion drops oldest records until both ceilings hold. A replacement
keeps its FIFO place. An answer above the byte ceiling serves the current
input but removes any older reusable record of the same name. An answer
whose payload cannot be measured also stays out of reuse. The current
input still holds its answer in either case. No record or value is cut
short, and the store adds no refusal or signing-key charge.

When an entry seals, the existing Seen object learns that last use. The
store immediately refreshes its measured weight if that same object is
still cached. A different object that has replaced the name stays intact.
The separate internal `reusableCounts()` diagnostic returns the actual
count and measured byte total. R3a's four-field signer `cacheCounts()`
result stays unchanged. Neither diagnostic adds a public RPC.

An admitted standing handle keeps consulting its key's kept record after
another key leaves the denied FIFO. A denied handle requires the exact FIFO
record that it captured. The existing run-wide generation still makes an
in-flight Membership read unanswered after any denied eviction, including
the read whose new denial caused that eviction. Callers retry. This adds no
pending-read store or deadline and leaves late Membership answers unchanged.

## Decisions and why

The earlier 50,347-byte rules-observation allowance is a serving bound,
checked after cache insertion. Fixed record-shape validation alone does
not impose it. `one()` also accepts duplicate valid value copies and
keeps each one. Counting actual payload therefore protects more than a
record-count bound could. The 8 MiB ceiling follows the planner's ruling.

`hand()` pins each newly exposed reusable Seen reference into the input's
own `mine` map. Another input's replacement or a later eviction cannot
change an answer already exposed to this input. This happens at first use,
as main exposes records, rather than when `further()` starts. The parent
reported the exact custody-only comparison in `3f8de0cf` before applying
it: first use adds four lines and removes one. A start snapshot adds two
and removes two. The approved first-use change is one changed line larger.
Deliberate rereads after freshness or highest-head failures keep their
existing replacement behavior.

A cache miss reads Membership or Rules again. Main could use a cached
answer inside its window while that new read reports a changed state or
is unavailable. Ruling `e838bb78` accepts this loss of reuse. The trusted
production path reads the same Native object's append-only history, so a
new read after a drop does not return a head older than the dropped
answer. The fold's existing highest-head guards still protect retained
history. No additional high-water map is introduced.

An ordinary definite grant denial stops before further observations.
Null or unavailable standing and native grant marks can still reach
`Further.read`. An act's declared operands can select member IDs from its
fields. Membership returns a valid unknown-member record for an absent
ID. Both that record and real-member records receive the same two cache
ceilings. Membership's live-item limits do not bound every distinct
historical subject that a run can encounter.

Replay does not read this cache. `verify.ts` builds its hand from the
entry's recorded observations and retained values, with `run.reads`
tracking previous recorded uses. A drop changes a future live read choice,
not an existing entry or its replay.

## Validation pending

No compiler, Node owner, Native owner, control or gate has run at this
source checkpoint. No generated file, dependency, package or setting
changes. The gate's unchanged selector includes Scale because this head
adds one Node-owner path to `scripts/test.mjs`.

| Check | Command or boundary | Exit | Output digest |
|---|---|---|---|
| Store Node owner | `node --test packages/scope/test/observation-cache.test.mjs` | Pending | Pending |
| Native observation owner | Whole `packages/scope/test/observes.test.ts` in the existing Scope pool | Pending | Pending |
| One unbounded-insertion control | Disable store eviction for the exact named Native flood witness | Pending | Pending |
| Compiler closure | Affected and owning contexts, once each | Pending | Pending |
| Final gate | `npm run gate`, original pools, workers and deadlines | Pending | Pending |

The one Node owner covers count drops, byte drops, FIFO replacement, and
an oversized replacement removing its older namesake. Its fixed byte
counts include a two-byte value and duplicate value copies.

The single Native witness seeds `@una`, then submits signed acts naming
4,097 absent members in batches of at most 64. It inspects the real cache
count and bytes after each batch. A final act names `@una` again inside
300 seconds and requires exactly one fresh member read and its original
accepted outcome. Membership, signatures, the Scope, SQLite and observation
port are real. The observing declaration and its empty policy are labelled
made-up fixtures. This does not prove Q13's publication policy or a live
room outcome. The original observation-owner cases and deadlines remain.

## Open limits

These ceilings cover the reusable store. Inputs separately retain Seen
references until they finish, and a large answer can serve an input while
remaining outside reuse. The head makes no whole-process heap bound.
Request `22b57b9e` owns this boundary and its final evidence. R3a's
`31f98f33` owns signer-key admission and revocation caching.

The planner deploys after review and landing. No live acceptance closes,
and no recorded definition pin, entry format or retained value changes.
