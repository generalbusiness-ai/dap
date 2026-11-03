# The receive-pack parser rejects a second terminal flush

## What the probe establishes

Request `6ce82b92`, under promise `7035c1a1`, asks where the Mac mini loses Git receive-pack replies. One isolated reproduction identifies a recognition failure in `SmartHttpGit.send`. The fetch and body reader deliver the complete observed reply. The parser then rejects its fourth packet record.

The reply contains `unpack ok`, an `ok` status for the exact scratch ref, and two terminal flush packets. Its 76 bytes have SHA-256 `e9e7e6ef6849f55a06a8dd01dd0b8b2240ac2c63e7f6ce881891eed2f54d60ed`. The first two packets occupy 14 and 54 bytes. The flushes start at offsets 68 and 72. Raw provider bytes remain private.

`packages/git/src/http.ts` parses all four records, then requires exactly three: unpack status, one command status, and one flush. That length check returns an unknown `PushAnswer`. `sendOnce` therefore returns `null` before its read-back callback runs. The code preserves the distinction between an applied ref and an accepted own reply.

The original G3 logs contain no wire reply. This reproduction establishes a concrete failure under the same binary and source. It does not prove that the original unknown stage received identical bytes. The original outcome and G3 acceptance remain open.

## Inputs and the one write

The planner staged the probe in `0be664e9`, following setup request `f544751c`. The mini runs celld 0.6.3, SHA-256 `76a95349d7eab84faf842fcbf41be5112e7cd7c9b721ed99ddfea7b2d057e121`. The scratch server uses its own project and state at `/Users/inguz/dap-receive-pack-diagnosis-20261102`, listening on loopback port 29876. The planner started the server without changing the installed G3 fleet.

The probe imports fixed G3 source `afdd8ee5` and calls the production `sendOnce` and `SmartHttpGit`. Before staging, it verifies both owner files against the mini. Their hashes are `df0c0737b69c76f4dcc3fa86f147d0ece3a2684875d93b4210f39e2c31c33b43` for `github-host.ts` and `18bb115bb6054c4e5da362632b94cee71158f3d46bcf27f636fd13c295a7e539` for `http.ts`.

The observer wraps the same response reader. It does not drain, clone, tee, or replace the stream. It records status, selected headers, chunk sizes, completion, and at most 65,536 private reply bytes. It captures no Authorization header. A SQLite insertion marks the sole attempt before any send. The only allowed write creates `refs/heads/builder-receive-pack-probe-20261102` in repository ID `1442980126`, using fixed parentless commit `2f3725810d10bafc51826906726a9f2acdd1cc45` and the empty tree.

The planner supplies a one-repository installation token with contents write and metadata read, expiring at `2026-11-03T04:30:59Z`. The builder neither reads that token file nor accesses the App key. The probe never calls a Native witness-room scope. Its direct production transport call exercises the same celld global fetch, but does not reproduce Native capability delivery or publication state transitions.

The preflight finds the ref absent and `report-status` advertised. At `2026-11-03T03:33:21.005Z`, the one send begins. It returns in 1,392 ms with a null answer. The POST response has status 200, the expected URL and media type, no redirect, all 76 captured bytes, and end of stream. Neither the one-MiB allowance nor the 30-second request bound decides this outcome.

A later `GET /result` returns the same retained result and raw-output hash. An independent GitHub API read finds the scratch ref at the expected commit. Repository main remains `dee19e0bb7ad1b99ab1e29ee72e3c9d439e916d6`. No second POST occurs.

## Replay and the possible fix

An offline replay sends the exact captured reply through unchanged production code. Its HTTP and read-back functions are explicit stand-ins. The captured two-flush reply returns null without read-back. Removing only the last four bytes produces an accepted result after the scripted exact read-back. Missing flush, third flush, and wrong-ref replies remain unknown in the unchanged parser. The replay makes no network request or provider write.

The [Git report-status grammar](https://git-scm.com/docs/gitprotocol-pack#_report_status) ends with one flush after unpack and command status. The observed provider adds another terminal flush. The documentation does not justify accepting arbitrary repeated flushes or trailing data. The [smart HTTP protocol](https://git-scm.com/docs/gitprotocol-http#_smart_service_git_receive_pack) specifies the media type observed here.

No celld setting is needed to deliver this captured reply: the complete body already arrives. A possible dap repair would recognize the provider's one extra terminal flush while preserving complete bounded parsing, the exact own-ref status, refusal on extra status or data, and the existing read-back requirement. That compatibility rule needs a separate reviewed head with boundary witnesses. This record changes no production parser or publication definition.

The [official celld 0.6.3 source](https://github.com/denoland/celld/tree/v0.6.3), commit `8702f6d186c77698dbfb30cf29e3b1922a88f008`, routes direct fetch through a registered response stream. A generic cross-isolate RPC fault does not establish this failure. The live byte capture and offline replay identify the deciding step here.

## Evidence and limits

The retained runtime and deployment logs cover eight named files and 89,842,535 bytes. Their 448,535 lines contain no receive-pack, stream, HTTP request or response, RPC, or exception marker. An earlier header timeout precedes the original merge producer and does not identify its cause.

The scripted probe check verifies byte pass-through and the one-attempt control flow using HTTP, storage, and Durable Object stand-ins. It proves no Native durability, crash recovery, or provider behavior. A first local bundle invocation used an unsuitable neutral-platform build configuration; the corrected browser-platform bundle passes without an install or source change.

After the one attempt, the builder sends SIGTERM once to planner-named listener PID 67482. The first five-second wait fails to observe its exit. A later read confirms both launcher PID 67479 and listener PID 67482 absent, with no listener on port 29876. No second signal or POST follows. The project and private logs remain in place.

The first seal refuses an empty local attempt marker at mode 0644. The builder changes only that marker to mode 0600 and retains the refusal. The completed [diagnosis manifest](evidence/2026-11-02-g3-receive-pack-diagnosis.manifest.json) seals 32 public files and indexes 25 private files. Its SHA-256 is `6681c32cd2a41dd684f0ebafc68ac8551f35a345e482630bfd92db96c7a46ac1`. Its SHA256SUMS digest is `f44a701975d57a124dcbdfd87e03a0996b639e154861b4b5b3f5b2817916dfdb`.

| Check | Command or boundary | Exit | Record SHA-256 |
|---|---|---:|---|
| Retained logs | Eight exact SSH file reads | 0 | `7fe2c3882694fa23e2e0cea3fc4cfac9dd9b0f74228b0d39114568d53e7b66a5` |
| Probe staging | Exact source and binary checks; no write | 0 | `3f123168a15b9c407a35c16066ff81dc0ae7eecc081f31a775b2d9d45ddfc96f` |
| Scripted observer check | `node check-scripted-probe.mjs` with explicit stand-ins | 0 | `206564ac99fbaf2703f730d26a43c0f3a44f1ce613770720d26fd48ade2f0f50` |
| Read-only preflight | `GET /preflight` | 0 | `5cd320da25cfc972a9b6351cc853ff418405708b781c542bb1c407393b886d2e` |
| Single live attempt | One `POST /run`; null own answer | 0 | `6ee9f461e039d97ade796841952a81604d73eaa7868d475005477535e37d6187` |
| Retained result | `GET /result`; same raw-output digest | 0 | `51be3417931f3d066956b27f50ea6779f9349a8f2c0172acef2469e493ce6d8a` |
| Reply replay | `node replay-reply.mjs`; unchanged production code | 0 | `d4169f9e56b4882ce525cf47b12e4b1748f91e28b1192ceefe6a1ea961c3dcc3` |
| Independent refs | Two `gh api` reads | 0 | `4637954239a928aa1869dbeba0c2727bed4243080f875d64fe1af806f52c8889` |
| Shutdown | First wait fails; later PID and listener checks pass | 1 then 0 | `3a521ca04f368fb1aa94052909a2236ba81708bd65f276d70776af6d1fde21c7` |
| Initial seal refusal | Empty marker mode; no seal created | 1 | `d0e5e63dffda291a0abecd60eb1795fc2ebc3dcfd0a2cb751949936c2a1fda3a` |
| Documentation-only source proof | Compare O1 gated source with main | 0 | `c4891b2a8a9317ad87d0794b833d753305df14c57dbe416efcc65c0ed67ed163` |

This record starts at landed main `ec48e2d526aa27c3746e7455c3eda6f8a3c87da4` and adds only this note and its manifest. Source, tests, configuration, and dependencies match O1's passing gate at `1ca60fee5d8bebc2876ae1cb184061466ca28540`, tree `55bb1505488601f629d9fce3a540b1ba84010297`. Its actual `gate.exit` says `exit 0`. The [existing gate manifest](evidence/2026-11-02-oauth-resource-gate.manifest.json) retains that run. The [documentation follow-up rule](../../docs/testing.md#follow-up-after-a-gate) calls for no new gate for this record. The review names the final tree and checks that equality.

The G3 witness room stays unchanged under `90f79edf`. This diagnosis settles neither its unknown stage nor G3 acceptance. A fix, a planner deployment, and any fresh witness use separate work.
