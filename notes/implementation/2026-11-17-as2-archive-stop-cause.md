# Record why an archive pass stopped

AS-2 (request `5443b484`, ruling `ff12d4f2` on the AS-1 report `3215594c`)
adds `stopCause` to `archive-pass-diagnostic-v1`. The AS-1 audit found that a
failed pass stopped at step `send` with reason `unavailable`, and that three
checks could have stopped it. The diagnostic did not say which one.

## The field

`ArchiveBudget` keeps the cause that its first stop names
(`packages/scope/src/archive-budget.ts`). Three sites name one:

| Site | Check | Value |
| --- | --- | --- |
| `clock` | `check()` sees a clock that runs backwards or is not finite | `{ site: "clock", clock: "regressed" }` or `"not-finite"` |
| `wait` | work inside `wait()` throws an error that is not a budget stop | `{ site: "wait", error: <class name> }` |
| `verifier` | `sendArchiveAppend` gets `limit`, `timeout` or `unavailable` from the append verifier (`packages/scope/src/archive-send.ts`) | `{ site: "verifier", verifier: <reason> }` |

A later stop keeps the first cause, and a stop at any other site records
`null`. The driver logs the field with each pass
(`packages/scope/src/archive-driver.ts`).

The log holds names only. `archiveStopName` accepts a letter followed by up
to 63 letters, digits, `_` or `-`, and gives `other` for anything else. A
thrown value that is not an `Error` gives `non-error`. No error message
reaches the log.

## Unchanged behaviour

The cause changes no stop reason, retry, backoff or wake. Each site throws the
same `ArchiveStopped` as before.

## Tests

- `packages/scope/test/archive-stop-cause.test.ts` has one case per cause: a
  clock that runs backwards and one that gives `NaN`; a wait whose work throws
  a `TypeError`, an error with an unusual name and a string; and a send whose
  verifier refuses an oversized parent commit before any request. Two more
  cases check that the first stop keeps its cause and that names stay
  bounded.
- `packages/scope/test/archive-driver.test.ts` lists `stopCause` among the
  record's keys. Its target lookup throws `Error("TEST PRIVATE ERROR
  SENTINEL")`, and each retry record names `{ site: "wait", error: "Error" }`.
  The existing check confirms that the message never reaches the log.
- Named red: with main's budget, send and driver at `830d134a`, the new
  cases fail and the driver case fails on the missing key. Evidence:
  `/Users/hughpyle/play/artroom-evidence/2026-11-17-as2-red/`.

## Deployment

The diagnostic runs in every room Worker that archives. After landing, the
planner deploys those Workers and reads the request rate. The change adds no
alarm, wake or request, so the rate should not move.
