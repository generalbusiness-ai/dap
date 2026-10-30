# Fixed-slot equality counts

## Changed

This note records request `121a8913bcbe0d65ce1e61643e16fa6b8e36c83d`
and promise `fcbad7a64c74f9c6fcb5c32883b3f955d73a3ce1`.
It describes current frozen source I below. The 36 closed captures include
failures as well as successful witnesses. The first full gate failed. The
second full gate passed at source I. The retained evidence preserves each
actual result. Checker review determines acceptance.

A fixed-slot equality guard now obtains complete counts from derived state.
A room can admit a fresh member beyond the scan bound and refuse an existing
handle with `handle-in-use`. The implementation indexes every declared fixed
slot. It does not special-case membership or handle names.

The fast path requires exactly one equality between a fixed subject slot and
an intent field or a constant. Either operand order works. Counts cover the
named states and exclude the subject once when requested. Mutable slots,
conjunctions and other predicates retain the bounded scan. The change raises
no shipped limit.

## Decisions

The index keeps raw and normalized aggregates. Raw equality serves acts without
Own. Normalized equality uses the same structural FactRef recognition as the
existing operand comparison. Each hash record contains metadata, not another
copy of an entry payload. Dependency rows identify fixed values whose normalized
key can change when a referenced entry becomes available or leaves the held
history.

Append and floor folding update those dependencies. Floor rekeying includes
retained final items. A fixed slot therefore keeps its value while its comparison
key can change with the history available to Own. The normalized aggregate
assumes the supplied Own exposes the actual held view at that head. When Own
is absent, guards use raw counts. This work does not promise correct indexed
answers for an arbitrary partial Own reader or a reader from a future head.

The in-memory state and SQLite store implement the same counts. SQLite marks
an index ready only for its definition and full scope identity: scope,
incarnation and kind. The marker contains no head sequence or hash. Legacy
initialization rebuilds current rows and held hash metadata in one transaction.
The old item-slot index, even with the right row count, cannot prove readiness.
A failed rebuild rolls back. Derived index tables do not change the checkpoint
or its state digest.

The first native run exposed a real initialization error. `Core.pinned` can run
after genesis append but before the first ScopeState fold. Source E skips legacy
rebuilding when that state does not yet exist. The normal genesis fold creates
the first rows. All three native index cases then passed.

Replay records concrete index writes at each head. It does not retain an Own
closure that might later observe more history. Historical tests revisit heads
out of order and keep the earlier counts unchanged.

Ruling `74286ee74383e8edcdf71ab1f9d4bcf3e7203bf7` permits one corpus
fixture change: the scan fixture's `job.name` becomes mutable. Its existing
assertions remain unchanged. New fixed field and constant cases exceed
`guardScan: 3`. Their mutable counterparts still return `guard-incomplete`.
The existing forms tests and definition corpus passed in `derive-owning-2`,
although two new fixture cases still failed there. Source D corrects those
fixture expectations and passes the three focused cases.

The first full gate passed the kernel, Node, Counting and plain stages.
Native finished with 843 passed, one failed and two skipped cases. The sole
failure came from the existing directory partition index fixture. It folded
a scripted entry without first appending that entry to the native journal.
The new hash check correctly found no matching held entry. Source G adds the
scripted append outside the counted fold boundary. It keeps the measured
fold limits and all assertions intact.

The first follow-up could not start tests because localhost listen returned
EPERM. The next run reached the real case and failed its unchanged query-plan
assertion. Source H adds assertion diagnostics only. Those diagnostics show
`USE TEMP B-TREE FOR ORDER BY` in `fixedAffected`.

Source I changes that query from `ORDER BY s.item,s.slot` to
`ORDER BY d.item,d.slot`. The join equates those keys. The dependency primary
key `(seq,hash,item,slot)` supplies the same order after the query fixes
`seq` and `hash`, so SQLite needs no temporary sort. The scope compiler and
all four cases in the two owning native files pass. No assertion or deadline
was weakened. This production repair required a new full gate. The note
claims no single-file follow-up exception. Gate 2 passed at source I.

The architecture, contract and derive documentation describe complete counts,
reconstruction and floor behavior. Kernel section 7 explains why this belongs
in deterministic derivation: runtime and replay must derive the same guard
answer. The index adds no application authority, capability, entry format or
kernel item. The source inventory adopts the reviewed entry-point hashes.
Two independent reviews of source F reported no findings. Those reviews are
not runtime evidence or final acceptance of source I.

The native room witness installs and creates the TEST room through the
maintained CLI. It adds the next 1,999 members through directly signed native
RPC requests and settles the resulting Inbox scopes. The fresh and held-handle
probes use the actual CLI and Worker HTTP path. An unauthorized
add leaves the head unchanged. The fixture reaches 2,000 members, evicts the
membership object, then admits a fresh handle as member 2,001. A duplicate gets HTTP 422 and the named
`handle-in-use` refusal. It does not return `guard-incomplete`, change the
head or create another scope. The fixture records 2,002 add attempts and
2,006 actual scopes, including all 2,001 Inboxes.

Ruling `841661d04aa8dfa31877a4fdceec8e32d41520fc` makes three default
CLI replays the acceptance witness. They use Worker HTTP and report consistent
membership through
entry 4004, register through entry 2 and directory through entry 4. Each report
states its own coverage and trusts. The test does not turn those three reports
into a claim that every room scope was verified.

The focused room capture performs exactly one `verify --all` measurement. Its
explicit budget is 120,000 milliseconds, 268,435,456 received bytes, 100,000 requests
and 100,000 history entries. Discovery completes and the observer sees all
2,001 Inbox Session histories. The command stops during membership replay at
input cursor `"200"` after 83,684 milliseconds. It records 268,437,957 received
bytes, 30,076 HTTP attempts and 58,379 history entries. One response can cross
the byte threshold before the next boundary check.

The last progress message counts 121 replay reports. The metadata records
2,251 progress notifications in total and zero returned consistent reports.
Those unreturned partial reports do not prove scope coverage. The inner CLI
returns Outcome.code 1 at the expected measurement boundary. The Vitest process
and capture both exit 0. No unresolved HTTP refusal was recorded, and the
bounded actual response-frontier join passed. This does not prove that every
HTTP body drained or that global work stopped. Whole-room consistency remains
unknown beyond these observations.

## Evidence

The source base is `4c3330720f8738172da8e6cf34128d8def8d991d`, tree
`22a9e44bc29ba6d176d3ce841952bab70b27472d`. The frozen diff changes
26 files with 1,021 insertions and 29 deletions. Table source letters name
these exact checkpoints and trees:

- A: `4eae958d63e83549fec57d7bfe77ac434141275e`, tree `f6e05717d037a895fae74e994f6db5eddc143c2f`.
- B: `a0e5cef533078c3f3e047f233eb8ec02b13ff9e0`, tree `8fd1fbbdd48d051fc5bb9dce6594805dcf3084e6`.
- C: `6fa9f0f652b4c2fa70137bc9c059f6de8c3ac478`, tree `36843ab601e5e23cb1f2c637502a6b4c71de996d`.
- D: `3136cd82c6b55e63fb37d6374431d7a81858320e`, tree `51a5c3bd853518208a22d476148fd152c1f4aa65`.
- E: `e7a70e9c88076c05783334a45457a9cc70355d97`, tree `a7b76d768a8c1ffcc8015d98f444cc3b9e73a3b3`.
- F: `80749894575b50e51c7128f3fa54d10c6749a372`, tree `d351bcf0c35522adcc3a45b139f9dc3f8ad4aa80`.
- G: `510121a82dc52ad44c241a5b88a22ec0af33db6d`, tree `fea7f1bdbf9c12b78db995cdf4e579b849409d93`.
- H: `8ee46c84a99f001bb7e2ff13ed757b0aeac1be1b`, tree `46a583b6ac4872b0ae81e792038b21c6250e2bd2`.
- I: `fe9fefb9e02a600a36b615fb25e7eac83b68ad2b`, tree `943ec3b780772ad016e4ccdae5f566de7770a608`.

The retained evidence root is
`/Users/hughpyle/play/artroom-evidence/2026-10-30-fixed-slot-index`.
Each table row cites six files under its label: `command.json`, `process.json`,
`receipt.json`, `source-index.json`, `stdout.log` and `stderr.log`.
The root index also covers retained source snapshots and extra reports.
Commands ran from
`/Users/hughpyle/play/artroom/.builder-worktrees/fixed-slot-index-20261029`.
The command column reproduces the recorded argument vector as shell syntax.
Control commands contain literal replacement strings.

The two exit numbers mean command status, then capture status. Each closed
capture reports complete output, a closed process, no timeout, a clean source
tree and unchanged source bytes after the command. Wall time includes the
capture's post-command source guards. CPU means recorded host child CPU,
not guest CPU or a load measurement. All costs use seconds.

Each stream cell gives its byte count and SHA-256. `E` means zero bytes with
SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
The receipt digest identifies the exact `receipt.json` bytes. Each directory
also retains `command.json` and the source index. The retained collector source is `finalization/fixed-slot-index-collector.py`,
SHA-256 `59642e19607baa881f46edd6112b8c523d760e8b3c935da09eb74c6f5eb3e3e7`.
It bounds local retention to 40,000 files, 2 GiB total, 128 MiB of source
snapshots and 128 MiB for each outer stream. The command timeout appears
in each row. The pool compatibility row records preparation, not a test.

| Capture and source | Actual command | Outcome; command, capture exits; timeout | Wall; host CPU | Stdout bytes and SHA-256 | Stderr bytes and SHA-256 | Receipt SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| `replay-types-1`; A | `npm run typecheck --workspace @generalbusiness/dap-replay` | FAIL: invalid fixture imports; 1, 1; 600 s | 1.732734583; 3.544366 | 376; `71eb1e3a6e5ec7882ca00d929c4d57f5998349ec968fe4a2f4c1a1c2aed13f92` | 477; `0b8515f2bf3e0197bae2a8909d4a40c0102e56f96b887fe0b889d21d57f5e4d6` | `81f62c1573cb38302dcc84a7acccc67b2ff0144db81ca4ea6f8cf78cadd0b2c8` |
| `scope-types-1`; A | `npm run typecheck --workspace @generalbusiness/dap-scope` | FAIL: invalid fixture imports; 1, 1; 600 s | 2.094766917; 5.784133 | 388; `0bfcba05f7c7c6d1dbb426e3b979e2037d75eeb9a0cea1843a9a72775ed31f1d` | 487; `31bef9aec77b811b02adb01ce841f3d4383518a58681ed5e538368221b21aca3` | `910511e650bcb89d64ef392b3c3371e2f539e1ee03fef7d1421fcff688c3e606` |
| `cli-types-1`; A | `npm run typecheck --workspace @generalbusiness/dap-cli` | PASS: compiler context; 0, 0; 600 s | 2.237883666; 5.995519 | 133; `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | E | `6ab5a223fbbfcfc3c6fd7d37a89eb64a597722c8090b8793e05366ce69e2fbb2` |
| `derive-types-1`; A | `npm run typecheck --workspace @generalbusiness/dap-derive` | FAIL: invalid fixture imports; 1, 1; 600 s | 1.545026250; 3.187385 | 554; `6b662dba51ea9e0322c57686f73ad7323afd8a005683537cf2ed5cf1ac67ab86` | 448; `6277c8947da59df0404e37fcbda63fb16f9f48b56480dff7f18876453a972799` | `b2fe82f037b4d3889d43a181d021650486a34047b906181a9081205399c1b5c5` |
| `derive-types-2`; B | `npm run typecheck --workspace @generalbusiness/dap-derive` | PASS: compiler context; 0, 0; 600 s | 0.861065167; 2.916191 | 106; `9c0d241243af93b4407c0403ed23829f628c596c3d1f35cfbf03a16817e14beb` | E | `f56a008af9dfe3ff0625c63fe9fc1c6e1b1eb50a7026f76a722716e3dd192535` |
| `scope-types-2`; B | `npm run typecheck --workspace @generalbusiness/dap-scope` | PASS: compiler context; 0, 0; 600 s | 1.594030541; 6.933744 | 147; `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` | E | `7c6ec928244e50e3fdc756602e967d1d60ecbef162f9994a63cf84c18f1c5011` |
| `replay-types-2`; B | `npm run typecheck --workspace @generalbusiness/dap-replay` | PASS: compiler context; 0, 0; 600 s | 1.066898500; 3.443562 | 135; `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` | E | `4a95cfb95263a3d431ff0df7c1fce3177efaa39d7054009b875b1774fb4183c9` |
| `security-entry-points-1`; B | `node --test scripts/security-entry-points.test.mjs` | PASS: all 10 Node inventory cases; 0, 0; 120 s | 2.441142791; 3.134958 | 1301; `f19d8058a4f4b4b54a38725d825a5e21aaee3ce048e27494f67027132a2710a1` | E | `dcc387e68358d5e2b882f760cd030a5ed0ee7f10b1d01edecfeee63d26052ead` |
| `pool-compat-1`; B | `node scripts/cloudflare-pool-compat.mjs` | PASS: dependency compatibility preparation, not a test; pool version 0.22.0, copied false; 0, 0; 120 s | 0.108697375; 0.218727 | 366; `45c8748ec80e27fb8553612683d29f8fd634ffb6734254248dbe88fc02b93d37` | E | `47c3a9a0b50e494097c14c1c444d24cb7f5bee062c1b437a5ce1a44e4509d529` |
| `derive-owning-1`; B | `npx --no-install vitest run --project derive --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/derive-owning-1/report.json packages/derive/test/fixed-slot-index.test.ts packages/derive/test/forms-guards.test.ts packages/derive/test/definition-corpus.test.ts` | FAIL: 1300 passed, 5 failed; comment acts illegally carried guards and also; 1, 1; 600 s | 2.868396750; 4.068175 | 97377; `07e2495f9915d0f18524ad13ef669a7e0012eeef915a00fde1c643771b7ad3c8` | 6357; `5925c58ce5d59486e93b45059e26a63f8aead98c18085102fa473a88a3bc12de` | `ef969f3db89c80bc1cfd9dbc1699c71f9b421fc2fa22d8b07d341e070dea0aa9` |
| `replay-view-1`; B | `npx --no-install vitest run --project replay --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/replay-view-1/report.json packages/replay/test/view.test.ts` | FAIL: 3 passed, 1 failed; same refused comment fixture; 1, 1; 600 s | 1.587493083; 1.900740 | 934; `a35be9967ce113b384ed3b101943d75ecf315fd0fbdeaa84828d9b0ac1bb75ee` | 1118; `53515bfd166d3f5848a8dc7a9f643ab8e241c9ac66db1ed3c365484886a65e1d` | `1f1363d633f3dd7abd8528dbe720ceed2f746cdbac47b603055ef54ce89be969` |
| `derive-types-3`; C | `npm run typecheck --workspace @generalbusiness/dap-derive` | PASS: compiler context; 0, 0; 600 s | 0.932868667; 3.057355 | 106; `9c0d241243af93b4407c0403ed23829f628c596c3d1f35cfbf03a16817e14beb` | E | `375ec03ac4a7d2fc1c063e117673e206ee69b725e2e0018f8f31c9cca6d30095` |
| `replay-types-3`; C | `npm run typecheck --workspace @generalbusiness/dap-replay` | PASS: compiler context; 0, 0; 600 s | 1.137914500; 3.502385 | 135; `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` | E | `b494c3fc365883ee0fc5eb0af711f72c380b0597a5d1287cda3bca6e95607a5c` |
| `derive-owning-2`; C | `npx --no-install vitest run --project derive --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/derive-owning-2/report.json packages/derive/test/fixed-slot-index.test.ts packages/derive/test/forms-guards.test.ts packages/derive/test/definition-corpus.test.ts` | FAIL: 1303 passed, 2 failed; new fixture lacked expected revisions; existing forms and corpus passed; 1, 1; 600 s | 2.908155375; 4.479771 | 930; `f7f9af6fb2b7a3481d96b24cdbb5a4c50c5b47d808c006fda7552df2915e6d39` | 1811; `fc146fb626a73f26e50ba9e551676d86dc6cf93170822e118554888dc0f0ee21` | `88a5dac81c37d65c40461a52b8299e5c1044c279681ddf2d2780f25f1423cd97` |
| `replay-view-2`; C | `npx --no-install vitest run --project replay --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/replay-view-2/report.json packages/replay/test/view.test.ts` | FAIL: 3 passed, 1 failed; fixture tick expected keys were wrong; 1, 1; 600 s | 1.654630166; 2.250753 | 935; `9baa09c3fac6a3e86773cb6a6b65b58bdbe5e51a4671497d83b226ac0d0eaa75` | 952; `578edcc98a65a9dd237d0931a200bce33275dd68487a5f8865fa2105d99e4471` | `df5cf989955c50bb0e29dcc083610d0f8929cb57b4c0239898a7f156fc6690bd` |
| `scope-types-3`; C | `npm run typecheck --workspace @generalbusiness/dap-scope` | PASS: compiler context; 0, 0; 600 s | 1.728241458; 7.102448 | 147; `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` | E | `db2b67fea7225b47101b1458b3962234b35f095fd492600413c6d6aa28c39088` |
| `derive-fixed-3`; D | `npx --no-install vitest run --project derive --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/derive-fixed-3/report.json packages/derive/test/fixed-slot-index.test.ts` | PASS: all 3 fixed index cases; 0, 0; 600 s | 1.264224750; 1.857663 | 424; `010ff495b3642263aab28acbe5a8e31edf2357a3c376f381c1346add19e6d34f` | E | `3ce5f539f6982bfd013c91e6be8c9329c3b9b9fe9b65f01f3238b9880164936e` |
| `replay-view-3`; D | `npx --no-install vitest run --project replay --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/replay-view-3/report.json packages/replay/test/view.test.ts` | PASS: all 4 historical view cases; 0, 0; 600 s | 1.342884708; 1.960459 | 411; `7086446cae535802bc4c32a5bcf041f00c80aa366e7576b305e80a3b15997cca` | E | `0ed35fe1fbe4ca3fda013d7f17ff4d3c9abff56106cefddcdd38d4fc74c80452` |
| `native-fixed-index-1`; D | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/native-fixed-index-1/report.json packages/scope/test/fixed-index.test.ts` | FAIL: 1 passed, 2 failed; first pin tried legacy initialization before genesis ScopeState existed; 1, 1; 600 s | 6.346980916; 6.841679 | 5626; `07f1616b6a52cb389684b970941e04163d3432ca7d8594c710d8ed2b635576c0` | 1566; `47a511d350e9ccbe4da0c95b4dd04598edcae07f75e0f019ba4877496ba9c7a2` | `508cd58ffd0915a5697d37d4ca5087cf27da9890162bdad4220068ffce31508a` |
| `replay-types-4`; E | `npm run typecheck --workspace @generalbusiness/dap-replay` | PASS: compiler context; 0, 0; 600 s | 1.211013916; 3.509813 | 135; `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` | E | `0badfc8c98172b493161317d6b1f13f2a3f2697ec171033c7c64aaa5fed1a169` |
| `scope-types-4`; E | `npm run typecheck --workspace @generalbusiness/dap-scope` | PASS: compiler context; 0, 0; 600 s | 1.915270500; 7.390025 | 147; `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` | E | `68a03102292ed40a0efbb03e692b0089d43271dcbb64b175523af616da8b7e86` |
| `security-entry-points-2`; E | `node --test scripts/security-entry-points.test.mjs` | PASS: all 10 Node inventory cases; 0, 0; 600 s | 3.030229041; 3.767636 | 1300; `4718450e6916f3f7daf84a629f6089e9627139925675837f8f49469bba98225c` | E | `2508998890193a99b42ce7ab65d8ec248c0d02120084c82bfe0f7ba2b5ad3831` |
| `cli-types-2`; E | `npm run typecheck --workspace @generalbusiness/dap-cli` | PASS: compiler context; 0, 0; 600 s | 1.768240208; 6.183131 | 133; `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | E | `f6fb24a53b149593907946d3412ebe072b6881f4904397e778909f8e1213bbb9` |
| `derive-types-4`; E | `npm run typecheck --workspace @generalbusiness/dap-derive` | PASS: compiler context; 0, 0; 600 s | 0.998784750; 3.190485 | 106; `9c0d241243af93b4407c0403ed23829f628c596c3d1f35cfbf03a16817e14beb` | E | `c09b01830c7f6843f5e6b46c79f2e1669555362e6518d029ea744385bea5a840` |
| `native-fixed-index-2`; E | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/native-fixed-index-2/report.json packages/scope/test/fixed-index.test.ts` | PASS: all 3 native index cases; 0, 0; 600 s | 4.932589417; 6.416143 | 3740; `97f8145cbcf378a9f434ab6b1048de0ca47d7725cc866167b72d2672592e9848` | E | `60eedf6b6b33c7f8fcc117afd9d9982d5ce2eb666b96f71c5f75bb7198ce1845` |
| `control-index-dispatch-1`; F | `node scripts/control.mjs packages/derive/src/guards.ts 'if (r.where!.length === 1 && where && "equals" in where) {' 'if (r.where!.length === 0 && where && "equals" in where) {' --expect 'fixed field and constant equalities complete beyond guardScan' -- packages/derive test/fixed-slot-index.test.ts` | DISTINGUISHES: baseline 3 passed; mutant 2 passed, 1 ordinary AssertionError at line 23; restored; 0, 0; 600 s | 1.591572667; 2.197974 | E | 2244; `03359107f169ef381f94a978b70ad2a91bdb0bdce1359905c656b88dedd7e077` | `bd9ed371604c36a9570a185017b29dfdcf5c6775b41fc5a422f7fafc52e7c1d9` |
| `control-floor-rekey-1`; F | `node scripts/control.mjs packages/derive/src/fold.ts 'rekeyFixed(writer, entry.at, removed, seq =>' 'rekeyFixed(writer, entry.at, [], seq =>' --expect 'structural fixed records rekey at a valid floor' -- packages/derive test/fixed-slot-index.test.ts` | DISTINGUISHES: baseline 3 passed; mutant 2 passed, 1 ordinary AssertionError at line 56; restored; 0, 0; 600 s | 1.596848792; 2.208270 | E | 2261; `13eb9d76a467478e725538f937ea4741ff1937697c49dd3f1686abfd21b783e1` | `f8f21f2efdd492619b7bc7c2467f2c7ec9ccf62e1b187917e2633db1bd5d67be` |
| `native-membership-room-1`; F | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/native-membership-room-1/report.json packages/cli/test/fixed-slot-membership.scope.test.ts` | PASS: 1 native room case; expected inner CLI Outcome.code 1 at byte boundary; 0, 0; 2100 s | 184.973967708; 197.349515 | 4023855; `d672d754183d7fc2fb333e945f5e8a944d472c3973a3f72a47456967432ad9a1` | E | `3b246c5863fe124a16bfd8a59a88133699f991f14909b1dbb01f9f68e53231f0` |
| `gate-1`; F | `npm run gate` | FAIL: kernel, Node 80, Counting 56 and plain 3115 passed, 1 plain skipped; native 843 passed, 1 failed, 2 skipped; scripted fixture omitted journal append; 1, 1; 7200 s | 1298.225492875; 2739.049412 | 8585; `c9945cf8d6eef7efc1b4c4f32a20632d294088978ccc8bb6b2ab206fb7d05fc1` | E | `355bd9015f251247e5248eff17c9adcc0dd1e2996172dac55ce674e80cd10125` |
| `scope-types-5`; G | `npm run typecheck --workspace @generalbusiness/dap-scope` | PASS: compiler context; 0, 0; 600 s | 1.544055834; 6.557159 | 147; `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` | E | `f161a626b7248d5ee6896bdc1fb351f0f3e33ba55acc144a4cddaf9f91f2c60b` |
| `directory-partition-index-followup-1`; G | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/directory-partition-index-followup-1/report.json packages/scope/test/directory-partition-index.test.ts` | SETUP FAIL: localhost listen EPERM; no tests ran; 1, 1; 600 s | 1.810835833; 2.235608 | 90; `ab0e13063a2dc0205b40bc814aaaa3429c7d2c603d673e3d5b40655eec48d31c` | 593; `6440e32fcb6670b0f517bed7f799561659e9e9fcb736b839b288e47123a3269a` | `d62ddc872b9ebb718ed41443d72dc04c776d7c36470e529e2da1b0b6f5df1371` |
| `directory-partition-index-followup-2`; G | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/directory-partition-index-followup-2/report.json packages/scope/test/directory-partition-index.test.ts` | FAIL: 1 real case; unchanged no-SCAN-or-TEMP assertion; 1, 1; 600 s | 5.061131209; 6.495077 | 1283; `6b95842a6e0ad6381e3732084db2980010555ef577b382e80ab8ae9cf6de1818` | 996; `4f47f1d75f49d23456902dd7c673f55175faf4a556ef8f65d97e307c32aad193` | `2b638b323b6b3781d0457eff1b3dae53ac3c156f8c940f6fd9ca1c10428044c7` |
| `directory-partition-index-diagnostic-1`; H | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/directory-partition-index-diagnostic-1/report.json packages/scope/test/directory-partition-index.test.ts` | FAIL: 1 real case; diagnostics locate temporary ORDER BY sort in fixedAffected; 1, 1; 600 s | 4.971782291; 6.439933 | 1285; `707de6cb52f154255404934d9c3f6a571387a51e754a3043ff081369e78a93a3` | 6081; `c87cd39cbb47ab685616a93094ca99529b5e537105bbfefb018fca927cf78250` | `13819fefb1e7a0416ed51cf6a560c817b9cfc4e19f0a7e60ec7d319337556433` |
| `scope-types-6`; I | `npm run typecheck --workspace @generalbusiness/dap-scope` | PASS: compiler context; 0, 0; 600 s | 1.416064291; 6.247039 | 147; `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` | E | `eb5c6d20cce20d5dd8f6201abaafb978366a056abb497e2f9121f3ca2430443e` |
| `native-fixed-index-3`; I | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/native-fixed-index-3/report.json packages/scope/test/fixed-index.test.ts packages/scope/test/directory-partition-index.test.ts` | PASS: all 4 native cases in 2 files; directory plan case and 3 fixed index cases; 0, 0; 600 s | 5.038041958; 8.104072 | 4506; `c097a4ae35e62a90e810a7f7f32481a395fda3c0ba0aaf48edb427f08fe3a657` | E | `7970f82aed8d86a4270b9218540e01f4f9252aedc9ff154f049b7e4ede9a227c` |
| `gate-2`; I | `npm run gate` | PASS: kernel, Node 80, Counting 56, plain 3115 passed with 1 skipped, native 844 passed with 2 skipped; 0, 0; 7200 s | 1064.656494208; 2264.714802 | 6249; `77906504570708ccb6e0d9d96371f6946d90018c6c4e8b8ba425d3ed0b8f50ff` | E | `a7b12c696e7626c35dfe6aafb70a285332477ebe45eba8066ee225bd38d447a8` |

The two controls run the three-case owning file before and after one narrow
change. Disabling fixed-index dispatch changes an expected write to unavailable
at `fixed-slot-index.test.ts:23`. Omitting floor dependency rekeying leaves a
count of one where line 56 expects zero. Both mutants fail with ordinary
AssertionError results. Each control restores its source bytes, and its capture
confirms the original clean checkpoint afterward. Neither failure comes from
an import or setup error. The standard control tool retains its baseline count
summary and full mutant output. It does not retain the baseline internal JSON.

The room capture reports 184.973967708 seconds wall time and 197.349515 seconds
of host child CPU. Its machine snapshot at 00:46:53.332894 UTC falls between
capture start at 00:46:50.103620 and finish at 00:49:55.078332. The host was
Darwin arm64, Mac17,7, with 18 logical CPUs and 64 GiB of memory. Node was
v26.13.0 and npm was 11.20.0. The single load snapshot was 1.43, 1.28, 1.30.
It does not describe continuous load, cache warmth or other concurrent work.
The retained source is `operator-inputs/machine-room-1.json`.

Gate 2 completed at source I with all five test stages passed. It records
80 Node cases, 56 Counting cases, 3,115 plain cases passed with one skipped,
and 844 native cases passed with two skipped. All terminal evidence is
complete. The native observer covers 241 scope modules only partially.
It records 72 unknown or suite observations and no contradictions. Those
observations do not establish callback completeness.

Gate 2 ran from 01:18:28.078458 to 01:36:12.736089 UTC. The host observation
in `operator-inputs/machine-gate-2.json` at 01:20:23.547835 records Darwin
arm64, Node v26.13.0 and npm 11.20.0. Its sysctl reads were denied. The
separate `operator-inputs/machine-gate-2-sysctl.json` observation at
01:20:40.142538 succeeds. It records Mac17,7, 18 logical CPUs, 64 GiB of
memory and load 4.44, 2.88, 2.59. Both observations fall within the gate.
They do not establish continuous load, per-command load or cache warmth.

Gate 1's separate observation in `operator-inputs/machine-gate-1.json` at
01:01:55.056308 UTC records the same host and tool versions, with load
3.75, 3.34, 2.48. The other table rows have no per-command load or cache
observation; those conditions remain unknown.

Gate 1 ran `npm ci`. Gate 2 skipped installation because the dependency view
already matched the verified package-lock stamp. Neither the install difference
nor the host snapshots establish why the two gate timings differ.

The 36 captured validation commands sum to 2,620.196451661 seconds of
elapsed time and 5,344.236107 seconds of host child CPU. Commands ran in
parallel, so the elapsed sum is not one pipeline or editing-session wall
time. It includes capture post-guards. Setup, source inspections and retention
outside those captures are excluded. The command window runs from
00:40:04.170037 to 01:36:12.736089 UTC.

The focused room's complete outcomes and metadata remain in
`native-membership-room-1/report.json`. The original gate logs are
`operator-inputs/gate-detail-gate-1/test.log` and
`operator-inputs/gate-detail-gate-2/test.log`. Their five-stage ledgers are
`operator-inputs/gate-detail-gate-1/test-evidence/stages.json` and
`operator-inputs/gate-detail-gate-2/test-evidence/stages.json`.

Both gates retain their whole original temporary output. The copy records
`operator-inputs/gate-detail-gate-1-copy-record.json` and
`operator-inputs/gate-detail-gate-2-copy-record.json` bind actual original
paths, byte and mode inventories, internal observer streams and the explicit
absence of an enabled external progress binding. This supplies no callback
coverage or physical-drain claim.

The six original generated Counting files for each gate are bound by
`operator-inputs/counting-generated-gate-1-copy-record.json` and
`operator-inputs/counting-generated-gate-2-copy-record.json`, with their own
indices at `operator-inputs/counting-generated-gate-1/SHA256SUMS` and
`operator-inputs/counting-generated-gate-2/SHA256SUMS`. Their original
source/output paths and metafiles remain unchanged. These are generated
Node witnesses.

`operator-inputs/source-preparations-copy-record.json` preserves initial
locked dependency setup, AST source inspections and a retrospective system
SQLite source probe. They are qualified operator inputs, not frozen project
acceptance captures. The native diagnostic and owning tests supply the SQL
plan evidence. `operator-inputs/retention-callers-copy-record.json` binds the
four closed retention callers.

The standard-library audit in `finalization/receipt-audit.json` validates all
36 captures, including failures, with no missing, integrity or closure issue.
It runs no project code. The manifest binds every cited file and the complete
`operator-inputs` and `finalization` units by their own indices. The root
`SHA256SUMS` covers every retained file. Finalization removes all write bits
and verifies every retained byte and mode again. Keep the evidence read-only
for at least 30 days after landing. Removal requires a planner act naming
this manifest.

## Limits and remaining work

Request `121a8913bcbe0d65ce1e61643e16fa6b8e36c83d` owns this change.
The room fixture uses a scripted clock, local TEST custody, setup inspection
and a finite callback scheduler. Its membership authority and signed client
requests are real within the native test host. The host runs workerd, not a
physical celld deployment. These results do not explain the earlier deployed
CPU finding or establish production load capacity.

The room case allows 2,006 scopes, callback batches of 128, at most 131,072
callbacks, one million scheduler actions, 100,000 callback batches and a
30-minute body deadline. Its test ceiling adds 20 seconds, and the outer
capture allows 2,100 seconds. Per-batch settlement has 64 rounds and at most
three actual outbox retry advances within eight seconds. Final callback joins
and observed HTTP requests have finite waits. Exceeding those bounds fails
the witness. Process-group closure does not prove physical cancellation or
container drainage.

The native index tests include an explicitly seeded migration fixture. They
also exercise a genuinely judged opening that rolls back at scope-full and
a fixture-judged floor whose append, fold, payload deletion and eviction run
through native SQLite. Scripted authority, archive receipts and seeded rows
do not prove native archive admission. The three passing cases cover the
stated index invariants, not every deployment lifecycle.

Index lookups avoid scanning matching items for this admitted predicate.
Legacy initialization still reads current items and held hashes. Rekeying
still visits affected dependencies. This work has not measured their worst
case and makes no constant-cost claim. It raises no scan or verification
limit. It does not claim a deployment, a CPU reduction or complete whole-room
verification.

The open limits remain with load findings request
`a6847815c845145adddca1476342e52b6a8baf82`: deployed CPU, production load
and the unmeasured worst-case cost of index maintenance.

Child request `7c0e8181a4edc7c45a00f5b4cc3815e98a61f890` owns proof reuse
across scopes within one `verify --all` run. It calls for unchanged defaults
and a complete 2,000-member verification witness. That work remains separate
from this bounded measurement. This note does not borrow its future result.

Gate 2 passed at source I. The original gate 1 failure remains recorded
above. The evidence checkpoint is source I and tree
`943ec3b780772ad016e4ccdae5f566de7770a608`. The review head adds only this
note and `notes/implementation/evidence/2026-10-30-fixed-slot-index.manifest.json`.
Source and tests remain unchanged after the passing gate; the documentation
follow-up rule in `docs/testing.md` applies. Checker review determines
acceptance separately from evidence integrity and retention.
