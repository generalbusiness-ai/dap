# Evidence rules: implementation evidence

## Scope and current status

Register 22, Directory 21, Rules 13, Destination 17, Issue 4 and Change 4 add
evidence choices. Membership 8 and Inbox 1 remain. Historical definitions,
pins, signed bytes, defaults and creation policy remain exact. Work started
from Main `06e4d33fe1` and merged Main `8659af4656` on
`request/evidence-rules-20261028`.

Review `8b1165f8f6` found that an unmarked key can strand a room-source job.
Issue 4 and Change 4 now keep all claims provisional until an authenticated
Destination notice counts them. Native checks the signed result and
`checked.bindingDigest` against the frozen room-service key before binding or
drawing a holder. An unmarked claim cannot draw the owed result duty.
Member-source jobs retain their current key eligibility. The repair adds no
kernel feature, field, slot or wider limit. N4 and N8 pass at the repaired code
head. Gate 4 passes there too. The [design] and [architecture] retain the
protocol.

## Governing decisions

Commit `0ff2027f3505f53d8264d4f90ab65f4bbcf812d7` records the service-mark
choices before source changes. These acts govern the slice:

- The request commissions the slice.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:a53e146477354f07cf6ff657e93b36d411d846c8`
- The promise commits the builder.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:a891555c470d4693e466b9c5240b5ed35a95b388`
- The mark ruling settles authority and rotation.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:ed8187819e92ad401315e78a5a7f0a6c6073509f`
- The incident ruling selects triagers.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f73805e41fb84d460ea391b66a2c6ab23568f15b`
- The TIME ruling forbids a new timed port.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:c20152ef7919ec4b03c7647a6b734aadc1cec7dd`
- The kernel ruling permits observation revision 21.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:1bc4f7fdc0f8bd2a31b54d04b74ccbb91228dbd4`
- The admission ruling retains legacy limits.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:393b3b99f469df1df80b676ec1da7b29dcce7cce`
- The validation ruling requires a full gate before a documentation tail.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:31962e1fb3206272c21017beeef9208b71234235`
- The manifest ruling separates cited files from directory retention.
  `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:4e199bd8cf50191b892fc2372afb13d1d5f0aa05`

## Authority and behavior

The service mark starts null. Only an active admin can mark or withdraw an
active checker. Custom publish permission cannot. Admission and judgment
require the exact key and current eligibility. External `CheckerService` keeps
`ResultSigner.key` outside the job and container. This slice selects no service
key.

The generation identifies the last mark change in that Rules incarnation. An
unchanged pair keeps it. Withdrawal and reinstatement change it. Effects use
actual positions and bytes, never future self hashes. Observed rotation freezes
both keys out of an old job. Fresh admission can proceed. Unavailable
observation yields null. Reinstatement can permit reuse of earlier facts
without reviving frozen jobs.

Rules observation revision 21 exposes `roomService` and `serviceGeneration`
only with declared `roomServiceChanged`. The contract adds only types. [Kernel
section 7][kernel] permits the observation because extents cannot prove foreign
mark positions. The platform owns bindings and the `artroom-check-binding-1`
codec. The ruling rejects bytes-layer and envelope-only solutions. Historical
kernel behavior remains exact.

Bindings retain genuine subjects and admissions. The [architecture] describes
defaults, stages, reuse and audit pairing.

TIME changes only literal job state, reason and deciding reference. It sends
nothing and performs no operations. Destination 1 through 16 retain their
timers. Later entries or recovery fund notice. Timeout proves neither drain nor
released capacity. Fresh authority can admit authentic late results.

Four original eight-slot NEW WORK carriers fund decisions after final outcomes.
Outcomes cannot acquire holders. The counted plan opens its nonholder cursor
directly from the publication birth's retained manifest proof. Carriers
guarantee no byte capacity. Failed required landing and audit outcomes clear
the branch's `slot` value.

The full plan returns six effects, including one open. The six effects and an
operation pair require RuleMost 8. The automatic attempt makes nine full
effects. Push retains Data 20 and RuleMost 20. Its deciding read retains
RuleMost 17. Crowded push derives 17 effects and 18 full effects within 20.
Evidence admission retains 16. No universal 16-effect guard applies after
writes.

Marking-time proof exchange remains separate.

## Legacy admission

The admission ruling preserves legacy admission. Pending state and coded-effect
ceilings determine initial cost. Later release cannot reduce it. These compiled
declarations measure neither runtime use nor simultaneous allocation.

| Destination 15 at Main `8659af4656` | Entries | Bytes |
|---|---:|---:|
| Publication | 1,831 | 549,978,112 |
| Branch | 588 | 154,140,672 |
| File publication | 676 | 177,209,344 |

| Destination 17 discarded draft at `41215939d5` | Entries | Bytes |
|---|---:|---:|
| Publication | 1,290 | 940,048,384 |
| Branch | 628 | 459,276,288 |
| File publication | 713 | 524,550,144 |
| Evidence request | 91 | 64,487,424 |

`account-lifecycle-compiled-ledger-3` captures the discarded draft. At
`8fe7d39a2e`, `legacy-admission-baseline-1` confirms the Destination 15 digest.
Comparison clones have equal entry and byte totals with and without forced
opt-in. Record totals need not match. At `7e3556cde2`,
`direct-plan-compiled-ledger-1` reports 1,209 compiled entries, 371,982,336
bytes, 25 items and 58 requests.

At `00834f19a9`, `repair-compiled-ledger-1` reports current Destination 17
entry reservations: publication 1,832; branch 628; file publication 713. These
are compiled reserves, not runtime use.

The slice removes byte-only chains, the two-slot sixteen-account profile, the
full-set-before-push requirement and N9. Legacy admission keeps its
100,000-entry ceiling and no global byte ceiling. N5 passes five concurrent
published jobs at `26315118ce`. The planner owns adoption after R4 and separate
settlement design. The collection retains the prototype.

## Witnesses

N1 through N8 use `packages/scope/test/evidence-rules-real.test.ts`. Title
prefixes are `scoped mark`, `member work`, `landing reuse`, `observed
room-key`, `real published holds`, `native TIME`, `the real failure` and `a
cancelled same-tree`, respectively. Pure tests live in
`packages/platform/test/`. P1 and P2 use `rules-policy-v13.test.ts`. P3 and P4
use `evidence-index-v17.test.ts`. P5 and P6 use `evidence-holds-v17.test.ts`.

1. N4 and `reservation-v17.test.ts` refuse Member results for room source. The
   lane can retain the claim.
2. N2 and P1 preserve the Member default and exact old pins.
3. N8 refuses audit disagreement after both results reach the head.
4. P2 refuses another audit configuration.
5. P2 refuses `every: 2`.
6. N8 gives a cancelled equal-tree retry a fresh audit and distinct Room and
   Member jobs.
7. P2 prevents audit-target reuse. `evidence-progress-v17.test.ts` checks
   parent reuse and alias pairing.
8. N3 and N2 reuse actual earlier equal-tree work.
9. N2 and P3 refuse reuse from another source.
10. N2, N3 and P4 disable conflicting reuse but allow fresh landing.
11. P2 refuses published reuse. This witness is pure only.
12. N5 opens an incident after published failure and blocks the next landing.
13. N7 and P5 keep policy unchanged and prevent an earlier pass from clearing a
    newer hold.
14. N5 and P6 prevent another configuration or generation from clearing a hold.
    Transition does not count as a pass.
15. N7 checks both orders of atomic failure and admission.
16. N5 and P5 preserve the original hold after duplicate or reordered failure.
17. N5 shows that closing the incident or an unrelated Issue clears nothing.
18. N5, N6 and pure hold tests preserve holds after timeout. They check TIME at
    its own head, replay and refusal before recovery.
19. N5 and P6 preserve override reason, key and release kind.

N4 keeps separate jobs admitted before rotation. Two unmarked Vic claims leave
the original work job and funded duty unchanged. Marked Paul then counts on
that same job. N8 also rejects an unmarked Change error claim before the marked
audit pass. These are actual Native source decisions.

## Current and historical results

The repaired code checkpoint is `00834f19a98afb69cd40bc8ef383a48014ee10aa`,
tree `c3d6e7a544572b084b35946f03272f8e34eb10c4`. Destination 17 is pinned to
`sha256:96390fe5119db6d85b903b4d8d7f86378af31823bd1bf4d01f2a5060d80fb59f`. The
independent domain-prefixed hash probe confirms all 76 historical pins, 40
declaration texts and six historical lane files remain exact. Its first attempt
omitted the definition domain prefix and failed; that row remains.

At this checkpoint, root types pass, the three repaired owning files pass 12
tests, and the two Native protocol files pass all 10 tests. N4's control passes
before the frozen-key restriction is removed. With that one change, it fails by
assertion: the delivery applies instead of refusing before binding. The control
restores the source. No mutation sweep ran.

`repair-physical-marked-room-1` passes exactly one physical Runner execution.
Its report ends complete with checkout, image and environment checked. The
bridge joins its work. Cleanup confirms no guest containers or tasks and
removes only the empty owned directory. This TEST loopback witness proves
neither deployment nor an external provider. Guest CPU is unavailable.

`repair-ordinary-gate-4` passes: preflight, root types, Node 78, Counting 55,
plain 3,092 passed with one skip, and Native 836 passed with two skips. There
are no unhandled errors. Wall time is 935.777 seconds; host child CPU is
1,987.834 seconds. Detailed Scope timing remains partial. Cache and load were
uncontrolled on the Mac17,7 host with 18 CPUs, 64 GiB and macOS 27.2.

The first gate failed in helpers. The second failed four stale assertions or
generated outputs and never reached Native. Rules 13 registration moved the
unsupported sentinel to Rules 14. The pure retained-proof subpath now exports
existing `isObjectId`. Both original behavioral cases remain. The third gate
and the separate Native follow-up passed at `3713cff17e`, before the security
repair. Their rows keep that qualification.

The original sealed collection stays unchanged. The repair collection preserves
it under `prior/`, with its original manifest at `prior-manifest.json`. The new
[manifest] lists cited files and directory checksums under the manifest ruling.
The root index still covers every retained file. Retention lasts at least 30
days after landing. Removal requires a planner act naming the manifest.

Regeneration uses `node packages/mcp/scripts/views.mjs` and `npm run build
--workspace @generalbusiness/dap-page`. The final receipt records their hashes
against the committed outputs. Freshness does not prove browser performance.

## Command receipts

Each capture label cites six files: `command.json`, `process.json`,
`receipt.json`, `source-index.json`, `stdout.log` and `stderr.log`. Each file
sits beneath that label. Labels starting `prior/` name original attempts. Audit
rows instead name their terminal JSON and output hash. The manifest also
records `prior/` and `finalization/` through their own indices. The root index
retains all snapshots and logs. Counts describe individual attempts; failed or
overlapping runs are not summed.

| Check / command record | Checkpoint | Exit/timeout | stdout SHA-256 |
|---|---|---|---|
| prior/account-lifecycle-compiled-ledger-1 | f4fa701b71 | 1 | 5671a214a7b6d06783f294e5bcabf07512d0f36a13aa21520312723da2871b68 |
| prior/account-lifecycle-compiled-ledger-2 | e976ea27d5 | 1 | 1541fa01eabd8fc5034bc05d84a9b4af0424888bbc265492825e5a8c7b885f57 |
| prior/account-lifecycle-compiled-ledger-3 | 41215939d5 | 0 | 65ff4379879861fca04bce5c4f220bfc195a23891729a548339bce469a627665 |
| prior/account-lifecycle-fixture-types-1 | dc91782d7d | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/account-lifecycle-fixtures-owning-2 | dc91782d7d | 1 | c2773f3c75450b35e96991f796005b4b538cc9a688667fa7bd9dbc7573100270 |
| prior/account-lifecycle-owning-1 | 41215939d5 | 1 | 576708a86b2b2cc84b4c42899ba5a4a6131407fdd3169366647373f02f7f74c3 |
| prior/account-lifecycle-platform-types-1 | f4fa701b71 | 1 | 7774475d3c25aba70eb93c57b472bb926158ce3d2833edbe4ae82be5000c399c |
| prior/account-lifecycle-platform-types-2 | e976ea27d5 | 1 | 97113280d0ea9b2ef68f4e1adafa6e9a2a76148f6ced09039037b788dc20444c |
| prior/account-lifecycle-platform-types-3 | 41215939d5 | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/account-lifecycle-prospective-ledgers-1 | c0e5c3842b | 0 | aad92ac4a8f46fc9f58340aae2af548b82ea2eed99b6148b23c9d2799265cb0e |
| prior/account-lifecycle-prospective-ledgers-2 | dc91782d7d | 0 | 43ee59264e3efb17eaf2e55b506fad568184ba8ab718eee1bc1b161f14b16d98 |
| prior/account-lifecycle-scope-types-1 | f4fa701b71 | 1 | 2abb4256bf77f52688ac5638c5aba37ecdb1be562e3aa19bbfafec72f441f758 |
| prior/account-lifecycle-scope-types-2 | e976ea27d5 | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/account-lifecycle-scope-types-3 | c0e5c3842b | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/account-lifecycle-written-plan-bound-2 | dc91782d7d | 0 | 27c83ed6a9e96aff4a28c00c5f9d06c571817767a7b110674a6be8477273dd57 |
| prior/account-proof-reuse-owning-1 | 4b80bcb261 | 1 | e129be1286bb2c247ee85d932570698ad9f4bfea52bcfd4e2e5c04562168037d |
| prior/account-proof-reuse-platform-types-1 | 4b80bcb261 | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/active-git-boundary-2 | be9859e9c7 | 0 | 62f1bfc7eed82313755fb6363d85d3b0beb78ec2abd1d1e9ece9dac297f9a47b |
| prior/active-ruled-source-1 | 52f4fd60bc | 0 | 27d97256f3ee1622c2d3ac1b614b13e4bcdf5b5eae97e9daab38705fb6e42235 |
| prior/active-source-1 | 73c49b9724 | 1 | e7266bb353cecf84ec531aaea84ccfb2baa6ae840a5430c75fe32f2934122b50 |
| prior/bound-actual-judge-owning-2 | ba17bcedf7 | 0 | 207a118f5026466409c239d033850dc38045199ecac98d59377ac0bcce896d29 |
| prior/bound-fence-checker-owning-1 | ed7b8fdde0 | 1 | f0c0777ea4a1174cd6712a806e890ec6ac901a9ca39ed825809871ac19673d1d |
| prior/bound-fence-checker-types-1 | ed7b8fdde0 | 1 | f70cd9a5816b26bef77252c0593b69757c69f2206a50bb32f44ba5ab22e217d3 |
| prior/bound-fence-native-pins-1 | 3b2b13a9cc | 0 | aa7b33fed7bbb2f05d2d2bf7e39de9a4454d532ef1468da300618070e200b8e1 |
| prior/bound-fence-platform-owning-1 | ed7b8fdde0 | 1 | d9e8a3b413687451882e376fa50ef591bbcbc1a07df5f75e6114a2d929eec7e3 |
| prior/bound-fence-platform-test-types-1 | ed7b8fdde0 | 1 | 9d80e25fdd38ad5c7758ad8ec1599c13c0ec9d963e1d2a5c82bdbbe353afb18d |
| prior/bound-fence-scope-types-1 | ed7b8fdde0 | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/bound-fence-security-measurement-1 | ed7b8fdde0 | 0 | 065c8db43b7668142c1f18c1854d325b445d40fa60943823ab545aa567845971 |
| prior/bytes-owning-1 | 464b1205c2 | 1 | a6e1ccb7faa73a3132b09c92091310dba0aa85eedf5051d02fd5dfad49267a81 |
| prior/bytes-retained-binding-1 | 15aa5d0e9f | 0 | 65dca48c5e0c665c225f43f89b09198e2b1f129195fe1bcc040ef1d167e10f62 |
| prior/bytes-retained-typecheck-1 | 15aa5d0e9f | 0 | ff3f3a0307660d6a3bcadfd4ae99f97c76da1f3c118c461674b9a43f17c7c8a8 |
| prior/bytes-typecheck-1 | f33bae9e65 | 0 | ff3f3a0307660d6a3bcadfd4ae99f97c76da1f3c118c461674b9a43f17c7c8a8 |
| prior/bytes-wire-2 | de3ea0b506 | 0 | a0210206305c9a30ab3430cc969fb9af4d462a921e42b5996c11dda10288ea06 |
| prior/capacity-context-platform-types-1 | d5ed79283d | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/capacity-context-scope-types-1 | d5ed79283d | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/capacity-pure-1 | 441b627cbf | 0 | 15589306608aeca2a3ae48b240dae1fde7cc63f9cb36377ecd34f3ca64bc78ce |
| prior/checker-admission-wire-2 | de3ea0b506 | 0 | e485ed64a3fff19aa91fa8f0416a2eaad85d62f44734ea120feee4465b416490 |
| prior/checker-container-origin-boundary-2 | de3ea0b506 | 0 | c1c26dfc4037a2f0e2e8bdf60450c981fd86b21796fd0fa04744d6e126a861cc |
| prior/checker-owning-1 | 464b1205c2 | 1 | 8fc41984510769f44e880d9b44f1b932c68b45fe5c665c41ab7626156a201dd4 |
| prior/checker-retained-owning-1 | 15aa5d0e9f | 0 | a393801b087301f80dce673e955a7b176efc34aa6e35389b828ab4ee765da5a8 |
| prior/checker-ruled-stage-1 | 52f4fd60bc | 0 | 9df94cdf02b600f04faf63a21004e97868c778c6a71f30e5925fe8515b0f20c3 |
| prior/checker-stage-3 | be9859e9c7 | 0 | cc74a9d9b32dc902f7df73df4bba55ce3a9e4ebf6ee61558dc89bdcb962b03aa |
| prior/checker-typecheck-2 | 73c49b9724 | 0 | a696ae9b97ea8946702ad433d5b798829bddf7ef25c2c7470f66d224e54bb6ec |
| prior/checkers-retained-typecheck-1 | 15aa5d0e9f | 0 | a696ae9b97ea8946702ad433d5b798829bddf7ef25c2c7470f66d224e54bb6ec |
| prior/checkers-ruled-typecheck-1 | 1e1b495731 | 0 | a696ae9b97ea8946702ad433d5b798829bddf7ef25c2c7470f66d224e54bb6ec |
| prior/checkers-typecheck-1 | f33bae9e65 | 1 | 85721a965bd3dbcbba6d323d2511d7ef80394c8b06ac5c3b250d34cc91ee13e6 |
| prior/cloudflare-owned-compat-1 | ed5fcf4e1b | 0 | 0a75876a1ef6fd27285e6adf68776e6c69161d6f00a27650076417359583ff92 |
| prior/cloudflare-physical-compat-1 | 1e1b495731 | 0 | b8a5b84aa0d69a4530304e047fe25936c5696e6fe73daf671db1312092f1be2f |
| prior/contract-typecheck-1 | 441b627cbf | 0 | 404b5015a1e8e4ffaa2002ffafb9ea8fb7687d19f92a6aa625d392dda3d59496 |
| prior/counted-send-lane-pins-1 | cb8c740b41 | 0 | 5e9e71849507cd2191fa1b39b3bef39984d8441e4f8eb9d24041a1c5fd52f4f6 |
| prior/counted-send-lane-reference-1 | 70c7b307e7 | 0 | 216bfaa2b2487bed4695ea090be033a212a47fa20b400cff3e051a7d71e7eec3 |
| prior/counted-send-native-pins-1 | 4ecf71816f | 0 | a16886ed979d55679dd66fa880fdb5c5ee91da3728ad9ec71b1d8c1671696a23 |
| prior/counted-send-owning-1 | 458e98b775 | 1 | a37656fda818690c6083ff27fa5d3ab10f8dafabddde353c26b5ef58137b496f |
| prior/counted-send-platform-types-1 | 458e98b775 | 1 | 240f81763e8e14a3dd633d5629832a675bdf4054f2d637624c24c7c5c64416eb |
| prior/counted-send-scope-types-1 | 458e98b775 | 1 | 2eae15548a678bd91f377783119ce2ce41e46440b0aa829fa9203c0318cb8a2b |
| prior/counted-send-security-inventory-1 | 2241e2f5ad | 0 | 394836039b2bad4c6680d9fcd65cc0935c6152afb0f88f4082093e714abe729f |
| prior/counted-send-security-measurement-1 | 0f2af80fd7 | 0 | 0befd8f040b4071f8d2d750be438d0635d6906deca33aaccc6632b76c0bf86bc |
| prior/declared-evidence-lane-scenarios-1 | ed5fcf4e1b | 1 | 8c2ed7250d2601db326013b7ac9a3911c75edfb2609f929ee25a1ff5e6e2b7cc |
| prior/declared-incident-boundary-4 | e27d769ae9 | 0 | f952eee2b48bb702be7a85c182e8d9c91e3e846695b3240a524e326ea61947f9 |
| prior/declared-incident-diagnostic-3 | 33c3cb46ad | 0 | c3f2f4717d28036491ea44c694ae4507e36bb04f8cea71bd9c0d01911a139aa1 |
| prior/declared-incident-scenario-2 | 441b627cbf | 1 | ab4791aa836a4c277a231a0291a7ce9c2e39f2d9e5ba5b233cc168b007e289e5 |
| prior/derive-observation-1 | 73c49b9724 | 0 | 3828c7842137fa438032bb799037f4629c03a9fb985e18f976fc3748774d6761 |
| prior/derive-ruled-observation-1 | 52f4fd60bc | 0 | eeb2ece1239867b43a492b14b202b210a4dcfbac1354bcff20272b0e772f84cd |
| prior/derive-typecheck-1 | 441b627cbf | 1 | df49bd5acc5e874cbc121438c75d888825b8295c6edfc543741571d0b830da46 |
| prior/direct-plan-compiled-ledger-1 | 7e3556cde2 | 0 | 6f4c81dd794a5e8e4cea32ba61efaf01b7ba370588a7bacf202773c7d9306c2a |
| prior/direct-plan-funding-owning-2 | 7e3556cde2 | 0 | 101fcd143ed77ecb89d887aaebdd2e6892b2709289a13d563f09d12c53a8a6a5 |
| prior/direct-plan-native-pins-1 | bc601d74dc | 0 | cb85e787f843f35fe91fefdb4d7800c4e6a34b54c6343ef0e6e88dedffd99307 |
| prior/direct-plan-native-repairs-1 | 3357332021 | 1 | 874346df377c48cc140868589f8b56a3f4ed1ee23dbf23043619fe5c280995eb |
| prior/direct-plan-native-time-orders-1 | 3357332021 | 1 | d253edb12e6e240785c6a1ff40987f3d70e298e75a3741210b651ce2b6e1e3c8 |
| prior/direct-plan-owning-1 | 3357332021 | 1 | 5facb08f37aef21a369e62b57f8ed694fd45d765de03dca6f4f22c31706e09b6 |
| prior/direct-plan-platform-types-1 | bc601d74dc | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/direct-plan-scope-types-1 | bc601d74dc | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/directory-closure-owning-1 | c94a00f526 | 0 | 5ed0fe0356ced50b88724ffea7b8be768245f8ac3d51bec3062e8c7ee8b86100 |
| prior/evidence-lane-validation-1 | f33bae9e65 | 1 | d4395b0aa15b1fd3394dfd94ad882fec42b6241d04c5adbd6c20c0b82f8376ca |
| prior/evidence-lane-validation-2 | 73c49b9724 | 0 | d18452cffe375f5d3de0efcb8d90876522b04c10a639f6cf5298ff768a6da018 |
| prior/evidence-reference-generation-1 | 712db468be | 0 | 8df46d1d96c72df0033437e3e126173460987cc600adcbe8d3a5fb557544483e |
| prior/final-document-reproduction-followup-1 | f5031122a9 | 0 | 8eca6892237627920a55cfb6fdb2db958a806c74e07a1396c3b0d73205c222f3 |
| prior/final-host-environment-1 | 3713cff17e | 0 | d1b84443fa6b1651e15cf2635381c26ff7c3cd117d405a10723a5f62db4ee06f |
| prior/forecast-type-repair-3 | 73c49b9724 | 0 | 5bed72e66b0d3c41de9527faf1fcf886cfc7b5458212233c0374e170c084a4f2 |
| prior/frozen-capture-owning-1 | e27d769ae9 | 0 | ee54b158ae8ac856c7f62a083c5657d5d05ea90073c40e149ca82ec62947e14f |
| prior/gate-four-owning-followup-1 | 3713cff17e | 0 | a391c633a58ba2a64939a22a4f18b1ccb131f1df82733d4323df349225d3a5ce |
| prior/gate-unreached-native-followup-1 | 3713cff17e | 0 | 491f78eddacc01170c4a6dd39bea6731e4d55144e3eb8d685770e77f7ad5d922 |
| prior/generated-assets-types-followup-1 | 3713cff17e | 0 | 62170bbe0cd055cff4699debd9470a886c0f98f328e7c9517d899c021a3788d0 |
| prior/generated-browser-assets-1 | 6f85107d4b | 0 | 5130dbe1f1fbc6115ea8da3574ea4648e424d562b8f38faa0a3d04c068382752 |
| prior/git-retained-typecheck-1 | 15aa5d0e9f | 0 | f7177ec41c5d59d1082d62357947755dcabdd6fe7cf48d36315c02839393bb49 |
| prior/git-typecheck-1 | 441b627cbf | 0 | f7177ec41c5d59d1082d62357947755dcabdd6fe7cf48d36315c02839393bb49 |
| prior/lane-generation-1 | 624b5ce29b | 1 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| prior/lane-generation-2 | 624b5ce29b | 0 | 7c88143a1d210ac01e5dd6d535259a30d55f32498b69efc28fec57bbe200ecf0 |
| prior/lane-generation-3 | 7579931aa6 | 0 | 81c6aa35c5ce69ef700218e99580180d5790356283a949e7cfb168bdb04ab485 |
| prior/lane-scope-compiler-1 | 73c49b9724 | 1 | 458984b41675236ffccdfd507438bdf1bf78109ac0717d19333ae8fd8863cdf6 |
| prior/lane-scope-compiler-2 | be9859e9c7 | 1 | 605abd177d24041e5299ae24b30180b6099ea81fd801fcf8c6058621634bfefa |
| prior/lane-scope-compiler-3 | e27d769ae9 | 1 | 605abd177d24041e5299ae24b30180b6099ea81fd801fcf8c6058621634bfefa |
| prior/lane-source-compiler-1 | 73c49b9724 | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| prior/ledger-readiness-owning-1 | bb08eb8521 | 1 | e90ced42250c2a16f141fd32ffd47bf7f3d13ea58cc346268c6aa81d307b5a67 |
| prior/legacy-admission-baseline-1 | 8fe7d39a2e | 0 | 2ef25265e26f2dc027978e6b9e36da64500e73f73c056157cfdb6f8710e4ce41 |
| prior/legacy-admission-native-pins-1 | d47cbfc160 | 0 | fbbb3af1b692b0d8abe16ae1136d25b130c5e9143e1f95691b1a00fdf34b985b |
| prior/legacy-admission-owning-1 | d99503e11b | 0 | e1b6422b3cc8af19a46c55530eccb3cc6a1b8c2adedf02a80517c9c047ad8c05 |
| prior/legacy-admission-platform-1 | 8fe7d39a2e | 1 | b840b27149d0984471a50b6b04a036d7c9ac2e7b6c8ef303b96389cce217c3ac |
| prior/legacy-admission-platform-2 | d47cbfc160 | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/legacy-admission-scope-1 | 8fe7d39a2e | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/legacy-native-landing-1 | d99503e11b | 1 | a35ea28b746031d436c45f682abf09627dd779a91a622555629699d77f51391a |
| prior/legacy-native-other-cases-1 | d99503e11b | 1 | c9a04b64a42f085827604a490ab34d453d800d48289c6612989bb1b1d44eac78 |
| prior/legacy-native-published-context-1 | 73e6c113fa | 1 | 0f3393ef26f1c785332532b91e8dac20f0e1a0ddf4f20e42a7e43c333a4b4ac4 |
| prior/local-settlement-security-inventory-1 | c0e5c3842b | 0 | 10cefbe933266dfaa6bc8251073f93de2d3f4a37cdd5351f1b8a0727f05e2fe6 |
| prior/local-settlement-security-source-1 | 41215939d5 | 0 | f3ec70e49357d27535c4e38294af0d6c3cb8695230394e035c729218d7b283c4 |
| prior/native-admission-context-8 | 4d5c992f50 | 1 | c5b3c7db62dd78f0bff777112aa565cd110d7f71a6b3bbacdff56c99e8477189 |
| prior/native-admission-settlement-context-13 | 7b9512ac97 | 1 | de8561795aca9cbb0249706b0406e917a53e82f0fbb94ae229cde7f992d01b37 |
| prior/native-bound-fence-prefix-17 | ed7b8fdde0 | 1 | e33f456b0d333ef2e6f225331c0d180b76857259163bdda7408364919e8831d3 |
| prior/native-boundary-corrections-1 | 7e3556cde2 | 1 | 4b90146a79d4f83e4a10daa097ddc7a08a4956cc2d80d5b5b297402efcdb564c |
| prior/native-boundary-scope-types-1 | 7e3556cde2 | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/native-cohort-mark-1 | f123113cdb | 1 | 0be98913773fa116455abe86e2e693d43c97fc8d33d90ecb3c4f7a361e4bfbdf |
| prior/native-context-fixture-types-1 | 4e7efa146b | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/native-counted-send-context-12 | 4e7efa146b | 1 | 28417e9925c5b9eab4c6b566b932bb6a33e1a9424baf1473c54f63acf75e11e5 |
| prior/native-counted-send-prefix-11 | 2241e2f5ad | 1 | d33fe0fb77e713ecacb8c0d14bf79555b3f06058991cf7ca67f097391b6a38e5 |
| prior/native-current-capacity-20 | d5ed79283d | 1 | c65857382a683cda7837fdf2759e509bfa7a9da9b4ef129894e6e0108c45a27b |
| prior/native-declaration-diagnostic-1 | 15aa5d0e9f | 0 | cc60d3ae49f390df80fc8a54c0afb8bd6155c3dc9c4809e238ca968ea713aebc |
| prior/native-declaration-diagnostic-2 | bb08eb8521 | 0 | 3520fdf8541ec6276b19e1c888d55f647d7054e55ab067ae81728690674b9a32 |
| prior/native-directory-closure-generation-3 | 35646529c4 | 0 | 5838ad100f799d1840605359b93e6e69a6cc2297ad98e44ff2bea329e44eee83 |
| prior/native-host-rulefault-trace-10 | 241880a7eb | 1 | d34f92cd63b992901b1e582ee0dd37d27b2afc6652573656026bf925e173d13c |
| prior/native-landing-holds-first-1 | 0599da9ea8 | 1 | a0e011514a24b5760d24caf81a3822ceb58cbee44f5e57cb88713441b701873f |
| prior/native-live-items-prefix-6 | 0599da9ea8 | 1 | d77439488a6b98baa09ae61c9973ef00f739b164466d5598884b3b38a88a3a03 |
| prior/native-local-position-generation-2 | cb4c1bbace | 0 | 7b088401a78dcfb2c8f7a1312a2afe95fa271425517f0fed7525dc8f435390bf |
| prior/native-local-position-prefix-5 | 9cc642c6ce | 1 | 93e74e3a51bfa7add1b9e9e2e025cfb862fd10030da5345e7ecf58e5c5dc33e5 |
| prior/native-next-reserve-reply-19 | 12c145c0a0 | 1 | fe5d9031af900c7f8a5f9cb4e218b53aa21acf16607e0c8e81c1f5a084ee946e |
| prior/native-opening-and-funding-prefix-16 | 9c458afc94 | 1 | 11833b732bfaa9da5c8d092367879ffc82b982ddf60ece890bdb508b9f00df78 |
| prior/native-pin-generation-1 | cd12e5f634 | 0 | 079156623e6a3d9b674b0e190f1ed5c405c86cefd38a1b609e44f0eb8f5cca71 |
| prior/native-prefix-diagnostic-2 | 52f4fd60bc | 1 | 645681de2a0c9ea53175d59106f07368cff8d4a3d1c25350f9a350097ea2ff69 |
| prior/native-publish-fields-diagnostic-3 | ba8e28f1cc | 1 | 99cef14e31d91f859321af95f5ed17b9dbc4e3004f8256a6da649b213f66cb80 |
| prior/native-publish-runtime-diagnostic-4 | 215b4b01ee | 1 | bca0cb84206fe35b2ac606f949e4e3b8fcef09ad848ccfb94e5699b089dc24d4 |
| prior/native-published-holds-conditions-1 | e2c66f200b | 1 | ee4e78a67c41513a73b4675b09f0c9c396aba578894b4408ac062127298a30b8 |
| prior/native-published-holds-timers-1 | 26315118ce | 0 | 939c9541ee2007c5adb773b28cb0ce638a74bc86e0e1b74ed53fe8482020fb1e |
| prior/native-recorded-reference-work-14 | f872e18a31 | 1 | e4a484da022b054ffc0096044f0882d24847532e7c7de8568f4c167de01c1a87 |
| prior/native-remaining-hold-time-1 | 81911b667d | 1 | c5dda4a5bf0a72a7902d4700546255e56311554dd4502f09e2d907052379c927 |
| prior/native-retained-result-prefix-18 | ba17bcedf7 | 1 | a0e91b5cb0c25cae3625328a1ce4dc3a95c60514c45a3e41ba7d42280756b427 |
| prior/native-ruled-pins-check-1 | 2f0af7000b | 0 | 13fa2ba98bcde095739b0eeaa739eafaea737ea050dced1e0fc7035bd8d35be3 |
| prior/native-ruled-stories-1 | 1e1b495731 | 1 | f366d63580f2f486bf033e7ba7529205d4f500a7d239ea349014d5c2f94a9622 |
| prior/native-settlement-trace-9 | c63149d413 | 1 | ab41f4dea28306578df4fb128966770db301cb1b3cca668b43a282bff701e87a |
| prior/native-stage-and-work-context-15 | 4df519de16 | 1 | eb32739912a6c52473f5c6febbd238b6241479fb1e223f2f7da2e5af7840ae74 |
| prior/native-versions-owning-1 | f123113cdb | 0 | 06b2c84e6f91816132ffcc59e6d0e8dee709f108b364c3a4492e0d4e64174ef7 |
| prior/native-work-landing-prefix-7 | c94a00f526 | 1 | f8a10183d45ab7677e001adf7092e9f4e581fcb4b8bd161c3fc2a0c8eaf838ad |
| prior/opening-correspondence-owning-1 | 7ab618f024 | 0 | 7df468a65915696b83f82b6d82073e79b9584ede12f1bbbb8c1ed18428a51e9c |
| prior/opening-correspondence-types-1 | 7ab618f024 | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/opening-counted-owning-1 | 9c458afc94 | 0 | 39a3d68fddf70f606933434be8e8dd3c324c6d0dd441788d68921ce64ec82978 |
| prior/opening-counted-platform-types-1 | 9c458afc94 | 1 | 04ca6d96964d4d422d8d037b8d6a4ad18ad5403c0b1d2a79e05dfc781bdb2c91 |
| prior/opening-counted-scope-types-1 | 9c458afc94 | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/ordinary-gate-1 | 26315118ce | 1 | ec3476fa933b0eba9c18f984368263c1efc74862feb4c0675285b721d4e53686 |
| prior/ordinary-gate-2 | dcd80f3d76 | 1 | f8b2cedd5fd1ef8beb2de1bb4219b19f448ce3243f4177bbbf37a0d8e8df997d |
| prior/ordinary-gate-3 | 3713cff17e | 0 | 406d9306412d8cdf311f93af0794cea5f01fe92bd2bd46d96b689bdcc4eea6e9 |
| prior/ordinary-issue-required-slot-1 | 81911b667d | 0 | 97ba2b55c0b9b09ca10f5ec5b7941174aabb3d1a2e5694ed17d8bfa3b85e87c8 |
| prior/physical-marked-room-1 | 26315118ce | 0 | 070954990a35105877c2b8f9d941599f505721a5c1df2f3807137b1b966f4f6b |
| prior/physical-marked-room-2 | dcd80f3d76 | 0 | 070954990a35105877c2b8f9d941599f505721a5c1df2f3807137b1b966f4f6b |
| prior/physical-runner-cleanup-1 | 26315118ce | 0 | c6f9569d4969b931f177e7831fba0a2177a09a72e9c9461a48c1ccdcfd3719ae |
| prior/physical-runner-cleanup-2 | dcd80f3d76 | 0 | 5ad65fa01a721443e5c5681a05fa4c312d65326aa3c477d508a694310cd822f6 |
| prior/platform-directory-types-4 | c94a00f526 | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/platform-ledger-typecheck-1 | bb08eb8521 | 1 | 4fa065a0dba74d81f5de018ea484cbbc996a4eb3c4e960552b83b2254a884d88 |
| prior/platform-local-position-types-3 | 9cc642c6ce | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/platform-pure-types-2 | 52f4fd60bc | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/platform-ruled-typecheck-1 | 1e1b495731 | 1 | b966e988bae231346bbb74a722ae9c316cb5a8b30c4161bac6cba51c55a72d5f |
| prior/platform-selector-typecheck-1 | cd12e5f634 | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/platform-test-compiler-1 | 73c49b9724 | 1 | 9581dc1946703c459c32b6ae50012a282c242c9127d489328524379acd36cbdf |
| prior/platform-test-compiler-2 | 33c3cb46ad | 1 | 9581dc1946703c459c32b6ae50012a282c242c9127d489328524379acd36cbdf |
| prior/platform-test-compiler-3 | e27d769ae9 | 1 | 9581dc1946703c459c32b6ae50012a282c242c9127d489328524379acd36cbdf |
| prior/platform-timeout-typecheck-1 | 15aa5d0e9f | 1 | 67d988fda3a45d51886feed99add61b49cb6233724f1f34225f47cd0da1ff33d |
| prior/platform-typecheck-1 | f33bae9e65 | 1 | 42d63283a9def133518f034e2130a18b9d65d314a4082302c5f72f5255d1bc4f |
| prior/platform-typecheck-2 | 73c49b9724 | 1 | 8cb6f9693b3c5c1d708c4c00cc68c7723037a37210ca06a0380f4858e1aaace7 |
| prior/policy-owning-1 | 464b1205c2 | 0 | 7ad2c7184aceb27b304b71f90a7e8f8dd5b7b6e335f2d97029af5f33e593e1ab |
| prior/policy-wire-2 | de3ea0b506 | 1 | 374763313327a3b15a536c136b122903441c958fc6f12ce32ddf8eec1ef71fb1 |
| prior/progress-funding-owning-1 | 33c3cb46ad | 0 | db2cf7ee339d381d825b8f361aa117369ec4a33c234e9b39b67f5b54e5cede8b |
| prior/record-wire-3 | f33bae9e65 | 0 | af9acfa37230ff2dc9a000080192b120eb01f74a302aafff5dcbaef9f06d9760 |
| prior/recorded-reference-owning-1 | f872e18a31 | 0 | a76ac0fdf7e87f9a16a18a317b771c5e3a7dc86d1be6a90116cbafda2b22f472 |
| prior/recorded-reference-types-1 | f872e18a31 | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/recovery-grants-scope-types-1 | 81911b667d | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/result-reader-checker-owning-1 | 64f11d19d6 | 0 | dba8ab6c008acf884a81eae981a6f610bf4a3b38f625f2e8726de7d9dd02ca35 |
| prior/result-reader-checker-types-1 | 64f11d19d6 | 0 | a696ae9b97ea8946702ad433d5b798829bddf7ef25c2c7470f66d224e54bb6ec |
| prior/result-reader-platform-owning-1 | 64f11d19d6 | 1 | b00942192934d6b603d23a1adcd317b65073e1af7bafe6a1cf0f0dce9ce61ea3 |
| prior/result-reader-platform-test-types-1 | 64f11d19d6 | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| prior/result-reader-scope-types-1 | 64f11d19d6 | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/result-reader-security-measurement-1 | 64f11d19d6 | 0 | 6590c690ea3fdb92383d768c81f9cd093add37726446dd2fa62e2e23ae02a4fb |
| prior/retained-host-owning-1 | ba17bcedf7 | 0 | 77de9798b8744e70cef1f1d64a7d9f0b686ba35402228440ce1e9d6e7642648b |
| prior/retained-host-security-inventory-1 | ba17bcedf7 | 0 | 0f1ca52b704d8a84ff85099d20464fa40bf1f5c4a7ee475b3efd57351fdc946e |
| prior/ruled-policy-owning-1 | 1e1b495731 | 0 | 4a0a20e24eefc5bed553af766ef6401293cec968c5ce1c4bf99e98a6b4d67c2d |
| prior/rules-local-position-owning-2 | 9cc642c6ce | 0 | 7f51d9527246fc9576b2dfbf5cb52a9300db44cd8e763b55508260e37cb11b89 |
| prior/scope-ledger-typecheck-1 | bb08eb8521 | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| prior/scope-provider-types-2 | c94a00f526 | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| prior/scope-ruled-typecheck-1 | 1e1b495731 | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| prior/scope-selector-typecheck-1 | cd12e5f634 | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| prior/scope-source-compiler-1 | 73c49b9724 | 1 | 99559bf2bf4f69bfc714c7f93d740b14cdeaa0ffcccaed10db16c751b10cad11 |
| prior/scope-test-compiler-1 | 73c49b9724 | 1 | 5f01584099824b1ee632d64966e6823bb0fbec810f155477b82a1d9e241c9016 |
| prior/scope-test-compiler-2 | be9859e9c7 | 1 | 4a0af6a5bd7658e38238c441a1b5b9eeb81f210fca6f28315b09fe81436b1b66 |
| prior/scope-test-compiler-3 | 33c3cb46ad | 1 | 4a0af6a5bd7658e38238c441a1b5b9eeb81f210fca6f28315b09fe81436b1b66 |
| prior/scope-test-compiler-4 | e27d769ae9 | 1 | 4a0af6a5bd7658e38238c441a1b5b9eeb81f210fca6f28315b09fe81436b1b66 |
| prior/scope-timeout-typecheck-1 | 15aa5d0e9f | 1 | 81979b2fb20e5c1c2cdb4b82d73d940bc78f83103945d05409ad66e13ec4b835 |
| prior/security-inventory-1 | ed5fcf4e1b | 0 | 04b19670dc2eff3fcf36faf0d1f7592a56340908b0731c8df0cb153b328d268b |
| prior/security-object-measurement-2 | be9859e9c7 | 0 | 525d3667c31f9aaaa28fadac4adc35fc7b5d57db3104981ed1fb0a6f997fddf2 |
| prior/security-owner-measurement-1 | 73c49b9724 | 0 | f23ad8e508db848c687fe3e9edb39fcca5f2b40c9d00f256117e9f43b0276cb3 |
| prior/security-pure-type-measurement-2 | 52f4fd60bc | 0 | ef5a75c8424b313abde84d6b83ac56fb6217f7e6c627a463d4c324a7af82d2fb |
| prior/security-ruled-inventory-1 | 2f0af7000b | 0 | 4a08b7d13b99ff5016f705259976a26574d6c2b5515667c337bbd3bf29559cd2 |
| prior/security-ruled-measurement-1 | 1e1b495731 | 0 | 0c030933ed2089649fa4a93974a1d45fca78bb53e38fc4143c0ef47cde3cacbf |
| prior/selector-readiness-owning-2 | cd12e5f634 | 0 | 467d66f3c3e17eabbea2f2be1c2360661174bc66b99466ee3610746b7750dd99 |
| prior/shared-helpers-checkers-types-1 | 09ed5daf83 | 0 | a696ae9b97ea8946702ad433d5b798829bddf7ef25c2c7470f66d224e54bb6ec |
| prior/shared-helpers-ownership-1 | 09ed5daf83 | 0 | 96c4f7131fa4bd7567a7e1b25f1d3c41e99bd1be3f466b929f943ffc4b343ad9 |
| prior/shared-helpers-platform-types-1 | 09ed5daf83 | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/shared-helpers-scope-types-1 | 09ed5daf83 | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/shared-helpers-security-inventory-1 | dcd80f3d76 | 0 | de7f51c6562ee9e963fec8ff36eb1bed5502194059b229fad21e49757d07b560 |
| prior/shared-helpers-security-source-1 | 09ed5daf83 | 0 | 7e3db3edb1ccd49e8a8120bb92244137c781c6d02e838ea7b52fab883370e0f6 |
| prior/stage-preflight-owning-1 | 4df519de16 | 0 | 300302e59ffe63283bfad6f2156ab27f53cdd095262185ed402399da9efe73f3 |
| prior/stage-preflight-types-1 | 4df519de16 | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/timeout-retained-owning-1 | 15aa5d0e9f | 1 | d13e2b05b08a192abbfaa5a1d614d38b33278335666134bf7b59edfb3d4acc2f |
| prior/written-plan-owning-1 | 0f2af80fd7 | 1 | e4c8caf2182a7b8d37071c1af2e1cfca186589a4bd6f3872cb495b94b60959a5 |
| prior/written-plan-owning-2 | 2241e2f5ad | 0 | cf4dd0cf84eda946bd9ca429eaa76252de18394bbf8c6866a2b3e2671c6219f0 |
| prior/written-plan-platform-types-1 | 0f2af80fd7 | 1 | a8cf0bff8b1446636fcc41b9e9db1a6c98633d09ec9788fd5ce3356ad5174265 |
| prior/written-plan-platform-types-2 | 2241e2f5ad | 0 | 8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3 |
| prior/written-plan-scope-types-1 | 0f2af80fd7 | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| prior/written-plan-scope-types-2 | 2241e2f5ad | 0 | fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976 |
| repair-compiled-ledger-1 | 00834f19a9 | 0 | e61d05e1594c2ba2d0dc7a469e5f5807f89910e38d8d57ae12ca5e823b4feb3a |
| repair-failed-owning-followup-2 | 00834f19a9 | 0 | b3bcbabdb6590ffeeeb179f2d2b0574d03bbd3e988b9c3e0b9c97c5385127662 |
| repair-final-document-reproduction-1 | ede0777f03 | 0 | 3901350cd0efcd2a596c9138b382f6744319e9f3845488aaa9f32dbf1e9acbff |
| repair-generated-cohort-1 | 256707b929 | 0 | 9ba246c8a01a112aa1dd7f00474941cafec7b4ca70a978f3aca62c27fa08d3cb |
| repair-historical-pin-baseline-1 | 00834f19a9 | 1 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| repair-historical-pin-baseline-2 | 00834f19a9 | 0 | e4dd6033bdffbf5601b45ec761f9c6b9b26f28375118907f2d12e5806b347c45 |
| repair-native-key-guard-control-1 | 00834f19a9 | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| repair-native-pins-2 | c22a2d348c | 0 | 74bb6b11b7a037a0eae1ad70b6dd32c3f5ba51ec8a2bc82f6475bd6be308b75a |
| repair-native-protocol-1 | 00834f19a9 | 0 | 2ec5344c68e177d1a6b342b7464f9da8e5b935058506d4b585107463dcdc81d9 |
| repair-ordinary-gate-4 | 00834f19a9 | 0 | 76b79c11d1a104510a9698540f1b21291068bc5dcc28facfc16f8cf73c4de080 |
| repair-owning-plain-1 | d36dece1a5 | 1 | 4e4472c130b0f437b87cdcb7621030b0b2a06f88e7c962a0c1e6a7987fb9f453 |
| repair-physical-marked-room-1 | 00834f19a9 | 0 | 070954990a35105877c2b8f9d941599f505721a5c1df2f3807137b1b966f4f6b |
| repair-physical-runner-cleanup-1 | 00834f19a9 | 0 | e84530eca80a559a60da45189bb63762cbbee5cb3ed2981dd103cef15e675b41 |
| repair-physical-runner-prepare-1 | 00834f19a9 | 0 | 6ef50dcf80595ded55eae81b6e886b24365cb65b535640c5f07a80a62435f3c1 |
| repair-root-types-1 | d36dece1a5 | 1 | 7a7f0ce45c4aec4344804b8301d1212576c8c0b91f563aabfe92ca15215a0fa6 |
| repair-root-types-2 | 00834f19a9 | 0 | 62170bbe0cd055cff4699debd9470a886c0f98f328e7c9517d899c021a3788d0 |
| prior/finalization/audit-terminal.json | retained data | 0 | 10557bcec6d1471ceb42769d51edb52d9b3827c79b07242673d04bb0853bfdff |
| finalization/audit-terminal.json | retained data | 0 | 755eaebe4536904065a715b973b825edcb21da3e24f49956071958c7e01881f8 |

## Remaining acceptance

Review and landing need their own acts. The planner owns rollout. TEST hosts
bound journal and SQLite claims. Manual acts do not prove Runner execution.
Seals detect change, not correctness.

[design]: ../2026-10-16-evidence-rules-design.md
[architecture]: ../../docs/architecture.md
[kernel]: ../../docs/kernel.md#7-rule-for-adding-to-the-kernel
[manifest]: evidence/2026-10-28-evidence-rules.manifest.json
