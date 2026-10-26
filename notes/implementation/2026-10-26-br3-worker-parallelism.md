# Two workers for the Scope test project

Request: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:50695e48bce9673efd1864fec5d264ffa28e384a.

## What changed

The `scope` native project allows two workers and keeps `isolate: false`.
Each worker reuses its runtime across files. The existing Lending story runs
once in a separate one-worker `scope-lending` project after Scope; the
one-worker `scope-denial` project follows it. Both the root and Scope package
entrypoints select these files exactly once. The root file-task limit stays
four. Expected behavior assertions, deadlines and production source remain.
The final ordinary gate G3 passed at its exact source checkpoint.

The historical Lending projection stand-in collects at most two complete
attempts. It restarts once only when independently validated original
sources name different complete native `{seq, hash}` heads. The existing
story places its same passer-by return and drain between the first native
item response and history. The same returned-item expectation follows the
first successful look. All original acts, second-look requirements, roles,
post counts and deadlines remain. Only bounded existing diagnostic labels
were added to the first failure message.

## Decisions and why

Two workers are the smallest change allowing different files to overlap.
The pinned pool creates one Miniflare per worker. Each archive clock and
fixture owner stays within its worker. Scope retains the clone-server and
maintained-application global setup; clone calls use separate directories
and random sessions, and captured application packets are immutable.
Lending uses the same real Worker, SQLite and Wrangler bindings, with one
exact file, `isolate: false`, and its existing 30-second allowance. It needs
neither global setup. Denial retains its separate runtime and budget.

Planner decision `29be96629213ba13f3acff8c9dec58f47a641926` accepted this
bounded isolation at `bd9d4dec5f79008c803a8eae506403430169aedb` after two
failed gates. Owning checks ran once after BR10's gate closed; one final
ordinary gate then supplied both validation and the after measurement,
as allowed by `cf0328ba`. Superseded question `72a1266e` and answered,
retired replacement `0db80e82` are historical; work rests on the original
request and promise.

The stand-in validates each original source through the unchanged strict
projector before comparing heads: query binding, complete items, declared
fields, journal bytes, chain and final hash. Refused, malformed, incomplete,
binding and transport errors propagate immediately. A generic `stale`
error never selects a restart. After its one allowed restart, the aggregate
projector stays strict. The interleave flag is set before awaiting the same
accepted return and drain; it adds no sleep, act or unjoined gate.

V1 failed the second current requirement; V2 failed the first after 678 ms,
with the underlying error again masked by no-query-reply. Both runs remain
failed. A diagnostic isolated pass captured no cause. The paired control
proves the deliberately interleaved coherence gap, and G3 shows one passing
run with the accepted runtime boundary. Neither establishes the unknown
cross-file cause. BR4 request `15b0f8ab` retains that cause and the original
V1 second-look failure at `lending.test.ts:237`.

Dependencies came from an existing earned installation. All fourteen
workspace links were rebound; external/link lock entries matched, with only
the allowed platform-to-git workspace edge across the R7 recut. The final
lock/stamp is `645224923cabfd70b51b8add2a43be12673444779d18002a42ed4254b3216d6e`.
The same private directory became real `node_modules` for the pool's
ownership check. No package was installed and no other dependency view was
changed. These comparisons do not authenticate every dependency byte.

## Evidence

G3 ran at `9c2d5f4bc882102acc6c826e2d44bcc5142f3400`, tree
`4d69701074dcc15edb2f84ddb85305cea073a080`, and closed exit 0 with the same
clean head. All gate steps and all five fixed test stages passed. Its public
totals were 57 Node cases passed, 55 Counting cases passed, 2835 plain
cases passed with one skipped, and 780 native cases passed with two skipped. Whole G3 elapsed was
882.237472083 seconds and child CPU was 1870.506783 seconds.

The [final delivery manifest](evidence/2026-10-26-br3-worker-parallelism-delivery.manifest.json)
indexes 181 files under
`/Users/hughpyle/play/artroom-evidence/2026-10-26-br3-worker-parallelism-delivery`;
its SHA-256 is `288bbc2a966e94914562e068a498233deee3105849cf812b8f0bee96e838e4c0`. The directory is retained read-only,
with top-level `SHA256SUMS`. It keeps each original BR3 raw directory and
index, prior unlanded manifests as provenance, source owners, and the
analysis input. Original home directories remain retained. The short
prefixes below name separate original runs; failed and passing evidence
are never combined into a replacement result.

The table uses six decimals for derived phase observations where available;
older displayed values retain their original precision. Whole wall and
child CPU come from each command's metadata. Phase wall comes only from
its canonical ledger. Concurrent case/module durations and nested phases
are never summed into whole wall. Native phase CPU is unknown; whole-gate
CPU is never assigned to native. Exact argv, timings, machine, load, cache,
source identities and restorations remain in the indexed records.

| Check | Command/source | Checkpoint | Exit and terminal outcome | Wall seconds | Child CPU seconds | Retained output SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical phase selection | `node --test scripts/test-phases.test.mjs` | `da2cf773` | exit 0; 1 passed | not measured | unknown | `87b7db670166cf0df4d0ac1eac4cc637705ac1b5a00e5ec0675cdb250c84d980` |
| Preparation whitespace | `git diff --check 9daa037e1976fa0e245192823cce96fc8741360d HEAD` | `da2cf773` | exit 0 | not measured | unknown | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Private dependency proof | Retained copy driver and materialization checks | `f6fb666c` | 14 links; exact external/link lock comparison; no install | not measured | unknown | `ab3fd2f36f49ec505c740350828785c120f7e8a9cc34ad2def9969c96d590258`; materialization `65ff21c6869cab2bbede53632203e208f17762e1bd2e87714077a0d7e462d07b` |
| Historical Scope test compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` | `f6fb666c` | exit 0 | 0.96 | 3.53 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| R7 recut and dependency comparison | Retained rebase driver and `git range-diff` | `2017e679` | exit 0; no conflicts; one allowed workspace edge; 14 links | not measured | unknown | `f632734cc7284969e8b35b7fab42ef6678047f2b975bd609f8270bf26dfdd914`; range diff `e00f80a28d580163d5c3a68f447a29381738c3d3a0329057591fd40826167358` |
| Diagnostic compiler | Scope test compiler | `7ee71a54` | exit 0 | 0.62 | 3.13 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Diagnostic isolated Lending file | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope packages/scope/test/lending.test.ts` | `7ee71a54` | exit 0; 1 passed; cause not captured | 7.91 | 9.56 | `e3222fdf98f2629f39592b48b4bea2d2c056bc3fb67cffa3c6bc2406085339fd` |
| Repair compiler | Scope test compiler | `e29acab4` | exit 0 | 0.63 | 3.10 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Repair paired control | `node scripts/control.mjs` exact argv and replacement in `ctrl/result.json` | `e29acab4` | exit 0 distinguishes: healthy 1 passed; fault 1 intended AssertionError | 13.69 (pair) | 16.67 (pair) | `306484fb618a2f5a77d75ecd20a150a754517779946b2491e550b3740f858cfe` |
| BR9 before: whole gate | `npm run gate` | `f4735c54` | 0; passed, older code, one Scope worker | 1431.828723 | 1661.266269 | `525e8cb13a5b3ed2502d4648b008e257c5bfacc1eb6a66be13e7c7eb533a978b` (`baseline-observations.json`) |
| BR9 before: kernel | Derived canonical phase ledger | `f4735c54` | 0; passed | 0.191410 | unknown | `525e8cb13a5b3ed2502d4648b008e257c5bfacc1eb6a66be13e7c7eb533a978b` (`baseline-observations.json`) |
| BR9 before: node | Derived canonical phase ledger | `f4735c54` | 0; 56 public cases passed | 36.439615 | unknown | `525e8cb13a5b3ed2502d4648b008e257c5bfacc1eb6a66be13e7c7eb533a978b` (`baseline-observations.json`) |
| BR9 before: counting | Derived canonical phase ledger | `f4735c54` | 0; 55 passed | 2.077884 | unknown | `525e8cb13a5b3ed2502d4648b008e257c5bfacc1eb6a66be13e7c7eb533a978b` (`baseline-observations.json`) |
| BR9 before: plain | Derived canonical phase ledger | `f4735c54` | 0; 2817 passed, 1 skipped | 64.604058 | unknown | `525e8cb13a5b3ed2502d4648b008e257c5bfacc1eb6a66be13e7c7eb533a978b` (`baseline-observations.json`) |
| BR9 before: native | Derived canonical phase ledger | `f4735c54` | 0; 771 passed, 2 skipped | 1310.254681 | unknown | `525e8cb13a5b3ed2502d4648b008e257c5bfacc1eb6a66be13e7c7eb533a978b` (`baseline-observations.json`) |
| R7 additional failed native point | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts` | `ae49c5a6` | 1; 778 passed, 2 failed, 2 skipped | 1315.809744 | 1329.898563 | `525e8cb13a5b3ed2502d4648b008e257c5bfacc1eb6a66be13e7c7eb533a978b` (`baseline-observations.json`) |
| BR3 initial: whole gate | `npm run gate` | `eceeb5e9` | 1; failed | 887.092 | 1877.359 | `13cba9557ce7bfc60e734ed53ae51b1d36c82a906a198c488ba8a4b705cc7259` (`a1/analysis.json`) |
| BR3 initial: kernel | Derived canonical phase ledger | `eceeb5e9` | exit 0; passed | 0.194 | unknown | `13cba9557ce7bfc60e734ed53ae51b1d36c82a906a198c488ba8a4b705cc7259` (`a1/analysis.json`) |
| BR3 initial: node | Derived canonical phase ledger | `eceeb5e9` | exit 0; 57 passed | 38.005 | unknown | `13cba9557ce7bfc60e734ed53ae51b1d36c82a906a198c488ba8a4b705cc7259` (`a1/analysis.json`) |
| BR3 initial: counting | Derived canonical phase ledger | `eceeb5e9` | exit 0; 55 passed | 2.136 | unknown | `13cba9557ce7bfc60e734ed53ae51b1d36c82a906a198c488ba8a4b705cc7259` (`a1/analysis.json`) |
| BR3 initial: plain | Derived canonical phase ledger | `eceeb5e9` | exit 0; 2835 passed, 1 skipped | 66.577 | unknown | `13cba9557ce7bfc60e734ed53ae51b1d36c82a906a198c488ba8a4b705cc7259` (`a1/analysis.json`) |
| BR3 initial: native | Derived canonical phase ledger | `eceeb5e9` | exit 1; 1 failed, 779 passed, 2 skipped | 761.231 | unknown | `13cba9557ce7bfc60e734ed53ae51b1d36c82a906a198c488ba8a4b705cc7259` (`a1/analysis.json`) |
| BR3 V2: whole gate | `npm run gate` | `cbb08aff` | 1; failed | 852.986079 | 1810.541754 | `c6ecbdb70541d6ebeb8ac9f1a2e04721fe06e0bb14b55e3329d6effda9a1ff01` (`a2/analysis.json`) |
| BR3 V2: kernel | Derived canonical phase ledger | `cbb08aff` | exit 0; passed | 0.184268583 | unknown | `c6ecbdb70541d6ebeb8ac9f1a2e04721fe06e0bb14b55e3329d6effda9a1ff01` (`a2/analysis.json`) |
| BR3 V2: node | Derived canonical phase ledger | `cbb08aff` | exit 0; 57 passed | 36.29350475 | unknown | `c6ecbdb70541d6ebeb8ac9f1a2e04721fe06e0bb14b55e3329d6effda9a1ff01` (`a2/analysis.json`) |
| BR3 V2: counting | Derived canonical phase ledger | `cbb08aff` | exit 0; 55 passed | 1.9299353340000016 | unknown | `c6ecbdb70541d6ebeb8ac9f1a2e04721fe06e0bb14b55e3329d6effda9a1ff01` (`a2/analysis.json`) |
| BR3 V2: plain | Derived canonical phase ledger | `cbb08aff` | exit 0; 2835 passed, 1 skipped | 59.650898999999995 | unknown | `c6ecbdb70541d6ebeb8ac9f1a2e04721fe06e0bb14b55e3329d6effda9a1ff01` (`a2/analysis.json`) |
| BR3 V2: native | Derived canonical phase ledger | `cbb08aff` | exit 1; 779 passed, 1 failed, 2 skipped | 736.957111875 | unknown | `c6ecbdb70541d6ebeb8ac9f1a2e04721fe06e0bb14b55e3329d6effda9a1ff01` (`a2/analysis.json`) |
| Isolation whole owning Node files | `node --test scripts/test-phases.test.mjs scripts/test-summary.test.mjs` | `bd9d4dec` | 0; 4 passed | not reported here | not reported here | `f3de338a445fb7f75d36f42c64400b109a576688441b200e42bd645bd75325dc` (`iso/node-owning.log`) |
| Isolation Scope test compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` | `bd9d4dec` | 0 | not reported here | not reported here | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`iso/compiler.log`) |
| Whole dedicated Lending project | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope-lending` | `bd9d4dec` | 0; 1 passed; 3925 ms case | 6.988 | 7.989 | `05508da3ee11cf19a36e2aa83edc2fb53c775fa71725b9edbd1368f74c9f98c5` (`iso/lending.log`) |
| BR3 G3: whole ordinary gate and after measurement | `npm run gate` | `9c2d5f4b` | 0; passed | 882.237472083 | 1870.506783 | `8fb9ad9a8fb1d6818f852f8ba93a463ef30f37c7e832d4f93041eec61a59c838` (`g3/result.json`) |
| BR3 G3: kernel | Canonical phase ledger, retained analysis | `9c2d5f4b` | 0; passed | 0.209378 | unknown | `5b44e43d122f829bb4f90956016ee385ea0afcd0811e0112f0b2439b487e1b5d` (`a3/analysis.json`) |
| BR3 G3: node | Canonical phase ledger, retained analysis | `9c2d5f4b` | 0; 57 passed | 37.988777 | unknown | `5b44e43d122f829bb4f90956016ee385ea0afcd0811e0112f0b2439b487e1b5d` (`a3/analysis.json`) |
| BR3 G3: counting | Canonical phase ledger, retained analysis | `9c2d5f4b` | 0; 55 passed | 1.985896 | unknown | `5b44e43d122f829bb4f90956016ee385ea0afcd0811e0112f0b2439b487e1b5d` (`a3/analysis.json`) |
| BR3 G3: plain | Canonical phase ledger, retained analysis | `9c2d5f4b` | 0; 2835 passed, 1 skipped | 69.409942 | unknown | `5b44e43d122f829bb4f90956016ee385ea0afcd0811e0112f0b2439b487e1b5d` (`a3/analysis.json`) |
| BR3 G3: native | Canonical phase ledger, retained analysis | `9c2d5f4b` | 0; 780 passed, 2 skipped | 753.643904 | unknown | `5b44e43d122f829bb4f90956016ee385ea0afcd0811e0112f0b2439b487e1b5d` (`a3/analysis.json`) |
| Closed G3 analysis | `node artroom-br3-analyze-isolated-closed-gate-20261026.mjs` on closed G3 records | `9c2d5f4b records` | analysis 0; G3 remains passed | not measured | unknown | `5b44e43d122f829bb4f90956016ee385ea0afcd0811e0112f0b2439b487e1b5d` (`a3/analysis.json`) |

BR9 is the passing before gate on older code with one Scope worker; all
five phases passed. Its head/tree were `f4735c5435224d9dbe828099cc280a6e3adef1b2` /
`849083ea95a3630556531dd6ac7d441632a2c83d`. R7's native command at
`ae49c5a6126c8b6704811783ca9c943d65f8f4b2`, tree
`96975fe5755918a615b1ddb9484e750a07d3e0d2`, failed two cases and remains
an additional failed observation. Those baselines are reused solely from
`baseline-observations.json`, SHA-256
`525e8cb13a5b3ed2502d4648b008e257c5bfacc1eb6a66be13e7c7eb533a978b`.
G3 analysis records that source and hash in `baselineReuse`. Embedded old
R7/BR9 result, manifest and raw paths were neither followed nor reopened;
their accepted evidence was not reauthenticated. The index does not itself
record worker topology; the one-worker description is supplied context.

Descriptions place these observations on macOS 27.0.1 arm64 and Node
v26.12.1, but do not establish identical physical machines. Starting loads
were BR9 `[1.728515625, 1.82421875, 1.93505859375]`, R7
`[2.10791015625, 2.6318359375, 2.552734375]`, V1
`[1.5347, 2.0464, 2.3735]`, V2
`[1.35400390625, 1.39990234375, 1.44287109375]`, and G3
`[2.0107421875, 2.755859375, 2.82666015625]`. G3 describes a private
copied dependency installation with earned caches, fourteen rebound links,
real owned `node_modules`, and no install or reset. BR9 describes the same
workflow; R7 describes existing private dependencies with no reset or
priming. Equal descriptions do not establish equal physical cache states.
Code trees, inventories, outcomes, runtime setup, load and cache histories
differ. These are uncontrolled observations; no ratio or speedup is claimed.

Callback counts use actual `(project, file, id)` identities. V1 plain had
2836 ready/result/final records with no gaps. V1 native had 767 ready,
766 result, and 782 final; two ready identities lacked a result, one result
lacked a ready, fifteen finals lacked a ready, and sixteen finals lacked a
result. V2 plain also had 2836 of each, without gaps. V2 native had 765
ready, 763 result, and 782 final; respective gaps were 2, 0, 17 and 19.
Both failed native runs ended with 779 passed, one failed, and two skipped.

G3 plain had 2836 actual ready, result and final identities, without gaps.
G3 native had 767 ready, 745 result, and 782 final; 22 ready identities
lacked a result, no result lacked a ready, fifteen finals lacked a ready,
and 37 finals lacked a result. There were no duplicate or unidentified
callback identities. Its finals report 780 passed and two skipped. Both
Vitest run ends report zero unhandled errors in each of V1, V2 and G3.
Kernel and Node unhandled counts remain unknown. Final states never supply
missing starts, results or execution intervals; those gaps remain unknown.

G3's maintained native inventory reports Scope with 228 observed module
records and partial duration coverage, Lending with one observed module,
and denial with one. The skipped Page recorder has no numeric module
duration, so Scope duration coverage stays partial despite the passed
terminal outcome. Module durations are concurrent sums, not phase wall.

G3 has 743 complete, uniquely paired executed intervals; two paired records
were ambiguous or invalid for interval use. One actual overlap is between
Scope's `archive-one-entry-scale.test.ts`, id `-1444993209_0`, ready
`2026-10-26T17:44:25.602Z` and result `17:48:10.644Z`, and
`floor-archive.test.ts`, id `-1601051069_0`, ready `17:44:25.615Z` and
result `17:44:26.039Z`. Both passed. Their overlap is
`17:44:25.615Z`–`17:44:26.039Z`. Each endpoint comes from one actual ready
and one actual result callback. This shows different-file framework
execution overlap, without measuring CPU occupancy or full-phase worker
utilization. Separate actual overlap witnesses for failed V1 and V2 remain
in their analyses; no missing callback is reconstructed.

The paired control at `e29acab45e6eb113af89e8b084b0650c8c038a62`, tree
`4aeb67935d527d8098a4f6ae129ed6435bfb0cf6`, passed the whole story once.
Disabling only the restart guard then failed its first current requirement
by the intended `AssertionError` with status `behind`, without timeout or
unhandled error. The helper was restored byte-for-byte; test bytes stayed
identical. Healthy helper SHA-256 is
`040cc416701ac8da25b34f9465bb87b7465524913e128e05ecd4ba2d1975dae5`;
fault helper is `0e53196a7ba81b52e39f1e2139fe8c1154c2058e2fee3999356e36bbd462befd`.
The external reporter adapter only selected output paths and delegated
maintained callbacks. Healthy stdout suppressed by the control helper
remains absent; callbacks, timing and passing-count summary are retained.

The isolation owning checkpoint was
`bd9d4dec5f79008c803a8eae506403430169aedb`, tree
`1703484866f0dfbe5aaf2d159cdb6d133b816b86`. Its two whole Node files,
Scope test compiler and whole dedicated Lending project each ran once,
in order, after BR10's successful closure. All passed without source
mutation. The subsequent G3 checkpoint adds only the note and interim
manifest. These owning results and the historical control keep their own
source identities; neither is relabelled as testing later configuration.

V1 remains at `eceeb5e92125a48e699b799750a6fb4e64e9593b`, tree
`4d3578dfeed0ef1ade7573af6f8a03e250b04d41`; V2 remains at
`cbb08aff65dfbf68008bf27b979b4e4a989ffd38`, tree
`640f42b1a863700b44c891816ced233e0edbc0ca`. Other historical full checkpoint
and tree pairs are retained in `checkpoints.json`. Preparation and compiler
records predate the R7 recut; they retain those limits. G3 compiled and
checked its actual upstream inputs.

Main and origin stayed at `986c7120` throughout G3. This branch starts
from the R7 documentation follow-up at `d36773b3`; Main also has BR9's
migration-prefix guard and its note/manifest. Those three paths are
disjoint from this branch's changes. G3 used its own fourteen workspace
links and source inputs. No gate of a merged Main tree is claimed; the
review must assess composition with the target.

The final documentation tail may change only this note and the six named
unlanded BR3 manifest removals plus their one delivery-manifest replacement.
Before review, record its final commit/tree externally and compare it with
G3's exact tree to confirm that source, tests, configuration, assets and
lock are unchanged. No final commit self-hash is asserted here. No compiler,
test, native phase, build, measurement or gate repeats for that documents-only tail.

## Open limits

Request `50695e48` owns final consolidation and exact-head review and
landing. One accepted G3 gate passed; V1 and V2 remain failed. BR4 request
`15b0f8ab` owns the unknown cross-file cause and the original line-237
failure record. A changing native head can still exhaust the stand-in's
two-attempt bound and refuse. Neither the fixture control nor this one
isolated passing gate proves the original cause, physical draining,
universal cross-file cleanup or a controlled performance improvement.

The older request `7783018d` remains separate. Its campaign is neither
repeated nor claimed closed. Archive work retains priority. Evidence
cleanup after the retention period needs a planner act naming the manifest.
