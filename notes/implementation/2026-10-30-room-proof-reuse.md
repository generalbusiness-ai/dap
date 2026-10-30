# Reuse proofs within one room verification

## What changes

This note records request
`7c0e8181a4edc7c45a00f5b4cc3815e98a61f890` and promise
`310185bf8291b7c7d4a373d845a449b6bc374e9a`. Twenty-five formal child
captures are closed. Default native room verification passes at D. Gate 1
fails at D, its isolated follow-up fails at E, and gate 2 fails at F. The G
output-contract repair passes its focused retry after a failed sandbox launch.
Gate 3 passes at exact source G. The accompanying manifest binds the retained
evidence. Exact-head review and landing remain under the request. Three marked
operator rows describe source work.

The child changes `dap verify --all` from separate target traversals to one
proof shared by the requested scopes. A Membership prefix proved for one
Inbox can serve later Inboxes. Proofs stay in memory for the command and are
never written. Shipped defaults remain 300,000 milliseconds, 268,435,456
received bytes, 100,000 HTTP attempts and 100,000 distinct history entries.
The default room run now reports every actual scope consistent at D.

The task diff starts at landed parent `5c6ea9bb8c25135605bcbe28d2426d54234e40b3`,
tree `bb685f2b991ec1bfafe52e869e6af047a099c1aa`. The fixed-slot index
and native rebuild repairs are inherited work, not child results. Collector
base `2d6811db8ca88f58ddb60e5cfe197679fbd0ce15` predates the later
parent repair. Snapshots relative to it also include parent repairs. It is
capture provenance, not the base for this child's final diff.

## Decisions

Ruling `8e0c4ff6053fedf38be34b6a8dfeb8c2e743b39a` adopts a joint room
proof. Requested scopes are roots at depth zero. Foreign depth is the least
distance along a chain actually followed from any root. A later root can
shorten that distance and discharge a provisional depth stop. This is not
fresh isolated traversal equivalence for every target. Standalone
`verify(source, options)` keeps its single-target semantics.

The current replay source adds `roomVerification`. `checkTarget` returns a
provisional token. `finish` settles outstanding content, resolves contradictions
and publishes final per-scope summaries with one union of coverage and trusts.
Each shared prefix names its proving root. The CLI rejects missing or reordered
requested roots before declaring every scope consistent. Contract section 9.4
and the replay README describe these semantics.

One owner binds the source and semantic, code and trust options. Reused facts
bind the exact scope, incarnation and entry hash. Replayed and anchored facts
stay distinct. Discovery supplies accounting and target names, not proof.
Digest-checked retained bytes establish content only. The consuming judge still
checks schema and admission. Another root's checked content can settle a
detached-text debt. The union names its source, proving root and consumers.
That does not prove the body accompanied a birth or authorized an entry.

A requested root refreshes its source head even when its prefix is cached.
Expected-head, scope-frame and causal-prefix checks remain. Contradictions
retract coverage and dependent proofs. A failed mutable fold is quarantined.
Reusing a sound earlier prefix rebuilds state from checked bytes. The closed focused captures
below exercise these checks. The D native case also completes its normal
room proof under shipped defaults.

The CLI's `Verification` owner counts discovery and log copies of an entry
once. It checks hashes, canonical stored bytes, sequences and source frames
before accepting duplicates. Known copies remain readable at the exact entry
ceiling. A new identity is charged before entering the maps. Conflicting
content or frames stop the command. Accounting retains identities, not bodies
or proof. Replay separately counts distinct checked identities across reuse
and repairs.

Every actual HTTP attempt and received response chunk still costs budget,
including repeated deliveries and refused replies. A retained-input cache hit
makes no source read and invents no wire charge. It preserves the original
read's cost. Session access and maintained Signed fallback use the outer
command owner. Standalone verification keeps its own traversal and counting.

The owner serializes root checks and finalization. Close clears proof state
and fences active or queued publication. The CLI closes both owners in
`finally`. Neither close nor a budget stop proves an ignored abort, pending
source promise or underlying HTTP body drained. There is no physical
cancellation claim.

New replay tests cover the entry ceiling, cached expected heads,
refreshed contradictions, depth promotion, option snapshots and close during
a pending read. Recovery cases cover independent contradictions, content from
an owing dependency and a post-fold failure beside a sound prefix. They use
judged and scripted in-memory histories with grants taken as recorded, not
native authority. Their actual results and fixture follow-up appear below.
Existing replay tests remain unchanged in the inspected child diff.

The revised native fixture keeps real TEST room creation, directly signed
native membership adds, actual Inbox creation and three standalone default
CLI replays. It replaces the bounded measurement with exactly one default
`verify --all`. It requires one shared proof header, actual proving roots and
one consistent report per tracked scope. The reported set must equal every
actual scope, including every Inbox. No raised-limit retry or boundary outcome
can satisfy this new witness.

The fixture records Fetch attempts, responses and forwarded response-body
bytes, excluding headers and request bytes. `performance.now` measures command
time and time through a bounded response-frontier join. Last progress per
phase is not a final counter. The TEST clock, local custody, setup reader and
finite callback scheduler remain fixture qualifications. This workerd
witness proves no physical celld load or global drain. Its D result appears below.

## Actual evidence

The first four child captures used accounting checkpoint A:
`0c25f48974f3fe6d261c6007c7fec282d0334345`, tree
`3e80d97f8466c651edc3c5a50f4a1d4d849b82a2`. That change was rebased
as `a2d2b9f580d65b437c1990eb93ad64a5de22d874`, committed tree
`06a3537798d7d800353dde054702ee35ac6c5f5f`. This was HEAD while the
child source was dirty at the first outline. It was not a frozen proof-reuse
checkpoint. Original receipts keep A's identity. Later closed captures use
these checkpoints:

- B: `30d93abda6726efa9934b937450d67c47e325825`, tree
  `371269bdfb9a4d79331b2420574247cd78114ce9`.
- C: `ecaf5ba543860b521affc034d2ef9557969b45f0`, tree
  `b731f2fbf08f937f2fbc8663083710839e5b8f97`.
- D: `bc19531f9b04e5ebca30224e20e7b0de3590934b`, tree
  `366a6b80211dda327aea30d7f94ca1100b6566b4`.
- E: `89112028e33b26f6118b7018f1a35a7e8ffd51ed`, tree
  `87367381f3c9e21bea4cba8ddbdc6f8411e4b1db`.
- F: `582d3ec6a2879d2d4dbbe44ff829a6e29fb0a450`, tree
  `e8b2d65f32204893e99ad94a5001f21d764d785c`.
- G: `f2fb7384de05bb6712c9a57c2adc218bf9cea56c`, tree
  `e46bcbe49bbb899556d038526f203e44e13290b1`.

Child records now reside in
`/Users/hughpyle/play/artroom-evidence/2026-10-30-room-proof-reuse`.
Each formal label names `command.json`, `receipt.json`, `stdout.log` and
`stderr.log`. Ordinary test captures also retain `report.json`. The retained
copy is indexed by its root `SHA256SUMS`. Table argv and working-directory records keep their original
execution paths. Their collector SHA-256 is
`aa00314ac292a521909e25123788d48d000eb6f3ff150c8541448dd013e1810b`.
Bounds are 40,000 files, 2 GiB total, 128 MiB of snapshots and 128 MiB per
outer stream. Formal commands allow 600 seconds except the controls and two
output-repair launches (1,200), the native room (2,100), and closed gates
and the unreached-stage follow-up (7,200). Operator limits remain in their
separate records.

Historical row H is the observed parent run accepted by ruling
`2a308f5d82ff7f269264236d27512edfea7d350b`. Its source is
`80749894575b50e51c7128f3fa54d10c6749a372`, tree
`d351bcf0c35522adcc3a45b139f9dc3f8ad4aa80`, now retained under
`operator-inputs/historical-control/native-membership-room-1` in the new root.
It was not rerun, rewritten or relabeled as a default-time run.

That observed run overrides time to 120,000 milliseconds. It stops at the
shipped byte bound during replay of membership scope
`sc_hngd6u6lodg73szmvz3z24jecjomuchh6xdvtulri25ofgcezaca`, cursor `"200"`:
83,684 milliseconds, 268,437,957 received bytes, 30,076 HTTP attempts and 58,379
history entries. Discovery completed and read all 2,001 Inbox Session histories.
The time override did not bind. The ruling accepts it as the prior-head
control without another run. Inner CLI Outcome.code is 1, while Vitest and
the capture exit 0. No consistent partial reports were returned. It proves
no complete room coverage.

At B, the CLI compiler passes but replay's portable TypeScript context cannot
resolve `structuredClone`. C fixes that portability problem. Both compiler
contexts then pass. The combined owning run at C passes 21 cases and fails one
before it can test room settlement: the made-up fixture declares an illegal
`acts.retain.fields.proof.value` field.

D repairs only that fixture by using a platform fixture and adding a provenance
check. It preserves every case and assertion. The replay compiler and all three
recovery-file cases pass at D. The failed C run remains a failure. This focused
follow-up is not a new complete owning run or a gate result.

The first entry-accounting control selects the hybrid CLI package's Node-runner
path. It returns INCONCLUSIVE with zero passing baseline tests. The helper retains
only the summary, not the underlying baseline error, so this note names no
exception or test behavior behind that failed selection. The corrected root
selector names the CLI Vitest project. Four baseline cases pass. Its mutant
has two passed and two failed cases, and the helper qualifies one named
ordinary AssertionError about duplicate entries at the ceiling.

The cached-head control passes its one selected baseline. Removing the expected
head comparison produces an ordinary AssertionError at line 44: the second
root says consistent where mismatch is required. The mutant has one failed
and nine skipped cases. Both distinguishing controls restore the source, and
all control captures confirm unchanged clean source afterward. The standard
helper retains baseline counts and mutant output, not baseline internal JSON.

The D native case completes one default `verify --all` in 38.754 seconds of
caller `performance.now` time, including the bounded request-frontier join.
All 2,006 actual scopes report consistent, with all 2,001 Inbox Session
histories observed. Limits are unchanged. During that command, the wire
observer records 12,076 attempts, 12,076 responses and 79,088,240 forwarded
response-body bytes, excluding headers and request bytes. No HTTP refusal or
unresolved HTTP refusal is recorded. This is not a global body-drain claim.
The outer capture, including setup, takes 140.151371542 seconds and
151.006290 seconds of host child CPU.

The actual report returns one shared proof header and 4,011 coverage segments.
Partitioning those intervals by scope, incarnation and kind gives 2,006 groups
and 8,019 reported positions. Sorted segments are contiguous and nonoverlapping
within each group. This derives a summary from the returned report. It is not
an independent scope census or a new successful-entry budget counter. The
complete outcome and metadata remain in `native-room-default-1/report.json`.

Gate 1 passes the kernel stage, then fails two Node cases in
`scripts/security-entry-points.test.mjs`. Its 78 other Node cases pass.
Counting, plain and native stages remain unreached. The failure names
unselected runtime declarations. Maintained parser readback in
`operator-inputs/cli-seals-readback.json` identifies new CLI helpers
`replaySource` and `sharedProofLines`. It returns 79 records: two new, five
changed old records and 72 unchanged. The whole verification-owner seal is
`3fb0f354c0d00dd1d21cf293e11dfc81738b9de4e8f5eb43ac9fd918dc9db557`.
E changes only inventory metadata in that test file, with eight additions and
six removals. Case code, assertions, controls and validator tail stay byte
identical. All ten owning Node cases then pass.

The isolated E follow-up runs the unreached stages. Counting passes 56 cases.
Plain passes 3,129, fails one and skips one. Native remains unreached. The
sole failure finds the generated Page module stale by eight bytes. This
follow-up does not turn the original failed gate into a pass.

The maintained `npm run build --workspace @generalbusiness/dap-page` exits 0
as source generation. Only `apps/room/page/assets.ts` changes among tracked
files. `operator-inputs/page-build-1/receipt.json` binds the old 1,187,769-byte
module, SHA-256
`ecc1fbe483283d0a1485d7fb28ba38ffea727d1e58ae123f6e77e9bd10b06d3b`,
and the new 1,187,777-byte module, SHA-256
`553d0303a89d30dc57b526691075bdff9dde7c89c8d6414e15b6f988e8a636ad`.
The latter exactly matches the failed test's expected bytes. Decoded HTML
stays identical, SHA-256
`f8bb00e0998e3d12b66f5c7334a7450566e1258bed6e37a53acf213a4299d23d`.
The source trace reaches replay through the CLI browser entry, command-support
and SourceError. At F the asset's owning case passes. No other production
runtime source changes between D and F. A generated production asset still
requires a new full gate, so the single-file follow-up exception cannot cover F.

Two read-only Node parser processes exit 0. The retained operator readback is
`operator-inputs/support/artroom-proof-reuse-page-ast-20261030-1/READBACK.md`. The first
path-aligned comparison shifts after one extra top-level declaration group.
After explicitly splitting top-level declaration groups while preserving
order, the comparison has 11,412 Identifier.name differences and two
Property.shorthand flag differences, with no other compared AST changes.
The raw 1,736 non-Identifier mismatches compare shifted paths; they are not
a count of semantic edits. The comparison excludes positional and comment metadata.
It resolves no lexical bindings and proves no alpha-equivalence or browser
behavior. Both payloads contain the same two Symbol calls and no new room
root-token call. No application payload was evaluated and no browser ran.
Build and parser work are clearly marked operator rows in the same table,
outside formal validation totals. Their zero exits do not supply runtime
acceptance. The Page build records CPU. Both AST receipts leave CPU unknown.

Ruling `ad166a42b89cc8fd6ef5ad10a98c02cfeaed2bbb`, read through Gitseq,
retains `control-unique-entry-1` as INCONCLUSIVE with cause RunnerMisSelect.
The hybrid script handed a Vitest file to Node. The underlying baseline
exception remains unknown. The ruling accepts the explicit Vitest control
`control-unique-entry-2`. It queues the helper repair outside 7c0: in the next
head touching the helper or testing guide, or after J4 if none comes earlier.
Historical H retains its separate observed-boundary role under ruling
`2a308f5d82ff7f269264236d27512edfea7d350b` and its original time override.

Gate 2 passes kernel, Node 80, Counting 56 and plain 3,130 cases, with one
plain skip. Native records 841 passed, five failed and two skipped cases:
two files fail, 240 pass and one is skipped. Four demo cases expect the old
output shape. The issues story parses Shared lines as scope kinds. The gate
remains failed, with complete unclipped capture and clean source at F.

G changes three paths for this output contract. The issues story checks a
12-root union, actual scope identities and coverage through each reported head.
It preserves the original 12-scope order, cleanup, final summary and callback
settlement assertions. The maintained rehearsal adds `judgedRoomProof` to
check prefix correspondence against the original room-summary suffixes.
It checks contiguous coverage, proving roots, checked-text provenance and
replay trusts. It stages CapturedValues and publishes them only after the
prefix and suffix pass. The transcript states the prefix rule. Existing
suffix templates remain unchanged.

The rehearsal-stops witness adds a positive case and fourteen malformed-prefix
or suffix probes, including a check that failed parses publish no captured
values. Old cases stay unchanged. All existing replay tests remain byte
unchanged. These are output-correspondence checks, not a second replay engine.
The native journeys still use stand-ins for the Git host, git and scheduler.
They prove no live provider, browser or deployment behavior.

Both G compiler contexts pass. The first owning launch fails before tests
because the sandbox refuses listening on 127.0.0.1 with EPERM. Its underlying
stderr is retained. Retrying the same frozen G source passes nine cases with
one existing skip across three files, in 27.601504833 seconds elapsed and
35.473587 seconds host child CPU. This focused result does not repair the
failed gate 2. Gate 3 then passes at the same G. The unused v2 acceptance
adapter never executed.

Gate 3 passes kernel, Node 80, Counting 56 and plain 3,131 cases, with one
plain skip. Native passes 846 cases with two skipped: 242 files pass and one
is skipped. The stage ledger records all five stages passed with no report
errors. Native's final observer record says passed with zero unhandled errors.
The scope observer's partial label, with 241 observed modules, includes the
skipped optional screenshot-recording module. It does not imply a failed phase
or establish callback completeness. The summary records 72 unknown or suite
observations and no contradictions.

`gate-3/stdout.log` binds the original closed temp root `tmp.UfU4zMrMiF`.
Retained `operator-inputs/gate-detail-gate-3/test-evidence/stages.json` and
`operator-inputs/gate-detail-gate-3/test-evidence/native.jsonl` supply the
phase and end records. Gate 3 has complete output, no timeout and unchanged
clean source G. Dependency installation was skipped against the verified lock
stamp.

Operator row `page-build-1` uses retained `operator-inputs/page-build-1`.
AST rows use retained
`operator-inputs/support/artroom-proof-reuse-page-ast-20261030-1`, with the
second receipt under `normalized`. Each keeps its original argv and working
directory.
Operator rows have an actual process exit, with no formal capture exit field.
Their elapsed times and stream hashes come from those receipts. AST CPU is
unknown. None of these rows enters the 25-capture formal cost sum.

The table preserves actual argv and paths. Formal exits mean command, then
capture. Costs use seconds. Formal costs include post-guards and CPU means
host child CPU, not guest CPU. Each formal capture closes without timeout or
stream loss at its unchanged clean checkpoint. Operator rows show their own
process exit and timing. Stream cells give bytes and SHA-256. `E` means zero
bytes with SHA-256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
Receipt digests identify exact bytes, not a future manifest.

| Capture and source | Actual command | Outcome and exits | Wall; host CPU | Stdout bytes and SHA-256 | Stderr bytes and SHA-256 | Receipt SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| `dependency-setup-1`; A | `npm ci --ignore-scripts --offline --no-audit --no-fund` | PASS: offline setup, not a test; 0, 0 | 1.136150500; 2.432902 | 29; `4f34ec9721b8b3485e0bd1ecb71e35a4b5b7005e7af86391d83e9bb6fd84d006` | E | `2d67fc96ea24b7b5b18ebb2ef313e4238b792cd0857d85f6cd758ff25bbd8527` |
| `cli-types-accounting-1`; A | `npm run typecheck --workspace @generalbusiness/dap-cli` | PASS: early accounting compiler only; 0, 0 | 1.784895542; 5.746465 | 133; `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | E | `f5dec7572c9504e801947bd1f71a47ef24f53974d7e7d1e5f3630deccf238c14` |
| `pool-compatibility-1`; A | `node scripts/cloudflare-pool-compat.mjs` | PASS: pool 0.22.0 preparation, not a test; 0, 0 | 0.109001083; 0.226535 | 366; `5b14d6b520ef1bdbff64a8ffc3b14c39955fc79beae01e63aec681bd7f5afc41` | E | `83be2a90f19998327a79bf016f5f8e5b81e325ec6abc397a1002088ca3a6c774` |
| `cli-accounting-1`; A | `npx --no-install vitest run --project cli --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/cli-accounting-1/report.json packages/cli/test/verification.test.ts` | PASS: 4 accounting tests only; 0, 0 | 1.551407458; 1.738393 | 417; `008d73155d1134aa4ffcc59fb466f591a0fd77876034b61fb98885e064285374` | E | `f27d27e375cc06b3d1b76e2732f6c1d4ac576c11f2a7b81a66bd66157d50c821` |
| Observed prior-head control H; `native-membership-room-1` | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/native-membership-room-1/report.json packages/cli/test/fixed-slot-membership.scope.test.ts` | Byte boundary with 120,000 ms override, which did not bind; inner CLI 1, Vitest 0, capture 0; timeout 2100 s | 184.973967708; 197.349515 | 4023855; `d672d754183d7fc2fb333e945f5e8a944d472c3973a3f72a47456967432ad9a1` | E | `3b246c5863fe124a16bfd8a59a88133699f991f14909b1dbb01f9f68e53231f0` |
| `cli-types-integration-1`; B | `npm run typecheck --workspace @generalbusiness/dap-cli` | PASS: CLI compiler; 0, 0 | 1.369054250; 5.659236 | 133; `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | E | `b1b2441da51f58dd21f9d1c1943b64a9e6ea1ccc73d99dc73da8ac882fb7fe74` |
| `replay-types-integration-1`; B | `npm run typecheck --workspace @generalbusiness/dap-replay` | FAIL: portable replay compiler cannot resolve structuredClone; 1, 1 | 0.370889208; 0.811013 | 655; `e5f8a946da6d93a87a79bcd61345b03644372ce7676dbb58035951bb5ed506e0` | 477; `931909411609a2c8fd36d62120c61934cd610998d8523a95eccb8ea226570717` | `204fa4afdf6893052707b67f6ad04b83d472678de3801548bc56adbd97de6ba3` |
| `replay-types-integration-2`; C | `npm run typecheck --workspace @generalbusiness/dap-replay` | PASS: replay compiler; 0, 0 | 1.015659750; 3.273105 | 135; `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` | E | `7b966b29156a3f32d81ef2277f4a3da730b2fd9d0d5c89a42245382c2c571339` |
| `cli-types-integration-2`; C | `npm run typecheck --workspace @generalbusiness/dap-cli` | PASS: CLI compiler; 0, 0 | 1.433504125; 5.782629 | 133; `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | E | `e48cb54b3dee6a14cbc9953e37b579bc3996f15fed65a54025bde93e9b101959` |
| `owning-integration-1`; C | `npx --no-install vitest run --project cli --project replay --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/owning-integration-1/report.json packages/cli/test/verification.test.ts packages/cli/test/verify.test.ts packages/replay/test/room-verification.test.ts packages/replay/test/room-recovery.test.ts` | FAIL: 21 passed, 1 fixture definition refused before settlement case; 1, 1 | 2.524883000; 4.275121 | 1080; `e9a71f0b4f41cf3000418296b40ec53cefb735db48dd0692a7eb79af4ff28bd7` | 806; `e0f88e56418c3d9bc644da4285d5a766beb84050bbd9ad92fd4e00c6d7f29602` | `08a9eeb62bdf03642a7385001d033789f8e681022d56410ff6fb5ff11c4b4c46` |
| `replay-recovery-1`; D | `npx --no-install vitest run --project replay --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/replay-recovery-1/report.json packages/replay/test/room-recovery.test.ts` | PASS: all 3 recovery cases; 0, 0 | 1.298887667; 1.904122 | 422; `074aa53446308ede36293cc9519658e5f7c4316ff11b55ea450b5e3e43c4a52a` | E | `bab656613e0176880bbe3135f2f56473092ac1e597a1e8625fd16bc2cd19f796` |
| `replay-types-fixture-1`; D | `npm run typecheck --workspace @generalbusiness/dap-replay` | PASS: replay compiler after fixture repair; 0, 0 | 0.943800000; 3.204845 | 135; `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` | E | `32e8fa808b17109d30dfaca4c6ab06e3af923123c76cc61500e5b7b04e6f042a` |
| `control-unique-entry-1`; D | `node scripts/control.mjs packages/cli/src/verification.ts 'if (knownHash !== undefined) {' 'if (false && knownHash !== undefined) {' --expect 'discovery and log copies' -- packages/cli test/verification.test.ts` | INCONCLUSIVE: baseline 0 passed, 1 failed; no underlying baseline error retained; 2, 2 | 0.286436625; 0.496520 | E | 186; `4af9fa2255104edac05d6ae8f4c035517565de313cc4e7269553b0d3c0eaedc2` | `1a6612da5cf48b3ce4c7fb5c5fe8d61152f31e4bf902e3c4069a0e46d60b5d2a` |
| `control-unique-entry-2`; D | `node scripts/control.mjs packages/cli/src/verification.ts 'if (knownHash !== undefined) {' 'if (false && knownHash !== undefined) {' --expect 'discovery and log copies' -- . --project cli packages/cli/test/verification.test.ts` | DISTINGUISHES: baseline 4 passed; mutant 2 passed, 2 failed; helper qualifies 1 named ordinary assertion; restored; 0, 0 | 2.471295833; 3.302233 | E | 4061; `ad47b46741a954940e353950d9e603935fc3aa75500165bf1cec473a6ed09a7b` | `f3d950e447372c46fd2b0fafe52b25eb6cb64a59e625c51acf63cd1653e88da5` |
| `control-cached-head-1`; D | `node scripts/control.mjs packages/replay/src/verify.ts 'if (root.expected && run.sealed[root.expected.seq]?.hash !== root.expected.hash)' 'if (false && root.expected && run.sealed[root.expected.seq]?.hash !== root.expected.hash)' --expect 'cached requested prefix' -- . --project replay packages/replay/test/room-verification.test.ts -t 'cached requested prefix'` | DISTINGUISHES: baseline 1 passed; mutant 1 ordinary AssertionError, 9 skipped; restored; 0, 0 | 2.320538000; 3.212170 | E | 2951; `d0b45708b89e7f526276229ab50aa64095e2d5f160e046370a473d68d0bf3068` | `cf61d8b05a1ce2c03d13973ff0038f7bc74370d6f7d9bca61687bddbbd66d5dc` |
| `native-room-default-1`; D | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/native-room-default-1/report.json packages/cli/test/fixed-slot-membership.scope.test.ts` | PASS: 1 real room case; default all 2006 scopes consistent; 0, 0 | 140.151371542; 151.006290 | 5432381; `02d53152dfb5e224f31c8a37075983038ce406a11dc272c2625a58af7a57fae6` | E | `a3aa4c6ec1ab83377f672a2983eed5b2166c3dbdd108bc73ffeddf15a4b169d1` |
| `gate-1`; D | `npm run gate` | FAIL: kernel passed; Node 78 passed, 2 failed; Counting, plain and native unreached; 1, 1 | 78.810069375; 141.975584 | 8628; `1b03b58c645cb602545f99cf9b41fe42fb7ba81684fccec3ec77c5652cd6bdaf` | E | `313d8acf863cb34d067fcaab7eb7cb94e74f610ba8675a6b125b366451e76bda` |
| `security-entry-points-repair-1`; E | `node --test scripts/security-entry-points.test.mjs` | PASS: all 10 Node inventory cases after metadata repair; 0, 0 | 2.434078709; 3.139698 | 1300; `6c064b5e0c92f252ddfb995f5b1857efbdddc60ac4fc787890e48ddaa62aab1b` | E | `7d7e9490d77cae4ed3b9d20a786e08e2e360b5fd6f6b22afe3926cdba39a3a92` |
| `unreached-stages-1`; E | `node /private/tmp/artroom-room-proof-reuse-unreached-20261030.mjs --evidence /private/tmp/artroom-room-proof-reuse-evidence-20261030/unreached-stages-1/test-evidence` | FAIL: Counting 56 passed; plain 3129 passed, 1 failed, 1 skipped; native unreached; 1, 1 | 72.666276792; 253.299750 | 491368; `b00e1c2cc1a9d557c3c3c5d4939891412d324e80e4b881888445978646b4f875` | 1201; `7663d850260c3193dd7ad8db97b219a0d836f006a033a3bc83b7d5285e5d6ef8` | `b56cdce742f3f727132c64719b86b538000849c3eb9a5358674f5749854586be` |
| `page-assets-repair-1`; F | `npx --no-install vitest run --project page --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/page-assets-repair-1/report.json apps/room/page/test/assets.test.ts` | PASS: 1 generated Page asset case; 0, 0 | 1.061379416; 1.622861 | 412; `37af6266bb6ea506263740db8f01cd53b025e289e5760fc1d85d36a1deb0975f` | E | `8e5aeb6d144781e2e68b5b077f4be53eb5a84873dbbeaaca77461b6bc24e30ff` |
| `gate-2`; F | `npm run gate` | FAIL: kernel, Node 80, Counting 56 and plain 3130 passed, 1 plain skipped; native 841 passed, 5 failed, 2 skipped; 1, 1 | 1270.095820333; 2675.502764 | 7602; `982ab92465303245e02ed853d733b26482249f0c199246a69c2a42d51dbbc3b7` | E | `af2f68c9f5cf66f83bb0b37dbb65bede6a2b42e584de3d5dbb84715d822b642b` |
| `lanes-types-output-1`; G | `npm run typecheck --workspace @generalbusiness/dap-lanes` | PASS: lanes compiler; 0, 0 | 1.318997458; 5.477198 | 135; `b91d29384f35cb1d0b20da37e74ed8bda5d069d9bbf6ede67718ff209e87c945` | E | `60feae2552e0eaaf8755524008d5e9506992278ec7b2623ecb1f2790730a62f8` |
| `scripts-types-output-1`; G | `npx --no-install tsc -p scripts/tsconfig.json` | PASS: scripts compiler; 0, 0 | 0.593907375; 1.785700 | E | E | `c3a87ed3342df46f20868182e5dc10b55d44c1f76bf1e1477dc9bd5ce7db3dd6` |
| `room-output-repair-1`; G | `npx --no-install vitest run --project lanes --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/room-output-repair-1/report.json apps/room/lanes/test/rehearsal-stops.test.ts apps/room/lanes/test/demo.scope.test.ts apps/room/lanes/test/issues.scope.test.ts` | SETUP FAIL: localhost listen EPERM before tests; underlying stderr retained; 1, 1 | 1.413216833; 2.011100 | 90; `213fda08c0b790a42922bca1644523942f10c8a22f8d1a17eed4cce0e2c8be31` | 593; `6440e32fcb6670b0f517bed7f799561659e9e9fcb736b839b288e47123a3269a` | `d1c7b4565c6522c7752cd794ecf4d8fdccc48cdeff712cc845e0266f28d40b9f` |
| `room-output-repair-2`; G | `npx --no-install vitest run --project lanes --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/room-output-repair-2/report.json apps/room/lanes/test/rehearsal-stops.test.ts apps/room/lanes/test/demo.scope.test.ts apps/room/lanes/test/issues.scope.test.ts` | PASS: 9 cases, 1 skipped, 3 files at unchanged G; 0, 0 | 27.601504833; 35.473587 | 69465; `ef6f3049977ca8466aac3fa6e7054ee6be5dce8af770dbc660f0a3e4b54e3252` | E | `9f89d47a317b6fd7835661f1a4df61132dc89075b18e246baacca58ab4504a3b` |
| `gate-3`; G | `npm run gate` | PASS: kernel, Node 80, Counting 56, plain 3131 passed with 1 skipped, native 846 passed with 2 skipped; 0, 0 | 1016.673974584; 2154.928362 | 6219; `0d59a59c75b1676c2bc1a3fcf942f6199a9cce69db3e39423fdf35570d6b8e67` | E | `3ffe4fa9e3c4fb66d9f9ea540bdfa3cbc1c7902bdd7554cbd0cc9b9edddf783d` |
| `page-build-1`; OPERATOR, E source generation | `npm run build --workspace @generalbusiness/dap-page` | OPERATOR: generated asset; exit 0; no formal capture exit | 0.325675083; 0.200452 | 212; `216bbd36e9c6308f647551161897e544d41528552e5102961b229a71d9a3a230` | E | `af15776b969ac6bcb3fdb75d8c05ec45c89ac0c14759c73cecdce1f4bb231843` |
| `page-ast-1`; OPERATOR, before/after asset inputs | `node /private/tmp/artroom-proof-reuse-page-ast-20261030-1/analyze.mjs` | OPERATOR: syntax readback only; exit 0; no formal capture exit | 0.484762915992178; unknown | 1921; `b1f4c86549a3f39032558d7bc088f20279c69b5de70a33203922a7772b962e6e` | E | `4ed85173409f9db912bbf8bbdff03417b2d697407ea18dca155794d390be6485` |
| `page-ast-normalized-1`; OPERATOR, before/after asset inputs | `node /private/tmp/artroom-proof-reuse-page-ast-20261030-1/analyze-v2.mjs` | OPERATOR: syntax readback only; exit 0; no formal capture exit | 0.5005387919954956; unknown | 1845; `613d200bb5fea526c3a26136fd2fc92d257064b8e59c24f9b89212a11e96420d` | E | `807e6f702ec89e70fe2c5d5fc3a7c189c692ffe9c068208e6225c2ad540765e4` |

The first four formal captures total 4.581454583 seconds elapsed and 10.144295
seconds host CPU. The first 14 total 18.616403041 seconds elapsed and
42.065289 seconds host CPU. The first 19 total 313.739578875 seconds elapsed
and 593.109472 seconds host CPU. Adding failed gate 2 brings 20 to
1,583.835399208 seconds elapsed and 3,268.612236 seconds host CPU. The first
24 total 1,614.763025707 seconds elapsed and 3,313.359821 seconds host CPU.
All 25 closed formal captures now total 2631.437000291 seconds elapsed and
5468.288183 seconds host CPU, within 03:21:10.726878 to 05:15:27.760093 UTC.
These sums include failures, INCONCLUSIVE and post-guards. They exclude the
three operator rows, other source work, inspection and note writing. They are
not one pipeline. No cache or isolated-load claim follows. AST CPU is unknown.

`operator-inputs/machine-native-room-1.json` records Darwin arm64, Node v26.13.0,
npm 11.20.0 and load 1.518, 1.625, 1.579 at 04:01:32.634342 UTC, rounded
to three decimals. Its initial sysctl hardware read was refused.
`operator-inputs/machine-native-room-1-hardware.json` records the separate
successful read at 04:01:49.177510: Mac17,7, 18 CPUs and 64 GiB. These are
host observations, not project results or per-command load monitoring. Cache
state remains unknown. They imply no native callback or physical celld CPU
attribution. They do not themselves establish a room outcome.

Additional operator snapshots are `operator-inputs/machine-gate-1.json` at
04:05:53.486399 UTC, load 1.459, 1.755, 1.661;
`operator-inputs/machine-unreached-stages-1.json` at 04:17:45.101776,
load 2.217, 1.932, 1.792; and `operator-inputs/machine-gate-2.json` at
04:29:23.437567, load 1.614, 1.875, 1.913. Loads round to three decimals.
Each is one observation before its named invocation. Cache state remains
unknown, without a controlled reset or per-stage monitoring. The gate 2
snapshot itself supplies no gate result. Its closed outcome is recorded above.

`operator-inputs/machine-gate-3.json` records one observation before gate 3 at
04:58:24.258077 UTC, load 1.608, 1.903, 2.367 rounded to three decimals.
Hardware and tool versions remain in the earlier snapshots. Cache state is
unknown, without a controlled reset. This is not continuous load monitoring
or a gate result.

The historical control's snapshot at 00:46:53.332894 UTC is now retained at
`operator-inputs/historical-control/parent-machine-room-1.json`. It records
Darwin arm64, Mac17,7, 18 logical CPUs, 64 GiB, Node v26.13.0, npm 11.20.0
and load 1.43, 1.28, 1.30. It is one old-run snapshot, not a cache observation
or a machine record for the child captures.

Normal preparation copied the reviewed evidence to the durable root.
`finalization/receipt-audit.json` records 25 complete captures with no integrity
or closure issues. The control tool's INCONCLUSIVE exit 2 remains an inconclusive
test result in a completed capture. The audit adds no project test or acceptance.
The accompanying manifest records the collection and its retention rule.

The manifest is `notes/implementation/evidence/2026-10-30-room-proof-reuse.manifest.json`.
It names source checkpoint G and the durable root. Each formal table row cites
its six core leaves: command, process, receipt, source index and both streams.
Retained Vitest reports and the historical control's core leaves, report,
original index and parent metadata are explicit extra citations. Complete
`operator-inputs` and `finalization` units are bound by their own indices.
The root index covers every retained file. Original execution paths in argv,
source maps and receipts remain unchanged after copying.

The operator unit includes the three complete gate outputs, each original
Counting output with its source mapping, the copied historical control and
public source-generation and parser support. Preparation and audit establish
copy and receipt integrity; they add no project test. The root index is the
last evidence write. Finalization removes write bits and verifies the full
index and manifest by readback. Retain this read-only root for at least 30 days
after landing. Later removal requires a planner act naming this manifest.

## Open limits and owning requests

Request `7c0e8181a4edc7c45a00f5b4cc3815e98a61f890` owns exact-head review
and landing. Gate 3 passes at G. Existing replay tests remain byte unchanged.
The final head adds only this note and its manifest to G; source and tests
remain unchanged under `docs/testing.md`. The Gitseq report supplies both tree
hashes for that documentation-only follow-up. No additional gate is required.
Checker acceptance and landing remain separate recorded acts.

Load findings request `a6847815c845145adddca1476342e52b6a8baf82` retains
the deployed CPU and production-load questions. The TEST timing is one local
observation, not a controlled speed comparison or a worst-case memory or runtime
bound. It does not explain the deployed CPU finding. Parent index results remain in
their own note. The historical row serves only the accepted boundary control.
