# Harden certified Rules publication

Request: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:5e6d482cbf1712a4c62294421663f3b58f099f70`. The choices follow planner decision `e17cbaa47238d726366ed392a2fd85ca798cc635`.

The hardening uses the explicit successor family R20/D19/M8/Q12/G15/I1. G15 adds publication-record admission and certificate decline handling. Q12 adds the one-use publication rule. D19 names those new child pins, and R20 names D19 as its creating definition. Membership and Inbox retain their existing pins. The shipped Q11, G14, R19, and D18 definitions retain their data and rules. Existing scopes keep their genesis pins and evaluators. The implicit default cohort, public creation policy, and Grow configuration remain unchanged. Support for the explicit family does not enable that family in a deployment.

G15 ties its complete `passes` record to the scope's actual `Bounds.entryBytes`. The check reserves space for the native entry envelope and the full allowed cohort of future generation proofs before the first policy capture. The reserve includes non-required names that a later fence can introduce. It uses bounded maximum forms for facts, identifiers, escaped names, numeric fields, times, and observation records. Foreign signed entries remain separately retained facts. Their references, rather than their complete foreign bodies, occupy this carrying entry.

Admission checks both the record with its future proof reserve and the complete capture envelope. The capture forecast includes the outcome, origin uses, ordinary effects, operation openings, and the declared observation cohort. A capture that cannot fit receives `evidence-too-large` and leaves the publication `not-reserved`, before a `passes` value is stored. The admitted record also leaves room for its later fence and check-completion entries. The guarantee covers this bounded G15 protocol under its retained bounds. The conservative cohort reserve can refuse a policy whose immediate record alone would fit. It deliberately avoids accepting that policy and discovering an unwritable record later. The native witness measures the complete stored entry independently of this forecast.

Q12 treats the existing `certificate.request` provenance as a monotone one-use marker. After the first publication, another accepted certificate must name the same full Destination reference and a strictly greater request sequence. The full reference includes the scope, incarnation, and kind. An equal sequence receives `rules-certificate-used`, an older sequence receives `rules-certificate-stale`, and a different full Destination reference receives the destination-mismatch refusal. Invalid stored provenance fails closed. The marker commits atomically with the published policy. This choice prevents reuse without a history scan, an unbounded consumed-certificate set, or a cross-scope consume transaction. Refusing a switch to another Destination also prevents a switch away and back from resetting the marker. A newly certified later request from the same Destination remains eligible, subject to the ordinary checks.

Certificate publication still requires authenticated native sibling births, the exact G15 opening, the retained policy and tree proof, and a confirmed outcome selected for that opening. Caller-supplied digests or host observations do not establish those facts. The host binds its read to the captured repository, ref, commit, and full request fact. G15 checks for an intervening native entry before I/O and again after the held read. The native before-send hook can refuse without a provider read. If an entry lands between the host's return and outcome recording, native judgment rejects selection and derives the same named decline. The confirmed host input remains intact in that final race. There is no outcome-normalization change or new kernel contract.

Each real decline is recorded in its immutable outcome entry as `certificate-declined`, with the full request fact and a full `interveningFact`. Native code derives that fact from the current observed Destination head before the outcome. It does not grant authority to the host's claimed hash or select a fact according to which historical entries happen to be available. That rule gives full-history and floor replay the same answer. The branch's `rulesCertificateDeclined` value is the latest completed answer, so later completions can replace that cache. The immutable outcome preserves each answer. The cache is separate from Q12's consumed-certificate marker. A fresh request can succeed after the Destination becomes quiet. A member who deliberately keeps adding entries can continue to prevent certification. This remains the intentional entry-flood liveness limit described in `5e6d482c`.

The platform floor hook recognizes the exact G15 decline type and genesis pin. It retains the local request and intervening entry positions named by the current decline record. The hook requires the same full local scope reference for both facts. Historical definitions keep their earlier floor roots. Existing live publication and operation roots still preserve the native origins that their readers follow.

The Page keeps Q11 and Q12 read-only and now says: “Certified rules are read-only in this page. No user-facing publish command is available yet.” The exact pin check covers those two versions. This change adds no publish command or Page editing path. The wording describes the shipped interface instead of directing a member to an unavailable workflow.

The final capture forecast counts reference writes in the longer stored value form. Native diagnostic V5 showed that two branch pointer writes gained five canonical bytes each after the budget callback. Commit `669f5d91` accounts for that ten-byte transformation. Selection remains native and unchanged. Q12 also allows its unconfigured optional certificate slot to be empty (`null`); configured missing provenance and malformed non-null values still fail closed.

The native certificate file passes all four cases: first/fresh/used/stale publication, and intervening entries before send, during the tree read, and after the actual host answer. In the first two refusal cases the native attempt is nonselecting (`null`); the final confirmed race records `selected:false` and preserves the original host evidence. The size witness passes with 32 real signed check proofs under one deciding key, a coherent admitted/next-refused padding boundary, complete stored-entry checks, and consistent replay. This boundary is maximal within its stated grammar-valid padding construction, rather than a largest-policy claim over every shape. The paired controls distinguish omitted reuse, final-race decline, capture admission, and floor roots by their intended assertions.

## Evidence

Raw directory: `/Users/hughpyle/play/artroom-evidence/2026-10-26-r7-hardening-delivery`. Each phase retains its full command, commit, tree, source status, output digest, wall time, child CPU time, and driver. The private physical dependency view reuses the existing exact-lock capsule, with 14 workspace links rebound to this worktree; no installation or cache reset ran. Generation and asset builds are source mutations, not passing clean-checkpoint validations. Early generation had untracked native test files, explicitly recorded in its result. All failed integration runs remain separate below.

The ordinary gate at `04ed601d6bbeae64863c6be7121e069e868feb35`, tree
`d09d223faf5d7baa6af5df055c85e4ec8ff5634f`, failed naturally with exit 1.
It took 71.694346 wall seconds and 118.768294 child CPU seconds, measured
around the unchanged `npm run gate` command. Kernel passed; Node had 56
passes and one failure. Counting, plain and native were unreached. The
failure was a source-seal expectation in `security-entry-points.test.mjs`,
not a runtime authority assertion. The original logs remain separate.

A builder source review found 12 stale seal literals over 11 changed
owners; `object.ts` has two rows. The review checked the explicit family
lists, native creation and archive bindings, configured bounds, and host
revalidation against the intended contract. No route matcher or gate
class changed. The repair at
`1e58a6a5e1cf6539a540aa7aeb0e73e237d69c7d`, tree
`fe8b288d1e90e033a48053e48d5afb2bbe1723cf`, changes only those literals.
All 70 map rows and every assertion remain. No production, imported
helper, configuration, dependency or compiler input changed. The whole
owning Node file then passed. This follows the limited follow-up rule in
`docs/testing.md`; it does not turn the failed gate into a pass.

The first follow-up executions of the unreached stages used clean
`1a06191bcada5091b20d91d238093d1cbe8d348f`, tree
`e77278af5cada58fcad9862e537924fbc65c4b00`. Counting passed 55 cases in
2.040181583 wall seconds; plain passed 2848 cases with one skip in
62.489929792 wall seconds. Native failed naturally after 959.463545208
wall seconds and 1847.630373 child CPU seconds. V8 exhausted its heap
near 1.4 GB, then Miniflare restarted the runtime. Later Vitest-state
errors followed that restart. Final case identities reconcile to 784
passed, two skipped and two pending; module identities reconcile to 230
passed, one skipped and one pending. One unhandled Worker error remains.
The timing record's `reason:"passed"` does not establish success when its
unhandled-error count is one and the command exits 1.

Both pending cases belong to `maintained-application-projections.test.ts`.
A single fresh execution of that unchanged module, with the same native
configuration and resource limits, passed both cases with no unhandled
errors in 14.244790542 wall seconds and 15.937134 child CPU seconds.
The separate Lending and denial projects passed in the failed full run.
This diagnostic does not replace the failed Native phase or identify its
allocator or physical worker. Nearby floor-archive output does not prove
causation; that floor case subsequently passed. Raw forensic reconciliation
is retained in `native-followup/failure-forensics.json`.

The G15 budget case passed within that failed Native phase. Its awaited
annotation reports `entryBytes:262144`, `maxStoredEntryBytes:88084`,
`maxPassesRecordBytes:83907`, `proof32RecordBytes:83907`,
`proof32EntryBytes:88084`, `positiveCaptureForecastBytes:262144`,
`positiveCaptureBudgetBytes:262144`, `positiveCaptureActualBytes:63927`,
and `negativeNextForecastBytes:262146`. These are measurements of that
case, rather than evidence that the full phase passed.

The bounded memory investigation began at
`a51b0ac384339aa4ad24d42848b846634afbb1aa`, tree
`cef54deb8952201ad29bad703c6a515757d62355`. The first observer command
failed before tests because this Vitest CLI rejects `--runner`. A temporary
configuration wrapper then loaded the observer. `process.memoryUsage()`
did not provide usable heap readings in workerd. An experimental pool
adapter enabled the loopback inspector through copied configuration
views. The adapter preserved the two-worker bound, `isolate:false`, cases,
assertions, and deadlines. Its instrumentation adds allocations and
scheduling overhead. Its successful runs are diagnostic observations,
rather than ordinary validation passes or replacements for the failed
Native phase. Each instrumented phase retains its exact adapter, observer,
driver, source hashes, and result under the raw directory named above.

The first seven-case window selected the four certificate cases, the G15
budget case, and the two maintained-application projection cases. It
sampled heap usage once a second, with normal GC and no forced collection.
Both experimental seven-case comparisons and the later clock comparison
completed all seven cases with no unhandled errors. These small selections
do not establish whole-suite success. The heap sampler maps local
inspector runtimes for these runs. It does not identify the physical
worker or retaining paths of the earlier full-suite crash.

An initial Counter allocation profile retained live samples. A second
profile, taken with the temporary parser candidate, also retained samples
for allocations collected by major or minor GC, as defined by the
[CDP protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/js_protocol.pdl).
That second profile assigned 3,615,421,544 of 4,593,500,284
sampled allocation bytes to frames in `@vitest/spy`. Those totals describe
sampled allocation volume during the profile window, including collected
objects. They are not measured live heap or an exact allocation census.
The stacks pass through Git pack inflate work in
`packages/git/src/http-read.ts`.
Source inspection connects that work to the projection fixture's
`vi.spyOn(Date, "now").mockReturnValue(now)`: inflate repeatedly polls
`Date.now`, and the unused spy records each call and result. The test
never asserts on that history.

A parser candidate at `f22dfe174a503192dd4091185a3cb095453721bb`
replaced character-by-character string accumulation with ordinary-run
slices. Its one-process synthetic 1 MiB string comparison reduced the
observed heap after parsing from 44,653,896 to 10,517,064 bytes. Its 2981-case
finite differential check found no differences in canonical output or
exact parser errors. The owning parser tests and compiler passed. Those
results did not explain the Native memory problem: the same seven-case
Native window still reached 1,226,066,304 bytes in the reused runtime that
ran the projection and certificate files.
Commit `33ec61b284802c0a4adf723915aa3ac11ec1bd78` withdrew the parser
candidate. No parser or other production change from that investigation
remains relative to `a51b0ac384339aa4ad24d42848b846634afbb1aa`.

The retained repair at `a9232f009a7a470fe7be17820f7fed4eb5fb1778`, tree
`efb7282b4bc210a1d43a88965f4461bb8ab50bb9`, changes only
`maintained-application-projections.test.ts`. It replaces the recording
spy with a function returning the same fixed time, and restores the prior
function during cleanup. The assertions and 30-second case deadlines
remain unchanged. On the same seven-case selection, the reused runtime that ran the
projection and certificate files had a largest sampled heap of 159,845,596
bytes, compared with 1,249,323,620 before the clock repair. The baseline
peak occurred after the certificate file started. These are runtime peaks,
not memory attributed exclusively to a projection case. All observer
sources were identical in the baseline and fixed-clock windows. The
budget runtime's largest sample was 159,935,460 bytes, compared with
165,205,424 before the clock repair. The complete diagnostic took
63.200280458 wall seconds and 72.859324 child CPU seconds. These are
one-run observations with normal GC and instrumentation overhead, not
performance thresholds or proof of retained size.

The ordinary owning projection command passed both cases with no
unhandled errors in 8.137638291 wall seconds and 9.769300 child CPU seconds.
The scope compiler passed in 1.364059084 wall seconds and 5.928494 child
CPU seconds. Commit `89a343e00cc4d8745b5336a1b31cc98dd7b5e037` then
merged Main's sprint-report documents. The original gate and Native
failure remain separate failed results. No heap increase, extended
deadline, fixture relocation, or case removal has been used to make them
pass. Planner decision `6634c94c293fb6f956244e30e8a115330543e0e8` puts
this hardening first, then archive-capacity request
`0f0eeab748533208c813092ebf1ad0dab5087105`.

The fresh ordinary gate passed at clean
`1c5025051c500d26695fb8e0cbb0900f99568488`, tree
`58ce7107f77def850bde48228df601f3d2cd887a`, with source unchanged through
natural completion. It took 876.985378958 wall seconds and 1857.050867
child CPU seconds around the unchanged `npm run gate` command. All static
checks, compiler contexts and five test stages passed. Final identities
reconcile to Node 57 passed, Counting 55 passed, plain 2848 passed and one
skipped, and Native 786 passed and two skipped. Native's 232 modules are
231 passed and one skipped. There are no duplicate or conflicting final
identities and no unhandled errors. The final records, stdout totals and
four Counting generated-source mappings agree. The two skips are retained
in those totals.

The final gate's awaited G15 annotation reports a largest complete entry
of 88,072 bytes and a 32-proof record of 83,907 bytes. Its actual capture is
63,903 bytes against the 262,144-byte bound. The positive forecast remains
262,144 and the next constructed forecast 262,146. These are this run's
concrete entry measurements; the earlier failed phase's measurements above
remain separate.

The [evidence manifest](evidence/2026-10-26-r7-hardening-delivery.manifest.json)
names this gate checkpoint and every retained raw file. The raw directory
has a final `SHA256SUMS` and is read-only. After the gate, only this note and
that manifest change. Production code, tests, configuration and dependencies
are unchanged. The reporting artifact names both the tested and reviewed
tree hashes; no second gate is needed for this document-only follow-up.

For the new investigation rows below, the command is the recorded child
command. Instrumented phases retain their observation environment and
outer procedure in `result.json` and `driver.py`, with temporary configuration
and profiler sources beside them. The synthetic parser rows use
`parser-runs-synthetic/before.result.json` and `candidate.result.json`,
plus the retained benchmark source. They name source digests instead of Git
commits because that candidate was not yet committed. The table records
outer command outcomes, including diagnostic successes that confer no
validation claim.

| Check | Command | Commit | Exit | Output SHA-256 |
| --- | --- | --- | --- | --- |
| `generation` | `node packages/platform/scripts/pin-native-declarations.mjs` | `352bd43ca4677e4d97326681e4553184cc958acc` | 0 | `5e7f279f6a63bda438c4b039f56a0e742b8c22bfbb1e1864b2dd472de2b44966` |
| `page-build` | `npm run build --workspace @generalbusiness/dap-page` | `64ded005a873765d9746be23e132b5e98ee0029c` | 0 | `1cca0f3214c5c8ceccc867042c3ffcae2ee7c0373a17c09367223b4027074704` |
| `platform-compiler-v1` | `npm run typecheck --workspace @generalbusiness/dap-platform` | `60fe3572d1e0eb7c9835fbb62e0d75df1e714dff` | 1 | `3cc1a9c9294c72e3971240fb5641ed1cfa415339c15f3a0c594c7077d7d83473` |
| `platform-compiler-v2` | `npm run typecheck --workspace @generalbusiness/dap-platform` | `73096a832054c0f2a64266364acbac46b8a68700` | 0 | `8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3` |
| `scope-compiler-v1` | `npm run typecheck --workspace @generalbusiness/dap-scope` | `73096a832054c0f2a64266364acbac46b8a68700` | 0 | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| `dependent-compilers-v1` | `npm run typecheck --workspace @generalbusiness/dap-derive --workspace @generalbusiness/dap-git --workspace @generalbusiness/dap-cli --workspace @generalbusiness/dap-checkers --workspace @generalbusiness/dap-replay --workspace @generalbusiness/dap-lanes --workspace @generalbusiness/dap-page` | `73096a832054c0f2a64266364acbac46b8a68700` | 1 | `4bfc255a8ac89ba38454bd8dac2686307cb549379fb9d457ceffd1e88146415e` |
| `remaining-compilers-v2` | `node node_modules/typescript/bin/tsc -b apps/room/lanes/tsconfig.scope.json packages/platform/tsconfig.test.json` | `440ea07783a63c41577915ee9d3119ceec088991` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `plain-owning-v1` | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts --project platform --project page --project git destination-budget-v15.test.ts floor-readers.test.ts rules-scope.test.ts archive-policy.test.ts rules-summary-v11.test.ts assets.test.ts` | `440ea07783a63c41577915ee9d3119ceec088991` | 1 | `af6e5574f39b4fd54077ba374adbe780b6a637749f96d44df96d09a921409714` |
| `page-build-v2` | `npm run build --workspace @generalbusiness/dap-page` | `90a4073255d0926698fddb94b3533f3619fe5dc6` | 0 | `82c0088790d30a807a42465984ce593b2c44eb5e7af290d19e15431704357374` |
| `native-pool-preparation` | `node scripts/cloudflare-pool-compat.mjs` | `cf3a60505be3fe46871a3ef4717b0d66ee513b55` | 0 | `1a259f878aac220732ac6b6a7890f3243103979380eb628264663310ce746137` |
| `plain-owning-followup-v2` | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts --project page --project git archive-policy.test.ts assets.test.ts` | `cf3a60505be3fe46871a3ef4717b0d66ee513b55` | 0 | `5d60026087d19ad3eda878981eca61301c6921a8840a069e4ad26ece088fccc2` |
| `native-owning-v1` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope certified-rules-hardening-certificate.scope.test.ts certified-rules-hardening-budget.scope.test.ts` | `cf3a60505be3fe46871a3ef4717b0d66ee513b55` | 1 | `84e78a60fd9b840e141aaf6e59a2f2a93e916a4cb323e51f31d0b16315cfcff7` |
| `native-certificate-followup-v2` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope certified-rules-hardening-certificate.scope.test.ts` | `ebb84c39c9276408ab35205c2c21caa3283d0801` | 1 | `70d8d9d213c96cffd8760ad0aaabb7a71405af540cbf4c846d04aaf0f1dd7c75` |
| `native-owning-followup-v3` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope certified-rules-hardening-certificate.scope.test.ts certified-rules-hardening-budget.scope.test.ts` | `4373f546621240787fae39cf5718e9289c57ec0b` | 1 | `28f438da28acbe3d6ee1763ee9c60fbee478fffbfba6926cd855bc60a2f0c016` |
| `native-version-goldens` | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts --project platform versions.test.ts` | `d81c7a10985747a212e8c8f8520ee272ce841a3b` | 0 | `a42c2a171d0475abebdeb972f08cbec5a3ff84cb17a51168c66217305a1820a3` |
| `floor-paired-control` | `node scripts/control.mjs packages/platform/src/floor.ts 'if (genesis?.type === "genesis" && genesis.seed.definition === "platform:destination@15") {' 'if (genesis?.type === "genesis" && genesis.seed.definition === "platform:destination@15" && false) {' --expect 'G15 keeps both local facts' -- packages/platform test/floor-readers.test.ts` | `d81c7a10985747a212e8c8f8520ee272ce841a3b` | 0 | `63c116134c241cfd68cfafad48b9743b4193749ec4776f535f0741e435f25e9b` |
| `native-budget-followup-v4` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope certified-rules-hardening-budget.scope.test.ts` | `1d5cab9f0219611571144421e865bb400b54ded3` | 1 | `3c472eed37b2e7dbaf3e2d00e2f9c410d6fef5adc1f488d084caa2002b1ac3c7` |
| `reuse-paired-control` | `node scripts/control.mjs packages/platform/src/rules-scope-v12.ts 'if(certificate.provenance.request.seq===previous.request.seq)return {ok:false as const,reason:'"'"'rules-certificate-used'"'"' as const};' 'if(false&&certificate.provenance.request.seq===previous.request.seq)return {ok:false as const,reason:'"'"'rules-certificate-used'"'"' as const};' --expect 'Q12 consumes a certificate once at a fresh revision and keeps the full Destination reference' -- . --config vitest.native.config.ts --project scope certified-rules-hardening-certificate.scope.test.ts` | `1d5cab9f0219611571144421e865bb400b54ded3` | 0 | `5a1bb5e075df8d485fafad50ae57b31048155eeb57b02880e8999d3b04a00ee2` |
| `budget-diagnostic-compiler` | `node node_modules/typescript/bin/tsc -p apps/room/lanes/tsconfig.scope.json` | `b1c30f92a297fcf5c590e89e810180d8689fb091` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `native-budget-diagnostic-v5` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope certified-rules-hardening-budget.scope.test.ts` | `b1c30f92a297fcf5c590e89e810180d8689fb091` | 1 | `58d2aa0258f1ccd0e827577f760aa85772fc298fadbbf22a9b7814b87e070781` |
| `native-budget-followup-v6` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope certified-rules-hardening-budget.scope.test.ts` | `7665c2ede63089a59ba6ad1748170c6b76fd7b86` | 0 | `66f63b6a3343a5b6d4c67214ce1ad49468a40bb12cf789e153b1304bc5121b1b` |
| `decline-paired-control` | `node scripts/control.mjs packages/platform/src/destination-v15.ts 'const finalRace=given.input.result==='"'"'confirmed'"'"'&&selected===false&&validConfirmed(given,operation)!==null;' 'const finalRace=given.input.result==='"'"'confirmed'"'"'&&selected===false&&validConfirmed(given,operation)!==null&&false;' --expect 'G15 names a real intervening native fact at heldAnswer' -- . --config vitest.native.config.ts --project scope certified-rules-hardening-certificate.scope.test.ts` | `7665c2ede63089a59ba6ad1748170c6b76fd7b86` | 0 | `136200e36c8e6b231027df74115628a38cbdaa8e694a167ac1ca5331fb49a04a` |
| `budget-paired-control` | `node scripts/control.mjs packages/platform/src/destination.ts 'if (!certifiedReservationBudgetV15(given, captured, { effects: decided.effects, opens: decided.opens, sends: [], uses: origin.entry.uses }).admitted) {' 'if (false && !certifiedReservationBudgetV15(given, captured, { effects: decided.effects, opens: decided.opens, sends: [], uses: origin.entry.uses }).admitted) {' --expect 'G15 admits the maximum constructed capture, retains 32 real proofs, and refuses the next capture before storing passes' -- . --config vitest.native.config.ts --project scope certified-rules-hardening-budget.scope.test.ts` | `1c38e61605e7fda7b7e76cbc5346dfd4e64e855d` | 0 | `23245ddbe54363922ecc196a7c19dc9bbe687de175ab90272f8df8de7c050d4d` |
| `page-build-final` | `npm run build --workspace @generalbusiness/dap-page` | `1c38e61605e7fda7b7e76cbc5346dfd4e64e855d` | 0 | `59e502fdc454525702ac735b5c78ec5ad9e96d448b4a5b08553ecbb36e773ebe` |
| `final-owning-compiler` | `npm run typecheck --workspace @generalbusiness/dap-platform --workspace @generalbusiness/dap-lanes --workspace @generalbusiness/dap-page` | `f5b59e4e45b0d6f1d2978375791c8ca2ce904164` | 0 | `9bfde5b6d34064ac53ad8a7772762c119a83fdb62d6c6987128b522a106028a3` |
| `final-owning-plain` | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts --project platform --project page destination-budget-v15.test.ts assets.test.ts` | `f5b59e4e45b0d6f1d2978375791c8ca2ce904164` | 0 | `d83ebef11f9221f6aca11809435ba1a5fbb64f46b81a2874bba5482a2a61bee0` |
| `ordinary-gate` | `npm run gate` | `04ed601d6bbeae64863c6be7121e069e868feb35` | 1 | `da5c0b72bd911e011e81c1c42a23ed53a9177f034c2a867b512f9f192d377c9a` |
| `security-seal-followup` | `node --test scripts/security-entry-points.test.mjs` | `1e58a6a5e1cf6539a540aa7aeb0e73e237d69c7d` | 0 | `fa5e30c37c61b0b945f2236c226d1a2c7f0a2209c1f04f4039181d70b62f18da` |
| `counting-followup` | `node apps/counter/scripts/test-browser.mjs` | `1a06191bcada5091b20d91d238093d1cbe8d348f` | 0 | `a913ab107e2ab500aaa886bbf50e8f909bed05735395716325aa89d3cba9f96d` |
| `plain-followup` | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts` | `1a06191bcada5091b20d91d238093d1cbe8d348f` | 0 | `8bf9814a59df4b2835c3f7235b3b3d094e3af4a3a417294fd7acdbc94de2ed0c` |
| `native-followup` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts` | `1a06191bcada5091b20d91d238093d1cbe8d348f` | 1 | `bae43e1a0110bffe18cabc447db77693d8377570741cf69c12430bcc8f2dc802` |
| `projection-diagnostic` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope maintained-application-projections.test.ts` | `1a06191bcada5091b20d91d238093d1cbe8d348f` | 0 | `f1df623d27278af4cb37e09393b947a9b1ac1b5b79ac58e0e5bae5cee65f95b0` |
| `memory-observer-capability` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope maintained-application-projections.test.ts --runner /private/tmp/artroom-native-memory-runner-20261026.mjs` | `a51b0ac384339aa4ad24d42848b846634afbb1aa` | 1 | `c9dca6a689f498b7caf15622e9ad5ed3776791562daa6a8ceaef4bc17c2a9398` |
| `memory-observer-capability-v2` | `node node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-native-memory-config-20261026.mjs --project scope maintained-application-projections.test.ts` | `a51b0ac384339aa4ad24d42848b846634afbb1aa` | 0 | `0e819acc6dd01d750ec02b9987f80574efbdcc1d754f85a942ce2fe338855bed` |
| `inspector-capability` | `node node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-native-inspector-config-20261026.mjs --project scope maintained-application-projections.test.ts` | `a51b0ac384339aa4ad24d42848b846634afbb1aa` | 0 | `0f8ef97aba3b05f74e356e0c52ff5276c7fbdcbe7fe14005749c3f621fff9013` |
| `heap-window-seven-cases` | `node node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-native-inspector-config-20261026.mjs --project scope certified-rules-hardening-certificate.scope.test.ts certified-rules-hardening-budget.scope.test.ts maintained-application-projections.test.ts` | `a51b0ac384339aa4ad24d42848b846634afbb1aa` | 0 | `bfc8e2f191509e3c3c3499d3e719cf83fa805f4f4bfcc740ed161eec3760dd82` |
| `projection-allocation-profile` | `node node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-native-inspector-config-20261026.mjs --project scope maintained-application-projections.test.ts` | `a51b0ac384339aa4ad24d42848b846634afbb1aa` | 0 | `66880d46a929556ceb401e7d1c27ebedbb9d98a8fe0a53f26352c3127f1c9d03` |
| `parser-synthetic-before` | `node /private/tmp/artroom-canonical-runs-benchmark-20261026.mjs /Users/hughpyle/play/artroom/.builder-worktrees/r7-hardening-20261026/packages/bytes/src/canonical.ts` | source SHA-256 `fe90f1b5b7aba1ab15fd956a981676d50449e59b9370955204995ae1c124da5e` | 0 | `e3847115600ea3c23d2efa6ef0b29c5d35f38b3f3bd543c46eb29335e3a8569a` |
| `parser-synthetic-candidate` | `node /private/tmp/artroom-canonical-runs-benchmark-20261026.mjs /private/tmp/artroom-canonical-runs-candidate-20261026.ts` | source SHA-256 `6dac5a521178a2ddf02d6ec7ac8311e98d263320d19f5c1882391ed501a6ab55` | 0 | `f388b9873155956d650c8b7110e33a78b53eb1c8e1e8ebd02ee3b9e0f6eba77b` |
| `parser-differential` | `node /private/tmp/artroom-canonical-runs-differential-20261026.mjs` | `f22dfe174a503192dd4091185a3cb095453721bb` | 0 | `d47cf05481a7689648b93c8d536ed2d8c1d5f37a0620bc07aa4ee5b651e1b680` |
| `parser-owning` | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts --project bytes canonical.test.ts` | `f22dfe174a503192dd4091185a3cb095453721bb` | 0 | `3f6cd6063c85bc1cf57d8a9a02428553a5a2fd0f83613d445ae78aa6a0bd10f8` |
| `parser-compiler` | `npm run typecheck --workspace @generalbusiness/dap-bytes` | `f22dfe174a503192dd4091185a3cb095453721bb` | 0 | `ff3f3a0307660d6a3bcadfd4ae99f97c76da1f3c118c461674b9a43f17c7c8a8` |
| `heap-window-parser-candidate` | `node node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-native-inspector-config-20261026.mjs --project scope certified-rules-hardening-certificate.scope.test.ts certified-rules-hardening-budget.scope.test.ts maintained-application-projections.test.ts` | `f22dfe174a503192dd4091185a3cb095453721bb` | 0 | `03602017d778e79a6e1e4bf6e3f2af8795c0a45c83ab3838e1278de09f3f1411` |
| `projection-allocation-collected-profile` | `node node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-native-inspector-config-20261026.mjs --project scope maintained-application-projections.test.ts` | `f22dfe174a503192dd4091185a3cb095453721bb` | 0 | `1f73fac73e5bf8f88d683c3b0a5f04c10361f7b955e58c88ccc480c708790713` |
| `clock-owning` | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope maintained-application-projections.test.ts` | `a9232f009a7a470fe7be17820f7fed4eb5fb1778` | 0 | `c345fb9e6789c661aa9aba3c65cb52476a6c848a11f1d11a14d7c6f65fcc4fc5` |
| `clock-compiler` | `npm run typecheck --workspace @generalbusiness/dap-scope` | `a9232f009a7a470fe7be17820f7fed4eb5fb1778` | 0 | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| `heap-window-fixed-clock` | `node node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-native-inspector-config-20261026.mjs --project scope certified-rules-hardening-certificate.scope.test.ts certified-rules-hardening-budget.scope.test.ts maintained-application-projections.test.ts` | `a9232f009a7a470fe7be17820f7fed4eb5fb1778` | 0 | `049a54daa7dd9ea6a45fd4d0d69615e31eb82f2603049d3ddece10e09c56f6cb` |
| `ordinary-gate-clock` | `npm run gate` | `1c5025051c500d26695fb8e0cbb0900f99568488` | 0 | `b46305dcd49d010f0b8211f28792edd194c5b1b4d0080e94bc7c46294d78b59f` |

## Open limits

Request `5e6d482c` owns the pending exact-head checker review. The fresh
ordinary gate verifies the test-only clock repair with the complete suite;
it does not turn the earlier full-suite failure into a pass.
The experimental inspector adapter is outside the delivered tree and
supplies no deployment, authority, or ordinary validation result.

Request `5e6d482c` owns the remaining deliberate entry-flood liveness limit, the absence of a user-facing certified-policy publish command, and planner-scheduled cohort enablement. This delivery changes no deployment or creation allowance. A fresh request can succeed when the Destination is quiet; a member adding entries on purpose can keep making it decline. The conservative observation/proof reserve can refuse policies whose immediate record alone would fit.

R16, request `b300dca1381f27beed6c0d3278ccc5955f86c7dc`, owns reserved file-publication paths and declared application prefixes. The required-check policy here covers the change reservation path; inherited installed-application file publication has its existing policy. BR-13, request `487496f5ad73675926a070808188cd2a228334c1`, owns next-version sentinel maintenance and must precede the next platform-version change after this head.

The native fixtures use real signing, grants, native rule evaluation, SQLite, certificate parsing, and reads. Git objects, callback scheduling, the fixture clock, and checker execution remain labelled test stands. The floor witness uses real validated G15 marks over scripted snapshot/genesis state; it shows retained roots, not native archive custody or a live floor-writing journey. The runtime and rollout limits remain under `5e6d482c`; no live provider HTTP, deployed Worker, production checker runner or full I3 claim is made.
