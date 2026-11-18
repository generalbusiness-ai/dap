# LC1: signed releases for dap-lending

Request `91829f2eb72201e35d9d7f35bb48e633347f51e7` and promise
`e380f82004841671aef4dbb3a37c5d4b7e5cac80` track this head. Canonical
ruling `bdeb6c151cd25e6b13259f6d6a48070dc3719723` separates LC1 from R.
LC1 starts on main `57f887ce066448133d0bd0fe611d0935cc6eb0ed`.

## Packets and deployment configuration

The two versioned packets retain the exact public blobs from planner
branch `64d3d6c143d45a8d7326a0541e4dafcd911869ee`, recorded by signing END
`196d99b7f64167effbe5e745b0d797ece5189d11`:

- `examples/lending/releases/0.2.0/application.dap.json`: blob
  `e4e43a0195d01529b9b84dd6769d6295b3805b44`, 2,501,114 bytes,
  SHA-256 `e451349b823028ae7840da76569319c32a7051acab8819dc4e3d69194b957f8a`.
- `apps/counter/releases/0.2.0/application.dap.json`: blob
  `22a65663e2f02d722611daab0bdc9a866ec5eed6`, 2,592,135 bytes,
  SHA-256 `5128da8bb50f2c05188101c44bf35f0bcae458803fc5e5aa1e855aeb13fe4109`.

The formatter excludes these paths alongside both existing Grow packets.
Its existing owner checks all four tracked paths. No copied identifiers
file or constants module enters this head.

Only `wrangler.lending.jsonc` changes Worker configuration. Its trust
rows name signed Lending release
`sha256:93819e267db04a8615dc63c202e39622fbca47cb2ca4aee58d221fd9cb679824`
and signed Counter release
`sha256:f681c1b5615139d76ee8612a1d253b6d314f200cb8dd0686c18cd6bf399aef0c`.
Both rows require publisher
`key_qNT9aIt0WhJndvMP7UV33FFJ7DOYwW0JUvOv4PhNlFI` and host `github.com`.
The file binds `APPLICATION_CONTENT` to the private bucket
`dap-lending-application-content`. The planner creates that bucket before
deployment and records the operation. Screen hosts remain empty.

## Reproduction boundary

The existing canonical reproduction owner still prepares Grow, Lending
and Counter with the public TEST signer and compares their current
identifiers. Its existing published Grow check stays intact.

For dap-lending, the published reader first validates both versioned
packets and discovers their releases. Each actual trust row then selects
one committed packet. The same reader reads that packet with the row's
exact release, and the witness compares its publisher with the row.
A missing packet or a mismatched publisher fails. The sorted trust and
packet release lists must match exactly, including multiplicity. Row
order grants no meaning. The witness also checks the exact private bucket
binding.

When a packet's manifest version equals the authored version, its
identifiers must equal the current `release-identifiers.json`. The
failure tells the developer to raise the version before changing a
signed release. A later authored version skips the old 0.2.0 packet's
current-identifier comparison. Its published-reader and trust-row checks
still run.
The packet itself supplies its identifiers. LC1 adds no baseline copy.

## Evidence

Development END `ccb3ec32809ac87b0f35cc157e0348aad5b4d732` records a
PASS at clean source `547ef30c96c3549820c29db191c957eed440e68b`, tree
`5428593a2a94a0391ad237f20004f59c6363fd83`. That source builds on NF5
main `57f887ce`; it has not integrated C3. The checks below establish
bounded development readiness at that source. The later exact-head preflight
and gate below establish their own results, without a deployment claim.

`W` is `.builder-worktrees/lc1-lending-counter-releases-20261114`.
`D` is the authentic owned C3 donor at
`.builder-worktrees/c3-resign-admission-20261114`.
`E` is `artroom-evidence/2026-11-14-lc1-development-attempt1`.
`N` is `/opt/homebrew/bin/node`. Commands run from `W` except the two
CLI owners, which run together from `W/packages/cli`.
`P` is `artroom-evidence/2026-11-14-lc1-gate-preflight-attempt1`.
`G` is `artroom-evidence/2026-11-14-lc1-full-gate-attempt1`.
The later preflight and gate commands also ran from `W`.

The setup rechecked all 17 current and committed metadata inputs before
one copy into the absent target. The copied stamp matches lock
`8b2ae5f7108ce36cf84753d99d4248d59cc21251d5e01da3da37a111bb495e20`.
Its 15 relative workspace bindings resolve into LC1, all 57 source
export targets exist, and 107 installed non-link package metadata files
equal the donor bytes. No install, restamp or preserved-view mutation ran.

For the dated LC4 continuation, `J4` is `artroom-evidence/2026-11-15-ls5-lc4-compiler-node-owners-attempt1` and `C4` is `artroom-evidence/2026-11-16-ls5-lc4-gate-attempt1/controls/attempt3`. `P4` is `artroom-private-evidence/2026-11-15-ls5-lc4-controls-attempt3`. `G4` is `artroom-evidence/2026-11-16-ls5-lc4-gate-attempt1`. All LC4 commands ran from `.builder-worktrees/ls5-owned-room-tables-20261115`. `LC4-C` means the exact command `N P4/helper/control.retained.mjs apps/room/wrangler.lending.jsonc 'sha256:1a5128d47487e9888228c64aa2b36e366b1d4b72b0f210b610ad3f14caf25ede' 'sha256:0000000000000000000000000000000000000000000000000000000000000000' --expect 'Grow, Lending and Counter reproduce their reviewed definition and presentation identifiers from canonical sources' -- packages/cli --config vitest.config.ts test/application-release-reproduction.test.ts`. These aliases do not change the older LC1/LC2 aliases or results.

| Check | Actual command | Result and wall | Retained output and SHA-256 |
|---|---|---|---|
| Owned dependency copy and metadata audit | `/bin/cp -cR D/node_modules W/node_modules` | One copy, exit 0; 0.686329792 s | `E/dependency-audit.json` — `86adf893ce6829a2fa1802134c53d142c6695803a20788399e670fc1402ba83d` |
| CLI test compiler | `N node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json` | Exit 0; 0.932685542 s | `E/cli-test-compiler.stdout.log` and `E/cli-test-compiler.stderr.log`, both empty |
| Whole canonical packet formatter owner | `N --test scripts/format-json.test.mjs` | Exit 0; one passed, zero failed, cancelled, skipped or todo; 0.185423458 s | `E/formatter-owner.stdout.log` — `b46b6c452b64f62b7100c3d6553032ca7c1eff0decf386f03f55bfeab3facbff` |
| Maintained compatibility prerequisite | `N scripts/cloudflare-pool-compat.mjs` | Exit 0; `copied:false`, accepted bundle unchanged; 0.089407000 s | `E/compatibility.stdout.log` — `4bbde52e48a6ebcd8e993840da6a340a4cd78571c1fff0ef83f5991e5cde6f62` |
| Whole canonical reproduction and configuration owners | `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/application-release-reproduction.test.ts test/demo-config.test.ts --reporter=default --reporter=json --outputFile.json=E/cli-owners.report.json` | Exit 0; one reproduction and six configuration cases passed, zero failed, pending or todo; 3.427555959 s | `E/cli-owners.report.json` — `b96c94f65bab97b2e40fee6b9c55b60f133e2f5bf5ce1bfa5fc86318b15a7e5f`; `E/cli-owners.stdout.log` — `a40b80112bcd8c5df0cbfbe37d78badb4dc7e3fd14776d51bd08b915290cd8f1` |
| Exact-head preflight: shared helpers | `N scripts/check-shared-helpers.mjs` | Exit 0; 0.664896375 s at `faece658` | `P/shared-helpers.stdout.log` — `57e77d32822dad832d49e3f80586983244932678940c6904dbbb9979173c8260` |
| Exact-head preflight: whole typecheck | `/opt/homebrew/bin/npm run typecheck` | Exit 0; 17.468887916 s at the same head | `P/whole-typecheck.stdout.log` — `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a` |
| Full gate at `faece658` | `/opt/homebrew/bin/npm run gate` | Exit 0; outer wall 870.297345083 s. Node 195; Counting 55; Plain 4,760 passed/1 skipped; Native 1,134 passed/2 skipped. Scale omitted as `outside-scale-paths` | `G/gate.log` — `0ad7621fac3b17b864702b773561bc0bd6a41f968f49997264010d080a2ab268` |
| Checker review and local artifacts | Not run | OWED under the LC1 request | No result claimed |
| LC2 whole CLI examples and configuration owners | `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/application-examples.test.ts test/demo-config.test.ts` with native reporters | Exit 0; 3 examples and 6 configuration cases passed; 6.366250250 s | `B/cli-examples-config.stdout.log` — `0290ce6d17e3bb0537071b9847bf4ba6c9bdd27f040b767185f5eafe100e32f6` |
| LC2 whole formatter owner | `N --test scripts/format-json.test.mjs` | Exit 0; 1 passed; 0.158079084 s | `B/formatter-owner.stdout.log` — `394cdc9e97c28e2a264115ddedea53f42f3bce14447ec6cb4f75dfac27df1e27` |
| LC2 whole Security owner | `N --test scripts/security-entry-points.test.mjs` | Exit 0; 12 passed; 3.886222833 s | `S/stdout.tap` — `a615f2ab428c653583b8f086e3d84bc13f1e5dc20d4b87d251f072abdb523da0` |
| LC2 unchanged whole reproduction baseline | `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/application-release-reproduction.test.ts` with native reporters, detached scratch | Exit 0; 1 passed; 3.271128208 s | `C/baseline/vitest.json` — `180ea88dfcea98e4b607cdc9e4de5644102035e93e712b25c2c86f0da6644630` |
| LC2 missing-packet control | Same whole owner with the single zero-digest trust-row fault | Exit 1; 1 failed by intended direct assertion at 71:8; 2.310296958 s; DISTINGUISHES | `C/missing-packet-row/vitest.json` — `8fe0d653f4d9efc91d3709aa434d74b39308c7dd53d3ca9e6c237b8c1f291b3f` |
| LC2 equal-version control | Same whole owner with both Lending versions 0.3.0 and the retained measured NF03 tuple | Exit 1; 1 failed by intended “Raise the version” assertion at 90:184; 2.446507709 s; DISTINGUISHES | `C/signed-version/vitest.json` — `b76bbb6c1135952572069a23bde3cb5c2ee819a6472df271a848f5a4d48bbe9f`; aggregate `C/result.json` — `6620eaad8d1644288f54ac7ebbbdc1c23df4100e51ab531317dc584dabc741ac` |
| LC2 exact-head shared helpers | `N scripts/check-shared-helpers.mjs` | Exit 0; 0.596663333 s | `T/helpers.stdout.log` — `af00848d1b94433533085adfecd184e68584914cce159b58ead29f4dab584502` |
| LC2 exact-head whole typecheck | `/opt/homebrew/bin/npm run typecheck` | Exit 0; 16.459192000 s | `T/typecheck.stdout.log` — `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a` |
| LC2 combined full gate | `/opt/homebrew/bin/npm run gate` | Exit 0; child 1620.579566916 s, outer 1620.829315250 s; Node 202, Counting 56, Plain 4858 passed and 1 skipped, Native 1158 passed and 2 skipped; natural Scale all 22 passed in 13 owners | `artroom-evidence/2026-11-15-nf6-nf8-fh2-sd1-lc2-full-gate-attempt1/gate.log` — `44a9865875f439993459f0f78655acc3475b54615a65b838ec78aae452f2daf9` |
| LC2 joint independent review | One five-promise review after final note-only successor | OWED | No approval claimed |
| LC4 CLI test compiler at 2a5 | `N node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json` | Exit 0; 0.536860500 s; empty streams. | `J4/result.json` — `26961fd949c7958ab4f51b1e32fd7673453441a1542d2129a9b7fd327a52aadc` |
| LC4 whole formatter owner at 2a5 | `N --test scripts/format-json.test.mjs` | Exit 0; 1 passed; 0.166339375 s; stderr empty. | `J4/result.json` above; stdout SHA-256 `4ac509c2285ce9e14206c60d501756f8805d02b95d53fa57ff1cc73c29ec004e` |
| LC4 current reproduction and missing-packet control at dad | `LC4-C`, whole-owner baseline then one trust-row mutant | Helper exit 0/DISTINGUISHES; 6.137459917 s. Baseline 1 passed; mutant the same case failed by the intended direct trust/packet inventory AssertionError. Exact bytes/0644 restored. | `C4/result.json` — `d5efb2f920e9520834dde81d2faaba38dcd96f9e927ff48065926ef7898b75ae`; `C4/lc4-control/before.json` — `13ebf04a7c99049071586a48a747dda236698c544a045a104a91ea2d3557d1bb`; `after.json` — `005ffd77abe868d3d3597cef42507880113010673b05bf19b8ca67b2b3ae6e79`; `C4/lc4-control.stderr.log` — `5d4d76ba0b3be8ebee7d090348d5d14ffccf981106b0a571d2db8f669ec9f660` |
| LC4 joint preflight and full gate at 1454 | `/usr/bin/git fetch origin main`; `N scripts/check-shared-helpers.mjs`; `/opt/homebrew/bin/npm run typecheck`; `/opt/homebrew/bin/npm run pins`; `/opt/homebrew/bin/npm run gate` | All exit 0. Preflight walls 0.366304667, 0.644900500, 16.403033083 and 16.821574667 s; outer 34.896495959 s. Gate child 1296.828786125 s, outer 1297.029816125 s. Kernel passed; Node 206, Counting 56, Plain 4890 passed/1 skipped, Native 1155 passed/2 skipped. Natural Scale MOVED: 16 passed in 9 owners. Review remains owed. | `G4/preflight.result.json` — `e9337f118a0157f0dc788971b9fc8134ea1f92bd71c446521bbfd47bad8b45eb`; `G4/gate.log` — `f1fb52e2f9633f2fd3686e972fb46a7b08a092f7acd10ca692161aeac7326d27`; `G4/gate.result.json` — `597130138ada545abba38619531e0d9266e1918dc7a019aee3d11ab16325d8cd`. See [LS5's table](2026-11-15-ls5-owned-room-tables.md) for completeness and timing limits. |

The stderr files `E/cli-test-compiler.stderr.log`,
`E/formatter-owner.stderr.log`, `E/compatibility.stderr.log` and
`E/cli-owners.stderr.log` are empty. Each empty stream has
SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
The command ledger is `E/commands.json`, SHA-256
`89ab68a76183d342fe0c172d662260acb149d9fc5e9fb14f7758d567f957df92`.
The result is `E/result.json`, SHA-256
`931aa0aabe10d9286fd62c39ecdc18b932adc93003716c85fae6900550132b0d`.
The measured development outer wall was 4.635378250 s, excluding the
separately timed dependency copy.

At this NF5 base, the actual signed 0.2.0 packets passed the row,
publisher and equal-version identifier checks. The packets and rows remain
exact. The development result establishes no post-C3 reproduction.

## Gated source and documentation successor

Preflight END `c1001f7750df97c936d5f14722607e49a2e8a6e4` records both
required checks at clean head
`faece6583c7d761a844637f40f6a13ff228cf585`, tree
`1f9227af71298a52b02dfb95b9d0cee27218ce68`. Its outer wall was
18.134091541 s. `P/commands.json` retains exact argv;
`P/result.json` has SHA-256
`08a17c958e71438dda344c88a377cf573711b7dbb6de4e284f06d2221ee7781d`.
No commit or dependency change intervened before the gate.

Gate END `1186e84b74586535e091954d2955be2f5fb0b28e` records the same
head/tree, with main/origin still `57f887ce`. The gate ran from
2026-11-15 02:20:14.255660 to 02:34:44.554604 UTC. Initial and final
source were clean and unchanged. `G/command.json` retains the exact command
and absent test/worker/scale overrides. `G/result.json` has SHA-256
`d62046e09520a3681306fed03c6a51f63de438d1ba4405aefd22b82757ea1c59`.
The log starts with that head/tree and zero changed files and ends with
`gate passed`.

All maintained checks passed, including kernel, typecheck and every
pre-test step. Notes reported zero warnings. Installation skipped because
the owned dependency stamp matched the actual lock. The count lines in the
one evidence table are terminal results, with their original skips. Scale's
natural selector omitted its project as `outside-scale-paths`; LC1 claims
no Scale acceptance. Terminal evidence for all four executed test stages
is complete. Module observations still qualify scope-stories as partial,
with 126 unknown/suite observations and no contradictory records. Concurrent
module/case duration sums are neither wall nor CPU time.

The gate created its stage logs in
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.VnMhZzFJbd`;
`G/stage-logs` retains their complete copy. The combined `G/gate.log`
remains the cited gate output.

This documentation-only successor changes only this implementation note.
Its final commit/tree belong to the source checkpoint, not the gated tree
above. Source, configuration, tests, packet bytes and dependencies remain
unchanged from the gate. The six non-note LC1 blobs retain their gated
identities. Under `docs/evidence-filing.md`'s follow-up rule, this filing
needs no second gate. No project check ran for the documentation update.

## Open limits

The following LC1 limits describe its original gated head. The dated LC2
continuation below records the later source and validation.

LC1 gated first under ruling `500885533dfe8ed370cc7c627f0ae3501142cff0`
after the two checks required by `7fe68ffe`. It still has not integrated C3;
the matching donor dependency view does not imply C3 source composition.
The second head to land must merge actual new main cleanly, repeat both
preflight checks and gate again. After both heads, the tooling head precedes
E1. No other development runs beside an active gate.

LC1 request `91829f2e` still owes exact local artifacts, checker review and
landing authorization. The planner still owns bucket creation before
deployment and its recorded operation. Provisioning, installation, signing,
deployment, screen hosts and install context remain outside this builder
head; none occurred in these checks. NF7's hosted Counter installation and
witness remain held under its own request. R retains reservation source and
its later signing boundary. Passing the gate makes no deployment, installed
release or hosted acceptance claim.


## LC2 source continuation, 15 November

LC2 request `46072a190cf7cc6be55036b0e62c7ddda6c821f9` and promise
`d59fe799976cf95b91c5dbb1ce8f6d7dcd3f6870` govern this successor. LC1's
results above retain their dated heads. Ruling
`c168799e37d1052a7199d29506e57649d6c5c2bd` puts LC2 on the waiting
NF6/NF8/FH2/SD1 head. The LC2 development results below bind source
`27e0165938ec563420c1fecce6364d11c14f4afb`, tree
`66ccd762db65d34a8f9e95f59071984a32c2c7be`. Earlier LC1 results keep their
original heads and limits.

Signing END `37119ff2f86cc48f0b4d8190f3cd24dd4b1a5775` records the two
0.3.0 packets signed from main
`c6711b53a368d24c1fad2830ea5634c045999ce1`. They come byte-for-byte from
carrier `5cb79ddd812b222c469069201c50df53d21b19e2`:

- Lending: `examples/lending/releases/0.3.0/application.dap.json`, Git blob
  `d083d5b16d5731563fbec6921d75dadf755bfcdc`, 2,504,735 bytes,
  SHA-256 `84f8e5f8738a1fd27fc7abe2cdf7b82a1ccd701d9edfeccd970631c3d4b3c039`.
  Release: `sha256:51f8afe2fd6728c121dfe18597808d529f642722634987144712bfedecfbb204`.
- Counter: `apps/counter/releases/0.3.0/application.dap.json`, Git blob
  `d77f239ffa4a9a80dfa8ca46b1dab8e4f0bc081d`, 2,593,092 bytes,
  SHA-256 `81b59b8cd3b8b109f3485116c5a570833fc6bb0ced222291b959b1b2a42a32e1`.
  Release: `sha256:0b3e5038f96e69cfb7942c9d7fc3dbbb67d49a71ba737aaec9fcc129a1e619ed`.

These packet hashes and sizes come from the signing END, not a new builder
calculation or signature check. Both rows retain publisher
`key_qNT9aIt0WhJndvMP7UV33FFJ7DOYwW0JUvOv4PhNlFI` and host `github.com`.
`APPLICATION_TRUST` contains exactly those two rows. The old 0.2.0 packets and
rows are removed because no installation uses them; Git history retains them.
The content bucket, installed registers, serving settings and empty screen-host
list stay unchanged. The formatter excludes the two new canonical paths and
keeps both Grow packet exclusions.

The side head changes both presentations after the 0.3.0 signing, so c168799e
opens authored Lending and Counter 0.4.0. Root completed the one normal comparison and applied its measured tuples
before LC2 composition, under END `3f54a4e6fe4c760b42fc09b41add62fd0c08b7b7`.
NF6 carries those six version and identifier paths under planner
`8228f48165d0f0cdb09dcfde3316a19b60cb402d`. Signed 0.3.0 stays immutable.
The reproduction owner keeps its version conditional: it compares a packet
with current source only when their versions match. On authored 0.4.0 it still
validates each signed 0.3.0 packet's release, publisher, host, application name
and manifest version against the exact configuration row. It still reproduces
all three current source tuples. It does not substitute 0.4.0 screen bytes for
the installed 0.3.0 packet's own presentation.

Both named REDs distinguished their intended guards under END
`60571fe4556bcccb2dc00d41f483af779256fe8c`. The unchanged whole reproduction
owner first passed its one case. The candidate and detached scratch matched
in source, owned dependencies and compatibility, so that baseline supplies
the required reproduction owner without another green run.

The missing-packet fault changed only Lending's trust release to the valid
zero digest. The owner failed with direct AssertionError, “dap-lending must
trust each committed packet exactly once,” at line 71:8. The later missing-
packet assertion did not run.

After exact restoration, the equal-version fault restored both authored
Lending versions to 0.3.0 and used the already measured NF03 candidate from
`artroom-evidence/2026-11-15-nf-canonical-compare-only-attempt1/preparation/lending.candidate.json`.
Its presentation is
`sha256:f99dce241076cc0d8a2b6eac1c84dff60f1f7858b5882ae5065ba7c914229b63`;
its entry, definition and semantic identifiers stay exact. The version enters
the browser bundle, so this measured input keeps the earlier current-source
assertion consistent. The owner reached the intended direct AssertionError,
“Lending 0.3.0: signed identifiers differ from current source. Raise the
version,” at line 90:184. Counter stayed at current 0.4.0.

Each fault failed the same one-case owner with zero pending or todo cases.
Neither run timed out or received a signal. Root read both complete native
JSON reports and assertion stacks, then verified the four restored files
against both candidate and saved originals, including every 0644 mode.
Candidate and scratch remained clean at the original head and tree. No new
producer, synthetic expected baseline, packet edit, weakened assertion or
third green supplied these results.

For the current rows in the existing evidence table, `C` is
`artroom-evidence/2026-11-15-nf6-nf8-fh2-sd1-lc2-full-gate-attempt1/controls/lc2`.
`B` is `artroom-evidence/2026-11-15-nf-lc2-bounded-owners-attempt1`,
`S` is `artroom-evidence/2026-11-15-nf-lc2-security-owner-attempt1`,
and `T` is `artroom-evidence/2026-11-15-nf-lc2-exact-head-preflight-attempt1`.
Current root commands ran from
`.builder-worktrees/nf6-nf8-on-c3-sh1-source-20261115`;
CLI examples and configuration ran from its `packages/cli`. The reproduction
baseline and controls ran from `packages/cli` in the matching detached scratch
`/private/tmp/artroom-lc2-fh2-control-source-20261115`. Exact reporter argv and
paths remain in each retained result. The earlier `W`, `E`, `P` and `G`
aliases describe LC1 only.

The 17 explicit safe LC2 and FH2 control records retain their original bytes
beside the combined gate log. Original attempts remain retained separately.

The whole application-examples and demo-config owners passed together, as
three and six cases. The whole formatter owner passed one case; Security
passed all 12. The pre-START helper and whole typecheck commands both exited
0 at the unchanged source above. The pinned-version source audit preceded
LC2's deliberate historical-packet assertions; it does not claim that all
current tests lack the literal 0.3.0. The combined gate passed under END
`9d48f8f053c936598e8de3d441ed9b5e08c2241c`. The retained terminal records
are complete for Node, Counting, Plain and Native. Native wall time was
1282098.070041 ms, including Scale; no separate Scale-only wall was recorded.
Scope-stories module observations remain partial, with 129 unknown or suite
observations and zero contradictory records. Independent review remains owed.

After landing, the planner owns dap-lending deployment, Lending 0.3.0
installation in lending-library, and later screen-host rows with the actual
installation item. RS1 continues within open 0.4.0 without another version;
planner signing follows RS1. These local checks claim none of those outcomes.

The final reviewed successor changes only four existing implementation notes:
this LC1/LC2 note, the NF6/NF8 report, the FH2 note and the SD1 note. Source,
configuration, tests, generated assets, packet bytes and dependencies match
the gated tree `66ccd762db65d34a8f9e95f59071984a32c2c7be` exactly. The source
checkpoint records the final commit and tree. The document-only follow-up
rule requires no repeated gate, typecheck, owner, control or producer.


## LC4 source continuation, 15 November

LC4 request `7c37e2fd5784d8b896345731dffc36c8a4007a9d` carries the signed 0.4.0 packets in the LS5 head. Planner acts `b0173954186ed015e0c9faf51ee6665c95b2b2b6` and `950bb11d3446361e2c055819113069e3ca81ab93` set this order. Root reported the existing reproduction rule before source in `2d5f5930137385ab42df556a9171b3457b54a017`. The LC1 and LC2 history above remains unchanged.

Signing act `1f3b7e76db2be57e47e0b918101deaf368066337` records both packets from published main `7a6fcadf5c317269650c574233c13ba8158861d8`. Root matched their bytes and blobs in its retained provenance record. LC4 retains those exact packet bytes and adds no signer, identifiers baseline or codec exception:

- `examples/lending/releases/0.4.0/application.dap.json`: 2,508,522 bytes, blob `a69cbc3aa478f4de16ce3a0bca02bb275e0a0ff7`, SHA-256 `4692366a86cfba9ad613c6c124c91d56c5b211ec880a39e833243548e3d5c546`, release `sha256:1a5128d47487e9888228c64aa2b36e366b1d4b72b0f210b610ad3f14caf25ede`.
- `apps/counter/releases/0.4.0/application.dap.json`: 2,594,218 bytes, blob `b7e8f1b8383ed988143e999ebf51b8658d950b94`, SHA-256 `a2a19f98f5be932ebf9210961f5cfb88845966dc8535226239d7e8b94249d972`, release `sha256:e8f8471e85b39db69fbd8fac57f4c231481d3cc89cdc97fbfcd8167146fa08a1`.

Both use publisher `key_qNT9aIt0WhJndvMP7UV33FFJ7DOYwW0JUvOv4PhNlFI` and host `github.com`. The three dap-lending trust rows now name Lending 0.3.0, Lending 0.4.0 and Counter 0.4.0. Lending's installed 0.3.0 library keeps its exact packet, row and screen-host settings. Counter 0.3.0 has no installed room, so its row and packet leave this head. All other Worker configuration stays unchanged. The formatter and its existing owner protect the two Grow packets and these three retained packet paths.

The reproduction rule stays the same. Every run reproduces all three current canonical tuples against their checked identifiers. Every retained signed packet still passes the strict published reader, its exact application/version assertion and its trust-row release, publisher and host checks. Its signed stored tuple remains authoritative for that historical packet. When the packet version equals current authored source, the owner additionally requires its tuple to match current checked identifiers. Each inventory row now names its own version instead of sharing the old 0.3.0 assertion.

At this LS5 head, Lending 0.4.0 and Counter 0.4.0 must match current source. A mismatch stops for the planner. No identifier adoption belongs to LC4. Lending 0.3.0 keeps its stored signed presentation rather than rebuilding it from newer source. The later E4/A1/CR2 head opens the changed applications at 0.5.0 and keeps the same three packets and trust rows. The same conditional then validates their signed historical tuples while current-source reproduction checks 0.5.0. That later head adds no 0.5.0 packet or trust row. Grow keeps its current rule and version unless its identifiers change under the planner's ruling.

LC4 joined at `2a5fbdbefbd00be7f29785f9bc3e9e50888a9060`, tree `05fab68a77431fb2f60da32784d2dd31421c662b`. The table records its CLI test compiler and whole formatter PASS. The first two sequential control attempts never reached LC4: their Scope baselines failed before mutation. Their timeout and stale-observer-count results remain INCONCLUSIVE in the linked LS5 table.

After the fixture alignment and active-start observer repair, focused END `330236a1d02673db2c7acfd29e59c5fcbfa782b9` accepts the actual run at `dad17fde6970e702dbce7c3d13eb1bea632f2d63`, tree `fb1f845ee51d4d4dbc509f615c0579976ad1d314`. The whole reproduction baseline passed its one case, including all three current canonical tuples, signed current 0.4.0 comparisons and the retained Lending 0.3.0 checks. That establishes the required current tuple correspondence without an identifier update.

The sole LC4 fault changed only Lending 0.4.0's trust release to the valid zero digest. All packet bytes and inventory rows stayed unchanged. The same whole case then failed by the first existing direct assertion, “dap-lending must trust each committed packet exactly once.” It did not need the later explicit missing-packet failure. Root read the actual failure and verified exact source bytes and 0644 restoration. The saved controller still marks its then-pending root inspection; the later END supplies that inspection. The helper retained both actual raw children with only its preserveScratch false-to-true change. No duplicate positive, restored third green, timeout extension, conditional change or packet rebuild supplied this result. The dated LC2 equal-version control remains history.

The joint focused outer wall was 55.508290334 s. Security, Agent, Scope's two inconclusive baselines and their repairs belong to [LS5's existing table](2026-11-15-ls5-owned-room-tables.md); they are not repeated here as new LC4 runs. Root screened and retained byte-exact safe control copies under the actual `2026-11-16-ls5-lc4-gate-attempt1` directory. The later joint gate passed as recorded in the same evidence table.

The exact-head preflight and one joint gate passed under END `24537e4f42759f8ea95547f6be7a119f7ae1dcb7`. Independent review remains owed. Planner assertion `a26cd1d7d974e7b57c6ee4ed97c18b021dc8fb92` records Local Worker smoke run 43806153520 green in 45 s at dad; it stands for review only if the gated successor differs solely under notes. Planner correction `65ec5705d102a010662fe19ab1bae04f38e3d153` requires retired hosted plain reads to answer 404 `not-found` before and after deployment, because enforced indexing starts no old object. The planner owns those probes, deployment and, after E4/A1/CR2 lands, the new 0.4.0 rooms and installs. No review approval, new installation or deployment result is claimed here.

The joint gated head is `1454bd88cf09412acd43ad30e36edbdf0ad522f2`, tree `75226586e096bd8219a4a04e8dde0dadda143c80`, against main `7a6fcadf5c317269650c574233c13ba8158861d8`. Native took 932.535182458 s including the moved Scale selection; no separate Scale-only wall exists. All four terminal groups are complete despite the partial scope-stories duration projection. The 129 unknown/suite observations and zero contradictions remain qualifications, not extra case counts. LS5 records the seven retained terminal files and exact-source correspondence. This follow-up changes only these two existing notes; source, tests, configuration, dependencies, generated assets and packets stay exact to the gated tree. The post-commit source readback supplies the final note-only head/tree. The document-only filing needs no repeated gate, preflight, owner or control.


## LC-5: trust Lending 0.5.0 and Counter 0.5.0, 17 November

LC-5 request `625e51d22ad019b91051404b77c9486ac7915318` adds the 0.5.0 pair.
The planner signed both packets at 01:33 EST from main `830d134a` (GW-1), so
the installed screens carry the read-minimum gateway rule. The head commits
the signed bytes unchanged:

- `examples/lending/releases/0.5.0/application.dap.json`: 2,513,568 bytes,
  blob `a26636afef3c8b84c67cbe4a181251364557b3e0`, SHA-256
  `939251a996e06658f2f248ae3547772b2a247223a6012be97b299e313a17da99`,
  release `sha256:1bda4e9bb7540300d3124759dae76d5e74dfc69919b1caa91a9d1534a0420077`,
  presentation `sha256:005987060d6db0d2234d4c78355887d3756d349fc5abf2c44da31abace00533b`.
- `apps/counter/releases/0.5.0/application.dap.json`: 2,599,263 bytes, blob
  `ce8449f2a3e82dd5ad09ca31f22449af097c2668`, SHA-256
  `e0851ec9b864d3dfcd9beb8c4eab202e932cce5518d7c7d4db21eac1d7d1f718`,
  release `sha256:7b9e666ba63c04fdedae50ff7932c91337bc5df4a6050b7d0006f39acecd5e8b`,
  presentation `sha256:9334159c91ea2df5d25e75aaa265b0ccb8b8ceac7a564b8eb46d0b7be57d2af4`.

The dap-lending trust rows now name five releases: Lending 0.3.0, 0.4.0 and
0.5.0, and Counter 0.4.0 and 0.5.0. Each uses publisher
`key_qNT9aIt0WhJndvMP7UV33FFJ7DOYwW0JUvOv4PhNlFI` and host `github.com`. The
sandbox Worker holds no trust rows. The formatter protects the two new packet
paths, and the reproduction test reads each packet against its row.

The head opens Lending and Counter 0.6.0 (ruling `163de663`). The version
raise moves the open presentations: Lending `1b40301d`, Counter `c4275588`.

Named red: with the packets and main's trust rows, the reproduction test fails
with "dap-lending must trust each committed packet exactly once" (3 rows, 5
packets). Evidence: `artroom-evidence/2026-11-17-lc5-red/`.

The screen-host rows still pin the 0.3.0 and 0.4.0 installations. The screen
route answers 404 when the installed presentation differs from its row
(`packages/scope/src/applications/route.ts:79`). An install of 0.5.0 does not
replace the older installation. It opens a new item, whose id is the sequence
number the rules scope assigns to the accepted install
(`packages/platform/src/application-install.ts:47`, `:122`). It also creates a
new application scope (`:240`), so the 0.5.0 installation starts with fresh
application state. The older item stays active, so each screen keeps serving
it until a later head moves its row to the new item (act `4f1474e6`).

## LC-6: trust Counter 0.6.0, 17 November

LC-6 request `268eb2a6a4469938e3a6c8996df5c8260818eaa1` adds Counter 0.6.0.
The planner signed it at 05:51 EST from main `66c70688` (NF-10), so the
installed screen binds an enrolled device to the room's service origin. The
semantic identifier `a5a44ebc` is unchanged from 0.5.0; only the screen
changed. The head commits the signed bytes unchanged:

- `apps/counter/releases/0.6.0/application.dap.json`: 2,600,242 bytes, blob
  `d46e3d97acc3c4f432bfeb8d8a381bd923b6ace6`, SHA-256
  `a83239571d04a0646ec67bd1416c40a48195ac169a18f29ca554dfa2337ff43e`,
  release `sha256:581e5d26a2e035f76a70cc627e76d483f5b9dc63cdea10b198d802cdc2951a8a`,
  presentation `sha256:905a3f7e088278894937f41bd27bf612bafac9b65fe030dbf0e2e0f584cd444f`.

The dap-lending trust rows now name six releases: Lending 0.3.0, 0.4.0 and
0.5.0, and Counter 0.4.0, 0.5.0 and 0.6.0, each with the same publisher and
host. The formatter protects the new packet path, and the reproduction test
reads the packet against its row.

The head opens Counter 0.7.0 (ruling `163de663`), which moves the open Counter
presentation to `36945f1d`. Lending stays at open 0.6.0, unsigned.

Named reds, in `artroom-evidence/2026-11-17-lc6-red/`:

- With the packet and main's trust rows, the reproduction test fails with
  "dap-lending must trust each committed packet exactly once" (5 rows, 6
  packets).
- With the 0.6.0 row listed and no packet, the test fails to open
  `apps/counter/releases/0.6.0/application.dap.json`.

After the deployment, the planner installs 0.6.0 in counter-witness. The
install opens a new item, and a later head (SH-3) moves the
`counter.inguz.space` row to it.

## U4-T: trust Counter 0.7.0, 18 November

U4-T request `4ef5478b` adds Counter 0.7.0 for the U4 witness. The planner
signed it from main `e90f04f4` (act `61ebf872`), which carries the U4
footer line `Counter <version>`. The semantic identifier `a5a44ebc` is
unchanged from 0.6.0, so a room upgrades in place. The head commits the
signed bytes unchanged:

- `apps/counter/releases/0.7.0/application.dap.json`: 2,609,520 bytes, blob
  `4b2d62f01e2052eb78ff6695653b93d35ecd9a04`, SHA-256
  `5cfaa3d62b4b85617663221047860dbd43f58a4dbe85c071ad211e4258fc66c9`,
  release `sha256:b0d84eb176e0de3240a4e399172b033d89c7c26f64ca91ed8c82c3765c0a5649`,
  presentation `sha256:70c32e9edc50ac6c5128fb0573f9703773bcac7098269fdd7b51b70832e5c15c`.

The packet's presentation equals the open presentation that the U4 marker
head landed (approval `a409625f`). That approval reviewed the 0.7.0 screen,
so this row adds no unreviewed screen to `counter.inguz.space`.

The dap-lending trust rows now name seven releases: Lending 0.3.0, 0.4.0
and 0.5.0, and Counter 0.4.0, 0.5.0, 0.6.0 and 0.7.0, each with the same
publisher and host. The formatter protects the new packet path, and the
reproduction test reads the packet against its row.

The head opens Counter 0.8.0 (ruling `163de663`). The footer line reads
the manifest, so the open presentation moves to `1407bd69`.

The head is built on head Q. Q names both registers in
`wrangler.lending.jsonc`, so a deployment of this head keeps the
upgrade-cohort room that the window made (approval `691bae0b`).

Named reds, in `artroom-evidence/2026-11-18-u4t-red/`:

- With the packet and main's trust rows, the reproduction test fails with
  "dap-lending must trust each committed packet exactly once" (6 rows, 7
  packets). `red-1-no-row.txt`, SHA-256
  `33f97e1a9c487dabd19df3834aa38dc850ab07499f745a2dd731ff4ea9a36812`.
- With the 0.7.0 row listed and no packet, the test fails to open
  `apps/counter/releases/0.7.0/application.dap.json`. `red-2-no-packet.txt`,
  SHA-256 `92f391d8aa3ba505ef68c9de5a06f25bddff4f45d3b72cb959ecc8ee07dbb529`.

## LC-7: trust Lending 0.6.0, 18 November

LC-7 request `0e5bf3ba` adds Lending 0.6.0 for the upgrade-witness room.
Lending 0.5.0 was signed before U3, and its page refuses a screen row whose
presentation differs from its own. The planner therefore skips 0.5.0 in
that room (ruling `b9e6a2d4`). The planner signed 0.6.0 from main
`277ae9f0` (act `af108d79`), which carries U3's client. The semantic
identifier `48616803` is unchanged from 0.4.0, so item 5 upgrades in place
from 0.4.0 to 0.6.0, and the `lending-shelf.inguz.space` row needs no
change. The head commits the signed bytes unchanged:

- `examples/lending/releases/0.6.0/application.dap.json`: 2,522,701 bytes,
  blob `ab5c335a94f9e5f59326083bdf26a521d404468f`, SHA-256
  `d02edf87c05d8c8ef3405b946472d13e9b0aa8b5abaac5763ae550231aa3bb3d`,
  release `sha256:2ba6c359ff7e030cc43e37de2630dcad4ba19e3224ab741dfbec5fcedb9e3789`,
  presentation `sha256:6153d94842dffeadaab5cfb8c6db3f417021daf8c1f9e2fb07a3bdfd110f1e84`.

The packet's presentation equals the open presentation on main `277ae9f0`.

The dap-lending trust rows now name eight releases: Lending 0.3.0, 0.4.0,
0.5.0 and 0.6.0, and Counter 0.4.0, 0.5.0, 0.6.0 and 0.7.0, each with the
same publisher and host. The formatter protects the new packet path, and
the reproduction test reads the packet against its row.

The head opens Lending 0.7.0 (ruling `163de663`). The page shows the
manifest version, so the open presentation moves to `cdcc3678`.

Named reds, in `artroom-evidence/2026-11-18-lc7-red/`:

- With the packet and main's trust rows, the reproduction test fails with
  "dap-lending must trust each committed packet exactly once" (7 rows, 8
  packets). `red-1-no-row.txt`, SHA-256
  `4f6d27f5c2fc816d61b3a3e3efb9f875399868aaa9eaaf49b5d3540ea7aaec06`.
- With the 0.6.0 row listed and no packet, the test fails to open
  `examples/lending/releases/0.6.0/application.dap.json`. `red-2-no-packet.txt`,
  SHA-256 `9ac6808f0ae51321a842eb80a5c9e060fed2f226c9771929684f3a67148da1d3`.
