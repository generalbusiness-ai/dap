# Check and preview a package

You write an application package and want to see it work before a room
installs it. Make a starter with `dap new`, check it with `dap check`,
read a refusal in its scenario, and preview it with `dap dev`. Each
command runs on your computer with public TEST actors. No room or
service is involved.

To run this starter in a room, pack it with `dap pack` and install it in
a room of the `base` cohort, as
[Install an application package](cli.md#install-an-application-package)
describes.

## Before you start

You need a checkout of the dap repository with its locked dependencies
installed by `npm ci`, as [Get the dap command](get-dap.md) describes.
[The dap command](cli.md) gives the Node version.
No registry publishes the command, so make an alias for the launcher in
the checkout:

```sh
alias dap="node /absolute/path/to/dap/packages/cli/bin/dap.js"
```

The launcher loads its own TypeScript loader from the checkout, so the
alias works in any directory. Run the steps below in a directory outside
the checkout.

## Make a starter

1. Make the starter in a new directory:

   ```sh
   dap new notes
   ```

   The command prints:

   ```
   Application: /home/you/notes
   Next: run dap check in that directory.
   Scenario authority uses public TEST actors. The browser starter joins no room.
   ```

   The directory name has 1 to 32 lowercase letters, digits or hyphens
   and starts with a letter. The command refuses a directory that
   exists, with exit 1.

2. Read what the starter holds:

   - `dap.application.json`: the package configuration. Its logical name
     is `test.example.notes`. It lists the definition, the scenario and
     the browser starter.
   - `definition.json`: a notes definition. A member who holds
     `notes.write` adds a note with `add`. Only the note's writer
     finishes it with `finish`.
   - `scenarios/basic.json`: a scenario with three public TEST actors,
     `alice`, `bob` and `visitor`.
   - `browser/`: a browser starter that joins no room.
   - `README.md`.

   The starter is a version 1 package with no projections and no views.
   To add a view, read
   [A minimal view](application-views.md#a-minimal-view).

## Check the package

1. Run the check in the starter's directory:

   ```sh
   cd notes
   dap check
   ```

   The command prints:

   ```
   Semantic: sha256:ac6d6f69d1cc2db76ec9035e3fa5ccd6cfad18ebdde6a733a0894e1bb8a817e8
   Presentation: sha256:e62dca38fa4a91d48feb6059bcef661cf754260990dc763bc057f63b4596d572
   Native definitions: 1 validated.
   Local authority: explicit scripted TEST grants; replay trusts authority as recorded.
   Local root definition: sha256:eacbf54e1300c43cb2e3ed714d4e2412b445cefbfa4fdc8c085ae91a6a9881e3; scripted directory fixture, without child transport.
   Scenario notes-custody: 5 steps passed; native replay consistent through 2.
   Declared capability requirements: none.
   Local external effects are disabled; this check does not admit a package or audit screen code.
   ```

   The scenario line says that all five steps met their expectations,
   and that replay of the scope's journal reached entry 2 and agreed. The
   command exits 0.

2. Edit `definition.json` and run `dap check` again after each change.
   A definition that the validator refuses stops the check with exit 1.
   For example, a guard that names a party slot the item lacks prints:

   ```
   Invalid native definition definition.json: acts.finish.guards.1.signer.0: names no party slot.
   ```

   The message gives the path of the row in the definition and the
   problem.

## Read a refusal

1. Open `scenarios/basic.json`. Its second step has `bob` try to finish
   the note that `alice` wrote:

   ```json
   {
     "act": {
       "actor": "bob",
       "kind": "finish",
       "on": 1,
       "fields": {},
       "expected": { "on": { "$revision": 1 } }
     },
     "expect": { "answer": "refused", "reason": "guard-failed" }
   }
   ```

   The scope refuses the act, because the second guard of `finish`
   accepts only the note's `writer`. A failed guard answers with the
   reason `guard-failed`.

2. State which guard refused. The guard declares `not-your-note` as its
   `reason`, and the refusal carries that word as its `name`. Add it to
   the expectation:

   ```json
   "expect": { "answer": "refused", "reason": "guard-failed", "name": "not-your-note" }
   ```

3. Run `dap check`. The scenario line again reports 5 steps passed.

A step whose answer differs from its expectation stops the check with
exit 1. The message names the scenario, the step and the native answer.
With `"expect": { "answer": "accepted" }` on the same step, the check
prints:

```
notes-custody, step 2: Expected accepted; native answer was refused (guard-failed).
```

With a `name` that differs from the guard's name, the check prints:

```
notes-custody, step 2: Expected the exact named native refusal.
```

## Preview the package

1. Start the development host in the starter's directory:

   ```sh
   dap dev
   ```

   The command prints:

   ```
   Development host: http://127.0.0.1:5173/__dap/
   Application preview: http://127.0.0.1:5173/
   Authority: explicit public TEST actors and open fixture reads. State is in memory.
   Clock: starts at the scenario's final time and advances with requests.
   ```

   The host runs the first scenario that the package lists, and keeps
   the scope's state in memory. To choose another port or scenario, add
   `--port <loopback-port>` or `--scenario <listed-file>`.

2. Open the preview address in a browser. Open the development host
   address to read the scope's state and run replay.

3. Edit a file in the directory. The host rebuilds and reloads the
   preview. A changed definition or scenario starts a fresh scope. A
   failed rebuild keeps the previous preview.

4. Stop the host with Ctrl-C.

## Next steps

- [Package reference](package-reference.md) describes package
  composition, the checks behind `dap check`, and device commands.
- [Declared application views](application-views.md) describes the
  views that show a package's items in an AI app.
- [`dap pack`](cli.md#dap-pack) signs the package. A room of the `base`
  cohort installs it. [Creation cohorts](cli.md#creation-cohorts) lists
  the cohorts.

## Source

The commands on this page ran on 10 November 2026 at main `fdd1c758`,
and every output block is copied from that run, except the `dap dev`
lines, which show the default port. Sources:
[`application-new.ts`](../packages/cli/src/application-new.ts),
[`application-command.ts`](../packages/cli/src/application-command.ts),
[`application-scenarios.ts`](../packages/cli/src/application-scenarios.ts),
[`application-dev.ts`](../packages/cli/src/application-dev.ts) and
[`application-files.ts`](../packages/cli/src/application-files.ts).
