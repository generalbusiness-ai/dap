# Public SDK Git closure

## What changed

Request `cd31231ee45edac63b68fca1ac66a4e4211bc95f`, promise
`8261c2191665ec427a50e49b467819d00a33b47a`, repairs the public SDK plan.
Disposition `2058b896313b0643ea5dc80105efe3d8916dc6b2` releases this repair
before the authoring skill's archive witness. All three event IDs use
repository `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3`.

The plan now includes `@generalbusiness/dap-git` as its eighth package.
It exports exactly `./tree-proof` and `./checkout-types`, with no root
export. Platform's release manifest declares its existing Git dependency.
The other seven packages retain their public export maps. Git depends on
the coordinated bytes and contract stages and `@noble/hashes` 2.4.0.

The producer copies the required Git README into the staged package.
The README describes the public subpaths and distinguishes them from
internal repository adapters. The release guide names the eight packages,
their build order and the pure Git closure.

## Decisions and why

Platform already calls `idOf`, `parseCommit` and `parseTree` through
`./tree-proof`. Its public `StageSnapshot` extends the interface from
`./checkout-types`. Omitting Git made the seven-package plan disagree with
the actual platform manifest. The earlier DX-A1 owning run correctly
refused that disagreement; this repair preserves that failed evidence.

The two public entrypoints need five unchanged pure files:
`tree-proof.ts`, `checkout-types.ts`, `reader.ts`, `ascii.ts` and
`pure-names.ts`. The exact source allowlist includes these implementation
dependencies. It excludes every other tracked Git input from compiler
ancestry and retains those omitted bytes as excluded evidence. The
implementation includes the internal callback-based `Reader`, but the
package export map exposes no `Reader` entrypoint. It includes no Node,
repository or host transport module.

Manifest checks enforce the exact public and excluded export maps. Source
selection enforces the five-file set. The checker verifies included and
excluded source inventories and hashes. Output checks independently reject
any other Git JavaScript or declaration module, then check every actual
module reference. The guards still reject missing relative modules,
unplanned bare dependencies, Node imports and testing imports.

Git uses the existing explicit bytes/web ambient declaration for its
`TextEncoder`, just as the other listed portable stages do. The producer
keeps ES2022 and its existing compiler ancestry restrictions; it adds no
Node or DOM library and changes no package source code. Compilation and
packing use the existing pinned tool/dependency selection boundaries.

This repair makes the release graph match the existing acyclic source
graph. It changes no kernel, Native authority, journal, host transport or
storage contract. `docs/architecture.md` therefore needs no contract
amendment. The owning test exercises manifest and archive boundaries with
scripted emitted modules, plus the actual source reference inventory; it
claims no runtime consumer acceptance. Its expected five paths use literal
strings, independent of the producer's allowlist.

Two scratch controls use a private local Git index for the copied Git
sources. Each runs the same named test against one removed guard. The
baseline passes; each mutant reaches an actual failed assertion, rather
than an import, compiler or fixture setup failure. The included-input
control proves refusal of a changed inclusion declaration. Even without
that guard, the independent fixed source selector still excludes Node
inputs; this control does not claim to demonstrate a Node source leak.
The output control proves refusal of an otherwise valid, unreferenced
`gateway.js`/`gateway.d.ts` module at the stage boundary.

The separate readback helper checks complete actual tar membership and
bytes against the producer inventory. It refuses nonregular, duplicate or
unsafe members. Its practical bounds are 10 MiB per archive, 10,000
members, 8 MiB per member and 64 MiB total member bytes per archive.
It extracts no files. These transport bounds grant no runtime authority.

## Evidence

The durable evidence directory is
`/Users/hughpyle/play/artroom-evidence/2026-10-29-public-sdk-closure`.
Its root `SHA256SUMS` covers every retained file. The evidence is read-only
and stays for at least 30 days after landing. Later removal requires a
planner act naming the committed manifest:
`notes/implementation/evidence/2026-10-29-public-sdk-closure.manifest.json`.

This note and that manifest are the only follow-up after the gate; source
and tests are unchanged. The gitseq review request names the actual report
commit and tree beside the gate tree below, as docs/testing.md requires.
Original scratch paths in receipts describe their original execution;
retained bytes do not provide a full runnable compiler or consumer setup.

Build and readback checkpoint:
`4ed3c9d9531ed94471a88a091d10aded465e6df6`, tree
`885e1f22339249f988eea634087817ec3c547e19`.
Gate checkpoint: `9ebdc9323c02b533d99fcd7844ff621cb0df7ec2`, tree
`269c50efab163fbe1623bd7da8f664bb1ddc9546`.
Only `docs/public-sdk-release.md` changed between those checkpoints;
producer source, package inputs and tests did not change.

The earlier owning runs used mutable source over base
`1f57314592ebbd331967d4ee85edfaa39606ad5d`; their source snapshots identify
those bytes, rather than a clean committed run. The second owning snapshot's
five script/plan files match the final committed versions. The Git README
arrived later, before the actual producer ran. The prior DX-A1 receipt
records a mutable-source failure without an immutable head checkpoint.

Commands below retain their original working directories in their receipts.
`N` is `/opt/homebrew/Cellar/node/26.13.0/bin/node` (v26.13.0).
`M` is `/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js` (11.20.0).
The producer used TypeScript 7.0.2. `C` is the exact named command:

```
N --test '--test-name-pattern=^Git publishes only two subpaths and their pure five-module closure$' scripts/public-release-modules.test.mjs
```

Each check row names one command. The eight artifact rows belong to the
single readback command; they are not eight additional test invocations.
The SHA256 column hashes stdout (and separately identifies stderr) for
check rows; it hashes tarball bytes for artifact rows. The control rows
describe separate baseline and mutant invocations, not a sweep.

For dependencies, build/pack and readback, elapsed time comes from the
collector’s monotonic command-start-to-receipt window, including its final
source checks. Host-child CPU is the collector’s `RUSAGE_CHILDREN` user
plus system delta over the whole capture, including source-guard children.
It excludes VM/container CPU and is not a hosted throughput measurement.
The finalization audit uses a separate `perf_counter()` subprocess-lifetime
wall reading and a `RUSAGE_CHILDREN` user-plus-system delta. It does not run
project tests or import project code.
The focused receipts retain their own monotonic subprocess elapsed times;
they did not measure CPU. The prior DX-A1 receipt measured neither.
Unmeasured values remain “not captured”, never zero. The gate uses the same
collector method. Its overall elapsed and CPU figures below belong to one
completed run. The receipts do not record hardware, concurrent load or
cache state; these are local command
observations, not comparative performance claims.

| Check and checkpoint | Command | Exit and observed result | Elapsed seconds | Host-child CPU seconds | SHA256 |
| --- | --- | --- | --- | --- | --- |
| Prior DX-A1 carrier failure; mutable source | `node --test scripts/public-release-modules.test.mjs` | 1; 2 PASS, 2 FAIL. Both failures: `unsupported-source-dependencies`. | not captured | not captured | `d8db7ff36a1118077472a1a807eccffea2085349a5e953048a140856d145fddb`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| First SDK owning snapshot | `N --test scripts/public-release-modules.test.mjs` | 0; 4 PASS. | 0.256180 | not captured | `85b9f3e5f3e78b4f7299581df6c6e5c0ce33df3ab8ac508c5265e0045987eea7`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Final SDK owning snapshot; independent literals and representative output control | `N --test scripts/public-release-modules.test.mjs` | 0; 4 PASS. | 0.200982 | not captured | `3bdd20d4f862ab93cae0fe365c110d46045a5bb55236d880a1e5f490c1bc1c7f`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Control fixture Git initialization | `git -c init.templateDir= init --quiet` | 0; scratch fixture only. | 0.019973 | not captured | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Control fixture tracked source ownership | `git add -- packages/git/src` | 0; scratch fixture index only. | 0.045884 | not captured | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Unchanged named Git test, baseline | `C` | 0; 1 PASS. | 0.209024 | not captured | `1714f15504cfcfd541eab547c9cd024dfd0a4812fb92d44a108f22c940f3a6d5`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Included-input guard removal, same named test | `C` | 1; actual `ERR_ASSERTION`, missing expected exception at test line 132. Distinguishes. | 0.202869 | not captured | `d9260288b0423f5cab218b6402bad5ffe140d0c06d50065a5a1514408995c831`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Output allowlist guard removal, same named test | `C` | 1; actual `ERR_ASSERTION`, missing expected exception at test line 154. Distinguishes. | 0.192535 | not captured | `8c929fb97cea2577de3fb9d91ce1b24bfa75dccb3578e57ce500d5d40b6aa6f1`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Locked dependencies; `a9e35a9b26c31d0888e8797ab234ca4d73676eee` / tree `7670071914c213a8d3c8e74ac0d45a1db786800e` | `N M ci` | 0; process closed, source clean. Existing audit and install-script warnings retained. | 4.413861 | 5.589662 | `0d7969d34f5158bc982a28a0c8b924d3c8528c221b4bec933bbf10385484ea4d`; stderr `50add94063c86dd023413e8f3b7675c71eaeede581ec7c89e78d48e9a74c568f` |
| Actual build and local pack; build checkpoint above | `N scripts/public-release.mjs --source /Users/hughpyle/play/artroom/.builder-worktrees/public-sdk-closure-20261029 --head 4ed3c9d9531ed94471a88a091d10aded465e6df6 --version 0.1.0-dev.2 --output /private/tmp/artroom-public-sdk-cd31231e-stage-1 --npm-cli /opt/homebrew/lib/node_modules/npm/bin/npm-cli.js --npm-version 11.20.0` | 0; capture 0, complete, process closed; 8 packages. | 3.201274 | 5.499579 | `b61deca96fbe2f3e7b97092ed1e70232c45e472732892b1566d11277d910c9a9`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Actual complete archive readback; same build checkpoint | `python3 /private/tmp/artroom-public-sdk-archive-audit-20261029.py` | 0; capture 0, complete, process closed; all 8 complete inventories and bytes match. | 0.078850 | 0.164136 | `a5b50b89697401e584d51f4f2e3dd244410d38b5677ee9601f566e76788174c2`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Single ordinary gate; gate checkpoint above | `npm run gate` | 0; capture 0, complete, process closed, post-source clean; PASS. | 1244.690072917 | 2559.467636 | `c1c3590621dda9c3fc8cf02714400dae085977ba4a59f0a186e53f04aa793348`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Finalization receipt/hash/Git-blob audit; frozen retained collection | `/Users/hughpyle/.pyenv/versions/3.14.5/bin/python3 /private/tmp/artroom-public-sdk-final-closure-proposal-20261029/sdk-audit-proposed.py` | 0; four formal captures complete; zero integrity issues, incomplete, inconclusive, unclosed or timed-out labels. No project checks rerun or acceptance inferred. | 0.23836504100472666 | 0.23526799999999998 | `df66cbdbd3132a80faaab62f296e9439a15982ca360cae73bf37ecb966e59546`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Artifact readback: `generalbusiness-dap-contract-0.1.0-dev.2.tgz` | Same single readback command above; no additional invocation. | 40764 archive bytes; 48 regular members; complete inventory and byte equality. | not a separate run | not a separate run | `cdf7500ec6ab0c30883064bbfdd5ea9dede492a8b35eb494ac176967326ab0be` |
| Artifact readback: `generalbusiness-dap-bytes-0.1.0-dev.2.tgz` | Same single readback command above; no additional invocation. | 43083 archive bytes; 47 regular members; complete inventory and byte equality. | not a separate run | not a separate run | `5870644dc2dcf9c01588278b9f5b1b90b2bd0fbb025ed5b2729df0f6930bcb82` |
| Artifact readback: `generalbusiness-dap-derive-0.1.0-dev.2.tgz` | Same single readback command above; no additional invocation. | 392000 archive bytes; 172 regular members; complete inventory and byte equality. | not a separate run | not a separate run | `20380e2a69211bc525d676fa0fffcfe00f4a8a8d384c0cf348779eb32dd2ad8c` |
| Artifact readback: `generalbusiness-dap-package-graph-0.1.0-dev.2.tgz` | Same single readback command above; no additional invocation. | 21575 archive bytes; 28 regular members; complete inventory and byte equality. | not a separate run | not a separate run | `2ca0c8ec6a4987e96174792e34617d36d81fd6637a68991b63b8aeefacaffd73` |
| Artifact readback: `generalbusiness-dap-git-0.1.0-dev.2.tgz` | Same single readback command above; no additional invocation. | 13725 archive bytes; 14 regular members; complete inventory and byte equality. | not a separate run | not a separate run | `2218fb75cc01573cdaa173bb38b5efe6cac6da33197224c90cbe609e183880ad` |
| Artifact readback: `generalbusiness-dap-platform-0.1.0-dev.2.tgz` | Same single readback command above; no additional invocation. | 396654 archive bytes; 202 regular members; complete inventory and byte equality. | not a separate run | not a separate run | `cf2d90679260d0213b346b766f42fe5269ccef6444e0f4ce672838ddb05aa073` |
| Artifact readback: `generalbusiness-dap-client-0.1.0-dev.2.tgz` | Same single readback command above; no additional invocation. | 78153 archive bytes; 84 regular members; complete inventory and byte equality. | not a separate run | not a separate run | `9e63f02bdff852027b2ce950aea51aa610eab068102e111f19a773b37d4352ca` |
| Artifact readback: `generalbusiness-dap-replay-0.1.0-dev.2.tgz` | Same single readback command above; no additional invocation. | 76550 archive bytes; 24 regular members; complete inventory and byte equality. | not a separate run | not a separate run | `c2b10e7db567ed826ea0a8bcf429d68cc93c5236d84a05c14de721a789cb40aa` |


The completed gate stdout reports separate phases: Node 78 PASS; Counting
55 PASS; plain 3,099 PASS and 1 skipped; Native 836 PASS and 2 skipped.
Kernel, Node, Counting, plain and Native each report passed stage status.
These are phase reports, not one deduplicated test total; they must not be
added to project/module summaries or to each other as a coverage claim.

The stage wall observations are kernel 0.19174 s, Node 57.20728 s,
Counting 1.96873 s, plain 73.89402 s and Native 1,087.90556 s. The maintained
stage runner measures each with `performance.now()` around the child
process lifetime. They exclude gate prechecks and are not CPU figures.
The gate shell separately reports each check's `/usr/bin/time -p` wall and
user-plus-system CPU. Neither set replaces the single collector receipt's
overall gate figures. Printed case and module duration sums can overlap
under concurrency; this note does not add them or call them wall/CPU time.
The summary marks scope duration coverage partial, with 66 unknown/suite
observations and zero contradictory records. Node, Counting, plain and
Native terminal evidence remains complete; partial duration coverage does
not change those recorded terminal outcomes.

The gate receipt SHA256 is
`4162e2e184d4ffafaea10b98b34e9abfff6620d5d44c1b56c5e373864049a9c4`.
Its source index SHA256 is
`3c0be31f6afc4eacddaad548f3f26892f4731c8f2cfabd7fcf0fff3d4aa925d2`.
That index binds the seven changed tracked regular files to their immutable
Git blobs and modes at the stated gate checkpoint. The command receipt
records that same head/tree before execution; the terminal receipt records
that head unchanged and a clean post-status.

Root's retained gate-detail copy record hashes to
`c86f841aa8da56199362899e93452003aca61e463fb3d0c6b37fd21f01e0aba8`.
It records 29 closed detail files and 44,670,759 bytes under
`operator-inputs/gate-detail`, including per-check logs/times and all phase
reports. The original native/plain progress files remain under
`operator-inputs`. This copying record confirms original modes and byte
identity; it is not the final evidence seal or an acceptance report.


The finalization audit checks receipt hashes, source Git blobs and physical
closure for four formal captures: dependencies, build/pack, archive
readback and gate. It reports zero issues, incomplete, inconclusive,
unclosed or timed-out labels. Its audit-input collection contains 1,573
files and 65,960,841 bytes, before terminal/result metadata additions.
`finalization/prepared-payload.json` records 1,578 files and 65,971,247
bytes excluding itself. Including that 280,006-byte payload produces the
prepared 1,579-file, 66,251,253-byte collection. These count different
inventory stages; they are not summed or substituted for final seal totals.
Finalization binds this note to the manifest, writes the root index last,
removes write bits, and verifies every hash, mode and cited directory index
by readback. Final counts belong to the manifest. Historical provisional
markers and mutable operator inputs retain their original qualifications.
The audit neither converts the DX-A1 failure into a pass nor treats its
own receipt parser's last phase count as a whole-gate test total.

The producer release-manifest SHA256 is
`dddebe20a2a51cb08cb507813791f14c378aa0f88b9a55ae0bd833844b33b73f`.
Its retained path is
`operator-inputs/sdk-stage/release-manifest.json`. The actual readback
record is `actual-archive-readback-1/stdout.log`; its bytes match the
reported complete inventories. The platform archive contains no authoring
skill assets in this repair.

Evidence paths for the table are `operator-inputs/owning-1`,
`operator-inputs/owning-2`, `operator-inputs/controls`, `dependencies-1`,
`public-sdk-build-pack-1` and `actual-archive-readback-1`. The preserved
failed row is
`operator-inputs/prior-dxa1-carrier-owning-20261029-1`. Its original receipt
states 2 PASS and 2 FAIL; no later pass changes that outcome. The completed
gate is retained as `gate-1`; its six core capture files are cited with the
other formal captures. The manifest cites `operator-inputs` and
`finalization` as complete indexed directory units. It also cites the
original `PROVISIONAL.json` as historical custody, not final acceptance.

## Open limits

- Request `c9d4e517` owns authoring skill assets in the platform carrier and
  their real archive witness. This repair supplies the prerequisite
  platform archive; it makes no skill-archive claim.
- Request `cd31231e` authorizes local build and pack only. The archive evidence
  establishes no registry publication, consumer installation or execution,
  live admission, Native SDK consumer behavior, deployment or new authority.
