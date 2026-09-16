# O-H2 append-work comparison

The repaired source `773a38ec8367d0b563f7741d1ff902aceb72350c` removes the reviewed aggregate's repeated whole-prefix signature verification in this ordinary-offer workload. Both fixed `/1` and moving `/3` profiles require exactly two signature verifications per append at 100, 400 and 1000 entries, matching accepted O1. All measured offers append once and are effective; no authentication or admission bypass is used.

This evidence is under O3 request `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:5ac2d896497117bc9cae0ca5c8e9d6375d092de3`, promise `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:868177936c44cd7a6c520bf1de293a4b9c414d04`, ratified review `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:5643a940fde2c3c372d48ae89ee34e8e35593cf3`. It is observational performance evidence, not formal review approval or a model campaign.

| Source / profile | Storage | 100 entries ms/append | 400 | 1000 | Verifications per append (100 / 400 / 1000) |
|---|---|---:|---:|---:|---|
| o1-fixed `aaa447d9` | memory | 0.449 | 0.559 | 0.793 | 2 / 2 / 2 |
| o1-fixed `aaa447d9` | sqlite | 1.338 | 2.775 | 6.124 | 2 / 2 / 2 |
| reviewed-fixed `1ba67c39` | memory | 29.516 | 138.964 | 285.541 | 222 / 822 / 2022 |
| reviewed-fixed `1ba67c39` | sqlite | 33.909 | 113.697 | 286.276 | 222 / 822 / 2022 |
| repaired-fixed `773a38ec` | memory | 0.430 | 0.545 | 0.721 | 2 / 2 / 2 |
| repaired-fixed `773a38ec` | sqlite | 1.314 | 2.534 | 5.800 | 2 / 2 / 2 |
| repaired-moving `773a38ec` | memory | 0.439 | 0.546 | 0.780 | 2 / 2 / 2 |
| repaired-moving `773a38ec` | sqlite | 1.326 | 2.493 | 5.950 | 2 / 2 / 2 |

o1-fixed: 2026-09-16T18:49:21.922Z to 2026-09-16T18:49:26.866Z, harness `5702225f7b024f62d68ff6abb08f860efa93964b4a90109a91be7995ad8cea59`

reviewed-fixed: 2026-09-16T18:49:35.782Z to 2026-09-16T18:54:58.733Z, harness `5702225f7b024f62d68ff6abb08f860efa93964b4a90109a91be7995ad8cea59`

repaired-fixed: 2026-09-16T18:56:41.208Z to 2026-09-16T18:56:45.937Z, harness `5702225f7b024f62d68ff6abb08f860efa93964b4a90109a91be7995ad8cea59`

repaired-moving: 2026-09-16T18:58:12.662Z to 2026-09-16T18:58:17.362Z, harness `5702225f7b024f62d68ff6abb08f860efa93964b4a90109a91be7995ad8cea59`


## Deterministic work and remaining cost

Each table cell measures 20 ordinary offers after filling the same journal to the stated entry count. With `n` committed entries immediately before an individual append, accepted O1 and both repaired profiles make two `verify`, two `sign` and two `entries()` calls; `entries()` returns `2n + 2` logical rows across those calls. The reviewed aggregate makes `2n + 3` verifications, two signatures and four `entries()` calls returning `4n + 3` rows. The 20-operation averages therefore produce 222/822/2022 verifications and 441/1641/4041 rows in the reviewed aggregate, versus 2 verifications and 221/821/2021 rows in accepted O1 and repaired profiles.

The repair restores bounded signature work for ordinary append, including moving-profile admission. Existing fold/row-copy work still grows with journal length; the result does not claim constant total append cost, bounded reopen verification, or timing guarantees for control operations. The moving profile run uses the same ordinary offers, not seal/assign handovers. Separate runtime correctness tests cover handovers, stale handles, concurrency and failure handling; this benchmark does not substitute for them.

## Timing conditions

Node v26.8.2, Darwin 27.0.0 arm64, Apple M5 Max, 18 logical CPUs, 64 GiB memory. Each source/profile was run once, sequentially, in an isolated `git archive` directory. The host was shared and had unrelated work; repaired runs had lower load. Treat elapsed times as representative, not a statistical speedup claim. Exact CPU time, wall time, UTC timestamps and all load averages are in the raw JSON. The work counters are the stronger evidence of eliminated prefix verification.

- o1-fixed: one-minute load 8.86–9.20; profile `dap.fixture.single-writer/1`.
- reviewed-fixed: one-minute load 5.27–12.60; profile `dap.fixture.single-writer/1`.
- repaired-fixed: one-minute load 3.49–3.61; profile `dap.fixture.single-writer/1`.
- repaired-moving: one-minute load 2.61–2.80; profile `dap.fixture.single-writer/3`.

## Exact commands and identities

Each command ran once. `sources.json` records all full source commits and SHA-256 hashes of selected runtime/fixture inputs. The frozen harness SHA-256 is `5702225f7b024f62d68ff6abb08f860efa93964b4a90109a91be7995ad8cea59`.

```sh
node /tmp/dap-o-h2-evidence.f7dfyn0r/append-work.mjs /tmp/dap-o-h2-evidence.f7dfyn0r/o1/spike /tmp/dap-o-h2-evidence.f7dfyn0r/o1-fixed fixed > /tmp/dap-o-h2-evidence.f7dfyn0r/o1-fixed.log 2>&1
node /tmp/dap-o-h2-evidence.f7dfyn0r/append-work.mjs /tmp/dap-o-h2-evidence.f7dfyn0r/reviewed/spike /tmp/dap-o-h2-evidence.f7dfyn0r/reviewed-fixed fixed > /tmp/dap-o-h2-evidence.f7dfyn0r/reviewed-fixed.log 2>&1
node /tmp/dap-o-h2-evidence.f7dfyn0r/append-work.mjs /tmp/dap-o-h2-evidence.f7dfyn0r/repaired/spike /tmp/dap-o-h2-evidence.f7dfyn0r/repaired-fixed fixed > /tmp/dap-o-h2-evidence.f7dfyn0r/repaired-fixed.log 2>&1
node /tmp/dap-o-h2-evidence.f7dfyn0r/append-work.mjs /tmp/dap-o-h2-evidence.f7dfyn0r/repaired/spike /tmp/dap-o-h2-evidence.f7dfyn0r/repaired-moving moving > /tmp/dap-o-h2-evidence.f7dfyn0r/repaired-moving.log 2>&1
```

`append-work.mjs`, `reviewer-rollback-bench.mjs`, `README.md`, `sources.json`, the four logs and the four `result.json` files form the retained evidence set. Source archives and SQLite output databases remain in the local evidence directory, but are unnecessary in a committed ledger because the exact Git commits are recorded. No repository source or shared integration worktree was changed by this task.
