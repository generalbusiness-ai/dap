# Name the Native timeout crossings

In the Native test projects, workerd can refuse the abort that vitest's
timeout makes. XD-1 names each refusal in the log and sorts it into one of
three classes. A refusal for a test that still runs is a lost timeout, and
it fails the gate. By source, a test past its limit can then keep running
and pass. No run has shown that yet: every line so far marks a timer that
fired after its test passed.

## The fault

Vitest's `withTimeout` starts a timer for each test and hook. When the
timer fires, `rejectTimeoutError` calls `onTimeout`, then rejects the
test with the timeout error. `onTimeout` is `abortIfTimeout`, which calls
`AbortController.abort` on the test context's controller.

In the workerd pool, the timer can fire while the isolate runs in the I/O
context of another Durable Object. Workerd then refuses `abort` with
"Cannot perform I/O on behalf of a different Durable Object". The throw
leaves `rejectTimeoutError` before the rejection, so vitest never fails
the test. The log shows an uncaught error and the test result is unchanged.

The Scope Native projects set `testTimeout: 30_000`. Hooks use the
10-second default.

A limit alone does not lose a timeout. Three runs with a 1 ms limit and no
guard each failed with the timeout error: a one-file workerd project, the
same project with the wait inside a Durable Object, and the real
`vitest.worker.config.ts` on `test/request-index.test.ts`. The gate logs
show the loss only under gate concurrency, with two workers and
`isolate: false`.

## The guard

`guardAbort` in `packages/scope/test/support/native-timeout-crossing.ts`
wraps `AbortController.prototype.abort`.
`packages/scope/test/support/native-timeout-crossing.setup.ts` installs it
once per isolate. It runs as a `setupFiles` entry in the
four Scope Native configs: `vitest.worker.config.ts`,
`vitest.lending.config.ts`, `vitest.denial.config.ts`, and
`vitest.scale.config.ts`. The `scope-stories` project inherits it from
`vitest.worker.config.ts`.

The setup file keeps one owner for each test context. `beforeEach` maps
the context's `signal` to the test's file and full name. `afterEach` marks
that owner finished. Vitest aborts the controller of the test's own
context, so the guard finds the owner of the aborted controller. A timer
of test A that fires while test B runs names A (step 1b, ruling
925778a5).

When `abort` throws and the reason is a vitest timeout error, the guard
prints one line and acts on its class (ruling 6ba49430):

| Class | Owner | The guard |
|---|---|---|
| `lost` | still runs | returns, so vitest rejects the test with its timeout error |
| `stale` | finished | throws the refusal again; the test has settled |
| `no-owner` | none | throws the refusal again |

Other aborts pass through unchanged.

## Read the line

```
[native-timeout-crossing] class=<lost|stale|no-owner> file=<path> name=<test name> limit=<N>ms kind=<Test|Hook>
```

- `class` is the class from the table above.
- `file` and `name` are the owner's file and full name. A `no-owner` line
  reads `file=(unknown) name=(no owner)`.
- `limit` is the limit from vitest's timeout message.
- `kind` is `Test` or `Hook`.

A `beforeAll` or `afterAll` hook has no test context, so its timer reports
`no-owner`. That is not a fault of the guard.

`scripts/gate.sh` prints one count for each class:
`native timeout crossings, lost: N`, then `stale` and `no-owner`. A `lost`
count above zero fails the gate. A `stale` or `no-owner` line never fails
it.

## What a stale line shows

A `stale` line shows that a test's timer fired after the test passed and
that workerd refused the abort. The step 1b gate named two owners in
`packages/scope/test/archive-driver.test.ts`:

| Test | Limit | Recorded duration |
|---|---|---|
| coalesces one host pass while a flood of native turns completes | 20000 ms | 786 ms, passed |
| a late host continuation cannot send or record after the original deadline | 30000 ms | 736 ms, passed |

A run of that file alone, followed by a test that waits 35 seconds, printed
both refusals during the wait. No gate ran beside it. Both stacks enter
`rejectTimeoutError` from the timer callback, not from the elapsed-time
check in `resolve`. So the timer of each test fired after the test passed:
`clearTimeout` in `resolve` did not clear it. Three more runs of the same
probe printed no refusal: one with the step 2 guard twice, and one with
the step 1b guard. The stale timer does not fire in every run.

Both tests settle a promise that `lane.inside` returns, from inside a
Durable Object. The likely cause is that `resolve` then runs in that
object's I/O context, and workerd does not clear a timer from another
context. No run has tested that cause.

When a stale timer fires, `reject_` comes after `resolve_`, so it changes
nothing.

## Limit

A timer that fires after the test settles and before its `afterEach` runs
counts as `lost`. The gate then fails, although the test passed. The time
between the two is a few microtasks.

## The control

`scripts/native-timeout-crossing.test.mjs` runs in the Node stage, by
rulings e48cd709 and 6ba49430. It pins the wrapper over a class whose
`abort` throws the workerd refusal:

- A finished owner gives one `stale` line, and the refusal is thrown again.
- A running owner gives one `lost` line, and the wrapper returns.
- An unregistered controller gives one `no-owner` line, and the refusal is
  thrown again.
- A timer that test A starts and that fires during test B names A.
- Without the wrapper, the refusal escapes `abort`. That is the lost
  rejection.
- Another reason, or an abort that does not throw, prints nothing.

The control does not prove that workerd refuses in a real run, or that the
setup file marks owners in a real run. A gate's counts are the Native
witness. A gate with all counts at 0 shows no refusal in that gate.

## Versions

The guard depends on these versions:

- `@vitest/runner` 4.1.12: `withTimeout`, `abortIfTimeout`, and the timeout
  message in `dist/chunk-artifact.js`.
- `@cloudflare/vitest-pool-workers` 0.22.0.

When either version changes, read `withTimeout` and `abortIfTimeout` again.
If `onTimeout` can no longer throw before the rejection, vitest fixed the
fault. Then remove the guard, the control and the gate counts.

## Plain projects

This answer is an inference from source. No Plain run has tested it.

The Plain projects run in Node threads. `AbortController.abort` there
runs listeners in the same context and does not throw. Node's
`EventTarget` also reports a throwing listener as an uncaught exception
after `abort` returns. The Plain projects can therefore not lose a
timeout this way. No Plain test reads the test context's `signal`.
