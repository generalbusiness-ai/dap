# Offer current creation families and preserve saved plans

## What changed

The CLI offers the five currently admitted creation families. A fresh explicit
historical selection refuses before key access, plan storage, signing or a
request. Saved historical plans retain their original definition, signature,
register ID and deadline; delivery and retry continue through exact custody.
The recognition catalog is unchanged. Neither defaults nor pins change.

Active install guides distinguish admitted new rooms from historical rooms.
They explain that currently admitted families do not install ordinary Counter
or Lending packages. MCP descriptions use the current default register sample,
and `docs/mcp-tools.json` is regenerated. The testing guide names the current
pre-test gate checks and removes a nonexistent helper name. Historical
register constants receive accurate comments without changing their values.

The owning CLI witness checks the offer against Scope's actual creation pins,
rejects fresh historical selections before custody, and preserves retained
plan signatures and retry behavior. Eight fixture owners now use one shared
test-only helper to construct retained historical custody instead of asking
the CLI for a fresh historical family. Their exact pins and delivery assertions
remain. The helper creates no Native receipt; each caller establishes its own
delivery boundary. Current-family fixture paths remain ordinary creation.

## Decisions and why

This delivers BR7 request
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:8c3af8bad558975aa171b9c9e52cdf91a9b1d464`
under promise
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:aaf158b95dbdbbd067a6d559d2ec349d22d904d3`.
Planner ruling
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:7a2be78bbc8a60db0091487b2a4eb74898a1a07d`
released this bounded work after the listing child landed. The cited TD-14
part 2 and TD-17 findings were read before edits. This changes the offer and
its guides, not platform creation policy or application-package capability.
No archive cut, allowance, route, deployment or recorded-entry meaning changes.

The five-name CLI list avoids importing the Native admission graph into the
runtime client. Its owning test compares the actual admitted register pins.
Historical selector recognition remains available for saved custody. Fixture
setup uses exact register definitions rather than a second selector catalog.

## Evidence

The 17 preparation receipts bind their recorded working sources through argv,
exit, wall time and patch/file hashes where available. Base `6499a12b` alone
does not identify dirty bytes. Earlier outputs do not validate the final source.
Final v4-selected binds 25 prepared paths; the seal follow-up adds the 26th.
`gate-source-checkpoint.json` binds all 26. `rebase.json` proves those bytes
unchanged onto Main `59a19054c617886ed2c894288390d7db3e320c07`.

The initial control exited 2 before tests with a duplicated config path and
remains inconclusive. v2/v3 distinguished the guard on their recorded whole-file
sources. v4-selected passed one healthy case, then failed it by assertion after
guard bypass. Its wrapper exited 0 and restored exact source. Deliberate failures
are separate from candidate passes. v3 finished before the selected-case instruction.

Focused Native delivery passed 32 cases in six files with unchanged inputs:
60.147339042 seconds wall, 75.054897000 child CPU.
The output includes expected SQLite constraint diagnostics from injected
retention faults; its terminal reports 32 passed. The TEST custody helper
supplies no receipt; each caller establishes delivery.
The actual sourceSeal probe compared old/new CLI/MCP values. Node inventory
passed four cases with unchanged route/method/gate parser and table. This is
structural evidence, not Native authority. Page-assets equality passed one case
without a bundle build.

Evidence is sealed read-only at `/Users/hughpyle/play/artroom-evidence/2026-10-27-br7-current-names`. Existing Native, seal and assets
subdirectories retain bytes/modes without rewrite or chmod. The 20-file seal
copy matches its unchanged original, named in `seal-copy-provenance.json`.
The manifest includes all nested indices. No dependency was installed.

The ordinary gate naturally passed at `10e89e18ed98da667b362d8ea182279b6050040d`, tree `7f13a3a120958ece38e6128811e5d58b9b6ad4a9`, with clean
source before and after and no driver signal. It ran from
`2026-10-27T13:04:50.709810Z` to `2026-10-27T13:24:28.355776Z`.
Wall time was 1177.553647792 seconds. Child CPU was
2414.913284000 seconds (2188.321473000 user,
226.591811000 system). Machine:
`{"architecture": "arm64", "cpus": 18, "release": "27.2.0", "system": "Darwin"}`, Node `v26.12.1`.
Load averages before/after: `[1.32470703125, 2.212890625, 2.64453125]` /
`[2.07666015625, 3.08642578125, 3.15576171875]`. These are local command observations,
not whole-edit latency or a controlled benchmark.

Actual gate totals reconcile to final identities and stdout: node: 66 passed; counting: 55 passed; plain: 2,864 passed, 1 skipped cases, 281 passed files; native: 796 passed, 2 skipped cases, 233 passed, 1 skipped files.
Both Vitest terminals had zero unhandled errors. Owning files passed: Node
(4 passed), CLI (10 cases in two files), Native
(32 cases in six files). Focused runs/control totals stay separate. Missing observations:
plain: 0 without ready and 0 without result callbacks; 0 duplicate ready and 0 duplicate result identities; native: 15 without ready and 37 without result callbacks; 1 duplicate ready and 0 duplicate result identities. Missing callbacks establish no cause, readiness or
missing duration. Concurrent case-duration sums are not wall time or CPU.

The analyzer receipt binds actual argv/exit/timing and stream/source/output
digests. Only this note and manifest follow the gate. All other tracked
blobs/modes, including other notes, match; `gate-source-equality.json` lists
their count/hashes. Publication binds the final head/tree separately. The root
index excludes itself; the manifest includes it and all raw files. Table paths
are relative to the raw directory.

| Check | Command | Exit | Output and SHA-256 |
| --- | --- | --- | --- |
| cli-admission-control-v2 (wrapper) | `Exact argv/cwd in cli-admission-control-v2.json` | 0 | `cli-admission-control-v2.log`: `36703aa21bc6aa2467cc5d984ea31c6a6d6385d31d7f95155ad220ebd17a9f90` |
| cli-admission-control-v3 (wrapper) | `Exact argv/cwd in cli-admission-control-v3.json` | 0 | `cli-admission-control-v3.log`: `2464bb262b2cf97357b9e7854e68c08af595402af0d7b9457b66dc8a35d80016` |
| cli-admission-control-v4-selected (wrapper) | `Exact argv/cwd in cli-admission-control-v4-selected.json` | 0 | `cli-admission-control-v4-selected.log`: `63f52ec59417e01e2b2b71be5bdce2a5d145f188a6070476255940de1cda9b46` |
| cli-admission-control (inconclusive) | `Exact argv/cwd in cli-admission-control.json` | 2 | `cli-admission-control.log`: `27d2385a48f876d1b50762a6be4fb07344ef571f50b696efbb89f3d6b1d99a5a` |
| cli-focused-v1 | `Exact argv/cwd in cli-focused-v1.json` | 0 | `cli-focused-v1.log`: `dad0698101cc43b9e63b85b64e45cd5613b8cf222aab14c8a6071282fd8a0dcf` |
| cli-focused-v2 | `Exact argv/cwd in cli-focused-v2.json` | 0 | `cli-focused-v2.log`: `53f11b5a951c3d8e6a40990bebecf9d49c24d799d096ea01ddc5f4f044e7d276` |
| cli-native-types-v1 | `Exact argv/cwd in cli-native-types-v1.json` | 0 | `cli-native-types-v1.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| cli-types-v1 | `Exact argv/cwd in cli-types-v1.json` | 0 | `cli-types-v1.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| cli-types-v2 | `Exact argv/cwd in cli-types-v2.json` | 0 | `cli-types-v2.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| diff-check-v1 | `Exact argv/cwd in diff-check-v1.json` | 0 | `diff-check-v1.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| doc-links-v1 | `Exact argv/cwd in doc-links-v1.json` | 0 | `doc-links-v1.log`: `d32eaa916626747fdc1c632131b58a6e719335f9eb304291180692016a1b1dc5` |
| doc-links-v2 | `Exact argv/cwd in doc-links-v2.json` | 0 | `doc-links-v2.log`: `d32eaa916626747fdc1c632131b58a6e719335f9eb304291180692016a1b1dc5` |
| lanes-native-types-v1 | `Exact argv/cwd in lanes-native-types-v1.json` | 0 | `lanes-native-types-v1.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| mcp-inventory-regenerate | `Exact argv/cwd in mcp-inventory-regenerate.json` | 0 | `mcp-inventory-regenerate.log`: `e7a313a2b45db8b4635f3ff3c421fb1fdc312ef698bcf09c89769975d11543b6` |
| scope-types-v1 | `Exact argv/cwd in scope-types-v1.json` | 0 | `scope-types-v1.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| section-citations-v1 | `Exact argv/cwd in section-citations-v1.json` | 0 | `section-citations-v1.log`: `12036d8cf9e6ddecaedfcc3b3198207686173c08a642666dcd116adf304610dd` |
| section-citations-v2 | `Exact argv/cwd in section-citations-v2.json` | 0 | `section-citations-v2.log`: `4b1f6307d3a160f54e2a74273408573837a265f79c62bdeb5cdafa88a08463c4` |
| Focused Native: six files, 32 passed | `Exact argv in native-focused-v1/result.json` | 0 | `native-focused-v1/output.log`: `5a6cf2978fcf2d95f2e1d0292e5ac9cf39466d5a225beb216d382a867aa48b25` |
| Actual sourceSeal values and unchanged route table | `Exact argv in seal-followup/probe-result.json` | 0 | `seal-followup/probe-output.json`: `2c4e94fa1d6acffc6da7ddabfd6470eea312b00dea99f58168bcbedea4b10ca0` |
| Security inventory: four passed | `node --test scripts/security-entry-points.test.mjs` | 0 | `seal-followup/owning.log`: `c38e0f4b3a53f65df00df289828b7953ec5c5159aba9b16e04d08bb212cb0e13` |
| Page assets: one passed | `Exact argv in page-assets-equality-v1/result.json` | 0 | `page-assets-equality-v1/output.log`: `df073c78635a368822937a8dbbedac2c28508ade95fc7602430b85ccfabe1a2f` |
| Native compatibility preparation | `Exact argv in native-focused-v1/compatibility.json` | 0 | `native-focused-v1/compatibility.log`: `e94d6d731f000d3c6d3606b2693c71a618dd1e42516767e7051c6a114f3b4e7c` |
| Rebase: all 26 task paths preserved | `Per-path comparison recorded in rebase.json` | 0 | `rebase.json`: `37038878ad32e8d3f5f22de285fd338292a0cfb1fad0f812cad030e70fe0092f` |
| Sealed follow-up copy: 20 exact files | `Original/copied file size/hash comparison` | 0 | `seal-copy-provenance.json`: `dbe864f34b727d2bb29279d4d775d91a340d61ab42791d6ca043403fffb33e64` |
| Ordinary combined-source gate | `npm run gate` | 0 | `ordinary-gate/output.log`: `f6cef8607be61e2a4428d58eab0fe6a94ac043f2d7a123fa52c1668dbb55f86e` |
| Actual gate reconciliation subprocess | `Analyzer argv/cwd in analysis-run.json` | 0 | `analysis-run.json`: `bc05ede072f89658877a3c3faeb3b2d3f8430e8bccad7d7b5aa6cc552a876ada` |
| All other tracked blobs/modes equal gate | `Git diff, one tree inventory and direct blob hashing` | 0 | `gate-source-equality.json`: `4003234c95f44f03067504b0e85f03ce571445805f213ae9b887f98eccc367d5` |

## Open limits

The planner owns creation-policy decisions for ordinary application packages.
BR7 adds no admitted family or platform version. This change supplies no live
query, deployment, archive action or authority-policy change. Archive parent
`0f0eeab7` preempts this work when capture evidence is ready. Exact-head review
and landing remain due under this request and ruling `7a2be78b`.
