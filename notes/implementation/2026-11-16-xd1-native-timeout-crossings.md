# Name the Native timeout crossings

In the Native test projects, a test or hook that exceeds its limit does
not fail. It keeps running and can pass. XD-1 step 1 names each such
crossing in the log. Step 3 turns each one into a failure.

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

When `abort` throws and the reason is a vitest timeout error, the guard
prints one line and throws the original error again. Other aborts pass
through unchanged. In step 1 the run behaves as before.

## Read the line

```
[native-timeout-crossing] file=<path> name=<test name> limit=<N>ms kind=<Test|Hook>
```

- `file` is the test file path.
- `name` is the current test's full name. It reads `(no test)` for a hook
  outside a test.
- `limit` is the limit from vitest's timeout message.
- `kind` is `Test` or `Hook`.

`scripts/gate.sh` prints `native timeout crossings: N`, the count of these
lines in the test log. A count above zero names tests that exceeded their
limit and passed.

## The control

`scripts/native-timeout-crossing.test.mjs` runs in the Node stage, by
ruling e48cd709. It pins the wrapper over a class whose `abort` throws the
workerd refusal:

- With the wrapper, one refused timeout abort prints one line, and step 1
  throws the refusal again.
- Without the wrapper, the refusal escapes `abort`. That is the lost
  rejection.
- With `swallow`, the wrapper returns, so vitest's rejection runs (step 3).
- Another reason, or an abort that does not throw, prints nothing.

The control does not prove that workerd refuses in a real run. A gate's
crossing count is the Native witness. A gate with a count of 0 shows no
crossing in that gate. It does not show that the guard sees a real one.

## Versions

The guard depends on these versions:

- `@vitest/runner` 4.1.12: `withTimeout`, `abortIfTimeout`, and the timeout
  message in `dist/chunk-artifact.js`.
- `@cloudflare/vitest-pool-workers` 0.22.0.

When either version changes, read `withTimeout` and `abortIfTimeout` again.
If `onTimeout` can no longer throw before the rejection, vitest fixed the
fault. Then remove the guard, the control and the gate count.

## Step 3

Step 3 waits until a gate prints a crossing line, or a run shows the guard
on a real crossing. Then set `SWALLOW_CROSSING` to `true` in
`packages/scope/test/support/native-timeout-crossing.setup.ts`. The guard
prints the line and returns. Vitest rejects the test with its timeout
error, so a crossing fails the test.

## Plain projects

This answer is an inference from source. No Plain run has tested it.

The Plain projects run in Node threads. `AbortController.abort` there
runs listeners in the same context and does not throw. Node's
`EventTarget` also reports a throwing listener as an uncaught exception
after `abort` returns. The Plain projects can therefore not lose a
timeout this way. No Plain test reads the test context's `signal`.
