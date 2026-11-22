# Submit the reviewed draft revision

## What changed

The draft view exposes the digest of the stored draft as its revision.
After review, a caller can supply that value as the third argument to
`ScopeClient.submit`. The client validates its shape before reading custody.
It compares the revision with the stored draft under the first member fence
before signing. A mismatch returns `draft-changed`. A caller can read the
current draft view before trying again. Existing two-argument calls retain
their behavior.

The Counting Commitments test enumerates all 16 ordered pairs of fulfill,
fail, cancel, and expire. It checks the fulfilled total after each resolution.
The target of three keeps both steps before the board finishes.

The Security review cleanup restores sequential execution of the real CLI
witness while retaining its 30-second deadline and assertions. It also
explains the bounded IPv6 overflow window and removes the incoming-power
sentence from the earlier S7 note. The original Security review and gate
remain recorded in the S7 implementation note.

## Decisions

Use the digest of the stored draft as the revision. The existing exploration,
signing, and submission checks still apply after the revision check.

The [Counting design decision](../2026-11-21-property-based-testing.md)
records the finite pair scope and fixture grants. In the prior control
`12449934`, four behavior tests passed on the original source. Resetting the
count in the fail effect made the added witness fail by assertion at
fulfill then fail. The control selected the four plain behavior tests.

## Evidence

The three-lane gate tested head `a779ade8a2bfa53e5a437b95beb12334318da56d`,
tree `37e8a416a2e5c8e417127685ca81f8c098f9c566`, against published base
`8a9f9d1e49874479636b6186094767a6184db23f`. START is
`a8e7e8f6fafbd35d8b7471c22871f5cde2e02950`. The review adds evidence and
design status notes after the gate. The gated source and test bytes carry
through to the reviewed head. Earlier focused checks stand at the heads
named below.

| Check | Command, result, and retained output |
| --- | --- |
| XD-1 client owner | `vitest run --project client packages/client/test/c4-draft-now.test.ts --maxWorkers 1`, exit 0, 26 passed at head `6dcefc796def49fbb144a367717939d6955c4c4f`. `~/play/artroom-evidence/2026-11-21-xd1-counting-cleanup-gate/xd1-focused/draft-now.log`, SHA-256 `320752b8433d9c204c05aa67e755117fada98786c5f4a9fb73e8df1a9d9e198b`. |
| XD-1 client test types | `tsc -p packages/client/tsconfig.test.json`, exit 0 at the same head. `~/play/artroom-evidence/2026-11-21-xd1-counting-cleanup-gate/xd1-focused/types.log`, SHA-256 `e0cde97a2ecaba63642a98b7ea4e4331fc5d42965caa141423d421e6b4afbdb9`. |
| Security cleanup CLI owner | `vitest run --project cli packages/cli/test/application-new.test.ts --maxWorkers 1`, exit 0, two passed at head `d71365c0873538f46a9e4d436f6da6a2cdc3fdba`. `~/play/artroom-evidence/2026-11-21-xd1-counting-cleanup-gate/security-cleanup-focused/application-new.log`, SHA-256 `0ff81393a7863732ad9aed6d0fcf866f72416d45d52275bdf62f8e2369ae163a`. |
| Security cleanup CLI test types | `tsc -p packages/cli/tsconfig.test.json`, exit 0 at the same head. `~/play/artroom-evidence/2026-11-21-xd1-counting-cleanup-gate/security-cleanup-focused/types.log`, SHA-256 `cc5331fa04ecbf9377974d087b0373d59b0d4d43142ff326e1f28245f729a1c6`. |
| Security entry inventory | `node --test scripts/security-entry-points.test.mjs`, exit 0, 13 passed at the cleanup head. `~/play/artroom-evidence/2026-11-21-xd1-counting-cleanup-gate/security-cleanup-focused/security.log`, SHA-256 `a9742351abb67a24a09a3dd1bc619090b057fa844c1f3ab81d38b3a6899ee598`. |
| Earlier Counting control | `scripts/control.mjs`, workroom record `124499340c16d55263819479028ee4740161d272`, attachment blob `038c601ae032ef7524be779573fcbddb5a606dc5`. Four behavior tests passed on the original source. With the fail-effect reset, three passed and one failed by assertion at fulfill then fail. The count was zero and the test expected one. The control deselected the pin check, restored the source, and predates the current test title. `~/play/artroom-evidence/2026-11-21-xd1-counting-cleanup-gate/counting-fulfillment-control.log`, SHA-256 `b4ed9dfae9fd3b493f6f7b02e594396e67dd384e21f51ebc37dabfbae03eb2ba`. |
| Interrupted two-lane gate | Head `4da0f76abff21462156c020d071e84ac2be7bcdf` exited 143 when the planner confirmed the three-lane group. The interruption stopped Node after 243 observations and stopped the wall timer. The retained `~/play/artroom-evidence/2026-11-21-xd1-counting-cleanup-gate/interrupted-two-lane/gate.txt` has SHA-256 `99ad3c003c9f88eb4f393bf3efb23ccf95a1aef3ddda6676f7b6b5917a3b20d1`. |
| Final three-lane gate | `npm run gate`, exit 0, 990.83 seconds measured wall time. Node 246, Counting 60, Plain 5,089 passed and one skipped, Native 1,239 passed and two skipped. Crossings: zero lost, four stale, zero without an owner. Scale was omitted because the changed paths did not select it. END `a7e42f58c02f2d1b28e17de640a26177e90a8cc3`. `~/play/artroom-evidence/2026-11-21-xd1-counting-cleanup-gate/gate.txt`, SHA-256 `4c7c6b8846ae1394032e3690285d003f7170264c8c3daa9a6f84a9fa8ace0fbd`. |

## Open limits

XD-1 request `1b402fc3` covers the client API. Each caller decides when to
display and review the revision. Counting request `d9477b7f` covers pairs
before the board finishes. The fault control ran in the plain test project.
