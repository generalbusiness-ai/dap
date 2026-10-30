# Minimum-head reads: review repairs

DX-A2 remains under request `1c124ebf0f204a06e9f0f0de33c3b88c4dd296bb`, promise
`28df5171acd1320942be751570e7a2b044a541e1`, and parent
`2888b81e7472b5c097c8bc676794ee0170949978` in workroom
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3`. The source base is
`5dc9765fdc6fb6896b736127801944c46ee288f9`.

**The fourth repair gate passed.** It closed naturally at clean source
`713487e04d8e119ce036ac817e04504e24f6b315`, tree
`f2dc10bd111a5f7ab31a30085ec8b38f8dd22bf6`, with unchanged source and
complete output capture. Three original and three earlier repair gates
remain failed. This report claims no review approval, landing or hosted result.

## What changed

The five existing reads accept optional `{at: ScopeRef, head: number | Head}`:
summary, items, history, entry and application projection. Clients may supply
a receipt. HTTP carries one canonical base64url `atLeast` parameter, bounded
to 512 decoded bytes and 683 encoded characters. Head and FactRef stay closed.
Malformed or duplicate HTTP input, or a different URL scope, returns 400.
An authorized kind mismatch returns unavailable; another incarnation returns
wrong-incarnation. Neither exposes a head. The bounded RPC record follows
the same authority rules without a new wire reason.

`ReadWait` registers before checking position and wakes after a committed
seal. It waits outside the turn and transaction, refreshes authority, and
releases its callback and timer in finally. Its wait timer uses
`Bounds.readWaitMilliseconds = 1000`. An authorized timeout returns behind
with the current FactRef; HTTP maps that answer to 503. No journal record,
alarm, subscription or rate policy enters the wait. Controlled-clock cases
prove behavior, not deployed one-second latency or physical drain.

The card retains its accepted receipt and sends it on its next existing
application-projection request. Hosted enrolment qualifies its existing entry
read-back. Neither adds a summary barrier or polling loop. Native definitions
and historical pins stay unchanged. Maintained generation supplies Page
assets and MCP resource bytes; generated equality checks prove no browser or
provider behavior.

## Six checker repairs and the floor decision

Checker `0924ce2ed5c619b8cc0845f65b87e2686dac7e3b` requested six changes at
`aa20f0fe0e01e380e49497a64371958e1147e574`, tree
`07baa6da9ad7c183f2cf1342bf6490336f62f627`. Its findings came from source,
not runtime reproduction. The new cases and captures below stay distinct.

1. **Preserve archived answers.** Ruling
   `366b3989097cc70edf291bb97e019c7a866c0607` adopts ordering only for a full
   minimum strictly below the real journal floor. After authority, exact
   ScopeRef/incarnation checks and reaching the position, entry keeps its
   existing archived metadata: floor, commit and through position. Summary,
   items, history and projection answer normally. No archived bytes or
   supplied historical hash are verified. At or above the floor, a missing
   or different retained hash remains unavailable. No archive dereference,
   authority or wire field is added. Below the floor the minimum orders;
   it does not verify.
2. **Keep a waiting projection out of the shared flight.** The wait now
   precedes PreparationFlights admission, so it cannot occupy the item-query
   slot. The original ten-second projection deadline includes time already
   spent waiting. A narrow earlier deadline only shortens that window.
   The existing flight still owns late unresolved work until it settles.
3. **Refresh causal roots.** Signed history and entry reads refresh the
   existing bounded chain proof on admission and after each wake. A seal
   during asynchronous refresh causes another refresh, not a stale read.
   The first authorized racing refresh starts the same wait timer. An
   expired or unauthorized reader gets its named refusal before any head.
   A deadline race with uncertain chain coverage fails unavailable.
4. **Keep receipt refusals.** followReceipt sends a qualified sequence
   minimum, then checks the returned full reference and computed entry hash.
   It retains hash-mismatch, reference-mismatch and the hosted 409 enrolment
   refusal. Only unavailable permits one ordinary entry read with the same
   target and reader. Other refusals pass through; no retry loop is added.
   A successful reply whose head is below the receipt cannot succeed.
5. **Stop dropped or stale minima.** All five handle reads own their input
   before dispatch and reject successful replies below it. An equal full
   head must also match its hash; a later head alone cannot prove a historical
   hash. CLI session wrappers forward and own all five arguments before
   asynchronous session work. The serialized local development host refuses
   a valid minimum with unavailable and rejects malformed/duplicate wire
   input with 400. It adds no local arrival wait.
6. **Complete kernel section 7.** It names the new
   `packages/bytes/src/read-minimum.ts` owner and readMinimum, isReadMinimum,
   encodeReadMinimumParameter, readMinimumParameter and
   READ_MINIMUM_WIRE_BOUNDS; isBehindRead; the five ScopeApi arguments; and
   wrong-incarnation/behind in APPLICATION_PROJECTION_REFUSALS. These are
   shared read contracts: all applications use the same existing reads and
   cannot redefine their wire, result guard or refusal shape. They introduce
   no application vocabulary. The client README
   states the bounded receipt fallback and local-development limit.

The floor ruling also withdraws the old single-file exception and requires
a new full gate. A separate waiter-count cap remains deferred to the planner's
observability design. The one-second timer bounds a wait; it does not bound
concurrent waiter count. No cap or new rate policy is claimed here.

## Actual witnesses and failures

The sealed old report keeps three failed gates: CLI status typing at
`6c2ad821`, stale generated resources at `091c0781`, and receipt hash and
kind expectations at `240c963f`. The `ce3aadfc` follow-ups passed but did
not preserve public refusals. Checker review rejected that exception.
The table preserves all 44 original invocation rows.

The client test compiler first rejects an invalid wrong-kind literal; a
valid rules kind fixes that fixture. Plain first reports 32 passes and two
failures: missing projection source and an explicit null reader selecting
Signed rather than the scripted Session. A valid empty board source and
issued session preserve the assertions; both whole owners then pass 18.

The first Native selection reports 16 passes and one timeout in the causal
reader case. Background delivery could beat the waiting readers. The fixture
now holds only the exact target delivery, signs both readers first, waits for
both timers, delivers the real envelope, then restores the prior dispatcher
and settles owned work in finally. The same six-case owner passes. This is a
fixture scheduling correction, not a passing result manufactured from the
timeout or a new production change.

The projection-wait case uses a real native Rules object and session. While
its controlled one-second wait stays pending, an actual item query succeeds.
The causal case uses real parent/child creation, a signed link and typed
native delivery. The original waiting history and entry replies see that
new causal entry; an unrelated signer is forbidden before waiting. Generic
definitions, grants, clock and timer are labelled test inputs. Journals,
signatures, causal traversal, turns and SQLite remain real.

The installed-card owner retains its pause receipt, writes later native
acts and checkpoints, advances its clock, and runs Core.floor on real SQL.
Its test-authored archive commit proves no provider custody or alarm writer.
After payload deletion and eviction, a new session reads actual archived
metadata and the card refresh carries the old receipt. A wrong retained
floor hash stays unavailable; unauthenticated access stays forbidden. The
combined two-file selection passes eight cases.

The floor control distinguishes archived from unavailable: its baseline
passes, its mutant reports one pass and one failure, and exact bytes return.
It stops before card refresh, so proves no refresh mutation result. Its
temporary JSON reports are absent. All 9,132 diagnostic bytes are in stderr,
with empty stdout; the old proposal's stdout caption stays historical.
The old full-head control stays separate. Neither is a sweep or hosted proof.

The first three repair receipts keep an obsolete BO1 two-fixture caption.
capture-qualification-correction.json names them. Actual before/after
inventories, dirty status and hashes govern those aa20-based bytes; no
receipt or source guard changed. Head/tree alone do not identify them.

Generation changes only assets.ts and ignored dist JavaScript; four
generated cases pass. AST readback fails on bare keys, then v2 passes on
qualified keys. Baseline comparison supports four adopted seal changes;
inventory passes ten. The v1 metadata-lock copy stays an input. No new
flight owner or semantic digest becomes a seal or file hash. Seals grant
no runtime authority.

The first repair gate at `1c5a6fba` passes Kernel, then fails Node:
79 pass and active-source rejects the client fixture's Platform import.
Counting, Plain and Native stay unreached. A one-shot maintained query
digest calculation, with fixed public input and tsx cache disabled, replaces
only that test import. Its value, template and patch remain retained. No
algorithm or allowlist changes. The client test compiler, seven client
cases and twelve active-source Node cases then pass separately.

The second repair gate at `b678ecba` passes Kernel and Node 80, then fails
Counting with 55 passes and one failure; Plain and Native stay unreached.
The fake accepted-history entry and receipt named sequence 2 but its read
reported head 1. The minimum guard correctly returned unknown. Changing
only those two fake head fields to 2 leaves production and allowlists
unchanged. The Counter compiler and all 56 Counting cases pass separately
on that dirty fixture repair.

Root commits clean source `887f411cbf857d1dc3e3e733de6ee8e17d497350`, tree
`85096fbf5a41e499b28f29eb6f2e4b251d44144b`. The third repair gate fails:
Kernel, Node 80, Counting 56 and Plain 3,156 with one skip pass. Native
reports 865 passes, one failure and two skips across all three projects.
The Lending story receives nothing-sent instead of unknown after discarding
its preceding look result. The output does not establish the no-send cause.

A one-file diagnostic retains that look and donation result only through
fixed reason labels, post counts and custody-presence booleans. It preserves
every call, assertion and deadline. Its compiler and whole Lending owner
pass separately. That pass supplies no missing observation of the earlier
failure and proves no repaired race.

Source inspection finds avoidable contention in the historical projection
stand-in: parallel library and thing queries share one native query flight,
which may refuse an overlapping task as unavailable. The helper now awaits
the original queries in order, then constructs the same response map. It
preserves history ordering, strict source/head validation and the two-attempt
limit. Its compiler and whole Lending owner pass once. No production,
authority, assertion, deadline or pin changes. The original cause remains
unconfirmed. This shared-helper change requires a new full gate.

Gate command walls are 84.707218, 93.139510 and 1,225.857183 seconds;
their capture host child CPUs are 153.316810, 164.599937 and 2,611.798288
seconds. Command-only and enclosing runner costs remain distinct in the
receipts. Gate 3's runner reports Darwin 27.2.0, arm64, 18 logical CPUs and
start load averages 4.993652, 4.701660 and 4.187988. Cache and shared-host
load are uncontrolled; this is no cold-cache benchmark. No VM CPU is
measured.

The fourth gate passes Kernel, Node 80, Counting 56, Plain 3,156 with one
skip, and Native 866 with two skips. All five stages pass, reportErrors is
empty, and four terminal ledgers are complete. Scope timing remains partial:
246 modules observed, 72 unknown or suite observations overall, zero
contradictory records. Those timing gaps are not inferred test failures.
Command wall is 1,253.580465 seconds, capture wall 1,253.746091, capture host
CPU 2,678.112164 and command CPU 2,677.929155. Enclosing runner wall is
1,254.820106 and host CPU 2,681.111010. No VM CPU is measured. Its Darwin
27.2.0 arm64 host has 18 logical CPUs; start loads are 4.101563, 4.330566 and
5.434570. Cache and shared-host load remain uncontrolled.

## Evidence table and custody

The old unit is actually sealed at
`/Users/hughpyle/play/artroom-evidence/2026-10-30-dxa2-minimum-head`:
576 files, 85,415,337 bytes, root SHA256SUMS
`64725902b21744c166ff1da6cc06fbeacb7038a0ff9ebd212d23f07fec81a450`.
Its old note and manifest remain unchanged. The sealed new home is
`/Users/hughpyle/play/artroom-evidence/2026-10-30-dxa2-review-repairs`.
The compact manifest records current custody and binds the aliases below.
E means that home; E/prior-evidence keeps the complete old namespace.

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
E/lending-diagnostic-checks and E/lending-serial-checks. The compact manifest
now binds these aliases.

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

## Open work and limits

Exact-head review remains open after the passing fourth repair gate. The
three original and three earlier repair gates remain failed. No single-file
exception substitutes for the new gate after the shared-helper change.

The waiter-count cap stays deferred under ruling 366b3989. Clock, namespace,
grants, Git peer and archive receipt stand-ins retain their stated limits.
Local Native authority and SQL prove no hosted deployment, provider archive
custody, remote cancellation or physical drain. Public retention excludes
operator homes, credentials and live signed request bodies.

Retention proposal v3 preserves the 1,244-file, 230,710,913-byte closed
baseline across 36 roots, including the old sealed unit and all 928 prior
rows. Its ledger lists 30 focused commands, five generation commands and
three failed repair gates once each. The table preserves all 82 earlier
closed rows and adds the actual final gate. These are invocations, not
unique coverage. Final selection separately counts the new gate and source.

The actual inner roots for failed repair gates 1, 2 and 3 are
`tmp.OI5t1lvlNW`, `tmp.Ef17noH7ux` and `tmp.AY8GVUIVtq`, below the
recorded macOS temporary directory. Their complete logs and stage ledgers
stay separate from their outer collector records. The proposed Counting
roots name failed gate 2's `artroom-counting-node-RPCGAx`,
the focused follow-up's `artroom-counting-node-hmFwqX`, and failed gate 3's
`artroom-counting-node-eQhi98`. Each has four bundles, source.json and its
metafile. Source hashes, not these short labels, govern retention.

The retained final report records preparation before selection, copy and
seal. It remains unchanged in the sealed root. This documentation update
records actual custody through the compact manifest, which binds the
durable full inventory and verifier. The final gate's actual outer capture,
inner `tmp.v8X2M7X1Rb` and Counting source `artroom-counting-node-KhIWb0`
remain separately bound. This update changes no check result or source pin.

Keep the final evidence at least 30 days after landing. Later removal needs
a planner act naming its manifest. This draft claims no acceptance or parent
closure. The old sealed report and its three failed gates remain unchanged.
