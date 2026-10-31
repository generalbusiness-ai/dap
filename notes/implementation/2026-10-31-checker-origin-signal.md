# Check that a checker origin forward keeps the source's abort

Status: source implementation. The gate passed at `15758339`.

Request `fb3f71f509917b78780b4b47d5c91ed95580ef00` and promise `48541f48af8898e3f9cdcb5d4f4bb5a26bd1d914` own this head.

## What changed

`packages/checkers/test/container-origin.test.ts` gains one case, and no source changes. The case gives `gatewayOrigin` a `Request`, keeps no reference to it, forces a collection while the upstream call waits, aborts the source and requires the upstream signal to follow. The fixture keeps the rebuilt upstream `Request` alive, as a real `fetch` does.

The witness passes, so this head repairs nothing. `forward` passes the `Request` to `Gateway.forward`, and that call keeps it reachable until the call returns.

## Decisions

Request `2fd85d18` showed that on Node a `Request`'s signal follows its source only while the `Request` is reachable. The risk here was `container-origin.ts`, which stores `request.signal` in `AsyncLocalStorage`. The store alone would not keep the `Request` alive, so the witness tests the whole boundary rather than the store.

The witness keeps the existing code, because the request says to repair only if the witness fails.

## Evidence

The checkpoint is `1575833944c993eb159a850206d8544031bb69a2`, tree `f1c1159f1675cb71657429bcfc2b74d5ef9e6b32`. The reviewed head adds only this note and its manifest. Per [the follow-up rule](../../docs/testing.md#follow-up-after-a-gate), source and tests are unchanged, so the gate does not run again. Digests name files in the manifest's directory.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate at the checkpoint: 3206 plain and 890 native tests passed. The test step took 1410.6 s in one observed run, while other work shared the machine | `npm run gate` | 0 | `daaf96f8a0d5a38785eb4c14030d2d0cd54d8f4ad54437647b9a4596b6b6c074` |
| Whole owner at the checkpoint: two of two passed | `vitest run --project checkers packages/checkers/test/container-origin.test.ts` | 0 | `6faefcdc3eb8473a45ba8d6176cbbc61fb147fcc8d1f11a2398df36a592af43c` |
| Control: `forward` hands the gateway `new Request(request)`, so nothing keeps the original reachable. The new case fails with `expected false to be true`, and the older case passes | `scripts/control.mjs` on `container-origin.ts`, whole owner | 0, distinguishes | `fe76fd06cc46d20e89f0f5ca9a2c0ec04bc07627f0ceee4f45b83a7c9205e002` |
| Probe, not in the tree: after `forward` returned a streaming response, the source's abort did not reach the upstream signal in three of three runs. An explicit `body.cancel()` did cancel the upstream stream | `vitest run` on the retained probe test | 0 | `347305e1364ba99bd9aac59e68ba8d1c18082fdb757482a06c168c9ac1075f1d` |
| Callers of `gatewayOrigin` | `grep -rln` over `packages` and `apps` | 0 | `6447569789d726f9ccaff32e2d3d4e878ae747c7b6648e06a73a2032a121c050` |

The witness also passed six of six runs during authoring. Those were counted from one shell loop, and no per-run logs exist.

## Open limits

- After `forward` returns, a collected `Request`'s signal no longer follows the source, as the probe shows. `serveOrigin`, the only server of an origin, does not depend on that signal in this phase. On abort, its `bodyOf` cancels the response body directly, and the older case in this owner witnesses that cancellation. A future caller of `origin.forward` that relies only on the source signal after the response arrives would lose the abort. Request `fb3f71f5` owns this statement of the limit.
- The reachability during the call comes from `Gateway.forward`'s own frame. Nothing in the type says so, and a refactor could change it. This witness would then fail. Request `fb3f71f5` owns this statement of the limit.
- No container, Git host or real `fetch` ran. The credential and the upstream are stand-ins. Request `fb3f71f5` owns this statement of the limit.
