# NF5 normal R1 reproduction interval

This plan has not run. Root must review the supervisor and grant one
invocation. Input is clean pushed `0012cdf93d4bc8d7b3a0212f5ec9c74cbaa33f87`,
tree `009a3609359a809013967225f0f5e470375d13d6`. Local main and origin main
stay `918ce5d73c215154d88005b74c2a97b58d61880a`.

The proposed outer command is:

```sh
python3 /tmp/artroom-nf5-reproduction-supervisor-20261114.py
```

The only test child uses the existing config and loader:

```sh
/opt/homebrew/bin/node node_modules/vitest/vitest.mjs run \
  --config vitest.plain.config.ts --project cli \
  packages/cli/test/application-release-reproduction.test.ts \
  --allowOnly=false --passWithNoTests=false \
  --reporter=verbose --reporter=json \
  --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-11-14-nf5-reproduction-attempt1/vitest.json
```

The whole owner declares one case:
`Grow, Lending and Counter reproduce their reviewed definition and presentation identifiers from canonical sources`.
The actual JSON must report exactly that case, passed, in the one expected
module. It must report success, one passed test, no failure, pending test,
todo, failed suite, or pending suite. Preserve raw JSON and both child
streams regardless of the result. This runs no collection, compiler,
separate pack comparison, control, browser, model, or gate.

The supervisor freezes every tracked byte, all 15 bindings, every installed
file and link outside the explicitly mutable cache roots, Node, its own
code, package versions, lock/stamp, and both main fences. It declares only
`node_modules/.vite` and `.vite-temp` under the root and each workspace as
mutable caches. Their complete before/after inventories and copies remain
outside the checkout. A new workspace `node_modules` container may hold
these declared caches, but any other installed file or link change fails
the immutable fence. No installed package source is silently excluded.

A fresh external evidence `temp` directory supplies `TMPDIR` and a separate
`NODE_COMPILE_CACHE` namespace. Preserve both. Clear inherited test
selection, timing, progress, Node options, and worker-count overrides.
Retain actual argv and the names of cleared environment keys. The normal
config, loader and test body remain unchanged.

Power sampling follows the reviewed modern-first active-AC parser: sample
at boundaries and every 15 seconds, fail on exceptions, nonzero mode,
terminal failure, or a monitor that does not stop. Retain child process
identities and wall, user and system times. On timeout or power drift,
terminate only the supervisor's own child process group and stop. Do not
retry or rerun the owner automatically.

After terminal, root reviews the real JSON, raw output, cache ledger,
immutable fences and actual power. Seal all evidence read-only with
checksums and at least 30 days of retention, then file END. Only after that
result should the larger focused C plan select its remaining compilers and
whole owners. Do not list this successful reproduction as another focused
body. The final gate remains a later obligation.
