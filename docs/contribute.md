# Contribute to dap

You set up a checkout of dap, find the code you want to change, run its
tests, run the gate, and send the change for review. You need Git, npm,
Node.js 22.18 or later, and a GitHub account. The project tests on Node 26.

## Set up a checkout

1. Clone the repository and install its locked dependencies.

   ```sh
   git clone https://github.com/generalbusiness-ai/dap.git
   cd dap
   npm ci
   ```

   npm reports the packages that it installed.

2. Create a branch for your change.

   ```sh
   git switch -c my-change
   ```

Do not install extra tools into the checkout. `package.json` and
`package-lock.json` change only in a commit that you send for review. To
run a tool once, run a pinned version from a scratch directory, for example
`npx -y wrangler@4.147.0` in a directory outside the checkout.

## Find the code

Each package under `packages/` holds one part of dap.
[The package table](scopes.md#packages) names each package, what it holds
and what it imports. The room application lives in `apps/room`, and the
example applications live in `apps/` and `examples/`. Each package has a
`README.md` that describes its parts.

[The kernel boundary](kernel.md) says which packages are kernel and gives
the rule for adding to the kernel. Read it before you change one of the
kernel packages: `contract`, `bytes` or `derive`.

## Run the tests of what you changed

1. Run the tests that import the files you changed and have not committed.

   ```sh
   npm run test:changed
   ```

   The last lines say which tests ran and whether they passed.

2. To run one project's test files whose names match a word, use Vitest
   directly. Apply the pool backport first.

   ```sh
   node scripts/cloudflare-pool-compat.mjs
   npx vitest run --project scope turn
   ```

[Run the tests of what you changed](testing.md#run-the-tests-of-what-you-changed)
lists the other forms.
[Write a test that earns its place](testing.md#write-a-test-that-earns-its-place)
says what a new test must show and where it goes.

## Run the gate before review

Run the gate once, at the commit you send for review.

1. Commit your change. Keep each commit subject at 100 characters or fewer.
   [Write commit messages the gate accepts](testing.md#write-commit-messages-the-gate-accepts)
   gives the other rules.

2. Fetch `main`, so the gate can find the base of your branch.

   ```sh
   git fetch origin main
   ```

3. Run the gate.

   ```sh
   npm run gate
   ```

   The gate prints one line for each step with its exit code and time. It
   ends with `gate passed; logs in <directory>` or
   `gate FAILED; logs in <directory>`. A failed step also prints the last
   lines of its log.

[What the gate runs](testing-reference.md#what-the-gate-runs) lists its steps.

## Send the change for review

Push your branch to your fork on GitHub and open a pull request against
`main` in [generalbusiness-ai/dap](https://github.com/generalbusiness-ai/dap).
In the description, say what changed, why, and which checks you ran.

Some workflows in `.github/workflows` run on a pull request when it
touches the files that they watch. The gate does not run in a workflow, so
state its result in the description.

The repository does not yet describe how maintainers review a pull request
from an outside contributor. The maintainers track their own work as
[the agent instructions](../AGENTS.md) describe.

To report a security problem, do not open a pull request or an issue.
Follow [Report a vulnerability](../SECURITY.md#report-a-vulnerability).

## Next steps

- [Test dap](testing.md) is the full test guide.
- [Scopes](scopes.md) is the runtime reference.
- [Produce the public SDK](public-sdk-release.md) builds and checks the
  published packages.
