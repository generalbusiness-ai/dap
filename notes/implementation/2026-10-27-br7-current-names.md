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

The existing security inventory also seals both changed CLI and MCP owners.
Their previous parser values were reproduced, the actual new values were
derived from the maintained parser, and only those two expectations changed.
The route and gate-class table stays unchanged. These hashes check structural
drift; Native delivery remains covered by the focused Native run. The sealed
follow-up was copied byte-for-byte into this collection; provenance names
the unchanged original directory. The existing page assets equality test
passed without rebuilding the bundle.

## Evidence

Focused validation is complete: the affected plain checks and all 32 Native
cases across six files passed. The one ordinary gate remains due. The source preparation base is
`6499a12bb16317d9bc614e5f5e905fb4d662cc87`, tree
`688c65618473c98443a204ee974b3fa1dcd02b20`. Each command's result records the
working patch or file hashes where available; the base tree alone does not
identify dirty tested bytes. `prep-summary.json` identifies the final prepared
25 paths; source-seal maintenance is recorded separately. No dependency was installed.

Before the first gate, the work was rebased onto Main `59a19054`. All 26 task
source, test and guide paths kept their tested bytes; `rebase.json` records
the comparison and the five R14 base paths. The gate includes that new base.

The first control attempt exited 2 before tests because its relative config
path was duplicated. It is inconclusive. Corrected whole-file controls on
their recorded source states distinguished the guard. The final selected-case
control passed one healthy case, then produced one assertion failure with
the new guard bypassed; its wrapper exited 0 and restored the exact source.
These deliberate failures are separate from passing candidate results. The
v3 whole-file control finished just before the instruction to select only
the fresh-selection case; both observations remain retained.

Raw evidence is open at
`/Users/hughpyle/play/artroom-evidence/2026-10-27-br7-current-names`.
The table currently records preparation checks. The first 17 outputs use
`<check>.log`; later rows use their named subdirectories. The gate result and sealed index will be added before review.

| Check | Command | Exit | Output SHA-256 |
| --- | --- | ---: | --- |
| cli-admission-control-v2 | Exact argv in `cli-admission-control-v2.json` | 0 | `36703aa21bc6aa2467cc5d984ea31c6a6d6385d31d7f95155ad220ebd17a9f90` |
| cli-admission-control-v3 | Exact argv in `cli-admission-control-v3.json` | 0 | `2464bb262b2cf97357b9e7854e68c08af595402af0d7b9457b66dc8a35d80016` |
| cli-admission-control-v4-selected | Exact argv in `cli-admission-control-v4-selected.json` | 0 | `63f52ec59417e01e2b2b71be5bdce2a5d145f188a6070476255940de1cda9b46` |
| cli-admission-control | Exact argv in `cli-admission-control.json` | 2 | `27d2385a48f876d1b50762a6be4fb07344ef571f50b696efbb89f3d6b1d99a5a` |
| cli-focused-v1 | Exact argv in `cli-focused-v1.json` | 0 | `dad0698101cc43b9e63b85b64e45cd5613b8cf222aab14c8a6071282fd8a0dcf` |
| cli-focused-v2 | Exact argv in `cli-focused-v2.json` | 0 | `53f11b5a951c3d8e6a40990bebecf9d49c24d799d096ea01ddc5f4f044e7d276` |
| cli-native-types-v1 | Exact argv in `cli-native-types-v1.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| cli-types-v1 | Exact argv in `cli-types-v1.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| cli-types-v2 | Exact argv in `cli-types-v2.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| diff-check-v1 | Exact argv in `diff-check-v1.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| doc-links-v1 | Exact argv in `doc-links-v1.json` | 0 | `d32eaa916626747fdc1c632131b58a6e719335f9eb304291180692016a1b1dc5` |
| doc-links-v2 | Exact argv in `doc-links-v2.json` | 0 | `d32eaa916626747fdc1c632131b58a6e719335f9eb304291180692016a1b1dc5` |
| lanes-native-types-v1 | Exact argv in `lanes-native-types-v1.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| mcp-inventory-regenerate | Exact argv in `mcp-inventory-regenerate.json` | 0 | `e7a313a2b45db8b4635f3ff3c421fb1fdc312ef698bcf09c89769975d11543b6` |
| scope-types-v1 | Exact argv in `scope-types-v1.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| section-citations-v1 | Exact argv in `section-citations-v1.json` | 0 | `12036d8cf9e6ddecaedfcc3b3198207686173c08a642666dcd116adf304610dd` |
| section-citations-v2 | Exact argv in `section-citations-v2.json` | 0 | `4b1f6307d3a160f54e2a74273408573837a265f79c62bdeb5cdafa88a08463c4` |
| Focused Native: six files, 32 passed | Exact argv in `native-focused-v1/result.json` | 0 | `5a6cf2978fcf2d95f2e1d0292e5ac9cf39466d5a225beb216d382a867aa48b25` |
| Security source values | Exact argv in `seal-followup/probe-result.json` | 0 | `2c4e94fa1d6acffc6da7ddabfd6470eea312b00dea99f58168bcbedea4b10ca0` |
| Security inventory: four passed | `node --test scripts/security-entry-points.test.mjs` | 0 | `c38e0f4b3a53f65df00df289828b7953ec5c5159aba9b16e04d08bb212cb0e13` |
| Page assets: one passed | Exact argv in `page-assets-equality-v1/result.json` | 0 | `df073c78635a368822937a8dbbedac2c28508ade95fc7602430b85ccfabe1a2f` |

## Open limits

The planner owns creation-policy decisions for ordinary application packages.
BR7 adds no admitted family or platform version. Archive parent `0f0eeab7`
preempts this work when new capture evidence is ready. The gate, exact-head review and landing
remain due under this request.
