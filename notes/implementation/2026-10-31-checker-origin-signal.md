# Check that a checker origin forward keeps the source's abort

Status: source implementation. The gate passed at `2ccba51a`.

Request `fb3f71f509917b78780b4b47d5c91ed95580ef00` and promise `48541f48af8898e3f9cdcb5d4f4bb5a26bd1d914` own this head.

## What changed

`packages/checkers/test/container-origin.test.ts` gains two cases, and no source changes. Both cases force a collection before the abort.

- During a forward: `gatewayOrigin` receives a `Request` that its caller does not keep. The source's abort must reach the signal of the rebuilt upstream `Request`, which the fixture keeps alive as a real `fetch` does.
- After a forward: a `serveOrigin` client aborts while a read of the upstream body is pending. The upstream stream must see `cancel`.

Both witnesses pass, so this head repairs nothing.

## Decisions

Request `2fd85d18` showed that on Node a `Request`'s signal follows its source only while the `Request` is reachable. The risk here was `container-origin.ts`, which stores `request.signal` in `AsyncLocalStorage`. The store alone does not keep the `Request` alive, so the first witness tests the whole boundary. `forward` passes the `Request` to `Gateway.forward`, and that call keeps it reachable until the call returns.

After the call returns, nothing keeps the `Request` reachable, and the upstream signal stops following the source. The probe shows this in three of three runs. `serveOrigin` does not depend on that signal in this phase, because `bodyOf` listens to the handler's own controller and cancels the body directly. The second witness tests that path.

This head keeps the existing code, because the request says to repair only if a witness fails.

The first filing of this request, head `4f14e0fb` and review request `d15ebeb7`, said that the older case in this file covers the second path. That case aborts before the response arrives, so it does not. Act `a0e0d3e7` withdrew the review before any verdict, and the second witness replaces the claim.

## Evidence

The checkpoint is `2ccba51a63d996b81bc0feeba8c86ad4399681a7`, tree `40f2a1ee08a5084deeb582fef8db7f34cbad0e00`. The reviewed head adds only this note and its manifest. Per [the follow-up rule](../../docs/testing.md#follow-up-after-a-gate), source and tests are unchanged, so the gate does not run again. Digests name files in the manifest's directory.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate at the checkpoint: 3207 plain and 890 native tests passed. The test step took 1136.8 s in one observed run, while other work shared the machine | `npm run gate` | 0 | `8004efe929d58cf0406a3b267cafa0d3c4e54fc1401a3efa7aacafc4e67d14c6` |
| Whole owner at the checkpoint: three of three passed | `vitest run --project checkers packages/checkers/test/container-origin.test.ts` | 0 | `dfe58f8bf40e4427b3ca3486acc46c2cad662d87ae3574e234b11d277817c05b` |
| Control of the first witness: `forward` hands the gateway `new Request(request)`, so nothing keeps the original reachable. The case fails with `expected false to be true` | `scripts/control.mjs` on `container-origin.ts`, whole owner | 0, distinguishes | `b4fca1aa22acf841e13525ae1fe8caba79455a3511305d57117b017784ded77c` |
| Control of the second witness: the `stop` function in `bodyOf` does nothing, so the abort does not end the read. The case fails with `expected 'still reading' to be 'cancelled'` | `scripts/control.mjs` on `container-origin.ts`, whole owner | 0, distinguishes | `58c2b5d665482bbb36f34faabea8279efcf6a69789fba5c11a9f9e166966a3a1` |
| Probe, not in the tree: after `forward` returned a streaming response, the source's abort did not reach the upstream signal in three of three runs. An explicit `body.cancel()` did cancel the upstream stream | `vitest run` on the retained probe test | 0 | `347305e1364ba99bd9aac59e68ba8d1c18082fdb757482a06c168c9ac1075f1d` |
| Callers of `gatewayOrigin` | `grep -rln` over `packages` and `apps` | 0 | `6447569789d726f9ccaff32e2d3d4e878ae747c7b6648e06a73a2032a121c050` |

The second witness waits at most 2 s for the cancel, and the wait ends as soon as the cancel arrives. Only the failing path uses the whole wait. The first witness also passed six of six runs during authoring. One shell loop counted those runs, and no per-run logs exist.

## Open limits

- After `forward` returns, a collected `Request`'s signal no longer follows the source. `serveOrigin` is the only caller of `origin.forward` outside tests, so no request owes a repair today. A later caller that holds a response body must cancel that body itself. Request `fb3f71f5` owns this statement.
- Reachability during the call comes from `Gateway.forward`'s own frame, and no type states it. A refactor that changes the frame fails the first witness. Request `fb3f71f5` owns this statement.
- No container, Git host or real `fetch` ran for this head. The credential and the upstream are stand-ins. Request `fb3f71f5` owns this statement.
