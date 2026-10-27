# Archive capacity measurement: partial two-row result

This draft records retained Site and Room A first-quote measurements and offline
numeric comparisons. Room A now has a complete numeric quote at entry 33387.
Its exact observed-build source map and charge-site analysis remain pending.
This is a PARTIAL measurement note, not an artifact submission, checker review,
gate result, landing request, or completion of the parent request. No cost cut
is justified by the evidence recorded here.

The governing request is
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:0f0eeab748533208c813092ebf1ad0dab5087105`,
under promise `0a23bfc8189b7d6a485a9158128afef6c2c6edd1`. All further act IDs in
this note belong to that workroom genesis. Planner ruling
`6634c94c293fb6f956244e30e8a115330543e0e8` changes the targets to each row's
current next entry when captured. The original Room A 24334 and Site 8477
have already been archived. The ruling requires a cut only if measurement
attributes growth to R7. Otherwise the work must explain the used metadata
by charge site and row growth. Its item 3 answers the historical fixed-finish
request from the planner's survey.

The source finding is `e55acc74884a287efd468b5c75019374b57c63cf`. The retained
Site finding is `d6c64ea4c013f205a2c6c87e10901f03155af6c6`. Planner capture
`4564445552db60f78d8df28e66d634527c71febd` and finding
`194d4ee15df0767b0e54f63221a4e121fe2c1aca` bind the new Room A observation.
The exact observed-build bundle and map were requested under
`47777d9a861ba812d69678ee0b14bcec02bfb8eb` with `no_git_artifact=true`.
This draft adds no
production code, test, hosted read, mutation, deployment, directive, endpoint,
authority exception, or budget change. It does not borrow the separate R14
gate as archive validation. The note worktree starts at Main
`d73b53c971d90bb246bad868815912bad0e83682`.

The existing [capture delivery note](2026-10-27-archive-capacity-capture.md)
describes the capture implementation and its earlier witnesses. The measurements
below retain their own exact targets, numeric inputs, and capture limitations.

## The retained Site observation

The source was `tail-0331.json`, 1,481,567 bytes, SHA-256
`a2c9b41b66ac9ad377fb0ecebc4139b26782c748d0a91a99bc52474f0ffe1158`.
The pass is at zero-based event 423, log 0, message 1. A matching row
diagnostic at event 378 uses the same actual Durable Object ID and identifies
Site `sc_rzinq6sfeuov7cmufveakgi6h433cz3yrkcsogjv62bx6ngb2qxa`.
The loaded confirmed frontier is 9171. The quote and terminal geometry bind
entry 9172 to
`sha256:af27e1fb46fc7b60dff5fa90985589d66feeeaf1d0a91d5f00d7d9f1230e5fad`.
The retained Worker version is `ffa1d021-923e-4813-85fd-2620b8b5996b`.

The original tail is deliberately withheld from the evidence directory:
unrelated records contain request headers and body keys. Only the closed
numeric projection, source digest and locator, public build bytes, and
offline analysis are retained. No full tail was copied for this note.
`extraction.json` records a compact payload size of 48,905 bytes and compact
message size of 48,936 bytes. The pretty-printed `numeric-pass.json` is
106,554 bytes. These are serialization measurements. They do not reassert
the survey's differently measured 55,250-byte line or prove transmission
completeness.

The pass reports `step=plan`, `state=retry`, `reason=limit`, and adaptive
strategy 1. It has `fixedFinish=null`. Finish geometry is complete and the
ledger reconciles, but debit attribution and the whole observation are
incomplete. The first-finish snapshot drops 302 site calls. The terminal
observation drops 303. No selection completed. A complete quote therefore
does not imply a successful plan, fixed-finish attempt, or completed archive.
The quote's admitted vector is already pre-finish work, not a pre-entry
baseline: preparation, inventory, and the one candidate can have charged it.

`hasNext=false` does not disqualify this capture. In the source finding,
`hasNext` records only whether the loaded row has a `next` retry timestamp.
It does not compare the journal head with the confirmed frontier. The
separate idle short-circuit rechecks the latest head. The exact quote target,
strategy, and geometry establish this sample's scope. Any earlier statement
that Site had no next entry solely because `hasNext=false` is withdrawn.

## Site reconstruction from captured numeric geometry

The retained tool evaluates these exact historical source heads:

- Before R7: `9daa037e1976fa0e245192823cce96fc8741360d`.
- R7 head: `a97c7425f860273ee0c37f9a4f3631bf2b24bfed`.

It re-evaluates selection reservation, selection, body, commit, fixed append,
transfer, row bookkeeping, and frontier arithmetic. Setup, inventory, input,
source lookups, publication, patch, and append edges remain observed common
components. Source lookups are already inside publication and are not added
twice. The tool checks byte identity of all 36 bound source files across
both heads and checks reconstructed components against the captured quote.
The evidence contains both sets of source snapshots. The 36 relative paths
have 72 retained copies under `sources/<historical-head>/`. Each entry in
`reconstruction.json`'s `sourceEvidence` gives the path, byte length, SHA-256,
and cross-head equality. Those records carry the source identity detail;
the table below groups that detail through the reconstruction result.

Patch and append-edge geometry does not expose private parent paths or full
tree topology. Their observed costs are carried rather than recomputed from
invented paths. The tool strips TypeScript and removes module linkage to bind
the historical arithmetic imports. It excludes the unused `ArchiveBudget`
class and lowers one checked error constructor's parameter properties to
field assignments for Node 26 strip-only support. It does not rewrite numeric
formulas or substitute I/O and crypto implementations.

This is a finish-cost reconstruction, not whole-plan execution, old-runtime
execution, fresh tree preparation, Native replay, source authority, or a
controlled performance measurement. Identical source files do not prove that
each historical runtime would select the same private tree path or incur the
same used work. The same observed used vector is carried into both totals.

All six axes of the resulting finish vector match at both heads:

```text
Axis order: entries, attempts, nodes, calls, metadata, inputWork
Observed used:           1, 33, 29, 89, 2608469, 32300289
Finish at either head:  1, 50, 27, 134, 1602247, 28926401
Used plus finish:       2, 83, 56, 223, 4210716, 61226690
Metadata margin:        65536
Used plus finish and margin: 2, 83, 56, 223, 4276252, 61226690
Limits:                 4096, 512, 64, 16384, 4194304, 67108864
R7 minus pre-R7 finish: 0, 0, 0, 0, 0, 0
```

Metadata exceeds the limit by 16,412 without the margin and by 81,948 with
the required 65,536 margin. The other axes fit. Their remaining allowances
are 4,094 entries, 429 attempts, 8 nodes, 16,161 calls, and 5,882,174 input-work
units. These are arithmetic totals using the carried observed work. They
are not measurements of counterfactual old-head work or evidence of R7
causality.

The captured quote includes 2,459 entry bytes, 3,800 retained bytes, 11 parent
objects with 6,203 parent bytes, and numeric layout counters. These quantities
are not interchangeable with cumulative metadata debits or unique stored
bytes.

## What the retained Site charge sites explain

Offline mapping uses the exact retained bundle and source map. All 88
distinct captured frames resolve. Captured lines and columns are one-based;
the mapper subtracts one from the column for the source-map consumer. It
checks that convention against the generated spend location. The consumer's
nearest preceding mapping is source association, not an independent runtime
trace or complete call tree. The refusal maps to
`packages/scope/src/archive-adaptive.ts:166`, with caller
`packages/scope/src/archive-driver.ts:376`.

The first-finish snapshot retains these large metadata charge groups:

- Three `archiveTarget.birth` sites at `archive-target.ts:60`: 786,432 in total,
  from three 262,144 reservations.
- Two `archiveTarget.one` sites at `archive-target.ts:69`: 524,288 in total,
  from two 262,144 item-query payload reservations.
- One `sources.prepare` site at `apps/room/archive.ts:92`: 262,144 for a source
  birth reservation.
- `JournalWork.metadata` at `journal-work.ts:98`: 201,724 across retained
  contexts. The tree-reader caller at `journal-objects.ts:200` accounts for
  178,176 of that group, through 348 debits of 512.

These groups sum to 1,774,588. Other retained sites account for 261,940.
The retained sites therefore explain 2,036,528 of the 2,608,469 metadata
units. Another 571,941 metadata units and 20,310,956 input-work units remain
unattributed. The capped table cannot identify their source sites.

The same capture provides one exact coarse checkpoint split.
`capacityObservation.rowContextCalls` is 1, and `rowContextAdmitted` is
`(0, 11, 12, 40, 1600374, 9310764)`. Subtracting that from
`firstFinishAttribution.admitted` gives
`(1, 22, 17, 49, 1008095, 22989525)`. Thus 1,600,374 metadata units were already
admitted at the row-context checkpoint and another 1,008,095 were admitted
before the first quote. These are cumulative checkpoint totals, not a
partition of the missing charge sites. No site snapshot accompanies the
row-context checkpoint. Site records accumulate later debits: the first 41
retained records already sum to 1,743,275 metadata units, exceeding the
row-context total. Their order therefore cannot identify the earlier phase.
The quote's `costs` fields forecast finish work; they cannot explain omitted
admitted work. This arithmetic uses the existing numeric capture and reruns no
reconstruction or host work.

The birth and item-query debits reserve bounded response allowances before
the reads. They are not measured response sizes. `JournalWork.metadata`
charges structural work as well as the same amount of input work. For
example, each decoded tree row charges 512 metadata units regardless of its
encoded length. Repeated work can charge the same object again. None of
these totals measures heap use, network traffic, or unique output bytes.

The fixed birth and item-query reservations explain a substantial constant
part of this pass. Decoded tree rows and other structural counters can make
charges grow with journal geometry. This single sample shows the charge
sites and counters above. It does not measure a growth curve or establish
which row change caused the historical deferral. The missing attribution
also prevents a complete explanation of the used metadata. No R7 cut or
both-row fitting witness follows from these numbers.

## Room A first quote and later terminal target

The new source is `tail-1032.json`, 3,135,057 bytes, SHA-256
`b614a17977e45c56b7007f032e168155508f3929dd8e9c4d37934759b6851257`.
The pass is at zero-based event 692, log 0, message 1. An earlier row diagnostic
at event 438 links the same actual Durable Object ID to Room A
`sc_2dn76oxegateryveqeoxx2wqov6rv4z6yepreht3y5h3u5lw7gqq`.
The row at 10:36:18 has confirmed 33377. The later pass at 10:38:14 reports
confirmed 33386. The earlier row establishes scope linkage; its frontier is
not the later pass frontier.

The first complete quote, also retained as the last complete quote, binds
entry 33387 to
`sha256:c5e0a527010893e9b525852e5ea48f376d88b8aea80e36816490bf88b6eb18d5`.
The outer terminal target instead names entry 33388 and
`sha256:e5b46c64d3b4900d898726687858969bb289f779aaa4b13ea0bed833fcd228d3`.
The reconstruction uses the first quote only. Equal recorded debit ledgers
and requested finish vectors do not make those two targets interchangeable.

The observed Worker version is `abbb266c-641d-4747-a9ba-a439cf64ff25`.
The planner identifies deployment `7097f15cb551542680da75442a4c967a899849ff`,
based on Main `6499a12bb16317d9bc614e5f5e905fb4d662cc87`.
The exact bundle and source-map pair for this observation is still awaited;
those deployment labels alone do not establish source-line association.
The older Site bundle and map belong to its different observed version and
are not used for Room A. The full tail is withheld from the builder evidence
collection. The planner
retains the full tail separately in its sealed collection. Only the closed
numeric projection, target identities, provenance, and offline results are
retained here.

The first two extraction invocations exited 1 before a numeric payload write.
They wrongly required the earlier row's confirmed frontier to equal 33386.
Their exact invoked sources and safe refusal outputs remain retained. The
second refusal identifies validator line 176. The third extractor retains
33377 solely as row-link provenance and independently checks pass confirmed
33386, first target 33387, and terminal target 33388. It exited 0. Its compact
payload and message are 48,899 and 48,930 bytes; the pretty numeric payload is
106,548 bytes. These are serialization sizes, not completeness guarantees.

The pass reports `step=plan`, `state=retry`, `reason=limit`, adaptive strategy 1,
and `fixedFinish=null`. Finish geometry and all six ledger axes reconcile.
Debit attribution and the observation remain incomplete, with flags 2. The
first-finish snapshot drops 218 site calls and the terminal drops 219. There
are zero dropped refusals, zero selection calls, and no selected target.
Complete quote geometry is not a successful plan, fixed-finish attempt, or
completed archive.

The Room A adapter reuses the Site reconstruction's checked arithmetic loader,
with target handling changed to retain first-quote and terminal identities
separately. It evaluates the same exact pre-R7 and R7 heads named above and
checks the same 36 producer source files, retained once per head. Observed
common work and private-path-dependent patch and append-edge costs remain
carried inputs. The Site reconstruction limitations therefore apply equally
to Room A. In particular, this is not old-runtime execution or a comparison
of counterfactual used work.

All six finish axes again match across the two historical heads:

```text
Axis order: entries, attempts, nodes, calls, metadata, inputWork
Observed used:           1, 29, 28, 77, 2894539, 29278325
Finish at either head:  1, 39, 25, 115, 1713289, 23570862
Used plus finish:       2, 68, 53, 192, 4607828, 52849187
Metadata margin:        65536
Used plus finish and margin: 2, 68, 53, 192, 4673364, 52849187
Limits:                 4096, 512, 64, 16384, 4194304, 67108864
R7 minus pre-R7 finish: 0, 0, 0, 0, 0, 0
```

The carried metadata total exceeds the limit by 413,524 without the margin
and 479,060 with the required 65,536 margin. The other axes' remaining
allowances are 4,094 entries, 444 attempts, 11 nodes, 16,192 calls, and
14,259,677 input-work units. This is arithmetic for the captured first quote,
not a fitting witness or evidence that R7 caused the used work.

The independently retained checkpoint analysis reconciles the first and
terminal ledgers. Their admitted-vector difference is zero on all six axes.
The 64 retained charge-site records sum to 2,250,433 metadata units; another
644,106 remain unattributed, totaling 2,894,539. Their input-work totals are
14,463,540 retained plus 14,814,785 unattributed, totaling 29,278,325. The
matching affordability refusal is index 0. Its raw metadata shortfall is
413,524; the finish forecast is not an explanation of prior admitted debits.

One row-context call provides the coarse checkpoint vector
`(0, 11, 13, 41, 1835802, 11364464)`. The difference to the first-finish
admitted vector is `(1, 18, 15, 36, 1058737, 17913861)`. Thus 1,835,802
metadata units are already admitted at that checkpoint, and another 1,058,737
accrue between it and the first-finish checkpoint. These are cumulative ledger differences.
The retained site totals accumulate later work and cannot be apportioned
to either interval or assigned to phases. The 127 retained site-frame
occurrences all carry numeric code 0. A separate frames-projection invocation
exited 0 and retained `frames-input.json`, with first-finish and terminal
attribution kept distinct. Projection is not source mapping. No Room A frame
has yet been associated with an authoritative source location. The missing map and incomplete site
attribution leave the charge-site and row-growth explanation partial.
Neither this one pass nor comparison with the differently shaped Site pass
establishes a growth curve, an entry-only cause, or R7 causality.

## Historical fixed finish and capture limits

Planner ruling `6634c94c293fb6f956244e30e8a115330543e0e8` answers item 3 of the
request from its survey. The independent inventory retains the old Room A
`fixedFinish` record from `tail-1900.json`, event 346, log 0. It reports
`step=confirm`, `state=confirmed`, loaded confirmed 27219, and no capacity
refusal. Its used vector is `(1, 28, 28, 80, 2327369, 23358219)`. Remaining is
`(0, 38, 24, 99, 1015176, 14874379)`, with a 65,536 metadata margin. The resulting
3,408,081 metadata total is below 4,194,304 by 786,223.

That record has no target hash or complete numeric quote geometry. It is
not a current Room A reconstruction input. The ruling's Site survey reports
confirmed 8672 and `fixedFinish=null`. Neither the retained inventory nor
this note supplies an exact-target Site fixed-finish attempt. That limit is
separate from the planner's decision that the historical item is answered.

The earlier independent metadata-only inventory parses its nine source tails:
4,587 events, 116 pass diagnostics, and 99 pass observations. It links scopes
through actual Durable Object IDs and matching row diagnostics. That inventory
predates `tail-1032.json`; it does not describe the later Room A capture above.
Its exact-hash quote is Site 9172, and its historical fixed-finish record is
qualified above. Every top-level `truncated` flag observed in that earlier
inventory is false. This proves neither log completeness nor a cause for an
absent diagnostic. The later Room A pass also has `fixedFinish=null`, so it
adds no fixed strategy 2 or 3 witness.

The source finding at Main `f9aca97f84803860cb10a714b1bf643e50bc87f1` identifies
only the alarm as a production caller of `ArchiveDriver.run()`, after earlier
alarm owners. The method coalesces an in-flight pass. Summary and cold
activation can recover or schedule archive wakes, but do not synchronously
run the pass. The observer emits best-effort from the pass's `finally`
block for idle, retry, stopped, and confirmed outcomes. An earlier alarm
owner can fail before the archive call, and an observation failure is
swallowed. Missing lines therefore identify neither absence of an archive
alarm nor its cause. The original tail's `nativeBirth` RPC label is observed
context, not proof of the pass's caller or scheduling cause.

## Retained evidence snapshot

The builder raw collections are still open. In the single table, `Site/` means
`/Users/hughpyle/play/artroom-evidence/2026-10-27-archive-site-9172/`, and
`RoomA/` means
`/Users/hughpyle/play/artroom-evidence/2026-10-27-archive-rooma-33387/`.
These are table prefixes, not a claim that both collections share a directory.
The table selects actual files supporting the findings. It is not a sealed
`SHA256SUMS` inventory or a committed PD-2 manifest. Final evidence must index
all retained files, including both sets of historical source snapshots and
all failed-invocation sources. Withheld full tails are not table entries.

For the older Site collection, only the two reconstruction invocations have
retained process exit and timing receipts. Both receipts record clean Main
`f9aca97f84803860cb10a714b1bf643e50bc87f1`, tree
`8a72ae9a88b29340edb0197afbb47d458f7d145c`. The source heads used by the
arithmetic remain the two historical heads named above. Neither checkpoint
identifies old-head runtime authority for the hosted capture.

In the table, R1 is the exact recorded command with `$RAW` expanded to the
Site raw directory above:

```sh
node "$RAW/reconstruct.mjs" --input "$RAW/numeric-pass.json" --output "$RAW/reconstruction.json" --label hosted-capture --repo /Users/hughpyle/play/artroom
```

R0 uses the same arguments except `--label hosted-Site-9172`. It exits 1 with
`Unknown capture label`; that refused invocation remains retained. R1 exits
0. R0 takes 0.079901042 seconds wall and 0.078709 seconds child CPU. R1 takes
0.955055 seconds wall and 0.888603 seconds child CPU. These are single offline
runs on the shared machine, not benchmark or product latency claims. The
reconstruction was not rerun to draft this note. A dash means that the retained
file has no separate recorded process exit.

Room A extraction v1 and v2 record clean Main `4419008a`, tree `8ff17372`.
Extraction v3, reconstruction, checkpoint analysis, and frame projection record
clean Main
`bb23e50f`, tree `e072e845`. Those are offline command checkpoints, not hosted
source identity. Their exact argv, full head and tree hashes, source and output
digests, and timings are in the named receipts. A1, A2, A3, AR, AC, and AF below refer respectively to those six receipts'
recorded commands. Each result receipt binds the invoked source digest; the
exact invoked sources and runners remain retained even where not table rows. The checkpoint
artifact SHA-256 is `6dfa790802957c3dcecd179c157f7ef5ca8383a76c51612a2d9ce7b2aa1b738f`;
its summary stdout has a different digest and is retained separately.

| Check or retained material | Command or role | Exit | File | Bytes | SHA-256 |
|---|---|---:|---|---:|---|
| Site numeric capture | Closed extraction | — | `Site/numeric-pass.json` | 106554 | `fe2c3137397c552b290af36eda0167af3d9da34725b09227d1f9a5b6ebabd65b` |
| Capture provenance | Tail digest and locator | — | `Site/extraction.json` | 1562 | `50dae998d531b5d2dde30399f12ff327f5b3559f7fa617517fc204b81fa43e77` |
| Payload extractor | Retained extraction code | — | `Site/extract.py` | 5183 | `a68204da070d495f285ed257fc253b031028af901ec2340a1490dbf70ab37a24` |
| Exact public bundle | Retained deployed-build bytes | — | `Site/worker.grow.js` | 6256716 | `a83797ad36ff7a3b51257a807576277eb35bdc34e2e17660fad123c1cb545437` |
| Exact public source map | Retained deployed-build bytes | — | `Site/worker.grow.js.map` | 11087394 | `eabc6c23123c32d6ccea0e2284f5113ff3c3b8e3c307543df0ecccf95163109c` |
| Numeric reconstruction and source identities | R1 result; sourceEvidence binds both source sets | 0 | `Site/reconstruction.json` | 18990 | `1551c3ca45cf2a92e6bbdcd3224f35c62df46be9b3fe42e3c7fd4342ef69c20c` |
| Reconstruction tool | Historical numeric helper loader | — | `Site/reconstruct.mjs` | 19841 | `a0674e4b84dbfb613d4746a4c0a94a5b8ef81582378cdc191efbbf865c2c0baf` |
| Mapped source frames | Offline association result | — | `Site/artroom-site-9172-frame-mapping-final-20261027.json` | 253663 | `64f482b69fe26fa61e18b8b687be0018849996c247e7421b4b85626b334f2887` |
| Frame mapper | Retained mapping code | — | `Site/artroom-site-9172-map-frames-20261027.mjs` | 9147 | `cd0d3f441bbfd2c3ddf80d23dedc4fe70199d4bb93c103055fcc03b62a781fcc` |
| Mapping input | Projected numeric frames | — | `Site/artroom-site-9172-frames-input-20261027.json` | 84563 | `a8b6ca696e1f4a0921d432bd5ab9259f196bfc134cdc160661d9f2d31facb046` |
| Frame extractor | Retained projection code | — | `Site/artroom-site-9172-extract-frames-20261027.py` | 1903 | `84164593df2db3df898eab47a1373d50461abf19cd12305dda3a51dcb3b75735` |
| Tail inventory | Retained whitelist projection | — | `Site/artroom-archive-tail-inventory-20261027.json` | 421366 | `15b153d8fa28f6eb59d50bd6ed00108b5d67440ed5b0d34e777684ec821dfdd0` |
| Inventory extractor | Retained inventory code | — | `Site/artroom-archive-tail-inventory-20261027.py` | 18461 | `6ac57d1bdf7019976e03fec37d7fe84758b9b436a6520bc6b08f5ee1ff18969e` |
| Run recorder | Commands, timing, and checkpoints | — | `Site/run.py` | 2292 | `9ceb4f44f6b04df607d8d0ee8a692b20a53aaace4375a16d76b5e19991d48d02` |
| Wrong-label refusal | R0 | 1 | `Site/reconstruction-run/output.log` | 46 | `e186fef6f0c1480b438b52bb3e7dee65d7955bb92f38be738ea6e257289e6393` |
| Wrong-label run receipt | R0 timing and checkpoint | 1 | `Site/reconstruction-run/result.json` | 1029 | `8d48b93ef752782c4e19b7499fdc176276ffc67549d33d28d8dcc43731f3f614` |
| Accepted reconstruction | R1 | 0 | `Site/reconstruction-corrected-label/output.log` | 681 | `72da8fdb0e4ba8f473d2cfc88426c658c2ae52b7e42e723ffea7dadd910e9b8b` |
| Accepted run receipt | R1 timing and checkpoint | 0 | `Site/reconstruction-corrected-label/result.json` | 1024 | `4dad5da2150ab665e2db4b8b018c01c6c37dab8dfbfc4bd3c05449908feb05aa` |
| Room A numeric capture | Closed numeric projection | — | `RoomA/numeric-pass.json` | 106548 | `456a02555e91b9433540a7045e0758cc973c15dda377cf2e5e940013750a48cd` |
| Room A provenance and target separation | Closed numeric projection | — | `RoomA/extraction.json` | 2183 | `1f30da5bbc593b9a6854276e79fc6df763a67b46fbcda6b9e0e45397efc1dd5b` |
| Room A first complete quote | Closed numeric projection | — | `RoomA/first-quote.json` | 4143 | `dba8e1cd00a4c846a1916951fa50be9166165e75f688f341d3b01750f3dc525e` |
| Room A terminal target | Closed numeric projection | — | `RoomA/terminal.json` | 1217 | `0fb4cd63e67eb02164893ba4879fad971e7e62650849b9a3016a2d242b41e4d4` |
| Accepted Room A extractor | A3 exact retained source | — | `RoomA/extract.py` | 16169 | `cc30b7b2cad1e6419b13870ab91494c39613328322e72604b60b86b594f7cc7c` |
| A1 wrong row-frontier equality | Exact command in `extraction/result.json` | 1 | `RoomA/extraction/output.log` | 71 | `a1f4d18c97862ea50c99687c8ff3d17988bc3dd1574a887efd4ad597d342b38c` |
| A2 same equality, validator location | Exact command in `extraction-v2/result.json` | 1 | `RoomA/extraction-v2/output.log` | 91 | `22a0e03740791342016ffa4a26765ca887d5c4ebde4d39a32e83b327dfe0f33c` |
| A3 corrected scope-link handling | Exact command in `extraction-v3/result.json` | 0 | `RoomA/extraction-v3/output.log` | 577 | `c12f1c51f414c008be44c8db50cf6912bce5d0c4b30ef57ae30fa1697f52aecc` |
| AR first-quote historical arithmetic | Exact command in `reconstruction/result.json` | 0 | `RoomA/reconstruction/output.log` | 684 | `3a184bb377f66b9b34a9e63afc5e6bfad7d48739703e476699298d58e5551291` |
| AC independent integer reconciliation | Exact command in `attribution-checkpoints/result.json` | 0 | `RoomA/attribution-checkpoints/output.log` | 578 | `ecddff3515a419d0bd6b1bd7e778f4540d91168bf54750a885c6fba97e51fa6b` |
| AF numeric frame projection; no mapping | Exact command in `frames-projection/result.json` | 0 | `RoomA/frames-projection/output.log` | 257 | `fb1cc39b3588f4a680a35a2b5fe1d787ef745454c6fd354c4566e41ec88189f5` |
| Room A reconstruction and both source sets | AR result; 36 bound files per head | 0 | `RoomA/reconstruction.json` | 19710 | `09a855b1a725d667b9780a931f266b8265e2c3023ba7e4ae0c0f0d69b157dda7` |
| Room A checkpoint ledgers and limits | AC result; eight input hashes | 0 | `RoomA/attribution-checkpoints.json` | 7393 | `6dfa790802957c3dcecd179c157f7ef5ca8383a76c51612a2d9ce7b2aa1b738f` |
| Room A numeric frames and identity | AF result; distinct observation snapshots | 0 | `RoomA/frames-input.json` | 85852 | `9f8bc4a1192c50f9ac0f8a9592f4dff16dceef43dd8c7d9f39fbc3194bfe06e9` |

## Work still owned by the parent request

Request `0f0eeab748533208c813092ebf1ad0dab5087105`, as narrowed by ruling
`6634c94c293fb6f956244e30e8a115330543e0e8`, still owns these limits:

- Obtain and verify the exact bundle and source map for Room A's observed
  version, then associate its retained code-0 frames. Do not reuse Site's map.
- Complete the used-metadata and row-growth explanation within the available
  attribution. Both rows now have exact-target numeric finish comparisons,
  each with zero historical finish delta. Their carried used vectors are not
  counterfactual old-head measurements and establish no R7 or entry-only cause.
- Apply the ruling's conditional cut requirement only if measurement
  attributes growth to R7. This draft delivers no cut, fit claim, or paired
  fitting control.
- Finish and seal the raw evidence, add the PD-2 manifest, run the required
  ordinary gate at the exact resulting head, and obtain its checker review
  before any completion or landing claim. None is supplied by this draft.

The capture delivery and the separate R14 work keep their own evidence.
The new Room A analysis is offline work over the retained numeric capture.
No new Native witness, fake SQL execution, live provider read, or hosted action
was performed to revise this note.
