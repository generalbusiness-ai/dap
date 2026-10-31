# DX-A2: preserve archived causal replies and hosted enrollment conflicts

Request `1c124ebf0f204a06e9f0f0de33c3b88c4dd296bb`, promise
`28df5171acd1320942be751570e7a2b044a541e1`, and parent
`2888b81e7472b5c097c8bc676794ee0170949978` track DX-A2. The historical source
base is Main `5dc9765fdc6fb6896b736127801944c46ee288f9`. The current production
checkpoint is `ba8953140c4465cd213af37dad97306150802613`, tree
`0170d16bc65bfa190759ef66889c8f1d04380f73`, parent
`7424aafc8ef80ec0287d6941bd42e388a98482a9`.

Checker `18f90534cbd8c6b319d13ec2fd600d64056d1c7e` requests two final repairs.
Both source repairs have focused evidence. Gate 6 passes at the current
checkpoint. Gate 5 fails under the outer restriction described below. The
fourth repair gate stays a pass for its older source. All seven earlier gate
failures stay failed. Exact-source review remains open.

## What changed and why

The five existing reads accept optional minimum `{at: ScopeRef, head: number | Head}`.
HTTP uses one canonical base64url atLeast value, bounded to 512 decoded bytes
and 683 encoded characters. Head and FactRef remain closed. Malformed or
duplicate input or a different URL scope returns 400. Authorization precedes
any head; wrong incarnation and unauthorized requests expose none. The existing
one-second wait sits outside the turn, transaction and projection flight. It
wakes on committed seals, refreshes causal authority, and releases its timer.
The card reuses its accepted receipt in its existing projection request. No
summary barrier, polling loop, native definition or new rate policy appears.

Ruling `366b3989097cc70edf291bb97e019c7a866c0607` keeps ordering-only semantics
for a full minimum strictly below a real floor. At or above it, a missing or
wrong retained hash stays unavailable. The earlier repairs also keep causal
refreshes, public followReceipt mismatch refusals, one ordinary unavailable
fallback, all five client and CLI arguments, development-host refusal, and
kernel section 7 contracts. The single-file exception remains withdrawn. A
separate waiter-count cap remains deferred.

The first final repair makes an authenticated entry read below the real floor
return its existing archive pointer directly. It does not wait or expose a
current head, including when a stranger supplies a future minimum. This keeps
plain entry behavior after the same request authentication without admitting
strangers to behind.current. No archived payload or supplied historical hash
is verified, and no new read authority or wire field appears.

Ruling `f71e8a29ffac0988ec9b341417bc706ad81eb6d3` accepts `archived` before
minimum kind or incarnation checks below the floor. HTTP route-scope
validation and request authentication still apply. Approved parent:
`e38f9cc4b7780bfb9a80de435e8b43b6036109c3`, tree
`8d63028755575b0b4966c3d6aab5b64ce1283292`. Only docs/scopes.md, note and
manifest change; production and tests keep gate bytes. Exact-head re-review
is due. Deployment waits for the J4 live witness to close. No new test is claimed.

The installed projection owner uses real Scope turns and SQLite, old signed
causal input, elapsed intent time and an actual floor. Both whole-file cases
pass. The controlled floor, archive receipt, clock, definition and provider
qualifications remain as before. The new control restores the bad refusal;
its ordinary assertion distinguishes archived from forbidden and exact bytes
return. It is local Native evidence, not provider archive custody.

Hosted enrollment now sends a qualified sequence minimum, as followReceipt
does. Its own retained hash and complete signed-input comparisons still return
409. A full minimum previously stopped a wrong receipt hash in the barrier and
turned the permanent conflict into 503. The ordering read now reaches the
existing comparison. Neither authentication nor bearer issuance changes.

The new three-case owner uses real HostedAgent, SQLite, custody, signing and
HTTP decoders. Its peer and retained-hash barrier are explicit in-memory wire
stand-ins using the maintained minimum codec. It proves classification and
custody, not Native admission, waits, floors or registry authority. The hash
case alters only the accepted receipt hash; the entry stays honest. The signed
input case keeps row and receipt hashes equal and changes only retained signed
bytes. Both return 409 without a bearer. Honest readback returns 201. Reopening
and repeating preserves the accepted original and dispatch count 1. The control
reverts only the full minimum and distinguishes 409 from 503 by an ordinary
status assertion. It does not merely assert an argument shape.

## Actual failures and follow-ups

The initial MCP test compiler fails because two fixture submit calls omit the
required grants argument. Explicit empty arrays fix that type error. The first
owner run then fails all three cases at an incorrect custody-digest expectation.
The HostedAgent helper reports a different documented digest domain from
intentDigest; correcting that expected value preserves the original signature,
receipt and status assertions. The final owner passes all three. Both earlier
failed captures stay separate. Four final compiler contexts pass: Scope and MCP,
each production and test. The Native projection owner passes two cases.

The first AST producer cannot load: the partial 7424 baseline omits a top-level
public source read. V2 runs the same maintained producer bytes against the full
exact Git 7424 export. It confirms the baseline seals, then reports new semantic
seals 1fbb2ae6de25
for Scope reads and 408713d777ce
for HostedAgent. Root adopts those two values. They are AST observations, not
file hashes or Native authority. Only the two named baseline sources, matching
producer bytes, helper and qualification join RAW; the 112-MB baseline export
is reconstructible from 7424 and is excluded. No node_modules tree is retained.

The first security owner has nine passes and one failure before adoption.
The next child has ten passes but capture exit 1 because a concurrent control
changes hosted.ts. That source-unstable capture is not a pass. A later
quiescent owner has ten passes with unchanged source. No assertion or deadline
changes to conceal either earlier result.

Gate 5 closes with child and capture exits 1 after Kernel. Node has 78 passes and two failures; Counting,
Plain and Native stages are unreached. Root reports the outer tool used default
restricted execution. The actual Mac child reports listen EPERM on 127.0.0.1,
and the owned Counting listener case times out. Every actual inner report is
retained separately from its outer receipt. Source is unchanged and output
capture complete, but the gate remains failed. The next runner changes only
the RAW path; Root must request escalated outer execution. Tests, deadlines,
source guards, locked dependencies and default TMPDIR stay unchanged.

Gate 6 closes with command and capture exits 0 at ba8953140c. Node passes 80,
Counting passes 56, Plain passes 3,159 with one skip, and Native passes 866 with
two skips. All five stages pass and all four terminal ledgers are complete.
Source and output capture remain complete, with zero dropped bytes. Root
reports escalated outer execution. Wall time is 1,137.567301 seconds and host
child CPU is 2,424.405295 seconds. Collector wall is 1,137.697504 seconds.
The runner observes Darwin 27.2 arm64, 18 logical CPUs, and starting loads
2.024, 2.417, and 2.316. Cache state is uncontrolled and guest CPU is unknown.
Scope timing remains partial, with 72 unknown or suite observations and no
contradictory records. Concurrent duration sums do not measure wall time or CPU.

The predecessor retains the three original and three earlier repair gate
failures, all fixture/control attempts, and the fourth repair gate's historical
pass. The original Lending no-send cause remains unconfirmed; later diagnosis
and serial stand-in reads do not retroactively prove it. Both earlier controls,
Native/provider/clock stand-ins, partial timing, unknown cwd and guest CPU
qualifications remain attached to their retained records. No hosted outcome or
physical descendant drain follows.

## Evidence custody

The sealed successor is
`/Users/hughpyle/play/artroom-evidence/2026-10-30-dxa2-final-two-repairs`:
1,836 files and 384,281,554 bytes. It preserves the complete predecessor:
1,378 files and 289,443,970 bytes, including its earlier 576-file unit.
E below means the successor's prior-evidence subtree. That independent copy
keeps every nested historical prefix. The table preserves all 83 old rows,
then the 16 focused invocations, failed Gate 5, and actual Gate 6. All 101 rows
remain byte-exact from the sealed raw note.

Root ran the reviewed v3 prepare, seal, and cite operations with exits 0.
Root independently checked all selected bytes, modes, 105 complete unit
inventories, and predecessor preservation, then checked the sealed leaves,
manifest, and readback. These are retention metadata operations with no formal
collector receipts, not additional project checks. The committed manifest
embeds Root's readback report and binds the adopted note separately from the
unchanged 39,773-byte raw note. Full raw inventories stay outside the checkout.

Static inspection found v2 reading a nonexistent receipt cwd field. V3 checks
the command cwd and the separate runner cwd. V2 never ran, so no failed
adapter execution is claimed. Its source and metadata remain unchanged.

W, C, S, M, P, I, G, R and N preserve the original table labels. Their retained
roots are E/prior-evidence/focused/contract, focused/client,
focused/scope, controls/full-head, generation/page, operator-inputs/seal-adoption,
captures, generation/mcp-resources and focused/inventory respectively;
every suffix in that list expands under E/prior-evidence.
RR means E/repair-checks; FR E/floor-checks; FC E/floor-control;
A1 E/generation-v1/captures; A2 E/generation-v2/captures;
Q E/fixed-query-calculation; BF E/client-boundary-checks; CF E/counting-fixture-checks;
NG1, NG2 and NG3 mean E/new-failed-gate-1, E/new-failed-gate-2 and
E/new-failed-gate-3. NG4 means E/gate-captures. LD and LS mean
E/lending-diagnostic-checks and E/lending-serial-checks. The prior compact manifest retains these definitions; the successor binds
them without flattening historical prefixes.

V expands to node node_modules/vitest/vitest.mjs and T to
node node_modules/typescript/bin/tsc. Package-local original commands retain
their ../../node_modules prefix. $WT is the original
`/Users/hughpyle/play/artroom/.builder-worktrees/dx-a2-minimum-head-20261030`.
$M is `/private/tmp/artroom-dxa2-minimum-head-control-20261030-v1`; $I is
`/private/tmp/artroom-dxa2-seal-adoption-20261030-v1`. $RR, $FR, $FC, $A1, $A2 and $QF in commands mean the original public
scratch roots named in draft derivation, not the new retained paths.
$LD and $LS in commands name the original public Lending capture roots.
Command records, receipts and streams govern each row. Cwd stays unknown
where no record names it. I/main, I/extra and N/owner use their root receipts.
No command is rerun to derive this table.

Output digests are SHA256. out means stdout; err means nonempty stderr.
Omitted empty stderr still exists with SHA256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
Receipt walls are rounded to six decimals; per-command host CPU and source
guards remain in the receipts. Concurrent case sums are not wall time or CPU.
S1's separate gate shared this host from about 20:05. No private S1 evidence
was read and no timing cause follows from that overlap. Logical deadlines
exclude guards and cleanup and prove no physical descendant or VM drain.

F means final-two-checks under the proposed successor. Each new command.json
retains exact argv and cwd; the outcome follows it in the command cell. The
index binds complete receipts, streams and before/after source snapshots.
G5 means gate5/outer, with its actual inner retained as gate5/inner. Current
row counts are invocations, not unique coverage. The later gate outcome and
all later pins remain unknown until a separate closed Root handoff.

| Check and receipt | Actual command | Exit | Output digest | Receipt digest | Wall seconds |
| --- | --- | ---: | --- | --- | ---: |
| W/owners | `V run --project bytes --project platform packages/bytes/test/read-minimum.test.ts packages/platform/test/application-projection-wire.test.ts` | 0 | out `48c6038e45a5c5e274b1a47da293feee78fdfa51aa6ecab687c12e9a1b1690c1` | `3a204a9bdc0d44bccf532c601774d07d22459b619c2f0ccf0d9e57955ac298c2` | 1.276071 |
| W/owners-followup | `V run --project bytes --project platform packages/bytes/test/read-minimum.test.ts packages/platform/test/application-projection-wire.test.ts` | 0 | out `e471f82c9a79d7ad84c4c9b4a2b22dafb653766a555b0223b0fbe47cf5b18652` | `435b8dd66ea50718cb34b19fe53b8719c97edb098f7c6df2c4db79ff542b073c` | 0.786957 |
| W/platform-types | `T -p packages/platform/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `a667c1280612dde854788b221ae54af5302dcd739e8de39313670a9b25cfeba5` | 0.350197 |
| W/types | `T -p packages/bytes/tsconfig.test.json --noEmit` | 1 | out `56ed888328793a8c5980ccc19adf83025540140f8d09bb49558707632d3716c7` | `4b1dc3a7e9b9badf661d855916c245fc88910e2115231611c09ebb8b47e34c29` | 0.456702 |
| W/types-followup | `T -p packages/bytes/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `4ef757f01871b8de372c04ff3ea79be4104a53ed6e93a92d51a3ac615800f2c4` | 0.129006 |
| C/client-owners-1 | `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/read-minimum.test.ts test/intent.test.ts test/journal-tail.test.ts test/signed-read.test.ts test/application-projection.test.ts test/answers.test.ts` | 0 | out `dab17a15351e54098d7e2beb54d6c3bb8135f74b5f54537465dda63ac786cae9` | `d6a25713675fdfe503b153492d64f4e83c84773a9e68ec0b2afc0c60004e55ff` | 0.445270 |
| C/client-owners-2 | `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/read-minimum.test.ts test/signed-read.test.ts` | 0 | out `2ba923479286289125f673eec33f9260f5dc87c10eb4d4429fd848214da19b0e` | `fb8f63f792c5afb6b71ba74590ca3ed2a32d49c9fc0a5e273d122fa226dec66e` | 0.455490 |
| C/client-projection-owner-2 | `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/application-projection.test.ts` | 0 | out `953225fc3cc0ef0e7dc91857c7ab953918da50a5a79577be224b379081f3f22b` | `907f1a7349d8fb5f4acf5a5859819522810d545e22adc49528f8dd9b88be1bdd` | 0.445472 |
| C/mcp-card-owners-1 | `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/declared-views.test.ts test/declared-view-inputs.test.ts test/metrics.test.ts` | 0 | out `5607197670c7a209edeaffecda4922d42403b52eebd317f0605c22d67342997e` | `6ed468819a00c6b99667e62282e18ccfb3c447aca71dabc8dbf220dbc8798f49` | 1.138290 |
| C/native-card-owner-1 | `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts --project scope test/application-projection-native.test.ts` | 0 | out `e85a7ffc946fe4a86330827779af6bed902f786ef51d98721b4355ffe58994ca` | `311c95fa7546e09d050a69f2c4c2cb37663c7e21cb7083c269f674af4a12efe3` | 7.798798 |
| C/native-mcp-owners-1 | `V run --config vitest.config.ts --project scope packages/mcp/test/hosted.scope.test.ts packages/mcp/test/card-actions.scope.test.ts` | 0 | out `c2c23016d4f7c5cbb8d9bd89d149a4e85d79c11bc32904655771bb7e8f6ed9a2` | `0bebe7a1b8fea454695514c2e3db1eea60e17fe9d67d9446d46bf9babf27126c` | 102.468351 |
| C/types-cli-gate-repair-1 | `npm run typecheck --workspace @generalbusiness/dap-cli` | 0 | out `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | `393fa7dd114aa53b1bbca921a4874a330274387c4fc809a22bf856ef514b6289` | 1.358344 |
| C/types-client-1 | `T -p packages/client/tsconfig.json` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `192707672c6879ac2c67de5459836a7f8893cbc9968d0580978ddba2399a9ca1` | 0.130392 |
| C/types-client-tests-1 | `T -p packages/client/tsconfig.test.json` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `0a595a28f066a61df4673ef6ad96e9ecb337804578e2671923cdfe60e38292a5` | 0.182609 |
| C/types-client-tests-final-1 | `T -p packages/client/tsconfig.test.json` | 1 | out `50a883a4219c5aae8cfbfdd0d5629cc8a133a3099beadc0626dd03361155beca` | `0e8f8959a656693112d627968a3c75dab55f0c7d636e393d003ccdab5701c784` | 0.180760 |
| C/types-client-tests-final-2 | `T -p packages/client/tsconfig.test.json` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `4ec31be9556dd56517d6652d5f38ea13c271e15e895e72c4148687be455d7c7e` | 0.184908 |
| C/types-mcp-1 | `T -p packages/mcp/tsconfig.json` | 1 | out `9bb02e683576bdf55e37c568302b9d54992205838f1e12c483605862ef02c439` | `176a0644746c44a2e3380bcc94da08ffdaf3ed6300ff845f1b4aa8a4d03b2f7a` | 0.292511 |
| C/types-mcp-2 | `T -p packages/mcp/tsconfig.json` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `1b404959003eb1c05ce9db97dd0a020d29cd4351e9107e85372ee5ae32ecfc0a` | 0.396310 |
| C/types-mcp-final-1 | `T -p packages/mcp/tsconfig.json` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `fc7073f1c40ce59ea981aee1e099b47bf435689462a1a87c424ac3578f1833fa` | 0.290501 |
| C/types-mcp-tests-1 | `T -p packages/mcp/tsconfig.test.json` | 1 | out `30b0d6e3614655d128c98d196ee2065455a0e7a3c62868017b67ac03b4fcefea` | `7c7b1631a237b8ec753f0d64bd328f3a54a391bdd48d874ecb4e5c9c3d11b05a` | 0.603218 |
| C/types-mcp-tests-2 | `T -p packages/mcp/tsconfig.test.json` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `fc917dc0a629818eeae0618911d9dcf3ce7f03ac0d9ad9dd631cc2c6297ce399` | 0.455204 |
| C/types-native-card-1 | `T -p packages/scope/tsconfig.test.json` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `70a8323014449a52990007d763978e89da90538158d39af50abcda5c68b048d4` | 0.836182 |
| S/native-minimum-owner | `V run --project scope packages/scope/test/read-minimum.test.ts` | 1 | out `b8f98ec3b175b382abb3b80daa8fc29817ff22c109dbe6d6c1b921e41eab9b92`; err `6440e32fcb6670b0f517bed7f799561659e9e9fcb736b839b288e47123a3269a` | `16c0404e81f8a5ee0e90d3638dfde8066f8515eae492d957495b47c7d55febe6` | 1.247141 |
| S/native-minimum-owner-2 | `V run --project scope packages/scope/test/read-minimum.test.ts` | 0 | out `3411953d7e3da58f8f40a2f373c4d59e7f0939855e8a9b287ac5a31a56307307` | `0517b24e8709e3d50b86691b6a790a7eb7500836491413ba8c1f30cbee79546f` | 6.654362 |
| S/pool-compat | `node scripts/cloudflare-pool-compat.mjs` | 0 | out `fb74376ef270118964e9337b343314714c1a7d1dce7328b646b9bae15ad54ffc` | `9d14139b41da0f4cf10067f64a41a8a36a6ed02a389ddbc282afcff6b36dd6e5` | 0.102923 |
| S/scope-types | `T -p packages/scope/tsconfig.test.json --noEmit` | 1 | out `7368114e2a1e2f285c11e9830560a5aa7cadf7db03c3c0118f4b583aebc2c32d` | `b03840bf75f20eae3e01bd5b00b7310b1e9458463128014c49b2a1617da9e344` | 0.872489 |
| S/scope-types-2 | `T -p packages/scope/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `dcff7c75f876c88f4e0dcd6f3ed88b91d918a5ef906864c8b31502f76c8f2eee` | 0.749824 |
| M/baseline | `V run --project scope packages/scope/test/read-minimum.test.ts -t '^native minimum reads wait for a seal while the same scope accepts the concurrent write$' --reporter=verbose --reporter=json --outputFile.json=$M/baseline/report.json` | 0 | out `22272dddd37e07dfe04cd647bad6af33f310d711d88e2b94f6aaea2105a6e558` | `40635e897ef1466390432c09aab47d13c1ab015deb679d7f9986b8f84fb03ed5` | 5.128998 |
| M/mutant | `V run --project scope packages/scope/test/read-minimum.test.ts -t '^native minimum reads wait for a seal while the same scope accepts the concurrent write$' --reporter=verbose --reporter=json --outputFile.json=$M/mutant/report.json` | 1 | out `fdbf7d9ba7bee083aea8bb75de1c1a3414276246693ff119042b2310122bdd8b`; err `d2a0e2fe928f75ac19e189a76284d444015e46cd09e3f3220d7918cfa3c6976e` | `c388bfeaf742e896241ec0144a0445edbd64db25b889a69f44ead477d7b4802f` | 5.041791 |
| P/assets-owner | `V run --project page apps/room/page/test/assets.test.ts --reporter=verbose` | 0 | out `c75c0afd561863acadbe4d7143aa1662f960c6815210ddcfd455c52c9e38c7fe` | `34bd4d15dc9946de6ec274264afe43042645c69f0c947280ff1ec28d51e8629d` | 0.753932 |
| P/build | `npm run build --workspace @generalbusiness/dap-page` | 0 | out `183ac2b8c4d925f62888e4df8bdf5a3a7f33b15cb0e263d224af3aaf76b0e6c4` | `ab3a158b123834072369d4ecb24b017abb5e4168b46e9dfe838fcec8bf52989d` | 0.307745 |
| P/compatibility | `node scripts/cloudflare-pool-compat.mjs` | 0 | out `fb74376ef270118964e9337b343314714c1a7d1dce7328b646b9bae15ad54ffc` | `4172c1e8f5871e6127603c7bde80792f1624bcf1e2230ed9e3f20eb5668cd3e3` | 0.083622 |
| I/extra | `node $I/produce-extra.mjs` | 0 | out `ff29f4ca01b56b85f090c6aafc59dd1bd620916edb5f95d7fb3b084eb9dbc2c6`; err `27569f4386471d5a985dcc17c2f9e763bb2bfa9ab7cf6d72266d8f3334d039c4` | `98aaf31cf4615e79a66c612eddd7bacf25792ce4710a4056937bca41d815ce0e` | 0.139966 |
| I/main | `node $I/produce.mjs` | 0 | out `3dc442f49e319ee247fe64dcf71dac46cf755f61fc4854536c490f5609b4d946`; err `c72cda3ff8ee2bd18760247e2347422ceffb78fd742f87f7823dd19c2c6f9411` | `024ac2dae891f792f257754c23c0f97a3fc5aa86bd87f1a71f45d4481b060cfd` | 0.439282 |
| G/gate-dxa2-1 | `npm run gate` | 1 | out `411711fe9fdaeb9915fd28f0e973e6ef8d480ab110a6e111789f437fd9f1fa45` | `e143aabd8b42020f9002362e1f134b8446a9c24eb60502645ec65e6e149249f5` | 17.534099 |
| G/gate-dxa2-2 | `npm run gate` | 1 | out `a98b0d144065972cf57091ed27fe91a99c17066075b7824755d3142e394082c6` | `16bda993a0da1f0ec199c9634c3bf10e81d8bc03e5ad9379a578d600f9f8e49b` | 153.798889 |
| R/generate | `node packages/mcp/scripts/views.mjs` | 0 | out `4c1a2bf8e5b091d5863efe0cc2cf5d90d6a143c4b74b92e4180559d59bca58f9` | `76db49410cb2619748a02fc6a099fc161046910da4884886d034fa969f34274e` | 0.138382 |
| R/view-resources-owner | `V run --project mcp packages/mcp/test/view-resources.test.ts` | 0 | out `508c9451f53783d58c2a8e32399d0fb2814e16ea0c2ad549a0dadcde0cfdefc5` | `ac0f237ce718eff5c0877885307b929c3b39bed849ca4c246f340b756af4818c` | 1.750442 |
| R/mcp-production-types | `T -p packages/mcp/tsconfig.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `53a3aab5885fd069f58c306adba22afc9af87d664cbc4eceb0d06c51d23a8b75` | 0.301436 |
| R/mcp-browser-types | `T -p packages/mcp/tsconfig.browser.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `368ef49f0e65c0218aa58181543d556898250b1a816c4625f0fbe89e280aebff` | 0.139844 |
| N/owner | `node --test scripts/security-entry-points.test.mjs` | 0 | out `41474c170864d7cc244d5719cb3d1825cb0e40f067dbdd361ccde9dfcdca00ef` | `e73e30c14405485d4ecee75b341e89b121d086b8f04f6ab57c61ba6a1e822cf0` | 2.631048 |
| G/gate-dxa2-3 | `npm run gate` | 1 | out `cd2d9aeec5b528f578d5e648a857f5bcc0b481660d5f036e13196af5c2ea8ac0` | `3b367c396bbb683c3982eb54f0a70a58efaf8ab0da8513513a9b426b927b57ab` | 1334.847241 |
| G/followup-scope-types-1 | `T -p packages/scope/tsconfig.test.json` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `92a3913ceb1852174a04492d21f76f5f0408fdf83c38d43b15d12cdd8fe32192` | 0.914732 |
| G/followup-native-client-1 | `V run --project scope $WT/packages/scope/test/client.test.ts --reporter=verbose` | 0 | out `ee36dcfe01853358b2a12c0ebf6b5f5fee0020bd948bfdcf46fd92a748bd846c` | `84b251243fea9a23d325f1bcd522b1e3c0ff9ab65f7b88418d51352034eb8548` | 5.667915 |
| RR/cli-native-types | `T -p packages/cli/tsconfig.scope.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e52e19f8ce9903a66a73eb253aaa2dfc15eb1b0ac25c05d425cf8e0c37d19a4a` | 0.455468 |
| RR/cli-test-types | `T -p packages/cli/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `d5713a46e311e947300cea8821f7f43ddad6f8cb6c19790acd82d02b1d08bd93` | 0.398552 |
| RR/cli-test-types-2 | `T -p packages/cli/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `d3eba8444fc800bbc66d97d8fe18f057b9dda6c4bf777ea90ee3cced9baf41a4` | 0.398424 |
| RR/cli-types | `T -p packages/cli/tsconfig.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `25a7d926c46740375f7641c683c9d590941f974cab6dfa44b8d74314596f4559` | 0.315844 |
| RR/client-test-types | `T -p packages/client/tsconfig.test.json --noEmit` | 1 | out `2b0bbf81cef78d95a7c580829b907cfcbcc97f5239b8aec9b0b96adaf1ab6e47` | `d18bc09939c5203881c2b768c5449817e9a50d1c11b759744c7bd9868a98a72a` | 0.141491 |
| RR/client-test-types-2 | `T -p packages/client/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `48414ecdf0d974314b77444b63ddf33cb8a249f1395f7f0a25bb6d0f4b2620cd` | 0.141038 |
| RR/client-test-types-3 | `T -p packages/client/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `a5540c6b013282607bf9f711bdab440cc75272d6f7e65a8a0a2fab945a5de094` | 0.142049 |
| RR/client-types | `T -p packages/client/tsconfig.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `9d08594bf060cc0f060b0b91859ce76d5fa916b5b27eecb53c23b92f6fd392f3` | 0.153653 |
| RR/compatibility | `node scripts/cloudflare-pool-compat.mjs` | 0 | out `fb74376ef270118964e9337b343314714c1a7d1dce7328b646b9bae15ad54ffc` | `d5c0d643a0a7c7eb72db7247c6fcdea6675c425cdc7f6dedf9f27f0b28bac001` | 0.085411 |
| RR/native-owners | `V run --project scope packages/scope/test/read-minimum.test.ts packages/scope/test/preparation-flight.test.ts packages/scope/test/application-projection-native.test.ts packages/scope/test/item-query-lifetime.test.ts packages/scope/test/client.test.ts --reporter=verbose --reporter=json --outputFile.json=$RR/native-owners/report.json` | 1 | out `c7be0ac68793b1d46bfc7a2183670c20748860cf57382892d07aca3971411143`; err `c1c42aead32b377aabb0778ce41b8ec8177b5ffa0272e573639011402f25401e` | `5c495bc2b0aa3cc0b8a9b50454763019e0f4742e44aa43cb76b1b2a214738568` | 36.231829 |
| RR/native-read-minimum-2 | `V run --project scope packages/scope/test/read-minimum.test.ts --reporter=verbose --reporter=json --outputFile.json=$RR/native-read-minimum-2/report.json` | 0 | out `f9889fda119b0fb9bf5f42f96258b46ced7fb955fbbd9714c70b98853279f785` | `142133a56bcbea546a81d2abdf7de41a43b2f66f6d2373d328dbc5268b4ea4a9` | 5.074523 |
| RR/plain-owners | `V run --project client --project cli packages/client/test/read-minimum.test.ts packages/client/test/intent.test.ts packages/client/test/application-projection.test.ts packages/cli/test/session-cache.test.ts packages/cli/test/application-dev.test.ts --reporter=verbose --reporter=json --outputFile.json=$RR/plain-owners/report.json` | 1 | out `88c72b6ec85724cb70e721646260b34a2fc3904275d4e385d5c9f8ef57ea6242`; err `58d58732bdf3a66e23005e89cb5ca9c97a0f6224dd2c9dca887782d5f8c3e1c0` | `53392fd895d56b830b777fc0e2b722b58d9d0030538307246ca864d05c2744de` | 2.804688 |
| RR/plain-repaired-2 | `V run --project client --project cli packages/client/test/read-minimum.test.ts packages/cli/test/session-cache.test.ts --reporter=verbose --reporter=json --outputFile.json=$RR/plain-repaired-2/report.json` | 0 | out `3be35a80dfbf06785820e6b821ea1e2eb1e601ea1947eeb5d730a2472a3aad50` | `dd06243e43964e06b273cf89fea71d88cf16d7829db0ad3b8c9ee1688a1af2a3` | 1.096278 |
| RR/scope-test-types | `T -p packages/scope/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `8bb7c82147e2a29b6b0dc225ad92d855ba994f9586671b833ee422fb9970a2dd` | 0.734451 |
| RR/scope-test-types-2 | `T -p packages/scope/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `ddc767b7892ab7c9a8ec0f744ee9ce48d44905571803051e20c6d8f43aabb4fa` | 0.731108 |
| RR/scope-types | `T -p packages/scope/tsconfig.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `2c434c5eae9352520870ce79f9e7ade4e616819416e726f37b14ba820e35ce43` | 0.353923 |
| FR/native-owners | `V run --project scope packages/scope/test/read-minimum.test.ts packages/scope/test/application-projection-native.test.ts --reporter=verbose --reporter=json --outputFile.json=$FR/native-owners/report.json` | 0 | out `6c2a2bec52f0de562ef1f9cd53b1b0da15711f43e812f361cbfae9a349f8567e` | `4efc10de6dc9d5335b8bc70a0fb23d0c7dbddfdba2227832131a64bdaae924d3` | 8.846382 |
| FR/scope-test-types | `T -p packages/scope/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `f0a43c6e34b528965042192904564bc95d847f7faeed86e7309de0b280355aaf` | 0.761282 |
| FR/scope-types | `T -p packages/scope/tsconfig.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `d45bd5db46e2099f66b36e006ed890829865fa132b8fde1e5f006c3d676131fc` | 0.394797 |
| FC/maintained-control | `node scripts/control.mjs packages/scope/src/read-wait.ts 'if (typeof minimum.head !== "number" && seq >= floor() && (seq === current.seq ? current.hash : hash(seq)) !== minimum.head.hash) return { ok: false, reason: "unavailable" };' 'if (typeof minimum.head !== "number" && (seq === current.seq ? current.hash : hash(seq)) !== minimum.head.hash) return { ok: false, reason: "unavailable" };' --expect 'native installed projection reads exact journal state and survives R2 deletion and eviction' -- packages/scope test/application-projection-native.test.ts` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; err `d208dbc79756ffa62b658944704ca6426a9e990740aa7eff81d5202374e2f235` | `deab5bba094439646649d98eb858b243ce22557963a49892f56e13daf59910d6` | 16.696802 |
| A1/ast-readback | `node $A1/read-seals.mjs` | 1 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; err `b7968e55f0d1de98ef1aab3beff51ba0946dc50f72019ca6703e260e26299891` | `b45d39ce751f800fa2963d61231924ea9eb40f26653931a2db9573dfaeb73044` | 0.139491 |
| A1/generated-owners | `V run --project page --project mcp apps/room/page/test/assets.test.ts packages/mcp/test/view-resources.test.ts --reporter=verbose` | 0 | out `429e4657899035e342fcc6c576cb6195f2acdd99e848d91a3583beeeb1db452f` | `e5644d534a36a943a66306d48fc9d00a732fab12809039a8da0de9ba3063a68a` | 1.519913 |
| A1/page-generate | `node apps/room/page/scripts/assets.mjs` | 0 | out `b2bf94e3ea65eb0580ec6a4f9394ff674f32fa7e95af28ed7cd35ae3dd87a791` | `75271f33a2733e96ced80cecf0527ffdbc20316dc7377e56aa757db2d38a9454` | 0.159886 |
| A1/security-owner | `node --test scripts/security-entry-points.test.mjs` | 0 | out `be5c943faf135c059e91a59f7045d8cbef7c3130490152f936d661e3e614e989` | `c7bf2498e0ca66c3d2a122cf02ae586b463889566597b6cf4d9ddfb0de892ddd` | 2.721717 |
| A2/ast-readback-qualified-2 | `node $A2/read-seals.mjs` | 0 | out `86f7922e33cd55c5a86b2235fea95d713b9f0bcb3116ad098ae11b668b6dc6cc`; err `2e40b5684315324a49f9ab9487a07853d3361ac2fae4404d89a3003e36dff3e3` | `608b67b420e6b034599e179852c2b2c2ef3d80f0b439d9f03a2c3498f880720f` | 0.140241 |
| NG1/gate-1 | `npm run gate` | 1 | out `18e999e75562ef028eb372fa2e9493e8bb9372f6ca5ee4e220ff7337623f6d67` | `993d5e60bb9a8847604e6ca0065e60e7cae94fa8f56426aa940f789f4c1b2ce0` | 84.707218 |
| Q/fixed-query-digest | `env TSX_DISABLE_CACHE=1 node --import $WT/node_modules/tsx/dist/loader.mjs $QF/calculate.mjs` | 0 | out `01ae6fcb64121c367ecac2f1cefa5fa9ac99ce3d434d2eadd6a459aeab690267`; err `2db021491c36eafa80a7dee80e4d63ca54ef6c2cb7ccf4d4ab4364f001e29e52` | `b24652b04517e609d3b922fba2cc7798f79cb2f546eee7619959d91c0840e1dd` | 0.216702 |
| BF/client-test-types | `T -p packages/client/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `16fddc5284a282e8959cb8e9886a5185ce8a7a91abe58748ee184c626fed13b3` | 0.193109 |
| BF/client-read-minimum | `V run --project client packages/client/test/read-minimum.test.ts` | 0 | out `707937af770fbb46316a3066cdc2472560af3ee1d3a4d8c7a5e9ea800b221a49` | `ef8e71259d63ee2b9dd130347f2188cb2c1f4b3b6324fe6bfa90245dab73e6e1` | 1.110031 |
| BF/active-source-owner | `node --test scripts/active-source.test.mjs` | 0 | out `587e0be48f7421fe61a37eca53770e933718f94d228d43cb9279b08ddf02023c` | `1ede17c292b9695eff8390711e538e34faa8764da4acd98aafdb465f03ebdd09` | 4.955294 |
| NG2/gate-1 | `npm run gate` | 1 | out `bae3390024f6104e0ee981124ed3f32dce57881b3bb9b9df6cba2f09da8e5fe3` | `cd4a1909e8684eeffb28ca3be416a14aaae62bd605e270b4191124a9e2bacf40` | 93.139510 |
| CF/counter-types | `T -p apps/counter/tsconfig.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `85903e87395e7b0888ea681979ca853b9f794d509154db98fde1ae4b9877997e` | 0.203664 |
| CF/counting-owner | `node apps/counter/scripts/test-browser.mjs` | 0 | out `40e96f6aa49f9d2ea1f7fa4ceda52843bcbc54d4c47e7d037c2bc28d6fe1a429` | `4ec5580cebd6ee190f68daf0f224f73735b09c4998cd69491f4123f2729132da` | 2.201397 |
| NG3/gate-1 | `npm run gate` | 1 | out `a34ed8edceea3e40067d1acab387c2e9436990448b06836cf9bf61be04de2e63` | `cb2122cbdb3f7d933b85c21ec89cdfb6407ab1d437c00c7ba2bae606d5e02c9a` | 1225.857183 |
| LD/lending-owner | `V run --project scope-lending packages/scope/test/lending.test.ts --reporter=verbose --reporter=json --outputFile.json=$LD/lending-owner/report.json` | 0 | out `cd82059cf2ad833a3de5235400b986246e6e60ed8e6fb9ba28e9b7107ad7f5d7` | `9f4fd9eeb963c012cab7fbf63a09a2decf1006d99b0dd3dceb12f377dfa42d50` | 8.192564 |
| LD/scope-test-types | `T -p packages/scope/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `c7563505856d24d6eb60b37058f9452587c40873af666dff01c5e0e704c7b07b` | 0.861521 |
| LS/lending-owner | `V run --project scope-lending packages/scope/test/lending.test.ts --reporter=verbose --reporter=json --outputFile.json=$LS/lending-owner/report.json` | 0 | out `1b35d5871506057150f72717022bbdddcbe48e3c11f3256649b8eca221799901` | `702c61b25325d2e0cbd86d07697f497f8cd6b724d20a9779f0e1dd2c41b8c919` | 8.376282 |
| LS/scope-test-types | `T -p packages/scope/tsconfig.test.json --noEmit` | 0 | out `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `29ffe9e371da3e77067f2207efa0fe03f5a308ae011868a28716d6b8e2f7801b` | 0.878712 |
| NG4/gate-1 | `npm run gate` | 0 | out `e08d94bbc1827690ae817d5e33df8a52a305db141c75c9399aed174c76d4191d` | `bcda2dbc86314165e4a40a04471b7077c2a0fb457f68cbd728908a4d08ac2d57` | 1253.580465 |
| F/ast-readback | `command.json`. Producer failed: partial baseline lacked a public dependency; no AST result. | 1 | out EMPTY; err `442cd4bbdc1a21a3a68b617384c24eb79deb01c1f829bab7e488c6ab4100be0d` | `901f59bb4fc5ac9224845fbf04000b6232c0f2fddf50d3ee0ea749650bd6a91e` | 0.316642 |
| F/ast-readback-full-baseline | `command.json`. Maintained AST producer passed on the exact full Git baseline. | 0 | out `6ffa7e4352a733b6e79b7737a3b024ba7f478edd3e1cc134aca73e9b7ca48064`; err `0464a3c5e0c2c9951f82ec1c8fffa1929d3c68df36366be12b7a65cc53391335` | `1f7ffe79b25dfb11abc6c3c781ad4bb7bdd2d06a20031c4c8c68569b18d6cc28` | 0.142465 |
| F/causal-archive-control | `command.json`. Distinguishes: real Native archived versus forbidden assertion; restored. | 0 | out EMPTY; err `c9348040ef0c983d9c16f25a71c95e14c5623cdce79c9b24f2d3cdaab229b90e` | `07a7cde6d8244c9ce756c2f2aea056fbccf36fab0b89274f7f335351ec7599de` | 15.848003 |
| F/hosted-readback-owner | `command.json`. Three cases failed at the wrong custody-digest expectation. | 1 | out `50ece14c6bfb84741f365246fa8642306f7f0acc3c7ceec9af9c0ec7e560d89d`; err `1fe96183b733184e4172ae50bf6dad2d648ae4008fef8f12be8f07dddc1bd606` | `b353fc380f3a7c2104287040cd3acbabd02d781c1f9081a52c1d83808291c1a2` | 3.292399 |
| F/hosted-readback-owner-after-digest | `command.json`. All three hosted SQLite/transport cases passed. | 0 | out `c703ec3cad950b82a2a2074875c8423cb19628fe0ccadaac946ca5419b0c95c6`; err EMPTY | `78c32d21978d1b7f12157a22a3dbef749d415b1013bee553422a59561abdb851` | 4.217808 |
| F/hosted-sequence-control | `command.json`. Distinguishes: ordinary assertion 409 versus 503; exact source restored. | 0 | out EMPTY; err `763c7a9359a606151c875775f0f3a16c594aa50d3d84346d6db865a760f6b5a8` | `c298e13159489181dc5ac46a88c93b9b26099005679f0b57d204a90e3502c5f3` | 2.499377 |
| F/mcp-test-types | `command.json`. Compiler failed TS2554: two submit calls omitted grants arguments. | 1 | out `f7d2db9806a65ab03b77b2bfc6373629d32a6f4f8727db6b8952fbc3bf56304d`; err EMPTY | `ecf17b6946485138ec3517b6dcef468afe8885adb73339cf69c954334f9955ba` | 0.655754 |
| F/mcp-test-types-after-args | `command.json`. Compiler passed after adding the two empty grants arrays. | 0 | out EMPTY; err EMPTY | `c48c96f4d6927b6bfc2eb5e485878c83832155ec0f445440e968534357322a9a` | 0.824164 |
| F/mcp-test-types-after-digest | `command.json`. Final MCP test compiler passed. | 0 | out EMPTY; err EMPTY | `60d94ef8fec1e00a07ed946bc8d8a4b412f09158cb1e1b921e4382aebb3598bf` | 1.184561 |
| F/mcp-types | `command.json`. MCP production compiler passed. | 0 | out EMPTY; err EMPTY | `b5fb68955f0208f798b7fac297d8f99a78f6976769cb261e1eeebc8134ab1bf5` | 0.461317 |
| F/native-projection-owner | `command.json`. The complete two-case Native projection owner passed. | 0 | out `20fccef96c97c6529eea62288c63696c0da36426f01bb2ba03d28e0749fd2f9e`; err EMPTY | `6a63bb199df2c603da196daded6bf448e06bc732660518bac966ada93d21ca8c` | 8.667982 |
| F/scope-test-types | `command.json`. Scope test compiler passed. | 0 | out EMPTY; err EMPTY | `395ff459a3a6f0f0aec1e5ef0bd455e23dbe4f717a62a43e22a52778827eb949` | 0.977513 |
| F/scope-types | `command.json`. Scope production compiler passed. | 0 | out EMPTY; err EMPTY | `28b0f718a927ab63fa785345778c2c33425c9969c075b25bc781733fb168489b` | 0.591611 |
| F/security-owner | `command.json`. Inventory failed: nine passed and one failed before seal adoption. | 1 | out `7daea2b5af47c0fec0d1e83cd3c2060a0e6a95358a3b5ce330364947bd23b7e5`; err EMPTY | `c71b3ecd069fddaa0f4dcd9e1deaa060ded02bfc9e785af03a9da6127fb0c143` | 2.581740 |
| F/security-owner-after-seals | `command.json`. Child had ten passes; capture failed source closure during a control overlap. Not a pass. | child 0, capture 1 | out `77ee3862d4558bdfec61aac99926a548be6308713f5100b65dd665e568865159`; err EMPTY | `eb5e8ebcbf8b87975e83282b69c9917fbe8476d32e8c3ae34bc1c125d4c46f81` | 2.624434 |
| F/security-owner-quiescent | `command.json`. Ten inventory cases passed with unchanged source. | 0 | out `481255e9630d4574d23d9b8a0212dee6b2ebd13979e70ffffd1a361b8ea3ed15`; err EMPTY | `3cb76a31767b3887b2d321f58a1786deaf41744d269ea429b456eab9f803961c` | 2.601919 |
| G5/gate-1 | `command.json`. Failed after Kernel: Node 78 passed and 2 failed; later stages unreached. | 1 | out `6cc5256f7a4afabd5f34f2f47638e761dcfba62da917f0d1731e1ec9be15b700` | `8fe2f769c7fad0c1e71935cbf0aa42632674bc3ccbb58415bf9760f3ce16bf18` | 78.250892 |
| G6/gate-1 | `command.json`. Pass: Node 80; Counting 56; Plain 3159 with 1 skip; Native 866 with 2 skips; all terminal ledgers complete. | 0 | out `94d00db968d06057bd5129ede9e76c067e397aac86ab3bca695ebdadd0b4db20`; err EMPTY | `44f21cb3cb2fedc9ce78516a36b6105b01b69a84044a8d0283667e6194d3e1c9` | 1137.567301 |

## Open work and limits

Exact-source review remains open under request 1c124ebf. Gate 6 passes at the
exact committed checkpoint. The sealed unit binds every actual inner leaf and
the explicit Counting footer and source pins. Failed Gate 5 remains failed.
The source-unstable Node capture cannot satisfy a clean-source guard.

The waiter cap stays with the planner under ruling 366b3989. Existing clocks,
namespace, grants, Git peers and archive receipts retain their stated stand-in
limits. The causal entry fix supplies no current-head oracle or extra authority.
The hosted fixture supplies no Native admission or deployed enrollment proof.
No provider archive custody, remote cancellation, physical drain, hosted result,
landing approval, or parent closure is claimed. Public evidence excludes private
homes, keys, invitations, tokens and live signed request bodies.

Keep predecessor and successor evidence at least 30 days after landing. Later
removal needs a planner act naming the manifests. The compact manifest binds
every cited output and each complete runner unit once through its inventory
proof. Its separate adopted-note binding avoids a raw-note seal hash cycle.
