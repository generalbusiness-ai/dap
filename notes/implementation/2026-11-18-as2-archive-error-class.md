# Name the error class behind an unavailable append check

AS-2 follow-up from the AS-1 report `c41d8ce4`. In NF-8, the scale test
`packages/scope/test/archive-one-entry-scale.test.ts` stopped once at seq
9780 with `{ state: "retry", reason: "unavailable" }`. The pass diagnostic
showed step `send` and caught `unavailable`, but it did not name the inner
route. Three routes can produce that stop. This change makes each route
name its cause in `stopCause` of `archive-pass-diagnostic-v1`.

## Routes

| Route | Where | `stopCause` before | `stopCause` now |
| --- | --- | --- | --- |
| (a) append check | `verifyJournalAppend` catch, `packages/git/src/journal-v2-append.ts:66-70`; stop at `packages/scope/src/archive-send.ts:36-37` | `{ site: "verifier", verifier: "unavailable" }` | `{ site: "verifier", verifier: "unavailable", error: "<class>" }` |
| (b) wait | `ArchiveBudget.wait()`, `packages/scope/src/archive-budget.ts:262` | `{ site: "wait", error: "<class>" }` | unchanged |
| (c) clock | `ArchiveBudget.check()`, `packages/scope/src/archive-budget.ts:86` | `{ site: "clock", clock: "regressed" \| "not-finite" }` | unchanged |

Route (a) covers errors thrown outside a budget wait, for example while the
verifier parses a commit, tree or head, or while it charges the budget. The
verifier reads every source object inside `budget.wait()`
(`packages/git/src/journal-objects.ts:156`, `:170`, `:178`), so an error that
a source read throws stops at route (b).

## Route (a)

`verifyJournalAppend` still maps every error that is not a layout refusal,
`limit` or `timeout` to `unavailable`. Its failure result now also carries
`error`, the error's class name (`errorClass`,
`packages/git/src/journal-v2-append.ts:76`). A thrown value that is not an
`Error` gives `non-error`. A `name` that is not a string, or a getter that
throws, gives `other`. The function cuts the name to 65 characters, so a
longer name still fails the 64-character check in scope. Results with
reason `limit`, `timeout` or a layout refusal do not change.

`sendArchiveAppend` passes that name through `archiveStopName`
(`packages/scope/src/archive-budget.ts:21`) into the verifier cause. The
allow-list stays in scope. `packages/git` does not import from
`packages/scope`, and the git result holds a bounded class name, never a
message or a value.

The site stays `verifier`. That site already separates route (a) from
routes (b) and (c), and the runbook and the AS-2 note of 2026-11-17 name it.
The new `error` field supplies the missing class.

The first stop of a pass keeps its cause. If the verifier's error is a
budget stop that a site without a cause raised, the pass records `null`, as
before.

## Route (c)

`check()` already stops with `{ site: "clock" }` when a reading runs
backwards or is not finite. The constructor's first reading
(`packages/scope/src/archive-budget.ts:75`) throws before a budget exists,
so no pass diagnostic can carry that cause. This change leaves it as it is.

## Diagnostic

`archive-pass-diagnostic-v1` logs `budget.stopCause()` whole
(`packages/scope/src/archive-driver.ts:601`). The new `error` field reaches
the log with no driver change. `examples/grow/runbook.md` documents the
field.

## Tests

- `packages/git/test/journal-v2-append.test.ts`, test "an append check that
  maps a thrown error to unavailable names its class, never its message": a
  budget whose `check()` throws gives `error: "TypeError"`, `non-error` for a
  string and a 65-character cut for a 100-character name. An error with
  reason `unreadable` gives `Error`. Reasons `limit` and `timeout` give no
  `error` field. No message text appears.
- `packages/scope/test/archive-stop-cause.test.ts`, test "a send whose
  append verifier maps a thrown error to unavailable names the error class":
  the verifier's first budget check throws a `TypeError`, the send stops as
  `unavailable` before any request, and `stopCause` is
  `{ site: "verifier", verifier: "unavailable", error: "TypeError" }`.
- Route (c) keeps its existing test, "a clock that runs backwards or stops
  being finite names the clock", in the same file.

Named red: at main `2631ad70`, both new tests fail because the result and
the cause have no `error` field. The route (c) test passes at `2631ad70`.

## Evidence

Files are in `artroom-evidence/2026-11-18-as2-red/`. Each run is
`npx vitest run --project git journal-v2-append` then
`npx vitest run --project scope archive-stop-cause`.

| Run | Result | File | SHA-256 |
| --- | --- | --- | --- |
| AS-2 tests, base source (2631ad70) | each new test fails: 1 of 2 and 1 of 6 | `red.txt` | `ea990f90ee969fca6750e59782284aae8b950a1e3854f295f8dbae0b7547a0ab` |
| AS-2 tests, AS-2 source | 2 and 6 pass | `green.txt` | `71ec65162e31ab994bb1d53c58aad25c5cfa813551a9adda0345bb8f9dd88333` |

The other users of `verifyJournalAppend` (`journal-append-cost`,
`journal-v2-budget`) pass. The `archive-budget.ts` seal moves to
`40d212d6`; the file changes only in the stop-cause type.
