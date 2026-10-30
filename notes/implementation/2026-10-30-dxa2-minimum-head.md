# Reads that wait for a minimum head

Validation uses the third full gate and its limited test-only follow-ups.
That gate failed in one Native test file. The complete file and affected
compiler pass at the direct-child repair, with production code unchanged.
Exact-head review must assess the single-file exception in docs/testing.md.

Request:
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:1c124ebf0f204a06e9f0f0de33c3b88c4dd296bb`

Promise:
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:28df5171acd1320942be751570e7a2b044a541e1`

Parent request:
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:2888b81e7472b5c097c8bc676794ee0170949978`

## What changed

The four existing journal reads and the existing application projection
accept the same optional `ReadMinimum`: `{at: ScopeRef, head: number | Head}`.
The exact scope reference supplies the incarnation. A full head adds the
recorded hash. Existing callers can omit the minimum.

HTTP carries one bounded canonical base64url `atLeast` query parameter.
The bytes codec rejects malformed, duplicate, oversized, or noncanonical
input. In-process calls use the same closed record. Summary, items, history,
entry, and application projection all forward the minimum to Scope.

Scope answers immediately when it has reached a valid minimum. Otherwise,
`ReadWait` waits for the existing post-seal notification outside the turn
and storage transaction. The single `Bounds.readWaitMilliseconds` value is
1,000 milliseconds. A timeout returns
`{ok:false, reason:"behind", current:FactRef}` and HTTP status 503.
Authorization runs before any head disclosure and again after a wake.
A different incarnation returns `wrong-incarnation`. A mismatched or missing
retained hash returns `unavailable`, even after the journal advances.
The read releases its callback and timer when it finishes.

Client handles accept a receipt on all five reads. `followReceipt` passes
that receipt's exact scope, incarnation, sequence, and hash to one entry
read. It preserves the existing entry-reference and computed-hash checks.
The method still makes one entry read; it now qualifies that read with
the complete receipt position.

The two commissioned receipt consumers are:

- `packages/mcp/src/views/session.ts`: `ViewSessions` retains the accepted
  receipt privately. Its next declared-card refresh passes the complete
  minimum through the declared view source.
- `packages/mcp/src/service.ts` and `packages/mcp/src/reads.ts`: the shared
  hosted MCP implementation forwards that minimum to the existing
  `applicationProjection` request. `packages/mcp/src/hosted.ts` also adds
  the complete minimum to its existing enrolment entry read-back. No summary
  barrier or polling request precedes the card projection.

The Page imports the changed handle and transport. The maintained Page
build updated only `apps/room/page/assets.ts`: 1,207,559 bytes, SHA256
`2e2b9f5378499a8c6e50bfbf0763d57d83442833928c910247c3a4ad86b4b7fa`.
Native definitions and their historical pins do not change.

## Decisions and reasons

The planner adopted the fifth, application-projection read in:
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:261004b145918f976ed32e509187876ca0da7c93`

The builder recorded the concrete wire and timeout choices in:
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:dc7be8f4a30c01e7790aac8f7e3aae3acd8bb051`

[Kernel section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel)
records why the shared read contract belongs in the kernel. HTTP,
in-process services, and clients must agree on the named incarnation,
minimum, and refusal. An application definition cannot redefine an existing
read response. Scope owns the ephemeral wait mechanism. No platform kind,
capability, new rate policy, subscription limit, journal record, durable
alarm, or polling protocol enters this change. The one-second bound stays
below the existing ten-second projection and thirty-second HTTP deadlines.

Registration precedes the synchronous authorized position check. A seal
before registration appears in that check. A seal after registration wakes
the waiting reader. The callback signals arrival after a seal and lets the
read check authority again. The implementation does not wait inside
`Turns.run` or a storage transaction. The barrier itself writes nothing.
Existing independent startup or recovery work retains its own behavior.

Root reviewed fourteen changed source-seal values and added whole-file
coverage for `read-wait.ts` and `read-minimum.ts`. Caller seals alone do not
cover these new implementation bodies. The source selectors and existing
route model stay unchanged. `I/root-adoption.json` records the exact
adoption. The whole structural inventory owner later passed ten tests with its
selected source pins unchanged. That owner does not establish Native
authorization or replace gate evidence.

## Evidence

The initial focused checks ran on evolving, uncommitted source based on
commit `5dc9765fdc6fb6896b736127801944c46ee288f9`, tree
`39c0bfaa8a48bfb3544a18c82e1873ddbafe76aa`. That base does not identify the
changed source. Their partial source pin files and command receipts record
only their actual boundaries.

The third gate ran at `240c963fe50e8f695cd3d7b667bdacef57890673`, tree
`ada6e6d1720b8917bbab162bb14491846cfabe57`. Final validation uses its
direct child `ce3aadfc3ab07dfa78c27856c590b192bd0d4d6d`, tree
`5a39c03be60feb3abf22f2ca73b049c93102bd34`. Only
`packages/scope/test/client.test.ts` differs between those two source trees.
Every other tracked blob and mode matches, including production code,
configuration, dependencies, shared helpers, and imported code. The test
has no module importer. The remaining literal filename mentions belong to
provenance-alias data and a comment. The scratch source proof records that
bounded read-only check. The reporting change adds only this note and its citation manifest after
validation. Source and tests remain unchanged.

The sealed evidence directory is:
`/Users/hughpyle/play/artroom-evidence/2026-10-30-dxa2-minimum-head`.
The [citation manifest](evidence/2026-10-30-dxa2-minimum-head.manifest.json)
binds the command records, outputs, and derivations below.
Its complete readback inventory contains 576 files and 85,415,337 bytes.
`SHA256SUMS` has SHA256
`64725902b21744c166ff1da6cc06fbeacb7038a0ff9ebd212d23f07fec81a450`.
The copy removed write permission after the last write and read every file
back. Keep it for at least 30 days after landing. Later removal requires
a planner act naming the manifest. These citation prefixes are relative
to that directory:

- `W` = `focused/contract`.
- `C` = `focused/client`.
- `S` = `focused/scope`.
- `M` = `controls/full-head`.
- `P` = `generation/page`.
- `I` = `operator-inputs/seal-adoption`.
- `G` = `captures`.
- `R` = `generation/mcp-resources`.
- `N` = `focused/inventory`.

Every table row identifies its retained receipt and actual command record.
Commands below abbreviate the unchanged executable prefixes as follows:
`V` means `node node_modules/vitest/vitest.mjs`; `T` means
`node node_modules/typescript/bin/tsc`. A package-local cwd instead uses the
literal `../../node_modules/` path recorded in that row's command JSON.
`$WT` is the original worktree path. Command aliases `$M` and `$I`
retain `/private/tmp/artroom-dxa2-minimum-head-control-20261030-v1` and
`/private/tmp/artroom-dxa2-seal-adoption-20261030-v1` respectively. The
citation prefixes name retained copies; command arguments keep original paths.
The command record, whose SHA is in operator-inputs/note-draft-v5/observations.json, remains authoritative.
All digests below use SHA256. `out` identifies stdout. `err` appears only
for nonempty stderr. Empty stderr has SHA256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
A table row's label locates its receipt in that prefix. `I/main` and
`I/extra` use `main-receipt.json` and `extra-receipt.json` at the root. `N/owner` uses its root receipt.json.

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

Counts come from each command's actual public terminal summary. They count
that invocation, including repeated development coverage. They are not a
sum of distinct cases in the final candidate. The final targeted selections
include five wire cases, seven client read cases, four client projection
cases, sixteen compact-card cases, four Native minimum-read cases, two
Native projection cases, twenty local Native MCP cases, and one Page asset
case. The later generated-resource owner passed three cases, and the final
whole Native client file passed two cases. These counts remain separate
from every gate. Earlier selections and all failed attempts remain above.

The six development failures remain evidence. Bytes typechecking first
failed while the full-head parser lacked explicit narrowing. MCP production
types first lacked `behind` in two closed refusal maps. Scope and MCP test
types exposed the same ReadPreparation union access. The client test
compiler rejected an incomplete binding stand-in cast. The first Native
minimum owner could not bind localhost inside the sandbox and ran no case.
The narrower corrections and authorized local follow-up appear separately.
The intentional mutant remains a separate expected nonzero row. It is not
a development failure hidden by a passing command. The three failed gates add
three further nonzero rows, whose causes follow.

The first ordinary gate ran at commit
`6c2ad82178d1c716ea66b57718fd0916a2d5c333`, tree
`f5d4bb07240b9de8d2b82699faead37b183b7c9a`. Its actual receipt reports
exit 1, process closed, and unchanged source. The dependency check and
prechecks reached typechecking, which found the CLI development server's
closed `READ_STATUS` map missing `behind`. Kernel, Node, counting, Plain,
and Native suites stayed unreached. This is a failed gate, not partial
suite coverage. Root added only `behind:503` to that map. The separate
`C/types-cli-gate-repair-1` process then passed all three CLI compiler
contexts. Root committed that CLI repair as checkpoint
`091c078144545b3b4c628d00969ebbe7ecc9004a`, tree
`d327d7ea7acea110b075e9b9b06bb7f5d657a7b0`, for the second gate.


The second gate closed exit 1 at that checkpoint. Its receipt reports clean,
unchanged source. Kernel, Node, and counting completed; Plain reported
3,152 passed, one failed, and one skipped. Native stayed unreached. The one
failure was `packages/mcp/test/view-resources.test.ts`, in the comparison
that rebuilds the four production resource documents. Changes in the shared
bytes import closure had left `packages/mcp/src/views/generated.ts` stale.
The failed gate remains failed. Its earlier phase coverage does not make it
a successful gate or supply any Native result.

The maintained `node packages/mcp/scripts/views.mjs` generator then updated
only that generated module: 178,065 to 178,273 bytes, SHA256
`56f2c2bf161b111028aed641b957aec51822b24636549c9fc54fc9b660dbe6ad`
to `4cd584ef69b61407c83cd59649e5eb7d250373a4415e961bc8c4c714eb884728`.
The whole view-resources owner passed three tests. MCP production and browser
compiler contexts each exited 0. `R/source-before.json` and
`R/source-after.json` retain the generated bytes and source status. Root
committed this generation as repair checkpoint `240c963f` for gate 3.
The note derives these records without rerunning their commands.


The third gate closed exit 1 at `240c963f`. Its receipt reports complete
capture, process closure, no timeout, clean post-status, and unchanged
source bytes. Kernel, Node, counting, and Plain passed. Node reported 80
passes, counting 56 passes, and Plain 3,153 passes with one skip. Native
reported 861 passes, two failures, and two skips across 248 files: 246
passed, one failed, and one skipped. Its module observations include 246
Scope modules, one Scope Lending module, and one Scope Denial module.
All five stages and all three Native projects ran. No stage remained
unreached. The aggregate Native result remains failed and partial, as the
maintained report records it.

Both failed Native cases belong to `packages/scope/test/client.test.ts`:
the HTTP fetch route and service-binding versions of the same receipt
witness. The test expected local `hash-mismatch` and `reference-mismatch`
findings after an entry read. The adopted full-head barrier now refuses a
wrong hash or scope kind earlier with `unavailable`, before returning an
entry. The tests still require `wrong-incarnation` for another incarnation.
The existing Plain assertion in `packages/client/test/intent.test.ts`
retains the post-read computed-hash check and passed in gate 3.

Commit `ce3aadfc` changes only those two expectations and their comments in
the single failing test file. It retains both transport cases, their
remaining assertions, fixture, and deadline. The complete Git comparison
shows no production, configuration, dependency, shared-helper, or imported
code change. The whole Native file then passed two cases, and the Scope
test compiler exited 0, each once at the exact final validation checkpoint.
Both collector receipts report complete closure, no timeout, clean source,
and exact unchanged Git blobs for all 43 task-changed tracked snapshots.
The relevant compiler context is `packages/scope/tsconfig.test.json`.

[The single-file follow-up rule](../../docs/testing.md#follow-up-after-a-gate)
permits the checker to assess this bounded test-only repair with the failed
run and owning follow-ups together. Since gate 3 reached every stage, it
left no unrun stage to execute. Root did not run another full gate or repeat
unrelated suites. These two follow-ups do not turn gate 3 into a pass and
leave the original failed result unchanged. Exact-head review must decide
whether this evidence satisfies that exception.

The four-case Native minimum owner uses the real ScopeObject, journal,
turn, SQLite, and Native Worker runtime. Its timer and first readers are
explicit test ports. Four concurrent minimum reads wait while the same
scope accepts an actual write. The timeout case advances the controlled
clock by 1,000 milliseconds and checks the exact `behind.current`, stable
summary and alarm, and timer release. A separate case uses production
session readers over an actually created room and expires the session
before the timeout can expose metadata. HTTP and in-process cases share
the minimum and reject malformed HTTP parameters without a head reply.
This proves ordering and authorization under a controlled clock, not a
one-second deployed latency measurement or process-drain guarantee.

The Native projection owner uses an actual installed declared application.
It submits the card's accepted `pause` act and refreshes through the shared
MCP view code. The retained request list must contain exactly one matching
application-projection HTTP request. That request carries the accepted
receipt's full minimum, and the returned projection reaches its sequence.
The display becomes `paused`. Stale shape and role-loss checks remain.
This is a local Native test-host witness, not a deployed hosted observation.
The twenty-case local Native MCP selection retains its deliberate scripted
reset messages as well as its actual passing terminal. No claim of live
provider behavior or deployed MCP service follows from that run.

The client and compact-card Plain cases use labelled transport or view
stand-ins. They check exact minima, signatures' existing selectors,
read-refusal metadata, and request count. Their results do not establish
Native authority by themselves.

The one omission control removes only full-head hash verification from
`ReadWait.until`. Its unchanged selected Native test passes once on the
baseline and fails once on the mutant: the forged full head returns success
instead of the required `unavailable`. The other three cases skip because
the command selects one title. The control proves the hash guard, not the
arrival wake. `M/result.json` records `distinguishes`. `M/restoration.json`
records the original mode and exact restored source SHA256
`f9fdd74dcb22c7812ab5605c9a36bf6cbe5b1c37e119efd7d7d90f84d969f966`.
The test stays byte-identical at SHA256
`0829797424d6660f5c60e3746bfd6b578e73c2473cd96be3006bf924021b7472`.
The retained read-only derivation also compared both hashes to the current
worktree. It did not run the control again.

Page generation changed only `assets.ts`; its owner changed no source.
The compatibility preparation overlapped Root's authorized Scope control
and observed `read-wait.ts` change. The Page build and asset owner each
observed no unrelated source movement. Page does not import Scope.
The Page context records shared host load from BO1's separate gate and
unknown OS cache. These are functional checks, not performance comparisons.

The 44 retained receipts sum to 1659.907647 seconds of command wall
time. This sum includes all three failed gates, earlier failed checks,
both control bodies, and the limited follow-ups. Only 20 receipts measure
host child CPU; their sum is 3321.640210 seconds. The remaining
24 receipts leave CPU unknown. The 25 receipts with UTC endpoints
span 4490.375428 seconds, including gaps and overlap. Receipts without
endpoint timestamps do not enter that partial window.

Gate 3 command wall is 1,334.847241 seconds and command host child CPU is
2,810.629618 seconds. Its collector wall is 1,334.998829 seconds and outer
host child CPU is 2,810.788125 seconds. The Scope compiler follow-up records
0.914732 command-wall seconds and 4.223748 command-CPU seconds. The Native
file records 5.667915 command-wall seconds and 7.113061 command-CPU seconds.
Their collector wall and CPU remain separate in the actual receipts.
These values exclude guest CPU, which the collector leaves unknown. The authoring session observed Darwin arm64, Node v26.13.0, and npm
11.20.0; hardware model and core count remain unobserved. Shared
host load and warm dependency caches do not establish an isolated-machine,
cold-cache, or product latency benchmark. Module and case duration sums
can overlap and are not wall or CPU totals. `operator-inputs/note-draft-v5/observations.json` records
the exact receipt and digest inputs for each calculation.

## Open limits

- Request `1c124ebf` requires exact-head checker assessment of the failed
  third gate and its single-file test-only follow-ups. The failed gate and
  successful follow-ups remain separate in the manifest.
- The request adds an authorized read minimum. Subscription, cancellation,
  cross-scope reads, deployment, and a new rate policy stay outside its
  scope. An abandoned transport can retain its callback until arrival or
  the bounded deadline. Local witnesses prove no hosted provider outcome.
- Historical records retain their source, failed outcomes, and partial
  reporting qualifications. Guest CPU and 24 command CPU observations remain
  unknown. The retained observation index states each count and timing's
  source; overlapping duration sums do not measure elapsed edit time.
