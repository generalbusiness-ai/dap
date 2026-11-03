# Join fixture callbacks before Native teardown

Request `df2abe35fa26f572712c464f7c555897a7b5e16d` owns this test-only change.

The fixture retired its session owner and returned while actual object callbacks still ran. Vitest could then close the RPC channel during a module resolution. The automatic finish hook now joins callbacks on the fixture’s known objects after synchronous retirement. It does not run effects, dispatch work, advance the clock, or assert transitive quiescence. Production code and deployed settings stay unchanged.

## Locate the lifetime fault

The flush and registration-recovery gates passed every case but exited 1 with `EnvironmentTeardownError`: RPC closed while `resolve` remained pending. Vitest attributed the error to `archive-input.test.ts`. That file passes alone, including a concurrent copy; these observations do not identify it as the owner.

The last completed MCP lending owner calls synchronous `room.done()`. A focused diagnostic of its two original cases found two scheduled Destination callbacks at each release. Both cases passed, but the resolver trace had 610 starts and 609 completions. The outstanding module was `packages/scope/test/worker.ts`.

With the callback-finish patch, the same owner passed both original cases. Its finish hooks joined two callbacks each, and all 659 module resolutions completed. The traces expose a lifetime fault that permits late resolution. They do not deterministically reproduce the original whole-gate error or prove that no other teardown fault exists.

## Preserve ownership and show the join

`release()` still retires authority synchronously and releases every owned resource. The cached `finish()` promise then uses raw test-only object handles to join actual scheduled callbacks. Finite round and callback bounds stop unbounded fixture work. Callback failures propagate to the test. Fixtures that explicitly own their finish hook retain that responsibility.

The new session-ownership case holds an actual `waitUntil` callback inside its object. After retirement, a metadata RPC answers while `finish()` remains pending. Releasing the callback lets `finish()` complete. Skipping the join makes this unchanged case fail its expected assertion. Every original case, assertion, and deadline remains.

The initial witness carried a runner-owned promise into the object and failed with cross-object I/O and a timeout. Its owned process required termination; the recorded exit is 143. The corrected witness creates and releases its gate inside the same object. The evidence retains both attempts.

## Evidence

These focused runs preceded the frozen candidate and do not form one aggregate gate.

| Evidence | Result | Manifest |
| --- | --- | --- |
| Initial named-file traces | Archive-input passes alone and with its identical concurrent copy; all observed resolutions complete | [Diagnostics](evidence/2026-11-03-native-teardown-diagnostics.manifest.json) |
| Actual MCP lending owner | Before: 610 starts, 609 completions; after: 659 of 659, two callbacks joined per case | [Callback diagnostics](evidence/2026-11-03-native-teardown-callback-diagnostics.manifest.json) |
| Owning checks and control | Corrected Native compiler passes; complete session-ownership and archive-input files pass four cases; skip-join control fails the intended assertion; exact restoration and shared-helper inventory pass | [Focused checks](evidence/2026-11-03-native-teardown-focused.manifest.json) |

The callback-diagnostic manifest has SHA-256 `924ab973b8aef5ec642263eb1baa7ff6ac7739058550d2ccd0a56421240af5f9`. The focused manifest has SHA-256 `740375693f5c65e950be93bc767d90243936eb5778be55b6d228800b18018d0a`. The manifests name public records and hash private raw output. Their evidence directories are read-only.

The candidate’s single required gate follows this source freeze. Its outcome remains open until `gate.exit` exists and has been read.
