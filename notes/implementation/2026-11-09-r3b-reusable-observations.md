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

## Final evidence

The focused pipeline and both controls used source
`ef12271d530856a9a16bbd51dcb716b4f19c8b6e`, tree
`561caa1f0eaa9aa767235ff8bd903234cc83627a`. That checkpoint includes the
ordinary merge of main `fade0074` and the maintained parser's authority
and store seals. No recorded pin, dependency, package or setting changed.
The one final gate remains pending. Its unchanged selector includes Scale
because this head adds a Node owner to `scripts/test.mjs`.

The focused launcher, driver, Node owner and compiler/Native pipeline
all returned 0. The two complete Node owners passed 13 cases: the 12
security inventory cases and the store's one case. All 14 unique affected
and owning compiler contexts returned 0. The two complete Native owners
passed all 15 cases: eight in `authority.test.ts` and seven in
`observes.test.ts`.

The static project, file, pool and title ledger matches the same-run
reporter and built-in JSON. All 15 Native obligations started and passed
once, with no missing, extra, skipped, failed, retried or repeated case.
The reporter recorded one accepted selection, two collected modules,
15 starts, 15 results and one successful end, with no unhandled error.
The source guards and process receipts agree throughout the run.

The store's one Node case covers count drops, byte drops, FIFO replacement,
and an oversized replacement removing its older namesake. Its fixed byte
counts include a two-byte value and every duplicate value copy.

The signed Native witness seeds `@una`, then submits signed acts naming
4,097 absent members in batches of at most 64. It checks the actual cache
count and accounted bytes after each batch. A final act names `@una`
again inside the 300-second window and requires exactly one fresh member
read and the original accepted outcome. The witness advances its test clock
one second before each batch and before that final act. Membership, signatures, the Scope, SQLite
and observation port are real. The observing declaration and its empty
policy are labelled made-up fixtures. This proves neither Q13's
publication policy nor a live-room outcome. The existing authority owner
uses its labelled scripted Membership stand-in.

The control driver ran four named Native invocations. It did not reuse a
whole-owner focused run as a differently selected baseline. The signed
flood baseline passed, then restoring unbounded insertion failed its real
map-size assertion at 4,097 records. The existing eviction baseline passed,
then removing `generation++` failed because the older active answer
returned a grant where the witness requires null. Each baseline returned
0 and each fault returned 1 at its expected assertion. The six other
observation-owner cases and seven other authority-owner cases stayed
skipped in each named invocation. No timeout or runtime failure counts as
a distinction. Both original sources were restored byte for byte, and
no recorded owned process group remained.

The launchers measured 26.553 seconds elapsed and 54.580 seconds of CPU
for the focused pipeline, and 30.594 seconds elapsed and 36.910 seconds
of CPU for the controls. Each observation includes its outer guards,
children and result parsing. These are two separate commands, not one
combined run or summed case durations. Both ran on this Mac in a reserved
local slot with an owned APFS dependency copy. The controls reused the
focused run's dependency and transform caches. Original pools, workers
and case deadlines remain. No command added a retry.

Run commands:

	python3 /private/tmp/artroom-r3b-focused-launch-20261109.py
	python3 /private/tmp/artroom-r3b-controls-launch-20261109.py

The public evidence manifest is
[evidence/2026-11-09-r3b-pre-gate.manifest.json](evidence/2026-11-09-r3b-pre-gate.manifest.json),
SHA-256 `367069e262d142e72a1601971e3c4ad72d571bb01e570c3b46d758cd2bcdacca`.
Every completed row below cites `reconciliation.json`, SHA-256
`4cec68c27455cb3faddfb7809cfe7598e070b50c536e72e135e3c43d804bae7a`.
That summary reconciles the actual exits with the complete structured
reports and source/process receipts. Its `raw-inputs.json` names and
hashes all 78 terminal inputs used for the audit. Both public files have
their sizes and digests in the manifest.

| Check | Command or boundary | Exit | Output |
|---|---|---|---|
| Complete security and store Node owners | `node --test --test-reporter=tap scripts/security-entry-points.test.mjs packages/scope/test/observation-cache.test.mjs` | 0. All 13 cases passed | `reconciliation.json`, `focus.NodeCases` and `focus.totals` |
| Compiler closure | Fourteen unique configs through `scripts/focused-check.mjs` | All 0 | `reconciliation.json`, `focus.compilerContexts` |
| Complete Native authority and observation owners | The frozen Scope selection through `scripts/focused-check.mjs` | 0. All 15 cases passed | `reconciliation.json`, `focus.NativeCases` and `focus.selection` |
| Unbounded-insertion control | Exact named signed Native flood baseline and recorded store fault | Baseline 0, fault 1. Expected count assertion | `reconciliation.json`, `controls.cases[0]` |
| Existing generation-eviction control | Exact named eviction baseline and recorded `generation++` fault | Baseline 0, fault 1. Expected old-answer assertion | `reconciliation.json`, `controls.cases[1]` |
| Final gate | `npm run gate`, unchanged pools, workers and deadlines | Not run | Pending |

The four original raw and launcher units and the public unit each have
`SHA256SUMS` and read-only permissions after their final metadata write.
The public unit copies only the curated reconciliation and a raw-input
hash index. Generated temporary fixtures, signing keys, raw reports,
assertion payloads, request bodies and saved fault sources remain withheld
in their original private units. No fixture or payload bytes enter the
committed manifest.

## Open limits

These ceilings cover the reusable store. Inputs separately retain Seen
references until they finish, and a large answer can serve an input while
remaining outside reuse. The head makes no whole-process heap bound.
Request `22b57b9e` owns this boundary and its final evidence. R3a's
`31f98f33` owns signer-key admission and revocation caching.

The planner deploys after review and landing. No live acceptance closes,
and no recorded definition pin, entry format or retained value changes.
