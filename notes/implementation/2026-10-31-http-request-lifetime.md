# Keep a stream opening's Request until its abort check

Status: source implementation. The gate passed at `731bbfd8`. Checker review and landing are owed.

Request `2fd85d189012944771ed490d69846b6de665bfb4` and promise `a001b0fe0acbc9f8a96eeeb4563e05b427a36710` own this head. Report `5901440f84e109b42a342cae8abafb0369bd24e4` gave the diagnosis to the planner.

## What changed

`McpHttp.handle` passed only `request.signal` to `#stream` in `packages/mcp/src/http.ts`. `#stream` now takes the `Request` and reads `request.signal.aborted` at its existing check, after the snapshot read. The check, its `204` answer and every other path stay the same.

`packages/mcp/test/http.test.ts` gains one case. It drops the caller's reference to the `Request`, forces a collection during the held snapshot, aborts the source signal and requires `204` with the live stream still attached. The diff adds 41 lines and removes none, so the nine original cases, their assertions and their deadlines are unchanged.

`scripts/security-entry-points.test.mjs` adopts the new seal of `http.ts`. The change adds no route or method and changes no gate class, so the inventory rows stay as they were.

## Why the defect is in production code

The whole HTTP owner failed with `B stays counted once: expected [ 3, false ] to deeply equal [ 4, true ]`. The working hypothesis was a test race: a fixed 100 ms sleep might end before the server saw the abort. A trace of a failing run falsifies that hypothesis.

```text
…759 CLIENT-ABORT R2
…760 res-close#193 gone=true
…861 RELEASE 2
…868 check signal.aborted=false installs=true
…868 res-close#192 gone=true
```

The server's own controller aborted 1 ms after the client did. The check read `false` 108 ms later, installed a stream for the departed client and closed B, the session's live stream.

Node's `Request` links its source signal through a `WeakRef` to an internal controller, and only the `Request` holds that controller strongly. In plain Node, the signal of a collected `Request` followed the abort in 0 of 20 trials. With the `Request` kept, it followed in 20 of 20.

The second reported failure, the H8 initial stream marker, follows from the first. The first case fails before its cleanup, and its streams keep the slots.

## Why the fixture proposal was dropped

Fixture-only proposal V2 replaced the sleeps with observed events. Its observer stored a closure over each `Request`, so it kept every `Request` alive. The owner could then pass with the defect still in place. V2 never ran. Request `504c3d88` forbade a production change, so this head has its own request, and promise `f49277c8` is retired.

The original fixed sleeps stay. They were long enough in the failing trace, and removing them would change the original cases.

## Who is exposed

The exposure needs a legacy MCP `GET` stream that is replaced while its client leaves, on the Node server `serveHttp`. The result is a lost live stream. No authority or stored data is involved.

On workerd, `new Request(url, {signal}).signal` is the same object as the source signal, by one probe. A constructed `Request` there has no intermediate link to cut. A search of J4's public setup packet and observer finds no MCP route or stream header, so this head needs no deployment before J4 closes.

## Evidence

The checkpoint is `731bbfd8cd62e0b6201d90fe91e1836132033e63`, tree `c9e1acb033305c6b5e8a93e1bb004c82dbcb9b00`. The reviewed head adds only this note and its manifest. Per [the follow-up rule](../../docs/testing.md#follow-up-after-a-gate), the gate does not run again for that documentation tail. Digests name files in the manifest's directory.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate at the checkpoint: 3203 plain and 889 native tests passed, 1006.88 s elapsed in one observed run | `npm run gate` | 0 | `ed94a54540f570ea37f4aa04d59f00eb2d0a0ad8ac4a75853cb407b6b01954be` |
| Earlier gate at `a8034631`, failed only on the `http.ts` seal | `npm run gate` | 1 | `15c74f5bdb0e743719595da9bbc4193f65cf2162ce8463932a101162273082c1` |
| Named red: the witness with `http.ts` restored from `b1069bf1` fails with `expected 200 to be 204` | `vitest run --project mcp packages/mcp/test/http.test.ts`, under `ulimit -n 256` | 1 | `b68bf508bc3529e54233810bfcaabb19402170758e573fe799a795da13f3ed15` |
| Whole owner with the fix, 10 of 10 tests, at `a8034631` | same | 0 | `21e9f93ab6c95ceae08ea8700ff342fa3426338193b128dee67f792a095f4319` |
| Failure rate, unchanged owner: 5 of 24 runs failed. With the fix: 0 of 24. Counts from one shell loop per series, with no per-run logs | same, in `diagnosis/RUNS.md` | n/a | `fc63e45ab08ad52e8a0da7582cf19e2659160a7a50e1098a15d442c07f88276b` |
| Trace of a failing unchanged owner | temporary logging, in `diagnosis/RUNS.md` | 1 | `ea5f69bc43fcea403d0d43c5c3a0126b512282da965ab1681ab0379ed3f66c68` |
| Plain Node trial of a collected `Request` | `node --expose-gc diagnosis/gc-signal.mjs` | 0 | `677b0d63f7687f71e485cfffaa8de71e640a4656265b540f974837727e17f7b7` |
| Workerd probe | temporary test in the `scope` project, in `workerd-probe.md` | 0 | `d95700532f0ddb62b3c10ab3f37e96b861490985a7d03502920eabf385190218` |

Other series in `diagnosis/RUNS.md` passed and show what does not produce the failure: 6 of 6 at a load average up to 47, and 18 of 18 without the JSON reporter and descriptor limit.

## Open limits

- No GC trace covers the failing server path. Collection there is inferred from the plain Node trial, the witness and the fix. Request `2fd85d18` owns this statement of the limit.
- `node.ts` also names the `Request` in the frame that awaits `http.handle`. Why that frame does not always keep it alive is unproven. Dropping a dead variable in optimized code is an untested explanation. Request `2fd85d18` owns this statement of the limit.
- The reproducing command sets a 256 descriptor limit and the JSON reporter. The series does not separate those two. Request `2fd85d18` owns this statement of the limit.
- An incoming request's signal on workerd is untested, and no Worker config sets `enable_request_signal`. The hosted path may never see a client's abort. The planner owns that question through its survey `6458b3fd`, answered in `0a472f43`.
- `packages/checkers/src/container-origin.ts` keeps `request.signal` in `AsyncLocalStorage` while it forwards the `Request`. Nobody has checked whether that `Request` stays reachable for the whole forward. Request `fb3f71f509917b78780b4b47d5c91ed95580ef00` owns that check.
