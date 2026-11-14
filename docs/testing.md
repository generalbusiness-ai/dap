# Test dap

You change dap and need to show that the change is right. Name the
invariant, put its test at the cheapest boundary that shows it, run the
tests of what you changed while you work, run the gate once before
review, and file the evidence. The steps come first.
[File test evidence](evidence-filing.md) gives the evidence rule.
[Testing reference](testing-reference.md) describes the stand-ins, what
the gate runs and the inventories.

## Write a test that earns its place

A test earns its place when it tells a plausible wrong behaviour from the
required behaviour, at a real interface or a meaningful internal boundary,
and so protects something the application relies on.

A test does not earn its place when it:

- repeats the implementation, or rebuilds the expected value with the same
  algorithm
- checks wiring nothing depends on
- exercises a combination no input can reach
- repeats, in a slower place, what a cheaper test already shows
- exists so that a count is met: one per field, one per condition, one per
  line

Each witness that the scope contract names, and each row of
[notes/implementation/2026-10-04-i1-contract-deltas.md](../notes/implementation/2026-10-04-i1-contract-deltas.md)
or of
[notes/implementation/2026-10-05-i2-contract-deltas.md](../notes/implementation/2026-10-05-i2-contract-deltas.md)
that names one, is an invariant with a stated expected result. Before you
remove or merge a test, check the cases it witnessed, and name the test
that witnesses each one afterwards.

Before you add a test, name the invariant in one sentence. If a test
already witnesses it, strengthen that witness instead of adding another.

Each test's name states its invariant, and the two deltas notes name the
witness of each decision. The retired
[test-invariants map](../notes/plans/retired/test-invariants.md) covers
the earlier model's tests, which are removed.

## Put the test where it belongs

Put each test at the cheapest boundary that can show its property.

| The property is about | Test it |
|---|---|
| A pure decision: canonical bytes, a digest, a validator's rule, a judgment, the fold, a bound | as a plain function, in the node tests of `bytes` or `derive`, once |
| What a scope records, refuses or keeps across a restart, and the transaction, the clock and the alarm | against a real scope, in the workerd tests of `scope` |
| The order of two things that race | against a real scope, with the test's gate and clock, never with sleeps |
| What passes between scopes: creation, delivery, a diagnosis | against real scopes in one namespace, in the workerd tests of `scope` |
| The Worker's routes and the service binding | in workerd, once for each. Do not run a whole suite over both |
| What a verifier reports for a journal | over journals in memory, in `replay`. That replay agrees with the runtime: once, in `scope` |
| What a client builds, signs and accepts as an answer | as plain functions in `client`, and the handle against the real Worker in `scope` |
| A form of a definition: that the validator accepts or refuses it, and what the judges derive from it | as a plain function in `derive`, on a small made-up definition, in the `forms-*.test.ts` file of its family |
| That a lane definition is exactly its pinned bytes and digest, meets its bounds, and passes the validator whole | as plain functions in `lanes`, once for both definitions. Do not write a test for one row, one field or one guard of a lane definition. |
| What only the two real lane definitions can show: several commitments and a hold, a plan's concerns, a manifest and its evidence, links, attention, capacity | against real scopes under the two pinned digests, in a scenario of `apps/room/lanes/test/*.scope.test.ts`, on the one fixture `test/support/graph.ts`. One scenario states one invariant. |

A stand-in proves only the boundary it exposes. A retry, an order of events or a
restart is shown against the thing that really retries, orders or restarts.
A test that uses a stand-in says so in its name or its first comment.
[Stand-ins and what they show](testing-reference.md#stand-ins-and-what-they-show)
lists each one.

## Keep time, size and setup small

- No test waits on the wall clock. Use the test clock, a gate, or an
  injected delay. A retry rule is about the rule, not about seconds
  passing.
- A bound is tested at a small configured limit when the limit is a
  parameter, and at the real limit once.
- Tests that only read may share one scope or one fixture per file. Tests
  that write get their own. The packages share one fixture set, exported by
  `@generalbusiness/dap-derive/testing`.

The harness's own deadlines are in
[Time allowances](testing-reference.md#time-allowances).

## Run the tests of what you changed

Run the tests of what you changed while you work, not the repository.

```
npm run test:changed                 # what you changed and have not committed
npm run test:changed -- origin/main  # everything that differs from origin/main
npx vitest run --project scope turn   # one project, files whose name matches
npm test --workspace @generalbusiness/dap-derive   # one package
```

`npm run test:changed` runs the root vitest run
([scripts/test-changed.mjs](../scripts/test-changed.mjs)), which picks the
test files that import a changed file, in every active package. The last
lines say what ran.

A change to a root file (`package.json`, the lock file, a root
`tsconfig`, the root `vitest.config.ts`) runs every test.

A changed file whose name git would quote, such as a name with a space or
a letter outside ASCII, runs the whole root vitest run, because vitest
cannot read that name.

The selection follows imports. A test that reads a file without importing
it, such as a fixture or a document, is not selected when only that file
changes. The gate runs everything.

`npm test` and `npm run test:changed` first apply the Cloudflare pool
compatibility backport in `scripts/cloudflare-pool-compat.mjs`. Before
you call a package's tests or Vitest directly, run
`node scripts/cloudflare-pool-compat.mjs` from the repository root.
[The compatibility backport](testing-reference.md#the-compatibility-backport)
says what it changes.

The names on this page match the repository workspace manifests.
Internal workspace test exports are not part of the public nine-package
SDK. In particular, `@generalbusiness/dap-platform/testing` is available
only in this checkout.

### Show that a test distinguishes

When you add or change a guard, show its witness fails without it. Break
the one line and run the one test file:

```
node scripts/control.mjs <source file> '<old text>' '<new text>' [--expect '<part of the test name>'] -- <package dir> <test args>
```

An explicit `.mjs` or `.cjs` test file selects Node. An explicit TypeScript
test file selects Vitest, even when the package test script runs both.
Other selections follow the package test script.

It runs the tests unchanged, which must pass. Then it applies the change,
runs them again and restores the file. It gives one of three results:

| Result | Exit | Meaning |
|---|---|---|
| distinguishes | 0 | a test failed by an assertion with the change applied, including a rejected Vitest `.resolves` or resolved `.rejects` assertion |
| survives | 1 | every test still passed: they do not see this fault |
| inconclusive | 2 | nothing was shown: the tests did not start, did not pass before the change, did not load or compile with it, ran fewer tests than before, had any timeout, or failed only by a thrown error |

A result-checking helper fails with
`expect.fail`, not with a thrown `Error`, so that a test which fails there
has failed by an assertion.

The pinned Vitest 4.1.12 JSON reporter omits error names. A promise
assertion can therefore carry an earlier `Error` stack. After checking the
`AssertionError` headline, the helper accepts only these complete first-line
forms, before it truncates the printed message:

- `Error: promise rejected "<inspected payload>" instead of resolving`
- `Error: promise resolved "<inspected payload>" instead of rejecting`

An ordinary thrown error remains inconclusive. If its entire message
counterfeits one of these two forms, the JSON reporter's missing name makes
it indistinguishable from the promise assertion. This fallback cannot
establish the error's constructor. Test names supply no error authority.
Earlier control exits, raw records and offline qualifications stay as filed.

Only the first is evidence. With `--expect`, the test you name must be one
of those that failed by an assertion, or the result is inconclusive. The
helper prints each failed test and the first line of its failure. Read
them: the assertion should be the one that states the invariant. The
helper cannot judge that for you.

On an inconclusive result, the helper prints the fresh scratch directory
that retains the actual child output. Node runs keep stdout bytes in
`before.tap` and `after.tap`, with separate `*.stderr.log` files. Vitest
runs keep their JSON reports and separate stdout and stderr logs. Only
attempted runs have files. Retain that directory with the control's other
evidence. Conclusive results still remove the scratch directory.

There is no mutation sweep. Do not write one mutant per field or per
condition, and do not run whole suites per mutant. One or two honest
controls for each invariant you touch are the evidence. If a guard cannot
change any outcome, because another check always decides first, say which
check, and consider deleting the guard.

## Run the gate once before a review

Run the gate once, at the head you will send, except for the
[limited follow-ups](evidence-filing.md#follow-up-after-a-gate). Fetch
`origin/main` first. The gate compares the branch with
`git merge-base HEAD origin/main`, and the commit-message check fails when
that base is unavailable.

```
npm run gate
```

`npm run gate -- --ci` reinstalls first. Keep `VITEST_MAX_WORKERS` unset
for the gate, because that override also replaces the native projects'
explicit worker limits.
[What the gate runs](testing-reference.md#what-the-gate-runs) lists its
steps.

### Write commit messages the gate accepts

A subject has at most 100 Unicode code points. Put detail in the body after
an empty line. In the subject and body, separate a word of three or more
Unicode letters from an ASCII hexadecimal run of at least seven
characters that contains a digit. For example, write `exact b8a4dea1`, not
`exactb8a4dea1`. Bare maximal hexadecimal tokens and names such as
`base64url`, `sha256`, and `ed25519` are allowed. Only a terminal block of
`Name: value` trailer lines, separated from the message by an empty line,
is exempt. Continuation lines are ordinary body text. Messages are read
as UTF-8, and an unreadable commit stops the check instead of passing it.
Landing messages supplied to `gs merge` follow the same bounds.

The standalone checker and its Node tests are:

```
node scripts/check-commit-messages.mjs <base> HEAD
node --test scripts/check-commit-messages.test.mjs
```
